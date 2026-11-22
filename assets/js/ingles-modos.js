/*
 * ingles-modos.js — modos de leitura num só seletor, para cada pessoa usar o que rende mais:
 *   single  Coluna única (padrão, linhas de ~70 caracteres)
 *   wide    Coluna larga (cartão mais largo, menos fundo vazio nas laterais)
 *   side    Lado a lado (original numa coluna e tradução na outra; o desenho das colunas fica no núcleo, em paintPara)
 *   focus   Foco com painel (recolhe o menu do site e mostra, ao lado do texto, a cota de hoje, o progresso e as palavras salvas)
 * A escolha fica em localStorage "dd-ingles-modo". O CSS dos modos está em ingles.css (classes body.lb-<modo>-open).
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !D.setMode) return;
    const L = {
        pt: {
            label: 'Modo de leitura', single: 'Coluna única', wide: 'Coluna larga', side: 'Lado a lado', focus: 'Foco com painel',
            hToday: 'HOJE', hBook: 'ESTE LIVRO', hWords: 'PALAVRAS SALVAS', quota: (n) => 'Cota de hoje: ' + n + ' palavras', done: 'Cota cumprida', left: (n) => 'Faltam ' + n + ' palavras',
            readToday: (n) => n + ' lidas hoje', noPlan: 'Sem plano de 7 dias para este livro. Comece uma semana na Biblioteca.', read: (a, b, p) => a + ' de ' + b + ' palavras (' + p + '%)',
            eta: (m) => 'restam ≈ ' + m + ' min', none: 'Toque numa palavra do texto para salvar.'
        },
        en: {
            label: 'Reading mode', single: 'Single column', wide: 'Wide column', side: 'Side by side', focus: 'Focus with panel',
            hToday: 'TODAY', hBook: 'THIS BOOK', hWords: 'SAVED WORDS', quota: (n) => 'Today\'s quota: ' + n + ' words', done: 'Quota done', left: (n) => n + ' words left',
            readToday: (n) => n + ' read today', noPlan: 'No 7-day plan for this book. Start a week in the Library.', read: (a, b, p) => a + ' of ' + b + ' words (' + p + '%)',
            eta: (m) => '≈ ' + m + ' min left', none: 'Tap a word in the text to save it.'
        }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const fmt = (n) => D.nf().format(n);

    const toolbar = D.$('lb-back') && D.$('lb-back').parentNode, wrap = D.$('lb-wrap'), reader = D.$('lb-reader');
    if (!toolbar || !wrap || !reader) return;

    /* seletor no cabeçalho do leitor (ponta direita, em frente ao botão de voltar) */
    const box = el('label', 'lb-readmode'); box.id = 'lb-readmode';
    const lab = el('span', 'lb-readmode-label'), sel = el('select', 'lb-input'); sel.id = 'lb-read-mode';
    D.MODES.forEach((m) => { const o = el('option'); o.value = m; sel.appendChild(o); });
    box.append(lab, sel); toolbar.appendChild(box);

    /* rótulos das colunas (modo lado a lado) */
    const head = el('div', 'lb-side-head'); head.id = 'lb-side-head';
    const hs = el('span'), ht = el('span'); head.append(hs, ht); wrap.insertBefore(head, wrap.firstChild);

    /* painel do modo foco, ao lado do texto */
    const panel = el('aside', 'lb-focus-panel'); panel.id = 'lb-focus-panel'; panel.setAttribute('aria-label', 'Painel de leitura');
    reader.appendChild(panel);

    let sidebarHidden = false;
    const sidebar = (hide) => { if (hide === sidebarHidden) return; sidebarHidden = hide; D.postParent({ type: 'dd-lab-sidebar', hide }); };

    async function paintPanel() {
        panel.textContent = '';
        const d = D.doc; if (!d || D.state.mode !== 'focus') return;
        // progresso do livro (a posição de leitura é o parágrafo atual)
        let words = 0, read = 0;
        d.paras.forEach((p, i) => { const n = p.s.join(' ').split(/\s+/).filter(Boolean).length; words += n; if (i < (d.pos || 0)) read += n; });
        const pct = words ? Math.min(100, Math.round(read / words * 100)) : 0;
        const sec1 = el('section'); sec1.append(el('h3', null, t('hToday')));
        const st = window.__ddWeek && window.__ddWeek.status ? await window.__ddWeek.status(d.id, d.pos || 0) : null;
        if (st) {
            sec1.append(el('p', 'lb-fp-big', t('quota')(fmt(st.quota))), el('p', st.readToday >= st.quota ? 'lb-ok' : 'lb-note', st.readToday >= st.quota ? t('done') : t('left')(fmt(st.quota - st.readToday))), el('small', null, t('readToday')(fmt(st.readToday))));
        } else sec1.append(el('p', 'lb-note', t('noPlan')));
        const sec2 = el('section'); sec2.append(el('h3', null, t('hBook')));
        const bar = el('div', 'lb-bar'), fill = el('div', 'lb-bar-fill'); fill.style.width = pct + '%'; bar.appendChild(fill);
        sec2.append(el('p', 'lb-fp-line', t('read')(fmt(read), fmt(words), pct)), bar, el('small', null, t('eta')(Math.max(1, Math.ceil((words - read) / 150)))));
        const sec3 = el('section'); sec3.append(el('h3', null, t('hWords')));
        let cards = [];
        try { cards = (await D.db.all('vocab')).filter((c) => c.doc === d.title).sort((a, b) => (b.added || 0) - (a.added || 0)); } catch (e) { /* sem banco */ }
        if (!cards.length) sec3.append(el('p', 'lb-note', t('none')));
        else { const ul = el('ul', 'lb-fp-words'); cards.slice(0, 12).forEach((c) => ul.appendChild(el('li', null, c.word + (c.tr ? ' = ' + c.tr : '')))); sec3.appendChild(ul); }
        if (D.state.mode !== 'focus' || D.doc !== d) return;
        panel.append(sec1, sec2, sec3);
    }
    let panelTimer = null;
    const later = () => { clearTimeout(panelTimer); panelTimer = setTimeout(paintPanel, 400); };

    function refresh() {
        lab.textContent = t('label');
        Array.prototype.forEach.call(sel.options, (o) => { o.textContent = t(o.value); });
        sel.value = D.state.mode;
        if (D.doc) { hs.textContent = D.langName(D.doc.lang).toUpperCase(); ht.textContent = D.langName(D.other(D.doc.lang)).toUpperCase(); }
        sidebar(D.state.mode === 'focus' && !!D.doc);
        paintPanel();
    }
    sel.addEventListener('change', () => { D.setMode(sel.value); refresh(); });
    D.on('open', refresh); D.on('lang', refresh);
    D.on('close', () => sidebar(false));
    D.on('sentence', later); D.on('vocab-saved', later);
    refresh();
})();
