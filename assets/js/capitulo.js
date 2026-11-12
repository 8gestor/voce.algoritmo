/*
 * capitulo.js — comportamento comum a todas as páginas de capítulo.
 *
 * Conversa com o leitor (index.html) via postMessage:
 *   recebe  { type: 'theme',      value: 'paper' | 'dark' | 'light' | 'sepia' }
 *   recebe  { type: 'font',       value: <px> }
 *   recebe  { type: 'typeface',   value: 'serif' | 'legible' | 'mono' }
 *   recebe  { type: 'margins',    value: 'narrow' | 'medium' | 'wide' }
 *   recebe  { type: 'align',      value: 'left' | 'justify' }
 *   recebe  { type: 'readlang',   value: 'pt' | 'en' }       idioma em que o texto é exibido
 *   recebe  { type: 'audiolang',  value: 'pt' | 'en' }       idioma em que o texto é narrado
 *   recebe  { type: 'voice',      value: { lang, name } }    voz escolhida para um idioma
 *   recebe  { type: 'rate',       value: <velocidade da narração> }
 *   recebe  { type: 'tts-toggle' }
 *   envia   { type: 'tts-state',  isPlaying: <bool> }
 *
 * TRADUÇÃO. Cada unidade traduzível tem data-id (ex.: "c01-003"). O texto original (PT) é
 * guardado ao carregar; a tradução (EN) vem de assets/i18n/en/<página>.js, que registra
 * window.DD_I18N['<página>'] = { id: 'html traduzido' }. Unidade sem tradução cai para PT.
 *
 * NARRAÇÃO. Lê, em ordem, cada elemento .speakable, sentença por sentença. O idioma do áudio
 * é independente do idioma da leitura: se forem diferentes, a palavra destacada na tela
 * acompanha a posição relativa da fala (ancorada por sentenças quando os dois textos têm o
 * mesmo número delas). Mudar a velocidade NÃO muda de parágrafo: retoma da palavra atual.
 */
(function () {
    'use strict';

    const synth = window.speechSynthesis;
    const root = document.documentElement;
    const LANG_TAG = { pt: 'pt-BR', en: 'en-US' };
    const CHARS_PER_SEC = { pt: 14.5, en: 15 };   // só para estimar quando a voz não envia eventos

    /* ------------------------------------------------------------ preferências */
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('dd-settings') || '{}'); } catch (err) { saved = {}; }

    const state = {
        readLang: saved.readLang === 'en' ? 'en' : 'pt',
        audioLang: saved.audioLang === 'en' ? 'en' : 'pt',
        rate: Number(saved.rate) || 1,
        voices: Object.assign({ pt: '', en: '' }, saved.voices || {})
    };

    document.body.className = (saved.theme || 'paper') + '-mode';
    if (saved.font) root.style.setProperty('--base-size', saved.font + 'px');
    root.dataset.face = saved.face || 'serif';
    root.dataset.margin = saved.margin || 'medium';
    root.dataset.align = saved.align || 'left';

    /* ------------------------------------------------------------ CSS e traduções */
    const pageKey = window.DD_PAGE || (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i, '');

    (function loadAssets() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'assets/css/narracao.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'assets/i18n/en/' + pageKey + '.js';
        script.onload = () => { applyReadLanguage(); };
        script.onerror = () => { /* capítulo ainda sem tradução: fica em PT */ };
        document.head.appendChild(script);
    })();

    const units = new Map();     // id -> { el, pt }
    document.querySelectorAll('[data-id]').forEach((el) => {
        if (el.parentElement && el.parentElement.closest('[data-id]')) return;   // rótulo dentro de outra unidade
        units.set(el.dataset.id, { el: el, pt: el.innerHTML });
    });
    const queue = Array.from(document.querySelectorAll('.speakable[data-id]'));

    function enTable() { return (window.DD_I18N && window.DD_I18N[pageKey]) || {}; }
    function hasEn(id) { return typeof enTable()[id] === 'string' && enTable()[id] !== ''; }
    function htmlFor(id, lang) { return lang === 'en' && hasEn(id) ? enTable()[id] : units.get(id).pt; }
    function langFor(id, lang) { return lang === 'en' && hasEn(id) ? 'en' : 'pt'; }

    function applyReadLanguage() {
        root.lang = state.readLang === 'en' ? 'en' : 'pt-BR';
        units.forEach((u, id) => {
            if (u.wrapped) return;                       // unidade em narração é refeita por refresh()
            const html = htmlFor(id, state.readLang);
            if (u.shown !== html) { u.el.innerHTML = html; u.shown = html; }
            u.el.lang = langFor(id, state.readLang) === 'en' ? 'en' : 'pt-BR';
        });
        refresh();
    }

    /* ------------------------------------------------------------ texto falado e palavras */
    function plainText(html) {
        const t = html
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/(p|div|li|h[1-6]|td|th|tr|table|ul|ol|section|article|blockquote)>/gi, '$& ');
        const box = document.createElement('div');
        box.innerHTML = t;
        return (box.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function tokenize(text) {
        const out = [];
        const re = /\S+/g;
        let m;
        while ((m = re.exec(text))) out.push({ s: m.index, e: m.index + m[0].length, w: m[0] });
        return out;
    }

    // Índices das palavras que terminam uma sentença.
    function sentenceEnds(tokens) {
        const ends = [];
        tokens.forEach((t, i) => {
            if (/[.!?…]["'”’)\]]*$/.test(t.w) && !/^(Dr|Dra|Sr|Sra|Prof|etc|vs|St|Mr|Mrs|Ms|U\.S|e\.g|i\.e)\.$/i.test(t.w)) ends.push(i);
        });
        if (!ends.length || ends[ends.length - 1] !== tokens.length - 1) ends.push(tokens.length - 1);
        return ends;
    }

    /* ------------------------------------------------------------ plano de uma unidade */
    let plan = null;     // { id, el, speechLang, text, tokens, chunks, words, map }

    function wrapWords(el) {
        const spans = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.nodeValue.trim() && !/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName))
                ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
            const frag = document.createDocumentFragment();
            node.nodeValue.split(/(\s+)/).forEach((piece) => {
                if (!piece) return;
                if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(piece)); return; }
                const sp = document.createElement('span');
                sp.className = 'w';
                sp.textContent = piece;
                frag.appendChild(sp);
                spans.push(sp);
            });
            node.parentNode.replaceChild(frag, node);
        });
        return spans;
    }

    function buildPlan(el) {
        const id = el.dataset.id;
        const u = units.get(id);
        const readHtml = htmlFor(id, state.readLang);
        const speechLang = langFor(id, state.audioLang);
        const speechHtml = htmlFor(id, state.audioLang);

        u.el.innerHTML = readHtml;                       // recomeça do HTML limpo antes de envolver
        u.shown = readHtml;
        const words = wrapWords(u.el);
        u.wrapped = true;

        const text = plainText(speechHtml);
        const tokens = tokenize(text);
        const ends = sentenceEnds(tokens);
        const chunks = [];
        let from = 0;
        ends.forEach((last) => { if (last >= from) { chunks.push({ a: from, b: last }); from = last + 1; } });

        // mapa: palavra falada -> palavra exibida
        const N = tokens.length, M = words.length;
        let map;
        if (N === M || N === 0 || M === 0) {
            map = (k) => Math.min(k, Math.max(M - 1, 0));
        } else {
            const dispTokens = words.map((sp) => ({ w: sp.textContent }));
            const dEnds = sentenceEnds(dispTokens);
            if (dEnds.length === ends.length) {
                map = (k) => {
                    let si = 0;
                    while (si < ends.length - 1 && k > ends[si]) si++;
                    const sa = si === 0 ? 0 : ends[si - 1] + 1, sb = ends[si];
                    const da = si === 0 ? 0 : dEnds[si - 1] + 1, db = dEnds[si];
                    const f = (k - sa + 0.5) / (sb - sa + 1);
                    return Math.min(db, da + Math.floor(f * (db - da + 1)));
                };
            } else {
                map = (k) => Math.min(M - 1, Math.floor((k + 0.5) / N * M));
            }
        }
        return { id: id, el: u.el, speechLang: speechLang, text: text, tokens: tokens, chunks: chunks, words: words, map: map };
    }

    function unwrapUnit(id) {
        const u = units.get(id);
        if (!u) return;
        u.wrapped = false;
        const html = htmlFor(id, state.readLang);
        u.el.innerHTML = html;
        u.shown = html;
    }

    /* ------------------------------------------------------------ vozes */
    function pickVoice(lang) {
        const voices = synth.getVoices();
        const tag = LANG_TAG[lang];
        const mine = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().indexOf(lang) === 0);
        if (state.voices[lang]) {
            const chosen = voices.find((v) => v.name === state.voices[lang]);
            if (chosen) return chosen;
        }
        const rank = (v) =>
            (v.lang.replace('_', '-') === tag ? 4 : 0) +
            (/natural/i.test(v.name) ? 3 : 0) +
            (v.localService ? 2 : 0) +
            (/google/i.test(v.name) ? 1 : 0);
        return mine.sort((a, b) => rank(b) - rank(a))[0] || null;
    }

    /* ------------------------------------------------------------ narração */
    let playing = false;
    let qi = 0;                // unidade atual na fila
    let serial = 0;            // invalida utterances antigas (cancel/troca de velocidade/idioma)
    let tok = 0;               // palavra falada atual
    let timer = null;
    let gotBoundary = false;

    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

    function mark(k) {
        if (!plan) return;
        tok = k;
        const idx = plan.map(k);
        plan.words.forEach((sp, i) => sp.classList.toggle('now', i === idx));
        const cur = plan.words[idx];
        if (cur) {
            const r = cur.getBoundingClientRect();
            if (r.top < 70 || r.bottom > window.innerHeight - 70) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    function startUnit(index, fromFraction) {
        if (plan) { unwrapUnit(plan.id); plan = null; }
        qi = index;
        document.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
        const el = queue[qi];
        el.classList.add('speaking');
        plan = buildPlan(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const first = plan.tokens.length ? Math.min(plan.tokens.length - 1, Math.floor((fromFraction || 0) * plan.tokens.length)) : 0;
        speakFrom(first);
    }

    function chunkOf(k) {
        for (let i = 0; i < plan.chunks.length; i++) if (k >= plan.chunks[i].a && k <= plan.chunks[i].b) return i;
        return plan.chunks.length - 1;
    }

    function speakFrom(k) {
        if (!playing || !plan) return;
        if (!plan.tokens.length) { nextUnit(); return; }
        const my = ++serial;
        const ci = chunkOf(k);
        const chunk = plan.chunks[ci];
        const startTok = Math.max(k, chunk.a);
        const base = plan.tokens[startTok].s;
        const endChar = plan.tokens[chunk.b].e;
        const piece = plan.text.slice(base, endChar);

        const ut = new SpeechSynthesisUtterance(piece);
        ut.lang = LANG_TAG[plan.speechLang];
        ut.rate = state.rate;
        const v = pickVoice(plan.speechLang);
        if (v) { ut.voice = v; ut.lang = v.lang; }

        const tokenAt = (abs) => {
            let lo = 0, hi = plan.tokens.length - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (plan.tokens[mid].s <= abs) lo = mid; else hi = mid - 1;
            }
            return lo;
        };

        gotBoundary = false;
        stopTimer();
        mark(startTok);

        ut.onstart = () => {
            if (my !== serial) return;
            const t0 = performance.now();
            stopTimer();
            timer = setInterval(() => {
                if (my !== serial || gotBoundary) { stopTimer(); return; }
                const pos = ((performance.now() - t0) / 1000) * state.rate * CHARS_PER_SEC[plan.speechLang];
                mark(tokenAt(Math.min(endChar - 1, base + Math.floor(pos))));
            }, 90);
        };
        ut.onboundary = (e) => {
            if (my !== serial) return;
            if (e.name && e.name !== 'word') return;
            gotBoundary = true;
            stopTimer();
            mark(tokenAt(base + e.charIndex));
        };
        ut.onend = () => {
            if (my !== serial) return;
            stopTimer();
            if (ci + 1 < plan.chunks.length) speakFrom(plan.chunks[ci + 1].a);
            else nextUnit();
        };
        ut.onerror = (e) => {
            if (my !== serial) return;
            stopTimer();
            if (e && (e.error === 'canceled' || e.error === 'interrupted')) return;
            if (ci + 1 < plan.chunks.length) speakFrom(plan.chunks[ci + 1].a); else nextUnit();
        };
        synth.speak(ut);
    }

    function nextUnit() {
        if (!playing) return;
        if (plan) { unwrapUnit(plan.id); plan = null; }
        if (qi + 1 >= queue.length) { qi = 0; halt(); return; }
        startUnit(qi + 1, 0);
    }

    function halt() {
        playing = false;
        serial++;
        stopTimer();
        synth.cancel();
        if (plan) { unwrapUnit(plan.id); plan = null; }
        document.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
        report(false);
    }

    function toggle() {
        if (playing) { halt(); return; }
        playing = true;
        report(true);
        if (qi >= queue.length) qi = 0;
        startUnit(qi, 0);
    }

    // Recomeça a unidade atual (mudou idioma, voz ou velocidade) sem sair do lugar.
    function refresh(opts) {
        if (!playing || !plan) return;
        const o = opts || {};
        const frac = plan.tokens.length ? tok / plan.tokens.length : 0;
        const keepToken = !o.audioChanged;
        const prevTokens = plan.tokens.length;
        serial++;
        stopTimer();
        synth.cancel();
        const id = plan.id;
        unwrapUnit(id);
        plan = null;
        setTimeout(() => {
            if (!playing) return;
            const index = queue.findIndex((q) => q.dataset.id === id);
            if (index < 0) return;
            qi = index;
            plan = buildPlan(queue[qi]);
            document.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
            queue[qi].classList.add('speaking');
            let first = 0;
            if (plan.tokens.length) {
                first = (keepToken && plan.tokens.length === prevTokens)
                    ? Math.min(tok, plan.tokens.length - 1)
                    : Math.min(plan.tokens.length - 1, Math.floor(frac * plan.tokens.length));
            }
            speakFrom(first);
        }, 60);
    }

    function report(isPlaying) {
        window.parent.postMessage({ type: 'tts-state', isPlaying: isPlaying }, '*');
    }

    /* ------------------------------------------------------------ mensagens do leitor */
    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'theme') document.body.className = d.value + '-mode';
        if (d.type === 'font') root.style.setProperty('--base-size', d.value + 'px');
        if (d.type === 'typeface') root.dataset.face = d.value;
        if (d.type === 'margins') root.dataset.margin = d.value;
        if (d.type === 'align') root.dataset.align = d.value;
        if (d.type === 'readlang' && d.value !== state.readLang) {
            state.readLang = d.value === 'en' ? 'en' : 'pt';
            applyReadLanguage();
        }
        if (d.type === 'audiolang' && d.value !== state.audioLang) {
            state.audioLang = d.value === 'en' ? 'en' : 'pt';
            refresh({ audioChanged: true });
        }
        if (d.type === 'voice' && d.value && LANG_TAG[d.value.lang]) {
            state.voices[d.value.lang] = d.value.name || '';
            if (plan && plan.speechLang === d.value.lang) refresh();
        }
        if (d.type === 'rate') {
            const v = Number(d.value);
            if (v > 0 && v !== state.rate) { state.rate = v; refresh(); }
        }
        if (d.type === 'tts-toggle') toggle();
    });

    /* ------------------------------------------------------------ clique */
    // Clicar em um parágrafo começa a narração a partir dele.
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, select, textarea, summary, label')) return;
        const target = e.target.closest('.speakable');
        if (!target) return;
        const i = queue.indexOf(target);
        if (i === -1) return;
        serial++;
        stopTimer();
        synth.cancel();
        if (plan) { unwrapUnit(plan.id); plan = null; }
        playing = true;
        report(true);
        startUnit(i, 0);
    });

    window.addEventListener('beforeunload', () => synth.cancel());
    if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged = () => { /* vozes disponíveis */ };

    // Gancho de teste (não usado pelo leitor).
    window.__dd = { state: state, units: units, queue: queue, get plan() { return plan; }, get playing() { return playing; } };
})();
