/*
 * ingles-explorar.js — explorar o texto palavra a palavra com as setas ← → (Shift + seta = frase a frase).
 *
 * A palavra explorada recebe o destaque principal no texto (a mesma marca da palavra sincronizada) e a palavra equivalente no outro idioma
 * recebe um destaque de outra cor: no modo lado a lado, na coluna da tradução; nos demais modos, numa etiqueta logo abaixo da palavra
 * (ver `DDLab.mapPos`, em ingles-alinhar.js, que liga as duas palavras mesmo quando a ordem muda). Ajuda a entender palavra por palavra.
 * Tocando, a seta pausa a narração e passa a explorar; ▶ volta a narrar dali. O teleprompter e a legenda tratam a mesma ideia nas suas linhas
 * (evento `explore` / teclado próprio). Atravessar o fim de uma frase segue para a primeira palavra da próxima.
 * API: DDLab.explore = { step(dir), counter(p, s, texto, idioma, charIndex) -> { text, lang, s, e } | null }
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !D.setMark || !D.setWordAt) return;
    const WORD = /[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;
    const words = (text) => { const out = []; let m; WORD.lastIndex = 0; while ((m = WORD.exec(text))) out.push({ s: m.index, e: m.index + m[0].length }); return out; };
    let ex = null, gloss = null;

    function textIn(p, s, lang) {
        const doc = D.doc;
        if (!doc || !doc.paras[p] || doc.paras[p].s[s] == null) return null;
        if (lang === doc.lang) return doc.paras[p].s[s];
        const tr = doc.tr[p];
        return tr && tr[s] != null ? tr[s] : null;
    }
    // o texto como aparece na tela (idioma de leitura; se a tradução ainda não chegou, o original)
    function shown(p, s) {
        const rl = D.state.readLang, t = textIn(p, s, rl);
        return t != null ? { text: t, lang: rl } : { text: textIn(p, s, D.doc.lang), lang: D.doc.lang };
    }
    function neighbour(p, s, d) {
        const doc = D.doc; let q = p, k = s + d;
        for (let guard = 0; guard < 4; guard++) {
            if (k < 0) { q--; if (q < 0) return null; k = doc.paras[q].s.length - 1; }
            else if (k >= doc.paras[q].s.length) { q++; if (q >= doc.paras.length) return null; k = 0; }
            if (k >= 0 && doc.paras[q] && doc.paras[q].s[k] != null) return { p: q, s: k };
        }
        return null;
    }
    // a palavra equivalente no outro idioma
    function counter(p, s, text, lang, ci) {
        const ol = D.other(lang), ot = textIn(p, s, ol);
        if (ot == null || !text) return null;
        const ws = words(ot); if (!ws.length) return null;
        const pos = D.mapPos ? D.mapPos(text, ci, ot, lang) : Math.round(ci / Math.max(1, text.length) * ot.length);
        let w = ws[0]; ws.forEach((x) => { if (x.s <= pos) w = x; });
        return { text: ot, lang: ol, s: w.s, e: w.e };
    }

    /* ------------------------------------------------------------ a palavra equivalente na tela */
    function clearCounter() {
        document.querySelectorAll('.lb-t .wd2').forEach((n) => { const par = n.parentNode; if (par && par._ot != null) { par.textContent = par._ot; par._ot = null; } });
        if (gloss) gloss.hidden = true;
    }
    function paintCounter(p, s, c) {
        clearCounter();
        if (!c) return;
        const pe = D.paraEl(p), tsp = pe && pe.querySelector('.lb-t[data-k="' + s + '"]');
        if (tsp) {                                                   // lado a lado: marca a palavra na coluna da tradução
            tsp._ot = tsp.textContent; tsp.textContent = '';
            const tx = tsp._ot; let last = 0;
            words(tx).forEach((w) => { if (w.s > last) tsp.append(tx.slice(last, w.s)); const n = document.createElement('span'); n.className = 'wd2' + (w.s === c.s ? ' now2' : ''); n.textContent = tx.slice(w.s, w.e); tsp.append(n); last = w.e; });
            if (last < tx.length) tsp.append(tx.slice(last));
            return;
        }
        const now = document.querySelector('#lb-text .wd.now'), wrap = D.$('lb-wrap');
        if (!now || !wrap) return;
        if (!gloss) { gloss = document.createElement('div'); gloss.id = 'lb-gloss'; gloss.className = 'lb-gloss'; wrap.appendChild(gloss); }
        const wr = wrap.getBoundingClientRect(), r = now.getBoundingClientRect();
        gloss.textContent = c.text.slice(c.s, c.e); gloss.lang = c.lang; gloss.hidden = false;
        gloss.style.top = Math.round(r.bottom - wr.top + 3) + 'px';
        gloss.style.left = Math.max(0, Math.round(r.left - wr.left)) + 'px';
    }

    /* ------------------------------------------------------------ explorar */
    function apply() {
        const { p, s, k } = ex, d = shown(p, s), ws = words(d.text), w = ws[k];
        if (!w) return;
        if (!D.tts.mark || D.tts.mark.p !== p || D.tts.mark.s !== s) D.setMark(p, s);
        D.tts.cursor = { p, s };
        D.setWordAt(w.s, d.text.length, d.text, d.lang);                        // destaque principal (a mesma marca da palavra falada)
        const c = counter(p, s, d.text, d.lang, w.s);
        paintCounter(p, s, c);
        if (!c && D.trSentence) D.trSentence(p, s).then(() => { if (ex && ex.p === p && ex.s === s && ex.k === k) apply(); });   // traduz esta frase e repinta
        D.emit('explore', { p, s, k, ci: w.s, text: d.text, lang: d.lang });
    }
    function step(dir) {
        if (!D.doc) return;
        if (D.tts.playing) D.stopTts();                                          // a seta pausa e passa a explorar
        let cur = ex;
        if (!cur) { const m = D.tts.mark || (D.tts.cursor && D.tts.cursor.p < D.doc.paras.length ? D.tts.cursor : null) || { p: Math.min(D.firstVisible(), D.doc.paras.length - 1), s: 0 }; cur = { p: m.p, s: m.s, k: dir > 0 ? -1 : 1e9 }; }
        let { p, s, k } = cur, d = shown(p, s), ws = words(d.text);
        k = Math.min(k, ws.length) + dir;
        if (k < 0) { const n = neighbour(p, s, -1); if (!n) k = 0; else { p = n.p; s = n.s; ws = words(shown(p, s).text); k = ws.length - 1; } }
        else if (k >= ws.length) { const n = neighbour(p, s, 1); if (!n) k = ws.length - 1; else { p = n.p; s = n.s; k = 0; } }
        ex = { p, s, k: Math.max(0, k) };
        apply();
    }
    D.explore = { step, counter };
    const reset = () => { ex = null; clearCounter(); };
    D.on('sentence', (ev) => { if (ex && (ev.p !== ex.p || ev.s !== ex.s)) { ex = null; clearCounter(); } });      // a marca mudou por outro caminho (Shift + seta, narração)
    D.on('piece', reset); D.on('close', reset); D.on('mode', reset); D.on('lang', () => { if (ex) apply(); });
})();
