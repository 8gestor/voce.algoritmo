/*
 * ingles-destaque.js — destaca no texto as palavras incomuns do inglês.
 *
 * Usa a mesma lista local de ingles-nivel.js (window.__ddNivel.isCommon), sem rede. Não altera o DOM do texto:
 * pinta com a CSS Custom Highlight API (CSS.highlights), por isso convive com a marcação da narração.
 * Só age quando o texto na tela está em inglês. Nomes próprios no meio da frase não são destacados.
 * Botão "Destacar" na barra do leitor; a escolha fica em localStorage (dd-ingles-destaque).
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;   // navegador sem suporte: some em silêncio
    const KEY = 'dd-ingles-destaque', NAME = 'dd-incomum';
    const L = {
        pt: { btn: 'Destacar incomuns', tip: 'Destaca no texto as palavras fora da lista das mais comuns do inglês' },
        en: { btn: 'Highlight uncommon', tip: 'Highlights words outside the list of the most common English words' }
    };
    const t = (k) => L[D.state.readLang][k];
    let on = false, timer = null, btn = null;
    try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* sem storage */ }

    function clear() { CSS.highlights.delete(NAME); }

    function paint() {
        clear();
        const host = D.$('lb-text'), nv = window.__ddNivel;
        if (!on || !nv || !D.doc || D.state.readLang !== D.doc.lang || D.doc.lang !== 'en' || !host) return;
        const ranges = [], walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        const re = /[\p{L}][\p{L}'’]*/gu;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const txt = n.nodeValue;
            if (!txt || !txt.trim()) continue;
            const inWord = n.parentNode.classList && n.parentNode.classList.contains('wd');     // palavra isolada pela narração
            let m;
            re.lastIndex = 0;
            while ((m = re.exec(txt))) {
                const w = m[0];
                if (w.length < 3 || /^\p{Lu}/u.test(w) && (inWord || m.index > 0 && !/[.!?…]["”’')\]]*\s*$/.test(txt.slice(0, m.index)))) continue;   // nome próprio
                if (nv.isCommon(w.toLowerCase())) continue;
                const r = new Range();
                r.setStart(n, m.index); r.setEnd(n, m.index + w.length);
                ranges.push(r);
            }
        }
        if (ranges.length) CSS.highlights.set(NAME, new Highlight(...ranges));
    }
    const later = () => { clearTimeout(timer); timer = setTimeout(paint, 120); };

    function label() {
        if (!btn) return;
        btn.textContent = t('btn'); btn.title = t('tip');
        btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on));
    }
    function build() {
        const bar = D.$('lb-study') || document.querySelector('.lb-toolbar');
        if (!bar || btn) return;
        btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'lb-btn'; btn.id = 'lb-highlight';
        btn.addEventListener('click', () => {
            on = !on;
            try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* ignora */ }
            label(); paint();
        });
        bar.appendChild(btn);
        label();
    }

    build();
    // o texto é repintado pelo núcleo (tradução chegando, narração, troca de idioma): reaplica depois de cada mudança
    new MutationObserver(later).observe(D.$('lb-text'), { childList: true, subtree: true });
    D.on('open', () => { label(); later(); });
    D.on('close', clear);
    D.on('lang', () => { label(); later(); });
})();
