/*
 * ingles-teleprompter.js — modo de leitura Teleprompter: UMA linha de cada vez, letras grandes, a linha rola para manter a palavra
 * falada no centro e a palavra é destacada em sincronia com a narração; embaixo, a tradução da frase (a mesma que o sistema já mostra
 * na legenda). Ligado pelo seletor "Modo de leitura" (ingles-modos.js), com a opção "Teleprompter".
 * Usa os eventos do núcleo: `sentence` (qual frase), `piece` (texto exato falado e idioma), `wordpos` (palavra falada), `stop`, `open`,
 * `close`, `mode`. O texto da narração mostrado é o que está sendo falado (idioma do áudio); a tradução é o outro idioma.
 * Teclado: Espaço = ler/pausar, ← e → = frase anterior/próxima, + e − = tamanho, Esc = sair. Tamanho em localStorage dd-ingles-tele-size.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !D.setMode) return;
    const KEY = 'dd-ingles-tele-size', RATES = [0.75, 1, 1.25, 1.5], PAD = 48;
    const L = {
        pt: { prev: 'Frase anterior', next: 'Próxima frase', play: 'Ler', pause: 'Pausar', speed: 'Velocidade', smaller: 'Letra menor', bigger: 'Letra maior', exit: 'Sair do teleprompter', swap: 'Trocar o idioma da linha grande', wait: 'traduzindo…', count: (a, b, p) => 'Frase ' + a + ' de ' + b + ' · ' + p + '%', group: 'Teleprompter' },
        en: { prev: 'Previous sentence', next: 'Next sentence', play: 'Play', pause: 'Pause', speed: 'Speed', smaller: 'Smaller text', bigger: 'Bigger text', exit: 'Leave the teleprompter', swap: 'Swap the language of the big line', wait: 'translating…', count: (a, b, p) => 'Sentence ' + a + ' of ' + b + ' · ' + p + '%', group: 'Teleprompter' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const WORD = /[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;

    let size = 1, rate = 1, cur = null, spoken = null, words = [], wi = -1, hidSidebar = false, cumSent = null;
    try { size = Math.min(1.7, Math.max(0.6, Number(localStorage.getItem(KEY)) || 1)); } catch (e) { /* sem storage */ }
    const saveSize = () => { try { localStorage.setItem(KEY, String(size)); } catch (e) { /* ignora */ } };

    /* ------------------------------------------------------------ montagem */
    const root = el('section', 'lb-tele'); root.id = 'lb-tele'; root.hidden = true; root.setAttribute('role', 'region');
    const bar = el('div', 'tl-bar');
    const bExit = el('button', 'tl-b tl-exit', '✕'), bPrev = el('button', 'tl-b', '⏮'), bPlay = el('button', 'tl-b tl-play', '▶'), bNext = el('button', 'tl-b', '⏭');
    const bSwap = el('button', 'tl-b', '⇄'), bRate = el('button', 'tl-b tl-rate', '1×'), bMin = el('button', 'tl-b', 'A−'), bMax = el('button', 'tl-b', 'A+');
    [bExit, bPrev, bPlay, bNext, bSwap, bRate, bMin, bMax].forEach((b) => { b.type = 'button'; });
    const count = el('div', 'tl-count'); count.id = 'lb-tele-count';
    bar.append(bExit, count, bPrev, bPlay, bNext, bSwap, bRate, bMin, bMax);
    const stage = el('div', 'tl-stage'), view = el('div', 'tl-view'), track = el('div', 'tl-track'), sub = el('div', 'tl-sub');
    track.id = 'lb-tele-line'; sub.id = 'lb-tele-sub';
    view.appendChild(track); stage.append(view, sub);
    const prog = el('div', 'tl-prog'), fill = el('div', 'tl-prog-fill'); prog.appendChild(fill);
    root.append(bar, stage, prog);
    document.body.appendChild(root);

    /* ------------------------------------------------------------ texto de uma frase em um idioma */
    function textIn(p, s, lang) {
        const doc = D.doc;
        if (!doc || !doc.paras[p] || doc.paras[p].s[s] == null) return null;
        if (lang === doc.lang) return doc.paras[p].s[s];
        const tr = doc.tr[p];
        return tr && tr[s] != null ? tr[s] : null;
    }
    function neighbour(p, s, d) {
        const doc = D.doc; if (!doc) return null;
        let q = p, k = s + d;
        for (let guard = 0; guard < 4; guard++) {
            if (k < 0) { q--; if (q < 0) return null; k = doc.paras[q].s.length - 1; }
            else if (k >= doc.paras[q].s.length) { q++; if (q >= doc.paras.length) return null; k = 0; }
            if (k >= 0 && doc.paras[q] && doc.paras[q].s[k] != null) return { p: q, s: k };
        }
        return null;
    }
    function position() {
        const doc = D.doc; if (!doc) return null;
        if (D.tts.mark) return { p: D.tts.mark.p, s: D.tts.mark.s };
        if (D.tts.cursor && D.tts.cursor.p < doc.paras.length) return { p: D.tts.cursor.p, s: D.tts.cursor.s };
        return { p: Math.min(D.firstVisible(), doc.paras.length - 1), s: 0 };
    }
    // número da frase no livro (para o contador e a barra de progresso)
    function sentIndex(p, s) {
        const doc = D.doc; if (!doc) return { n: 0, total: 0 };
        if (!cumSent || cumSent.id !== doc.id) { const c = [0]; doc.paras.forEach((q) => c.push(c[c.length - 1] + q.s.length)); cumSent = { id: doc.id, c }; }
        return { n: cumSent.c[Math.min(p, cumSent.c.length - 2)] + s + 1, total: cumSent.c[cumSent.c.length - 1] };
    }

    /* ------------------------------------------------------------ desenho: a linha única, com rolagem até a palavra falada */
    const active = () => D.state.mode === 'tele' && !!D.doc && !D.$('lb-reader').hidden;
    function paintLine(text, lang) {
        track.textContent = ''; words = []; wi = -1; track.dataset.lang = lang || ''; track.lang = lang || '';
        if (text == null) return;
        let pos = 0, m;
        WORD.lastIndex = 0;
        while ((m = WORD.exec(text))) {
            if (m.index > pos) track.append(text.slice(pos, m.index));
            const w = el('span', 'tl-w', m[0]);
            track.append(w); words.push({ el: w, s: m.index, e: m.index + m[0].length });
            pos = m.index + m[0].length;
        }
        if (pos < text.length) track.append(text.slice(pos));
        center(-1);
    }
    // a linha cabe? centraliza inteira. Não cabe? a palavra atual fica no centro, sem deixar sobrar vazio nas pontas
    function center(k) {
        const vw = view.clientWidth, tw = track.scrollWidth;
        let tx;
        if (tw <= vw - 2 * PAD) tx = (vw - tw) / 2;
        else if (k < 0 || !words[k]) tx = PAD;
        else { const w = words[k].el, x = w.offsetLeft + w.offsetWidth / 2; tx = Math.min(PAD, Math.max(vw - tw - PAD, vw / 2 - x)); }
        track.style.transform = 'translateX(' + Math.round(tx) + 'px)';
    }
    function mark(k) {
        if (k === wi) return;
        words.forEach((w, i) => { w.el.classList.toggle('now', i === k); w.el.classList.toggle('past', i < k); });
        wi = k; center(k);
    }
    function render() {
        const doc = D.doc;
        if (!active() || !doc || !cur) return;
        const same = spoken && spoken.p === cur.p && spoken.s === cur.s;
        const lang = same ? spoken.lang : D.state.audioLang;
        let mainText = same ? spoken.text : textIn(cur.p, cur.s, lang), mainLang = lang;
        if (mainText == null) { mainText = textIn(cur.p, cur.s, doc.lang); mainLang = doc.lang; }     // sem tradução ainda: o original
        paintLine(mainText, mainLang);
        const otherLang = D.other(mainLang), subText = textIn(cur.p, cur.s, otherLang);
        sub.textContent = subText != null ? subText : t('wait');
        sub.classList.toggle('wait', subText == null); sub.lang = otherLang;
        if (subText == null) {                                   // traduz só esta frase (rápido); o parágrafo continua atrás
            const want = { p: cur.p, s: cur.s };
            const job = D.trSentence ? D.trSentence(want.p, want.s) : D.ensureTr(want.p);
            job.then((x) => {
                if (!cur || !active() || cur.p !== want.p || cur.s !== want.s) return;
                const y = typeof x === 'string' && x ? x : textIn(want.p, want.s, otherLang);
                if (y) { sub.textContent = y; sub.classList.remove('wait'); }
            });
        }
        const ix = sentIndex(cur.p, cur.s), pct = ix.total ? Math.round(ix.n / ix.total * 100) : 0;
        count.textContent = t('count')(D.nf().format(ix.n), D.nf().format(ix.total), pct);
        fill.style.width = pct + '%';
        root.style.setProperty('--tl-size', String(size));
        labels();
    }
    function labels() {
        bPrev.title = bPrev.ariaLabel = t('prev'); bNext.title = bNext.ariaLabel = t('next');
        const pl = D.tts.playing;
        bPlay.textContent = pl ? '❚❚' : '▶'; bPlay.title = bPlay.ariaLabel = pl ? t('pause') : t('play');
        bRate.textContent = String(rate).replace('.', D.state.readLang === 'en' ? '.' : ',') + '×'; bRate.title = bRate.ariaLabel = t('speed');
        bSwap.title = bSwap.ariaLabel = t('swap'); bMin.title = bMin.ariaLabel = t('smaller'); bMax.title = bMax.ariaLabel = t('bigger'); bExit.title = bExit.ariaLabel = t('exit');
        root.setAttribute('aria-label', t('group'));
    }

    /* ------------------------------------------------------------ ligar e desligar com o modo */
    function sidebar(hide) { if (hide === hidSidebar) return; hidSidebar = hide; D.postParent({ type: 'dd-lab-sidebar', hide }); }
    function sync() {
        const show = active();
        root.hidden = !show;
        sidebar(show);
        if (show) { cur = cur && D.doc.paras[cur.p] ? cur : position(); spoken = null; render(); } else labels();
    }

    /* ------------------------------------------------------------ eventos do núcleo */
    D.on('sentence', (ev) => { cur = { p: ev.p, s: ev.s }; spoken = null; render(); });
    D.on('piece', (ev) => { if (!cur || cur.p !== ev.p || cur.s !== ev.s) cur = { p: ev.p, s: ev.s }; spoken = ev; render(); });
    D.on('wordpos', (ev) => {
        if (!active() || !words.length || !spoken || spoken.text !== ev.text) return;
        let k = 0;
        while (k < words.length - 1 && words[k].e <= ev.ci) k++;
        mark(k);
    });
    D.on('stop', labels); D.on('restartspeech', labels);
    D.on('open', () => { cur = null; spoken = null; setTimeout(sync, 40); });
    D.on('close', () => { cur = null; spoken = null; root.hidden = true; sidebar(false); });
    D.on('mode', () => { cur = null; spoken = null; sync(); });
    D.on('lang', () => { labels(); render(); });
    window.addEventListener('resize', () => { if (!root.hidden) center(wi); });
    setInterval(() => { if (!root.hidden) labels(); }, 600);       // ▶/❚❚ acompanha a narração iniciada pela barra superior do site

    /* ------------------------------------------------------------ controles */
    function go(n) { if (!n) return; cur = { p: n.p, s: n.s }; spoken = null; render(); D.startTts(n.p, n.s); }
    bPrev.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, -1)); });
    bNext.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, 1)); });
    bPlay.addEventListener('click', () => { if (D.tts.playing) D.stopTts(); else if (cur) D.startTts(cur.p, cur.s); labels(); });
    bSwap.addEventListener('click', () => { D.postParent({ type: 'legend-swap' }); });
    bRate.addEventListener('click', () => { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; if (D.setRate) D.setRate(rate); labels(); });
    bMin.addEventListener('click', () => { size = Math.max(0.6, Math.round((size - 0.1) * 10) / 10); saveSize(); render(); center(wi); });
    bMax.addEventListener('click', () => { size = Math.min(1.7, Math.round((size + 0.1) * 10) / 10); saveSize(); render(); center(wi); });
    bExit.addEventListener('click', () => { D.setMode('single'); const s = D.$('lb-read-mode'); if (s) s.value = 'single'; });
    window.addEventListener('keydown', (e) => {
        if (root.hidden || (e.target && /^(input|textarea|select)$/i.test(e.target.tagName))) return;
        if (e.key === ' ') { e.preventDefault(); bPlay.click(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); bPrev.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); bNext.click(); }
        else if (e.key === '+' || e.key === '=') bMax.click();
        else if (e.key === '-') bMin.click();
        else if (e.key === 'Escape') bExit.click();
    });
    // toque numa palavra da linha grande: mesmo cartão do texto (significado, pronúncia, salvar)
    track.addEventListener('click', (e) => {
        if (!cur || !D.doc) return;
        const lang = track.dataset.lang || D.state.audioLang;
        D.emit('tap', { e, sp: track, p: cur.p, s: cur.s, handled: false, wlang: lang, sentHere: track.textContent.trim(), sentOther: sub.classList.contains('wait') ? '' : sub.textContent.trim() });
    });
    labels();
})();
