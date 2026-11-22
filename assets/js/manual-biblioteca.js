/*
 * manual-biblioteca.js — página "Manual da Biblioteca" (extra do menu, fora do livro).
 * Recebe do site as mesmas mensagens da Biblioteca: theme, font, typeface, margins, align e readlang (PT/EN, troca o texto do manual).
 */
(function () {
    'use strict';
    const root = document.documentElement;
    const pt = document.getElementById('mn-pt'), en = document.getElementById('mn-en');
    function lang(v) {
        const isEn = v === 'en';
        pt.hidden = isEn; en.hidden = !isEn;
        root.lang = isEn ? 'en' : 'pt-BR';
        document.title = isEn ? 'Library Manual' : 'Manual da Biblioteca';
    }
    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'theme') document.body.className = d.value + '-mode';
        else if (d.type === 'font') root.style.setProperty('--base-size', d.value + 'px');
        else if (d.type === 'typeface') root.dataset.face = d.value;
        else if (d.type === 'margins') root.dataset.margin = d.value;
        else if (d.type === 'align') root.dataset.align = d.value;
        else if (d.type === 'readlang') lang(d.value);
    });
})();
