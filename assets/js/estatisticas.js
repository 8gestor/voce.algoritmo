/*
 * estatisticas.js — página final: estatísticas do livro por capítulo.
 *
 * Totais de palavras: assets/js/estatisticas-dados.js (gerado por tools/stats.ps1).
 * Avanço da leitura: localStorage "dd-stats", gravado pelo leitor (assets/js/leitor.js) enquanto
 * você lê. A página se atualiza sozinha. O idioma acompanha o idioma de leitura do leitor.
 */
(function () {
    'use strict';

    const TXT = {
        pt: {
            meta: 'ESTATÍSTICAS | BASE DE DADOS', title: 'Estatísticas do Livro',
            intro: 'Quantas palavras cada capítulo trabalha em cada idioma, quanto tempo leva ler ou ouvir e o quanto você já percorreu. Os totais saem do próprio texto; o seu avanço é registrado neste navegador enquanto você lê, e esta página se atualiza sozinha.',
            words: 'Palavras', read: 'Tempo de leitura', listen: 'Tempo de escuta (1×)', progress: 'Lido', spent: 'Tempo de leitura real', pace: 'Seu ritmo',
            paceUnit: 'palavras/min', paceNone: 'ainda sem dados', ofBook: 'do livro', heardLbl: 'palavras ouvidas',
            chapters: 'Por capítulo', rRead: 'lido', rHeard: 'ouvidas', rSpent: 'tempo gasto', bookWord: 'Livro todo',
            note: 'Tempo de leitura = palavras ÷ ritmo médio (leitura silenciosa: PT 200 e EN 238 palavras por minuto; escuta: 150 e 155 a 1×). São médias; o seu ritmo real aparece em "Seu ritmo". Um trecho do capítulo conta como lido uma única vez por idioma, então reler não aumenta o número, e ir direto ao fim sem ler não conta. Barra cheia = palavras do capítulo; parte escura = quanto você já leu.',
            exportCsv: 'Exportar CSV', reset: 'Zerar estatísticas', confirmReset: 'Apagar todo o seu avanço de leitura registrado neste navegador? Os totais de palavras não mudam.',
            min: 'min', barPt: 'PT', barEn: 'EN', generated: 'Dados de palavras gerados em'
        },
        en: {
            meta: 'STATISTICS | DATABASE', title: 'Book Statistics',
            intro: 'How many words each chapter works in each language, how long it takes to read or listen, and how far you have gone. The totals come from the text itself; your progress is recorded in this browser as you read, and this page updates on its own.',
            words: 'Words', read: 'Reading time', listen: 'Listening time (1×)', progress: 'Read', spent: 'Actual reading time', pace: 'Your pace',
            paceUnit: 'words/min', paceNone: 'no data yet', ofBook: 'of the book', heardLbl: 'words heard',
            chapters: 'By chapter', rRead: 'read', rHeard: 'heard', rSpent: 'time spent', bookWord: 'Whole book',
            note: 'Reading time = words ÷ average pace (silent reading: PT 200 and EN 238 words per minute; listening: 150 and 155 at 1×). These are averages; your real pace shows under "Your pace". A part of a chapter counts as read once per language, so rereading does not raise the number, and jumping to the end without reading does not count. Full bar = chapter words; dark part = how much you have read.',
            exportCsv: 'Export CSV', reset: 'Reset statistics', confirmReset: 'Erase all your reading progress recorded in this browser? Word totals do not change.',
            min: 'min', barPt: 'PT', barEn: 'EN', generated: 'Word data generated on'
        }
    };

    const NB = 50;
    let lang = 'pt';
    try { lang = JSON.parse(localStorage.getItem('dd-settings') || '{}').readLang === 'en' ? 'en' : 'pt'; } catch (e) { /* padrão */ }
    let lastRaw = null;

    const $ = (id) => document.getElementById(id);
    const nf = () => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR');
    const n0 = (x) => nf().format(Math.round(x));
    function fmtMin(m) {
        if (m < 1) return '< 1 ' + TXT[lang].min;
        if (m < 60) return Math.round(m) + ' ' + TXT[lang].min;
        const h = Math.floor(m / 60), r = Math.round(m % 60);
        return h + ' h' + (r ? ' ' + r + ' ' + TXT[lang].min : '');
    }
    function fmtSec(s) { return fmtMin(s / 60); }
    function pct(x) { return Math.round(x * 100) + '%'; }
    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function loadStore() {
        try { lastRaw = localStorage.getItem('dd-stats'); const s = JSON.parse(lastRaw || 'null'); return s && s.ch ? s : { ch: {} }; }
        catch (e) { return { ch: {} }; }
    }
    function frOf(st, l) {
        const s = st && st.b && typeof st.b[l] === 'string' ? st.b[l] : '';
        let c = 0;
        for (let i = 0; i < s.length; i++) if (s[i] === '1') c++;
        return c / NB;
    }

    // Linhas da tabela: um item por capítulo que tem dados de palavras, na ordem do sumário.
    function buildRows(store) {
        const rd = STATS.wpm.read, ls = STATS.wpm.listen, rows = [];
        structure.forEach((item) => {
            const S = STATS.chapters[item.f];
            if (!S) return;
            const st = store.ch[item.f] || {};
            const frPt = frOf(st, 'pt'), frEn = frOf(st, 'en');
            rows.push({
                file: item.f, title: lang === 'en' && TITLES_EN[item.f] ? TITLES_EN[item.f] : item.t, sub: !!item.sub,
                pt: S.pt, en: S.en,
                readPt: S.pt / rd.pt, readEn: S.en / rd.en,
                listenPt: S.ptListen / ls.pt, listenEn: S.enListen / ls.en,
                frPt: frPt, frEn: frEn,
                wordsReadPt: frPt * S.pt, wordsReadEn: frEn * S.en,
                heardPt: (st.ls && st.ls.pt) || 0, heardEn: (st.ls && st.ls.en) || 0,
                sec: st.sec || 0
            });
        });
        return rows;
    }

    function tile(label, big, small) {
        const t = el('div', 'st-tile');
        t.appendChild(el('div', 'st-tile-label', label));
        t.appendChild(el('div', 'st-tile-big', big));
        if (small) t.appendChild(el('div', 'st-tile-small', small));
        return t;
    }

    function render() {
        const L = TXT[lang], store = loadStore(), rows = buildRows(store);
        document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
        $('st-meta').textContent = L.meta;
        $('st-title').textContent = L.title;
        $('st-intro').textContent = L.intro;
        $('st-h-chapters').textContent = L.chapters;
        $('st-note').textContent = L.note + ' ' + L.generated + ' ' + STATS.generated + '.';
        $('st-export').textContent = L.exportCsv;
        $('st-reset').textContent = L.reset;

        const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
        const tPt = sum('pt'), tEn = sum('en');
        const rdPt = sum('wordsReadPt'), rdEn = sum('wordsReadEn');
        const sec = sum('sec'), heardPt = sum('heardPt'), heardEn = sum('heardEn');
        const totalRead = rdPt + rdEn, pace = sec >= 60 && totalRead >= 100 ? totalRead / (sec / 60) : 0;

        const tiles = $('st-tiles');
        tiles.textContent = '';
        tiles.appendChild(tile(L.words, 'PT ' + n0(tPt), 'EN ' + n0(tEn)));
        tiles.appendChild(tile(L.read, '≈ ' + fmtMin(sum('readPt')), 'EN ≈ ' + fmtMin(sum('readEn'))));
        tiles.appendChild(tile(L.listen, '≈ ' + fmtMin(sum('listenPt')), 'EN ≈ ' + fmtMin(sum('listenEn'))));
        tiles.appendChild(tile(L.progress, 'PT ' + pct(tPt ? rdPt / tPt : 0), 'EN ' + pct(tEn ? rdEn / tEn : 0) + ' ' + L.ofBook));
        tiles.appendChild(tile(L.spent, sec ? fmtSec(sec) : '—', n0(heardPt + heardEn) + ' ' + L.heardLbl + ' (PT ' + n0(heardPt) + ' · EN ' + n0(heardEn) + ')'));
        tiles.appendChild(tile(L.pace, pace ? n0(pace) : '—', pace ? L.paceUnit : L.paceNone));

        const list = $('st-list');
        list.textContent = '';
        const maxW = Math.max.apply(null, rows.map((r) => Math.max(r.pt, r.en)).concat([1]));
        rows.forEach((r, i) => {
            const art = el('article', r.sub ? 'st-row st-sub' : 'st-row');
            const head = el('div', 'st-row-head');
            const a = el('a', 'st-title-link', r.title);
            a.href = '#' + r.file.replace('.html', '');
            a.addEventListener('click', (ev) => { ev.preventDefault(); window.parent.postMessage({ type: 'dd-goto', file: r.file }, '*'); });
            head.appendChild(a);
            head.appendChild(el('span', 'st-row-time', '≈ ' + fmtMin(r.readPt) + ' PT · ' + fmtMin(r.readEn) + ' EN'));
            art.appendChild(head);

            [['pt', r.pt, r.frPt, L.barPt], ['en', r.en, r.frEn, L.barEn]].forEach((b) => {
                const line = el('div', 'st-bar-line');
                line.appendChild(el('span', 'st-bar-lang', b[3]));
                const track = el('div', 'st-bar st-bar-' + b[0]);
                track.style.width = Math.max(4, b[1] / maxW * 100) + '%';
                track.setAttribute('role', 'img');
                track.setAttribute('aria-label', b[3] + ' ' + n0(b[1]) + ' ' + L.words.toLowerCase() + ', ' + pct(b[2]) + ' ' + L.rRead);
                const fill = el('div', 'st-bar-fill');
                fill.style.width = (b[2] * 100) + '%';
                track.appendChild(fill);
                line.appendChild(track);
                line.appendChild(el('span', 'st-bar-num', n0(b[1])));
                art.appendChild(line);
            });

            art.appendChild(el('div', 'st-row-meta',
                L.rRead + ' PT ' + pct(r.frPt) + ' · EN ' + pct(r.frEn) + '   |   ' +
                L.rHeard + ' PT ' + n0(r.heardPt) + ' · EN ' + n0(r.heardEn) + '   |   ' +
                L.rSpent + ' ' + (r.sec ? fmtSec(r.sec) : '—')));
            list.appendChild(art);
        });
    }

    function csv() {
        const rows = buildRows(loadStore());
        const head = ['file', 'title', 'words_pt', 'words_en', 'read_min_pt', 'read_min_en', 'listen_min_pt', 'listen_min_en',
            'read_pct_pt', 'read_pct_en', 'heard_words_pt', 'heard_words_en', 'time_spent_sec'];
        const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
        const lines = [head.join(',')];
        rows.forEach((r) => lines.push([r.file, q(r.title), r.pt, r.en, r.readPt.toFixed(1), r.readEn.toFixed(1),
            r.listenPt.toFixed(1), r.listenEn.toFixed(1), (r.frPt * 100).toFixed(0), (r.frEn * 100).toFixed(0),
            r.heardPt, r.heardEn, r.sec].join(',')));
        return lines.join('\r\n');
    }

    $('st-export').addEventListener('click', () => {
        const blob = new Blob(['﻿' + csv()], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'data-double-estatisticas.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('st-reset').addEventListener('click', () => {
        if (!window.confirm(TXT[lang].confirmReset)) return;
        window.parent.postMessage({ type: 'dd-stats-reset' }, '*');
        try { localStorage.removeItem('dd-stats'); } catch (e) { /* ignora */ }
        setTimeout(render, 300);
    });

    // Idioma acompanha o leitor; os dados são relidos a cada 2 s e quando outra aba grava.
    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'readlang' && (d.value === 'pt' || d.value === 'en') && d.value !== lang) { lang = d.value; render(); }
    });
    window.addEventListener('storage', (e) => { if (e.key === 'dd-stats') render(); });
    setInterval(() => {
        let raw = null;
        try { raw = localStorage.getItem('dd-stats'); } catch (e) { /* ignora */ }
        if (raw !== lastRaw) render();
    }, 2000);

    render();
    window.__ddStats = { render: render, rows: () => buildRows(loadStore()) };     // gancho de teste
})();
