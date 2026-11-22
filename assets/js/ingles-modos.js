/*
 * ingles-modos.js — modos de leitura num só seletor, para cada pessoa usar o que rende mais:
 *   single  Coluna única (padrão, linhas de ~70 caracteres)
 *   wide    Coluna larga (cartão mais largo, menos fundo vazio nas laterais)
 *   side    Lado a lado (original numa coluna e tradução na outra; o desenho das colunas fica no núcleo, em paintPara)
 *   focus   Foco com painel (recolhe o menu do site e mostra, ao lado do texto, o que está acontecendo agora)
 *   tele    Teleprompter (uma linha grande que rola com a palavra falada; módulo ingles-teleprompter.js)
 * Painel do foco, de cima para baixo:
 *   AGORA       lendo, ouvindo, os dois ou pausado, e o tempo de cada um (lendo, ouvindo, total) contando desde que o livro abriu
 *   PROGRESSO   palavras lidas, % do texto, palavras ganhas nesta sessão e a próxima marca (10, 25, 50, 75, 90, 100%)
 *   HOJE        cota do plano de 7 dias, se houver
 *   PALAVRAS SALVAS  as do livro aberto
 * Os tempos vêm do log de estudo (ingles-progresso.js: campos rd = lendo, ls = ouvindo, sec = total); a posição vem do
 * evento "progress" do núcleo. A escolha do modo fica em localStorage "dd-ingles-modo". CSS em ingles.css (body.lb-<modo>-open).
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !D.setMode) return;
    const WPM = 150, MARKS = [10, 25, 50, 75, 90, 100], ACTIVE_MS = 30000;
    const L = {
        pt: {
            label: 'Modo de leitura', single: 'Coluna única', wide: 'Coluna larga', side: 'Lado a lado', focus: 'Foco com painel', tele: 'Teleprompter',
            hNow: 'AGORA', hProg: 'PROGRESSO', hToday: 'HOJE', hWords: 'PALAVRAS SALVAS',
            reading: 'Lendo', listening: 'Ouvindo', both: 'Lendo e ouvindo', idle: 'Pausado',
            tRead: 'Lendo', tListen: 'Ouvindo', tTotal: 'Total', sessionTimes: 'nesta sessão',
            words: (a, b) => a + ' de ' + b + ' palavras', sess: (n) => '+' + n + ' palavras nesta sessão', eta: (m) => 'restam ≈ ' + m + ' min',
            next: (mk, rem, m) => 'Próxima marca: ' + mk + '% (faltam ' + rem + ' palavras, ≈ ' + m + ' min)', finished: 'Livro concluído. Parabéns!',
            quota: (n) => 'Cota de hoje: ' + n + ' palavras', done: 'Cota cumprida', left: (n) => 'Faltam ' + n + ' palavras', readToday: (n) => n + ' lidas hoje',
            noPlan: 'Sem plano de 7 dias para este livro. Comece uma semana na Biblioteca.', none: 'Toque numa palavra do texto para salvar.'
        },
        en: {
            label: 'Reading mode', single: 'Single column', wide: 'Wide column', side: 'Side by side', focus: 'Focus with panel', tele: 'Teleprompter',
            hNow: 'NOW', hProg: 'PROGRESS', hToday: 'TODAY', hWords: 'SAVED WORDS',
            reading: 'Reading', listening: 'Listening', both: 'Reading and listening', idle: 'Paused',
            tRead: 'Reading', tListen: 'Listening', tTotal: 'Total', sessionTimes: 'this session',
            words: (a, b) => a + ' of ' + b + ' words', sess: (n) => '+' + n + ' words this session', eta: (m) => '≈ ' + m + ' min left',
            next: (mk, rem, m) => 'Next milestone: ' + mk + '% (' + rem + ' words to go, ≈ ' + m + ' min)', finished: 'Book finished. Well done!',
            quota: (n) => 'Today\'s quota: ' + n + ' words', done: 'Quota done', left: (n) => n + ' words left', readToday: (n) => n + ' read today',
            noPlan: 'No 7-day plan for this book. Start a week in the Library.', none: 'Tap a word in the text to save it.'
        }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const fmt = (n) => D.nf().format(n);
    const clock = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
    const dayKey = () => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const prog = () => (window.__ddProg && window.__ddProg.log && window.__ddProg.log.d[dayKey()]) || {};

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

    // atividade do leitor: lendo = mexeu na página nos últimos 30 s; ouvindo = narração tocando (os dois podem ocorrer juntos)
    let lastAct = 0;
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));

    // por livro aberto: palavras acumuladas por parágrafo e a base da sessão (posição e tempos no momento da abertura)
    let cum = null, words = 0, base = null;
    const readWords = (pos) => (pos >= cum.length - 2 ? words : cum[Math.max(0, Math.min(pos | 0, cum.length - 1))]);
    function prepare() {
        const d = D.doc; cum = null; if (!d) return;
        cum = [0]; d.paras.forEach((p) => cum.push(cum[cum.length - 1] + p.s.join(' ').split(/\s+/).filter(Boolean).length));
        words = cum[cum.length - 1];
        const pg = prog();
        base = { read: readWords(d.pos || 0), rd: pg.rd || 0, ls: pg.ls || 0, sec: pg.sec || 0 };
    }

    // elementos que mudam o tempo todo (atualizados a cada segundo e a cada avanço de leitura, sem refazer o painel)
    let ui = null;
    function tick() {
        if (!ui || !D.doc || !cum || D.state.mode !== 'focus') return;
        const pg = prog(), read = readWords(D.doc.pos || 0), pct = words ? Math.min(100, Math.floor(read / words * 100)) : 0;
        const playing = !!D.tts.playing, reading = Date.now() - lastAct < ACTIVE_MS;
        ui.act.textContent = t(playing && reading ? 'both' : playing ? 'listening' : reading ? 'reading' : 'idle');
        ui.act.className = 'lb-fp-act' + (playing || reading ? ' on' : '');
        ui.rd.textContent = clock((pg.rd || 0) - base.rd); ui.ls.textContent = clock((pg.ls || 0) - base.ls); ui.tot.textContent = clock((pg.sec || 0) - base.sec);
        ui.pct.textContent = pct + '%'; ui.fill.style.width = pct + '%';
        ui.words.textContent = t('words')(fmt(read), fmt(words));
        ui.sess.textContent = t('sess')(fmt(Math.max(0, read - base.read)));
        const mk = MARKS.find((m) => m > pct);
        if (!mk || read >= words) ui.next.textContent = t('finished');
        else { const rem = Math.max(1, Math.ceil(mk / 100 * words) - read); ui.next.textContent = t('next')(mk, fmt(rem), Math.max(1, Math.ceil(rem / WPM))); }
    }

    // partes que pedem leitura no banco (cota de hoje e palavras salvas): refeitas com folga depois dos eventos
    async function paintPanel() {
        const d = D.doc; if (!d || D.state.mode !== 'focus') { panel.textContent = ''; ui = null; return; }
        if (!cum) prepare();
        const s1 = el('section'); s1.append(el('h3', null, t('hNow')));
        const act = el('p', 'lb-fp-act', ''); act.id = 'lb-fp-act';
        const times = el('div', 'lb-fp-times'), mkT = (label) => { const row = el('div'), v = el('b', null, '0:00'); row.append(el('span', null, label), v); times.appendChild(row); return v; };
        const rd = mkT(t('tRead')), ls = mkT(t('tListen')), tot = mkT(t('tTotal'));
        s1.append(act, times, el('small', null, t('sessionTimes')));
        const s2 = el('section'); s2.append(el('h3', null, t('hProg')));
        const pct = el('p', 'lb-fp-big', '0%'); pct.id = 'lb-fp-pct';
        const bar = el('div', 'lb-bar'), fill = el('div', 'lb-bar-fill'); bar.appendChild(fill);
        const wd = el('p', 'lb-fp-line', ''), ss = el('p', 'lb-fp-sess', ''), nx = el('p', 'lb-note lb-fp-next', '');
        wd.id = 'lb-fp-words'; ss.id = 'lb-fp-sess'; nx.id = 'lb-fp-next';
        s2.append(pct, bar, wd, ss, nx);
        const nextUi = { act, rd, ls, tot, pct, fill, words: wd, sess: ss, next: nx };
        const s3 = el('section'); s3.append(el('h3', null, t('hToday')));
        const st = window.__ddWeek && window.__ddWeek.status ? await window.__ddWeek.status(d.id, d.pos || 0) : null;
        if (st) s3.append(el('p', 'lb-fp-line', t('quota')(fmt(st.quota))), el('p', st.readToday >= st.quota ? 'lb-ok' : 'lb-note', st.readToday >= st.quota ? t('done') : t('left')(fmt(st.quota - st.readToday))), el('small', null, t('readToday')(fmt(st.readToday))));
        else s3.append(el('p', 'lb-note', t('noPlan')));
        const s4 = el('section'); s4.append(el('h3', null, t('hWords')));
        let cards = [];
        try { cards = (await D.db.all('vocab')).filter((c) => c.doc === d.title).sort((a, b) => (b.added || 0) - (a.added || 0)); } catch (e) { /* sem banco */ }
        if (!cards.length) s4.append(el('p', 'lb-note', t('none')));
        else { const ul = el('ul', 'lb-fp-words'); cards.slice(0, 12).forEach((c) => ul.appendChild(el('li', null, c.word + (c.tr ? ' = ' + c.tr : '')))); s4.appendChild(ul); }
        if (D.state.mode !== 'focus' || D.doc !== d) return;
        panel.textContent = ''; panel.append(s1, s2, s3, s4); ui = nextUi;   // troca atômica: o painel nunca fica vazio
        tick();
    }
    let panelTimer = null;
    const later = (ms) => { clearTimeout(panelTimer); panelTimer = setTimeout(paintPanel, ms || 400); };

    function refresh() {
        lab.textContent = t('label');
        Array.prototype.forEach.call(sel.options, (o) => { o.textContent = t(o.value); });
        sel.value = D.state.mode;
        if (D.doc) { hs.textContent = D.langName(D.doc.lang).toUpperCase(); ht.textContent = D.langName(D.other(D.doc.lang)).toUpperCase(); }
        sidebar(D.state.mode === 'focus' && !!D.doc);
        paintPanel();
    }
    sel.addEventListener('change', () => { D.setMode(sel.value); refresh(); });
    D.on('open', () => { prepare(); refresh(); });
    D.on('lang', refresh); D.on('mode', refresh);   // o seletor acompanha mudanças feitas de fora (sair do teleprompter, por exemplo)
    D.on('close', () => { sidebar(false); cum = null; ui = null; });
    D.on('progress', () => { tick(); later(1500); });         // posição mudou: números na hora, partes do banco com folga
    D.on('sentence', () => later(1500)); D.on('vocab-saved', () => later(400));
    setInterval(tick, 1000);
    refresh();
})();
