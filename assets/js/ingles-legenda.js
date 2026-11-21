/*
 * ingles-legenda.js — legenda fixa embaixo, como legenda de filme, sincronizada com a narração.
 *
 * Mostra a frase que está sendo falada (palavra por palavra), a tradução na linha de baixo e a frase anterior e a
 * próxima esmaecidas. Usa os eventos do núcleo: `sentence` (qual frase), `piece` (texto exato falado e idioma),
 * `wordpos` (posição da palavra falada), `stop`, `open`, `close`. Controles: anterior, ▶/❚❚, próxima, velocidade, A−/A+.
 * Toque na palavra abre o mesmo cartão do texto (ingles-palavras.js, via evento `tap` com o idioma informado).
 * Liga e desliga pelo botão "Legenda" do grupo Estudo; a escolha fica em localStorage (dd-ingles-legenda).
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const KEY = 'dd-ingles-legenda', RATES = [0.75, 1, 1.25, 1.5];
    const L = {
        pt: { btn: 'Legenda', tip: 'Mostra a frase narrada embaixo, como legenda de filme', prev: 'Frase anterior', next: 'Próxima frase', play: 'Ler', pause: 'Pausar', speed: 'Velocidade', smaller: 'Diminuir a letra', bigger: 'Aumentar a letra', off: 'Fechar a legenda', wait: 'traduzindo…', group: 'Legenda' },
        en: { btn: 'Captions', tip: 'Shows the narrated sentence at the bottom, like movie captions', prev: 'Previous sentence', next: 'Next sentence', play: 'Play', pause: 'Pause', speed: 'Speed', smaller: 'Smaller text', bigger: 'Larger text', off: 'Close captions', wait: 'translating…', group: 'Captions' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const WORD = /[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu;

    let on = false, size = 1, rate = 1, cur = null, spoken = null, words = [], wi = -1, btn = null, dock = null, spacer = null;
    try {
        on = localStorage.getItem(KEY) === '1';
        size = Math.min(1.8, Math.max(0.8, Number(localStorage.getItem(KEY + '-size')) || 1));
    } catch (e) { /* sem storage */ }
    const save = () => { try { localStorage.setItem(KEY, on ? '1' : '0'); localStorage.setItem(KEY + '-size', String(size)); } catch (e) { /* ignora */ } };

    /* ------------------------------------------------------------ montagem */
    dock = el('section', 'lg'); dock.id = 'lb-legenda'; dock.hidden = true;
    dock.setAttribute('role', 'region');
    const bar = el('div', 'lg-bar');
    const bPrev = el('button', 'lg-b', '⏮'), bPlay = el('button', 'lg-b lg-play', '▶'), bNext = el('button', 'lg-b', '⏭');
    const bRate = el('button', 'lg-b lg-rate', '1×'), bMin = el('button', 'lg-b', 'A−'), bMax = el('button', 'lg-b', 'A+'), bOff = el('button', 'lg-b lg-off', '✕');
    [bPrev, bPlay, bNext, bRate, bMin, bMax, bOff].forEach((b) => { b.type = 'button'; });
    bar.append(bPrev, bPlay, bNext, el('span', 'lg-gap'), bRate, bMin, bMax, bOff);
    const lnPrev = el('div', 'lg-ctx lg-prev'), main = el('div', 'lg-main'), sub = el('div', 'lg-sub'), lnNext = el('div', 'lg-ctx lg-next');
    main.id = 'lb-leg-main'; sub.id = 'lb-leg-sub';
    dock.append(bar, lnPrev, main, sub, lnNext);
    document.body.appendChild(dock);
    spacer = el('div', 'lg-spacer'); spacer.hidden = true;
    const reader = D.$('lb-reader');
    (reader || document.body).appendChild(spacer);

    function buildButton() {
        const host = D.$('lb-study') || document.querySelector('.lb-toolbar');
        if (!host || btn) return;
        btn = el('button', 'lb-btn', ''); btn.type = 'button'; btn.id = 'lb-legend-btn';
        btn.addEventListener('click', () => { on = !on; save(); sync(); });
        host.appendChild(btn);
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
    const shortLine = (x) => (x == null ? '' : x.length > 140 ? x.slice(0, 137) + '…' : x);

    /* ------------------------------------------------------------ desenho */
    function paintMain(text, lang) {
        main.textContent = ''; words = []; wi = -1; main.dataset.lang = lang || '';
        if (text == null) return;
        let pos = 0, m;
        WORD.lastIndex = 0;
        while ((m = WORD.exec(text))) {
            if (m.index > pos) main.append(text.slice(pos, m.index));
            const w = el('span', 'wd lg-w', m[0]);
            main.append(w); words.push({ el: w, s: m.index, e: m.index + m[0].length });
            pos = m.index + m[0].length;
        }
        if (pos < text.length) main.append(text.slice(pos));
    }
    function render() {
        const doc = D.doc;
        if (!on || !doc || !cur) return;
        const lang = spoken && spoken.p === cur.p && spoken.s === cur.s ? spoken.lang : D.state.audioLang;
        let mainText = spoken && spoken.p === cur.p && spoken.s === cur.s ? spoken.text : textIn(cur.p, cur.s, lang);
        let mainLang = lang;
        if (mainText == null) { mainText = textIn(cur.p, cur.s, doc.lang); mainLang = doc.lang; }     // sem tradução ainda: o original
        paintMain(mainText, mainLang);
        const otherLang = D.other(mainLang), subText = textIn(cur.p, cur.s, otherLang);
        sub.textContent = subText != null ? subText : t('wait');
        sub.classList.toggle('wait', subText == null);
        sub.lang = otherLang;
        if (subText == null && D.ensureTr) D.ensureTr(cur.p).then(() => { if (cur && on) renderSubOnly(); });
        const a = neighbour(cur.p, cur.s, -1), b = neighbour(cur.p, cur.s, 1);
        const ctx = (n) => (n ? shortLine(textIn(n.p, n.s, mainLang) != null ? textIn(n.p, n.s, mainLang) : textIn(n.p, n.s, doc.lang)) : '');
        lnPrev.textContent = ctx(a); lnNext.textContent = ctx(b);
        lnPrev.dataset.p = a ? a.p : ''; lnPrev.dataset.s = a ? a.s : ''; lnNext.dataset.p = b ? b.p : ''; lnNext.dataset.s = b ? b.s : '';
        lnPrev.hidden = !a; lnNext.hidden = !b;
        main.lang = mainLang;
        dock.style.setProperty('--lg-size', String(size));
        labels();
    }
    function renderSubOnly() {
        const doc = D.doc; if (!doc || !cur || !on) return;
        const ml = main.dataset.lang || D.state.audioLang, ol = D.other(ml), x = textIn(cur.p, cur.s, ol);
        if (x != null) { sub.textContent = x; sub.classList.remove('wait'); }
        const a = neighbour(cur.p, cur.s, -1), b = neighbour(cur.p, cur.s, 1);
        const ctx = (n) => (n ? shortLine(textIn(n.p, n.s, ml) != null ? textIn(n.p, n.s, ml) : textIn(n.p, n.s, doc.lang)) : '');
        lnPrev.textContent = ctx(a); lnNext.textContent = ctx(b);
    }
    function labels() {
        bPrev.title = bPrev.ariaLabel = t('prev'); bNext.title = bNext.ariaLabel = t('next');
        const pl = D.tts.playing;
        bPlay.textContent = pl ? '❚❚' : '▶'; bPlay.title = bPlay.ariaLabel = pl ? t('pause') : t('play');
        bRate.textContent = String(rate).replace('.', D.state.readLang === 'en' ? '.' : ',') + '×'; bRate.title = bRate.ariaLabel = t('speed');
        bMin.title = bMin.ariaLabel = t('smaller'); bMax.title = bMax.ariaLabel = t('bigger'); bOff.title = bOff.ariaLabel = t('off');
        dock.setAttribute('aria-label', t('group'));
        D.postParent({ type: 'legend-state', on });
        if (btn) { btn.textContent = t('btn'); btn.title = t('tip'); btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on)); }
    }

    /* ------------------------------------------------------------ estado: ligada, desligada, posição */
    function position() {
        const doc = D.doc; if (!doc) return null;
        if (D.tts.mark) return { p: D.tts.mark.p, s: D.tts.mark.s };
        if (D.tts.cursor && D.tts.cursor.p < doc.paras.length) return { p: D.tts.cursor.p, s: D.tts.cursor.s };
        return { p: Math.min(D.firstVisible(), doc.paras.length - 1), s: 0 };
    }
    function sync() {
        const open = !!D.doc && !D.$('lb-reader').hidden;
        const show = on && open;
        dock.hidden = !show; spacer.hidden = !show;
        if (D.needBoth) D.needBoth(show);
        if (show) { cur = cur && D.doc.paras[cur.p] ? cur : position(); spoken = null; render(); fit(); } else labels();
        labels();
    }
    function fit() { if (!dock.hidden) spacer.style.height = dock.offsetHeight + 'px'; }
    if (window.ResizeObserver) new ResizeObserver(fit).observe(dock);

    /* ------------------------------------------------------------ eventos do núcleo */
    D.on('sentence', (ev) => { cur = { p: ev.p, s: ev.s }; spoken = null; render(); });
    D.on('piece', (ev) => { if (!cur || cur.p !== ev.p || cur.s !== ev.s) cur = { p: ev.p, s: ev.s }; spoken = ev; render(); });
    D.on('wordpos', (ev) => {
        if (!on || !words.length || !spoken || spoken.text !== ev.text) return;
        let k = 0;
        while (k < words.length - 1 && words[k].e <= ev.ci) k++;
        if (k === wi) return;
        if (wi >= 0 && words[wi]) words[wi].el.classList.remove('now');
        wi = k; words[k].el.classList.add('now');
    });
    D.on('stop', () => { labels(); });
    D.on('restartspeech', labels);
    D.on('open', () => { cur = null; spoken = null; setTimeout(sync, 40); });
    D.on('close', () => { cur = null; spoken = null; dock.hidden = true; spacer.hidden = true; if (D.needBoth) D.needBoth(false); });
    D.on('lang', () => { labels(); render(); });
    setInterval(() => { if (!dock.hidden) labels(); }, 600);       // ▶/❚❚ acompanha a narração iniciada pelo texto ou pela barra superior

    /* ------------------------------------------------------------ controles */
    function go(n) { if (!n) return; cur = { p: n.p, s: n.s }; spoken = null; render(); D.startTts(n.p, n.s); }
    bPrev.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, -1)); });
    bNext.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, 1)); });
    bPlay.addEventListener('click', () => { if (D.tts.playing) D.stopTts(); else if (cur) D.startTts(cur.p, cur.s); labels(); });
    bRate.addEventListener('click', () => { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; if (D.setRate) D.setRate(rate); labels(); });
    bMin.addEventListener('click', () => { size = Math.max(0.8, Math.round((size - 0.1) * 10) / 10); save(); render(); fit(); });
    bMax.addEventListener('click', () => { size = Math.min(1.8, Math.round((size + 0.1) * 10) / 10); save(); render(); fit(); });
    bOff.addEventListener('click', () => { on = false; save(); sync(); });
    lnPrev.addEventListener('click', () => { if (lnPrev.dataset.p !== '') go({ p: Number(lnPrev.dataset.p), s: Number(lnPrev.dataset.s) }); });
    lnNext.addEventListener('click', () => { if (lnNext.dataset.p !== '') go({ p: Number(lnNext.dataset.p), s: Number(lnNext.dataset.s) }); });

    // toque numa palavra da legenda: mesmo cartão do texto, informando o idioma e as frases
    main.addEventListener('click', (e) => {
        if (!cur || !D.doc) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && !sel.isCollapsed) return;
        const lang = main.dataset.lang || D.state.audioLang;
        const ev = { e, sp: main, p: cur.p, s: cur.s, handled: false, wlang: lang, sentHere: main.textContent.trim(), sentOther: sub.classList.contains('wait') ? '' : sub.textContent.trim() };
        D.emit('tap', ev);
    });

    window.addEventListener('message', (e) => { if (e.data && e.data.type === 'legend-toggle') { on = !on; save(); sync(); } });
    buildButton();
    labels();
    sync();
})();
