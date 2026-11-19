/*
 * ingles-progresso.js — painel de progresso do Estudo de Inglês: sequência de dias, minutos de estudo,
 * palavras ouvidas, palavras salvas, revisões e ditados. Tudo fica no navegador (localStorage "dd-ingles-log").
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const KEY = 'dd-ingles-log';
    const L = {
        pt: { h: 'SEU PROGRESSO', streak: 'sequência', day: 'dia', days: 'dias', today: 'hoje', min: 'min de estudo', heard: 'palavras ouvidas', saved: 'palavras salvas',
              rev: 'revisões', dict: 'ditados', week: 'Últimos 7 dias (minutos)', total: 'Total', none: 'Comece a ler ou ouvir um texto: seu progresso aparece aqui.',
              wd: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] },
        en: { h: 'YOUR PROGRESS', streak: 'streak', day: 'day', days: 'days', today: 'today', min: 'min studied', heard: 'words heard', saved: 'words saved',
              rev: 'reviews', dict: 'dictations', week: 'Last 7 days (minutes)', total: 'Total', none: 'Start reading or listening to a text: your progress shows up here.',
              wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

    let log = { d: {} };
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.d) log = s; } catch (e) { /* sem storage */ }
    let dirty = false;
    const dayKey = (d) => { const x = d || new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    function save() { if (!dirty) return; dirty = false; try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) { /* ignora */ } }
    function add(field, n, day) {
        const k = day || dayKey();
        const r = log.d[k] || (log.d[k] = { sec: 0, heard: 0, saved: 0, rev: 0, dict: 0 });
        r[field] = (r[field] || 0) + n; dirty = true;
    }
    const active = (r) => r && (r.sec >= 30 || r.heard > 0 || r.rev > 0 || r.saved > 0 || r.dict > 0);
    function streak() {
        let n = 0; const d = new Date();
        if (!active(log.d[dayKey(d)])) d.setDate(d.getDate() - 1);       // hoje ainda vazio não quebra a sequência
        while (active(log.d[dayKey(d)])) { n++; d.setDate(d.getDate() - 1); }
        return n;
    }

    // tempo de estudo: documento aberto, aba visível e atividade recente (ou narração tocando)
    let lastAct = 0;
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
    setInterval(() => {
        if (!D.doc || document.visibilityState !== 'visible') return;
        if (D.tts.playing || Date.now() - lastAct < 60000) add('sec', 1);
    }, 1000);
    setInterval(save, 10000);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);

    D.on('heard', (e) => add('heard', e.words || 0));
    D.on('vocab-saved', () => add('saved', 1));
    D.on('reviewed', () => add('rev', 1));
    D.on('dictation', () => add('dict', 1));

    /* painel na biblioteca */
    const sec = el('section', 'lb-prog'); sec.id = 'lb-prog';
    const h2 = el('h2'); h2.id = 'lb-h-prog';
    const tiles = el('div', 'lb-prog-tiles');
    const chart = el('div', 'lb-prog-chart');
    sec.append(h2, tiles, chart);
    const anchor = D.$('lb-vocab') || D.$('lb-h-engine');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor);

    const fmt = (n) => D.nf().format(n);
    const tile = (big, small) => { const x = el('div', 'lb-tile'); x.append(el('div', 'lb-tile-big', big), el('div', 'lb-tile-small', small)); return x; };
    function render() {
        save();
        h2.textContent = t('h');
        const td = log.d[dayKey()] || { sec: 0, heard: 0, saved: 0, rev: 0, dict: 0 };
        const all = Object.keys(log.d).map((k) => log.d[k]);
        tiles.textContent = ''; chart.textContent = '';
        if (!all.some(active)) { tiles.append(el('p', 'lb-empty', t('none'))); return; }
        const st = streak();
        tiles.append(
            tile(fmt(st), t('streak') + ' (' + (st === 1 ? t('day') : t('days')) + ')'),
            tile(Math.floor(td.sec / 60) + ' ' + t('min').split(' ')[0], t('today') + ' · ' + t('min').split(' ').slice(1).join(' ')),
            tile(fmt(td.heard), t('heard') + ' · ' + t('today')),
            tile(fmt(td.saved), t('saved') + ' · ' + t('today')),
            tile(fmt(td.rev + td.dict), t('rev') + ' + ' + t('dict') + ' · ' + t('today'))
        );
        // 7 dias
        const days = []; const d = new Date(); d.setDate(d.getDate() - 6);
        for (let i = 0; i < 7; i++) { days.push({ wd: t('wd')[d.getDay()], m: Math.round(((log.d[dayKey(d)] || {}).sec || 0) / 60) }); d.setDate(d.getDate() + 1); }
        const max = Math.max(10, ...days.map((x) => x.m));
        chart.append(el('div', 'lb-prog-title', t('week')));
        const bars = el('div', 'lb-prog-bars');
        days.forEach((x) => {
            const col = el('div', 'lb-prog-col');
            const b = el('div', 'lb-prog-bar'); b.style.height = Math.max(2, x.m / max * 64) + 'px'; b.title = x.m + ' min';
            col.append(el('small', null, String(x.m)), b, el('small', null, x.wd));
            bars.appendChild(col);
        });
        chart.append(bars);
        const sum = all.reduce((a, r) => ({ sec: a.sec + (r.sec || 0), heard: a.heard + (r.heard || 0), saved: a.saved + (r.saved || 0) }), { sec: 0, heard: 0, saved: 0 });
        chart.append(el('p', 'lb-note', t('total') + ': ' + fmt(Math.round(sum.sec / 60)) + ' min · ' + fmt(sum.heard) + ' ' + t('heard') + ' · ' + fmt(sum.saved) + ' ' + t('saved')));
    }
    D.on('close', render); D.on('lang', render); D.on('imported', () => {});
    render();
    window.__ddProg = { add, streak, render, dayKey, get log() { return log; } };
})();
