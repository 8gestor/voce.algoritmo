/*
 * ingles-teleprompter.js — modo de leitura Teleprompter: uma LEGENDA CORRIDA, como as de TV e cinema.
 * - A linha grande mostra a frase no idioma de LEITURA ("Ler") e corre da direita para a esquerda: a frase nova entra pela direita e a palavra
 *   falada fica sempre no ponto de leitura (um pouco à direita do centro, 62% da largura), destacada, em sincronia com a narração.
 * - A narração fala no idioma de ÁUDIO ("Ouvir"), que pode ser outro: ler em português e ouvir em inglês, ou o contrário. Como o texto da
 *   linha e o texto falado têm tamanhos diferentes, a posição da palavra falada é mapeada proporcionalmente (igual ao texto corrido).
 * - Embaixo, em letra menor, a frase no outro idioma (o que se ouve, ou a tradução).
 * - O resto da tela some: o site pai esconde menu, barra de comandos e rodapé (mensagem dd-lab-immersive). Ficam a legenda, os controles
 *   mínimos (sair, frase anterior/próxima, ler/pausar, velocidade, tamanho, Ler PT/EN, Ouvir PT/EN) e o acompanhamento (frase N de M, %).
 * Ao escolher o modo no seletor a narração começa sozinha; ao reabrir um livro já no modo, espera o ▶ (o navegador exige um toque).
 * Eventos do núcleo: `sentence`, `piece` (texto exato falado e idioma), `wordpos`, `stop`, `open`, `close`, `mode`, `lang`.
 * Teclado: Espaço = ler/pausar, ← e → = frase anterior/próxima, + e − = tamanho, Esc = sair. Tamanho em localStorage dd-ingles-tele-size.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !D.setMode) return;
    const KEY = 'dd-ingles-tele-size', RATES = Array.from({ length: 30 }, (_, i) => (i + 1) / 10), READ_AT = 0.62;
    const L = {
        pt: { prev: 'Frase anterior', next: 'Próxima frase', play: 'Ler', pause: 'Pausar', speed: 'Velocidade', smaller: 'Letra menor', bigger: 'Letra maior', exit: 'Sair do teleprompter', wait: 'traduzindo…', read: 'Ler', listen: 'Ouvir', count: (a, b, p) => 'Frase ' + a + ' de ' + b + ' · ' + p + '%', group: 'Teleprompter' },
        en: { prev: 'Previous sentence', next: 'Next sentence', play: 'Play', pause: 'Pause', speed: 'Speed', smaller: 'Smaller text', bigger: 'Bigger text', exit: 'Leave the teleprompter', wait: 'translating…', read: 'Read', listen: 'Listen', count: (a, b, p) => 'Sentence ' + a + ' of ' + b + ' · ' + p + '%', group: 'Teleprompter' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const WORD = /[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;

    let size = 1, rate = 1, cur = null, spoken = null, words = [], wi = -1, immersive = false, cumSent = null, lastBase = '', pendingNext = '', asked = '', nx = null, pf = new Set(), painted = null, lastArr = 0, cpsEst = 0.013, subWords = [], subTxt = '', exK = -1;
    try { size = Math.min(1.7, Math.max(0.6, Number(localStorage.getItem(KEY)) || 1)); } catch (e) { /* sem storage */ }
    const saveSize = () => { try { localStorage.setItem(KEY, String(size)); } catch (e) { /* ignora */ } };

    /* ------------------------------------------------------------ montagem */
    const root = el('section', 'lb-tele'); root.id = 'lb-tele'; root.hidden = true; root.tabIndex = -1; root.setAttribute('role', 'region');
    const bar = el('div', 'tl-bar');
    const bExit = el('button', 'tl-b tl-exit', '✕'), bPrev = el('button', 'tl-b', '⏮'), bPlay = el('button', 'tl-b tl-play', '▶'), bNext = el('button', 'tl-b', '⏭');
    const rateBox = el('div', 'tl-rate-box'), bRd = el('button', 'tl-b', '−'), bRv = el('button', 'tl-b tl-rate', '1×'), bRu = el('button', 'tl-b', '+'), bMin = el('button', 'tl-b', 'A−'), bMax = el('button', 'tl-b', 'A+');
    [bExit, bPrev, bPlay, bNext, bMin, bMax, bRd, bRv, bRu].forEach((b) => { b.type = 'button'; });
    bRv.id = 'lb-tele-rate'; bRd.id = 'lb-tele-rate-down'; bRu.id = 'lb-tele-rate-up'; rateBox.append(bRd, bRv, bRu);
    // idiomas: ler num e ouvir em outro (e o contrário); o site pai guarda a escolha e atualiza os botões LER/OUVIR dele
    const langs = el('div', 'tl-langs'), groups = {};
    [['readLang', 'read'], ['audioLang', 'listen']].forEach((g) => {
        const box = el('div', 'tl-lg'), lab = el('span', 'tl-lab'); box.appendChild(lab); groups[g[0]] = { lab, key: g[1], btns: {} };
        ['pt', 'en'].forEach((v) => {
            const b = el('button', 'tl-b tl-lang', v.toUpperCase()); b.type = 'button'; b.id = 'lb-tele-' + (g[0] === 'readLang' ? 'read' : 'listen') + '-' + v; b.dataset.opt = g[0]; b.dataset.val = v;
            b.addEventListener('click', () => setOpt(g[0], v)); box.appendChild(b); groups[g[0]].btns[v] = b;
        });
        langs.appendChild(box);
    });
    const count = el('div', 'tl-count'); count.id = 'lb-tele-count';
    bar.append(bExit, count, langs, bPrev, bPlay, bNext, rateBox, bMin, bMax);
    const stage = el('div', 'tl-stage'), view = el('div', 'tl-view'), track = el('div', 'tl-track'), head = el('div', 'tl-head'), sub = el('div', 'tl-sub');
    track.id = 'lb-tele-line'; sub.id = 'lb-tele-sub'; head.style.left = (READ_AT * 100) + '%';
    view.append(head, track); stage.append(view, sub);
    const prog = el('div', 'tl-prog'), fill = el('div', 'tl-prog-fill'); prog.appendChild(fill);
    /* ------------------------------------------------------------ painel de andamento: palavras, página, tempo e o que se trabalha agora */
    const PAGE_WORDS = 250, TKEY = 'dd-ingles-tele-tempo';
    const T2 = {
        pt: { words: 'PALAVRAS', page: 'PÁGINA', time: 'TEMPO', now: 'AGORA', left: 'faltam', used: 'usado', avg: 'média para concluir', pageNote: 'página estimada de ~250 palavras', both: 'Lendo e ouvindo', reading: 'Lendo (pausado)', readIn: 'lê em', listenIn: 'ouve em', sent: 'frase' },
        en: { words: 'WORDS', page: 'PAGE', time: 'TIME', now: 'NOW', left: 'left', used: 'used', avg: 'average to finish', pageNote: 'estimated page of ~250 words', both: 'Reading and listening', reading: 'Reading (paused)', readIn: 'reads in', listenIn: 'listens in', sent: 'sentence' }
    };
    const foot = el('div', 'tl-foot'), cells = {};
    [['words', 'lb-tele-words'], ['page', 'lb-tele-page'], ['time', 'lb-tele-time'], ['now', 'lb-tele-now']].forEach((c) => {
        const box = el('div', 'tl-cell'), k = el('span', 'tl-k'), v = el('span', 'tl-v'), v2 = el('span', 'tl-v2'); v.id = c[1]; v2.id = c[1] + '-2';
        box.append(k, v, v2); foot.appendChild(box); cells[c[0]] = { k, v, v2 };
    });
    let wcum = null, rec = { used: 0, listen: 0 }, sess = null, lastAct = Date.now(), clock = null, tickN = 0;
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
    const wcOf = (x) => (x.match(/\S+/g) || []).length;
    function buildWc() {
        const doc = D.doc;
        if (wcum && wcum.id === doc.id) return wcum;
        const c = [0], first = []; let n = 0;
        doc.paras.forEach((q) => { first.push(n); n += q.s.length; q.s.forEach((x) => c.push(c[c.length - 1] + wcOf(x))); });
        wcum = { id: doc.id, c, first };
        return wcum;
    }
    function wordsNow() {
        if (!D.doc || !cur || !D.doc.paras[cur.p]) return { read: 0, total: 0 };
        const w = buildWc(), flat = w.first[cur.p] + cur.s, base = w.c[flat], sw = w.c[flat + 1] - base;
        return { read: Math.round(base + (words.length ? (wi + 1) / words.length : 0) * sw), total: w.c[w.c.length - 1] };
    }
    function fmtClock(ms) { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p2 = (n) => String(n).padStart(2, '0'); return h ? h + ':' + p2(m) + ':' + p2(x) : m + ':' + p2(x); }
    function fmtMin(min) { if (!(min >= 1)) return '<1 min'; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? h + ' h ' + String(m).padStart(2, '0') + ' min' : m + ' min'; }
    function loadRec() {
        try { const all = JSON.parse(localStorage.getItem(TKEY) || '{}'); rec = Object.assign({ used: 0, listen: 0 }, all[D.doc.id] || {}); } catch (e) { rec = { used: 0, listen: 0 }; }
    }
    function saveRec() {
        if (!D.doc) return;
        try { const all = JSON.parse(localStorage.getItem(TKEY) || '{}'); all[D.doc.id] = rec; const ks = Object.keys(all); if (ks.length > 60) delete all[ks[0]]; localStorage.setItem(TKEY, JSON.stringify(all)); } catch (e) { /* sem storage */ }
    }
    function paintStats() {
        if (root.hidden || !D.doc || !cur) return;
        const L2 = T2[D.state.readLang], nf = D.nf(), wn = wordsNow(), left = Math.max(0, wn.total - wn.read);
        const pages = Math.max(1, Math.ceil(wn.total / PAGE_WORDS)), page = Math.min(pages, Math.floor(wn.read / PAGE_WORDS) + 1);
        const adv = wn.read - (sess ? sess.w0 : wn.read), actMin = sess ? sess.act / 60000 : 0;
        const wpm = Math.min(600, Math.max(30, actMin >= 0.5 && adv >= 15 ? adv / actMin : 150 * D.state.rate));       // ritmo medido; no começo, o esperado para a velocidade
        const remMin = left / wpm, usedMin = rec.used / 60000, pct = wn.total ? Math.floor(wn.read / wn.total * 100) : 0;
        cells.words.k.textContent = L2.words; cells.words.v.textContent = nf.format(wn.read) + ' / ' + nf.format(wn.total); cells.words.v2.textContent = pct + '% · ' + L2.left + ' ' + nf.format(left);
        cells.page.k.textContent = L2.page; cells.page.v.textContent = nf.format(page) + ' / ' + nf.format(pages); cells.page.v2.textContent = L2.left + ' ' + nf.format(pages - page); cells.page.v.title = L2.pageNote;
        cells.time.k.textContent = L2.time; cells.time.v.textContent = L2.used + ' ' + fmtClock(rec.used) + ' / ' + L2.avg + ' ' + fmtMin(usedMin + remMin); cells.time.v2.textContent = L2.left + ' ' + fmtMin(remMin) + ' · ' + Math.round(wpm) + ' ' + (D.state.readLang === 'en' ? 'wpm' : 'palavras/min');
        const ix = sentIndex(cur.p, cur.s);
        cells.now.k.textContent = L2.now;
        cells.now.v.textContent = (D.tts.playing ? L2.both : L2.reading) + ' · ' + L2.readIn + ' ' + D.state.readLang.toUpperCase() + ' · ' + L2.listenIn + ' ' + D.state.audioLang.toUpperCase();
        cells.now.v2.textContent = '“' + (D.doc.title || '') + '” · ' + L2.sent + ' ' + nf.format(ix.n) + '/' + nf.format(ix.total);
    }
    function tick() {
        if (root.hidden || document.visibilityState !== 'visible') return;
        if (D.tts.playing || Date.now() - lastAct < 60000) { rec.used += 1000; if (sess) sess.act += 1000; if (D.tts.playing) rec.listen += 1000; }
        if (++tickN % 5 === 0) saveRec();
        paintStats();
    }
    function startClock() { if (clock) return; loadRec(); sess = { w0: wordsNow().read, act: 0 }; clock = setInterval(tick, 1000); }
    function stopClock() { if (clock) { clearInterval(clock); clock = null; saveRec(); sess = null; } }
    window.addEventListener('pagehide', saveRec);
    root.append(bar, stage, foot, prog);
    document.body.appendChild(root);

    function setOpt(key, val) {
        if (window.parent && window.parent !== window) D.postParent({ type: 'dd-set-option', key, value: val });
        else window.postMessage({ type: key === 'readLang' ? 'readlang' : 'audiolang', value: val }, '*');
    }

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
    function sentIndex(p, s) {
        const doc = D.doc; if (!doc) return { n: 0, total: 0 };
        if (!cumSent || cumSent.id !== doc.id) { const c = [0]; doc.paras.forEach((q) => c.push(c[c.length - 1] + q.s.length)); cumSent = { id: doc.id, c }; }
        return { n: cumSent.c[Math.min(p, cumSent.c.length - 2)] + s + 1, total: cumSent.c[cumSent.c.length - 1] };
    }

    /* ------------------------------------------------------------ a linha corrida */
    const active = () => D.state.mode === 'tele' && !!D.doc && !D.$('lb-reader').hidden;
    // x (no track) do centro da palavra k que deve ficar no ponto de leitura; antes da 1ª palavra, o começo da linha fica nele
    function target(k) {
        const vw = view.clientWidth;
        if (!words.length) return vw * READ_AT;
        if (k < 0 || !words[k]) return vw * READ_AT - words[0].el.offsetLeft;
        const c = (i) => words[i].el.offsetLeft + words[i].el.offsetWidth / 2;
        // alvo = meio caminho entre esta palavra e a próxima: durante a fala da palavra a linha desliza até lá, então ela fica centrada em média
        return vw * READ_AT - (words[k + 1] ? (c(k) + c(k + 1)) / 2 : c(k));
    }
    // dur (ms) = deslize contínuo e linear até o alvo, no ritmo da fala; sem dur, a animação padrão (entrada de frase, redimensionar)
    function place(k, dur) {
        track.style.transition = dur ? 'transform ' + dur + 'ms linear' : '';
        track.style.transform = 'translateX(' + Math.round(target(k)) + 'px)';
    }
    // modo: 'slide' = frase nova entra pela direita; 'carry' = a frase que já aparecia à direita como prévia vira a atual e a linha segue contínua; 'stay' = só repinta
    function paintLine(text, lang, mode, nextText) {
        const carry = mode === 'carry' && nx ? new DOMMatrix(getComputedStyle(track).transform).m41 + nx.offsetLeft : null;   // onde a prévia estava na tela
        track.textContent = ''; nx = null; words = []; lastArr = 0; wi = -1; track.dataset.lang = lang || ''; track.lang = lang || ''; track.dataset.text = text == null ? '' : text;
        if (text != null) {
            let pos = 0, m;
            WORD.lastIndex = 0;
            while ((m = WORD.exec(text))) {
                if (m.index > pos) track.append(text.slice(pos, m.index));
                const w = el('span', 'tl-w', m[0]);
                track.append(w); words.push({ el: w, s: m.index, e: m.index + m[0].length });
                pos = m.index + m[0].length;
            }
            if (pos < text.length) track.append(text.slice(pos));
        }
        setPreview(nextText);
        painted = { sig: (text || '') + '|' + (lang || ''), next: nextText || '' };
        if (carry != null) {
            track.style.transition = 'none';
            track.style.transform = 'translateX(' + Math.round(carry) + 'px)';
            void track.offsetWidth;
            track.style.transition = '';
            requestAnimationFrame(() => place(wi));
        } else if (mode === 'slide') {                          // frase nova: entra pela direita e corre até o ponto de leitura
            track.style.transition = 'none';
            track.style.transform = 'translateX(' + view.clientWidth + 'px)';
            void track.offsetWidth;
            track.style.transition = '';
            requestAnimationFrame(() => place(wi));
        } else place(wi);
    }
    // buffer: a frase seguinte já está carregada à direita, esmaecida; só a atual é destacada. Trocar só a prévia não mexe na frase atual.
    function setPreview(nextText) {
        if (nx) { if (nx.previousSibling && nx.previousSibling.className === 'tl-gap') nx.previousSibling.remove(); nx.remove(); nx = null; }
        if (!nextText) return;
        track.append(el('span', 'tl-gap'));
        nx = el('span', 'tl-nx', nextText); nx.dataset.text = nextText; track.append(nx);
    }
    // a linha de baixo (outro idioma) em palavras, para destacar a equivalente da palavra falada ou explorada, em outra cor
    function paintSub(text) {
        sub.textContent = ''; subWords = []; subTxt = text || '';
        let pos = 0, m; WORD.lastIndex = 0;
        while ((m = WORD.exec(subTxt))) {
            if (m.index > pos) sub.append(subTxt.slice(pos, m.index));
            const w = el('span', 'tl-sw', m[0]); sub.append(w); subWords.push({ el: w, s: m.index, e: m.index + m[0].length });
            pos = m.index + m[0].length;
        }
        if (pos < subTxt.length) sub.append(subTxt.slice(pos));
    }
    function markSub(k) {
        subWords.forEach((w) => w.el.classList.remove('now2'));
        if (!subWords.length || sub.classList.contains('wait') || k < 0 || !words[k]) return;
        const txt = track.dataset.text || '', c = D.mapPos ? D.mapPos(txt, words[k].s, subTxt, track.dataset.lang || D.state.readLang) : 0;
        let j = 0; subWords.forEach((w, i) => { if (w.s <= c) j = i; });
        subWords[j].el.classList.add('now2');
    }
    // setas: palavra a palavra, parando a narração (Shift + seta = frase)
    function exploreStep(dir) {
        if (!cur || !words.length) return;
        if (D.tts.playing) D.stopTts();
        let k = (exK >= 0 ? exK : (wi >= 0 ? wi : (dir > 0 ? -1 : words.length))) + dir;
        if (k < 0) { const n = neighbour(cur.p, cur.s, -1); if (!n) k = 0; else { cur = { p: n.p, s: n.s }; spoken = null; render(); k = words.length - 1; } }
        else if (k >= words.length) { const n = neighbour(cur.p, cur.s, 1); if (!n) k = words.length - 1; else { cur = { p: n.p, s: n.s }; spoken = null; render(); k = 0; } }
        exK = Math.max(0, k);
        mark(exK); markSub(exK);
    }
    function mark(k) {
        if (k === wi) return;
        words.forEach((w, i) => { w.el.classList.toggle('now', i === k); w.el.classList.toggle('past', i < k); });
        const prev = wi, now = performance.now();
        wi = k; paintStats();
        if (lastArr && prev >= 0 && k === prev + 1) {                    // aprende o ritmo da voz (caracteres por ms) para o deslize casar com a fala
            const sample = (words[prev].e - words[prev].s + 1) / Math.max(1, now - lastArr);
            cpsEst = 0.6 * cpsEst + 0.4 * Math.min(0.05, Math.max(0.004, sample));
        }
        lastArr = now;
        place(k, Math.min(1400, Math.max(90, (words[k].e - words[k].s + 1) / cpsEst)));
    }
    function render() {
        const doc = D.doc;
        if (!active() || !doc || !cur) return;
        const rl = D.state.readLang;
        let mainText = textIn(cur.p, cur.s, rl), mainLang = rl;
        if (mainText == null) { mainText = textIn(cur.p, cur.s, doc.lang); mainLang = doc.lang; }     // a tradução ainda não chegou: mostra o original
        const base = cur.p + ':' + cur.s + ':' + rl;               // mesma frase e mesmo idioma: só repinta (a tradução chegando não faz a linha entrar de novo)
        const nb = neighbour(cur.p, cur.s, 1), nbText = nb ? textIn(nb.p, nb.s, mainLang) : null;
        const how = base === lastBase ? 'stay' : (lastBase && base === pendingNext ? 'carry' : 'slide');
        if (how === 'stay' && painted && painted.sig === (mainText || '') + '|' + (mainLang || '')) {
            if (painted.next !== (nbText || '')) { setPreview(nbText); painted.next = nbText || ''; }     // só a prévia mudou: a linha atual e o destaque ficam como estão (sem refazer, sem pulo)
        } else paintLine(mainText, mainLang, how, nbText);
        lastBase = base; pendingNext = nb && nbText != null ? nb.p + ':' + nb.s + ':' + rl : '';
        prefetch(nb); if (nb) prefetch(neighbour(nb.p, nb.s, 1));
        const otherLang = D.other(mainLang), subText = textIn(cur.p, cur.s, otherLang);
        paintSub(subText != null ? subText : t('wait'));
        sub.classList.toggle('wait', subText == null); sub.lang = otherLang;
        if (wi >= 0) markSub(wi);
        if ((subText == null || mainLang !== rl) && asked !== base) {     // traduz só esta frase (rápido); uma vez por frase, para não repetir sem tradutor
            asked = base;
            const want = { p: cur.p, s: cur.s };
            const job = D.trSentence ? D.trSentence(want.p, want.s) : D.ensureTr(want.p);
            job.then(() => { if (cur && active() && cur.p === want.p && cur.s === want.s) render(); });
        }
        const ix = sentIndex(cur.p, cur.s), pct = ix.total ? Math.round(ix.n / ix.total * 100) : 0;
        count.textContent = t('count')(D.nf().format(ix.n), D.nf().format(ix.total), pct);
        fill.style.width = pct + '%';
        paintStats();
        root.style.setProperty('--tl-size', String(size));
        labels();
    }
    // buffer à frente: traduz as próximas frases enquanto a atual é lida, para a prévia e a troca nunca esperarem a tradução
    function prefetch(n) {
        if (!n || !D.doc || !D.trSentence) return;
        const key = D.doc.id + ':' + n.p + ':' + n.s;
        if (pf.has(key) || (textIn(n.p, n.s, 'pt') != null && textIn(n.p, n.s, 'en') != null)) return;
        pf.add(key);
        D.trSentence(n.p, n.s).then(() => { if (cur && active()) { const a = neighbour(cur.p, cur.s, 1); if (a && a.p === n.p && a.s === n.s) render(); } });
    }
    function labels() {
        bPrev.title = bPrev.ariaLabel = t('prev'); bNext.title = bNext.ariaLabel = t('next');
        const pl = D.tts.playing;
        bPlay.textContent = pl ? '❚❚' : '▶'; bPlay.title = bPlay.ariaLabel = pl ? t('pause') : t('play');
        { const r = Math.round(D.state.rate * 100) / 100; bRv.textContent = String(r).replace('.', D.state.readLang === 'en' ? '.' : ',') + '×'; bRv.title = bRv.ariaLabel = t('speed'); bRd.title = bRd.ariaLabel = t('speed') + ' −0,1'; bRu.title = bRu.ariaLabel = t('speed') + ' +0,1'; }
        bMin.title = bMin.ariaLabel = t('smaller'); bMax.title = bMax.ariaLabel = t('bigger'); bExit.title = bExit.ariaLabel = t('exit');
        Object.keys(groups).forEach((k) => {
            const g = groups[k]; g.lab.textContent = t(g.key);
            Object.keys(g.btns).forEach((v) => { const on = D.state[k] === v; g.btns[v].classList.toggle('on', on); g.btns[v].setAttribute('aria-pressed', on ? 'true' : 'false'); });
        });
        root.setAttribute('aria-label', t('group'));
    }

    /* ------------------------------------------------------------ ligar e desligar com o modo (o resto da tela some) */
    function setImmersive(on) { if (on === immersive) return; immersive = on; D.postParent({ type: 'dd-lab-immersive', on }); }
    function sync(autoplay) {
        const show = active();
        root.hidden = !show;
        setImmersive(show);
        if (show) {
            cur = cur && D.doc.paras[cur.p] ? cur : position(); spoken = null; lastBase = ''; painted = null; render();
            try { root.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
            startClock(); paintStats();
            if (autoplay && !D.tts.playing && cur) setTimeout(() => { if (active() && !D.tts.playing) D.startTts(cur.p, cur.s); }, 150);
        } else { stopClock(); labels(); }
    }

    /* ------------------------------------------------------------ eventos do núcleo */
    D.on('sentence', (ev) => { cur = { p: ev.p, s: ev.s }; spoken = null; render(); });
    D.on('piece', (ev) => { exK = -1; if (!cur || cur.p !== ev.p || cur.s !== ev.s) { cur = { p: ev.p, s: ev.s }; render(); } spoken = ev; });
    D.on('wordpos', (ev) => {
        if (!active() || !words.length || !spoken || spoken.text !== ev.text) return;
        const text = track.dataset.text || '';
        const pos = text === ev.text ? ev.ci : (D.mapPos ? D.mapPos(ev.text, ev.ci, text, ev.lang || D.state.audioLang) : (ev.ci / Math.max(1, ev.len || ev.text.length)) * text.length);   // outro idioma: alinhamento palavra a palavra
        let k = 0;
        while (k < words.length - 1 && words[k].e <= pos) k++;
        mark(k); markSub(k);
    });
    D.on('stop', labels); D.on('restartspeech', labels);
    D.on('open', () => { cur = null; spoken = null; setTimeout(() => sync(false), 40); });
    D.on('close', () => { stopClock(); cur = null; spoken = null; pf.clear(); pendingNext = ''; painted = null; root.hidden = true; setImmersive(false); });
    D.on('mode', () => { cur = null; spoken = null; sync(true); });
    D.on('lang', () => { asked = ''; pf.clear(); labels(); render(); });
    window.addEventListener('resize', () => { if (!root.hidden) place(wi); });
    D.on('step', (ev) => { if (root.hidden) return; if (ev.word) exploreStep(ev.d); else (ev.d > 0 ? bNext : bPrev).click(); });      // seta do site (quando o foco está fora da legenda)
    D.on('playstate', () => { if (!root.hidden) labels(); });      // ▶/❚❚ acompanha a narração iniciada de fora (sem sondar a cada instante)

    /* ------------------------------------------------------------ controles */
    function go(n) { if (!n) return; cur = { p: n.p, s: n.s }; spoken = null; render(); D.startTts(n.p, n.s); }
    bPrev.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, -1)); });
    bNext.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, 1)); });
    bPlay.addEventListener('click', () => { if (D.tts.playing) D.stopTts(); else if (cur) D.startTts(cur.p, cur.s); labels(); });
    // velocidade de 0,1 em 0,1, de 0,1x a 3x (botões − e +, ↑ e ↓; clicar no valor volta a 1x)
    const setR = (v) => { v = Math.min(3, Math.max(0.1, Math.round(v * 10) / 10)); if (D.setRate) D.setRate(v); labels(); };
    bRd.addEventListener('click', () => setR(D.state.rate - 0.1));
    bRu.addEventListener('click', () => setR(D.state.rate + 0.1));
    bRv.addEventListener('click', () => setR(1));
    bMin.addEventListener('click', () => { size = Math.max(0.6, Math.round((size - 0.1) * 10) / 10); saveSize(); render(); place(wi); });
    bMax.addEventListener('click', () => { size = Math.min(1.7, Math.round((size + 0.1) * 10) / 10); saveSize(); render(); place(wi); });
    bExit.addEventListener('click', () => { D.stopTts(); D.setMode('single'); });
    window.addEventListener('keydown', (e) => {
        if (root.hidden || (e.target && /^(input|textarea|select)$/i.test(e.target.tagName))) return;
        if (e.key === ' ') { e.preventDefault(); bPlay.click(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); if (e.shiftKey) bPrev.click(); else exploreStep(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) bNext.click(); else exploreStep(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setR(D.state.rate + 0.1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setR(D.state.rate - 0.1); }
        else if (e.key === 'F11') { e.preventDefault(); D.postParent({ type: 'dd-fullscreen' }); }
        else if (e.key === '+' || e.key === '=') bMax.click();
        else if (e.key === '-') bMin.click();
        else if (e.key === 'Escape') bExit.click();
    });
    // toque numa palavra da linha: mesmo cartão do texto (significado, pronúncia, salvar)
    track.addEventListener('click', (e) => {
        if (!cur || !D.doc) return;
        D.emit('tap', { e, sp: track, p: cur.p, s: cur.s, handled: false, wlang: track.dataset.lang || D.state.readLang, sentHere: (track.dataset.text || '').trim(), sentOther: sub.classList.contains('wait') ? '' : sub.textContent.trim() });
    });
    labels();
})();
