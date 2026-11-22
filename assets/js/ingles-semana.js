/*
 * ingles-semana.js — Livro da semana: o aluno escolhe um livro em inglês da biblioteca e tem 7 dias para terminá-lo.
 * O módulo divide a leitura em cotas diárias, mostra o ritmo (em dia, adiantado, atrasado) e as palavras mais
 * frequentes e difíceis para ver antes de ler. O progresso vem da posição de leitura do próprio documento (meta.pos).
 * Plano em localStorage ("dd-ingles-semana"); o livro fica só no IndexedDB deste aparelho.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const KEY = 'dd-ingles-semana', DAYS = 7, WPM = 150, DAY = 86400000;
    const L = {
        pt: {
            h: 'LIVRO DA SEMANA',
            pick: 'Escolha o livro em inglês da semana. A leitura é dividida em cotas diárias para você terminar em 7 dias.',
            start: 'Começar a semana', none: 'Nenhum texto em inglês na biblioteca ainda. Envie um livro acima (PDF, EPUB ou texto colado).',
            day: (d) => 'Dia ' + d + ' de ' + DAYS, over: 'O prazo de 7 dias terminou',
            progress: (r, w, p) => r + ' de ' + w + ' palavras (' + p + '%)',
            quota: (n, m) => 'Cota de hoje: ' + n + ' palavras (cerca de ' + m + ' min de leitura)',
            doneToday: (r) => 'Cota de hoje cumprida: você leu ' + r + ' palavras hoje.',
            leftToday: (n, r) => 'Faltam ' + n + ' palavras hoje · você leu ' + r + '.',
            onPace: 'No ritmo da semana', behind: (n) => 'Atrasado em ' + n + ' palavras', ahead: (n) => 'Adiantado em ' + n + ' palavras',
            cont: 'Continuar a leitura', end: 'Encerrar a semana', gone: 'O livro da semana não está mais na biblioteca.',
            finished: (d) => 'Livro concluído em ' + d + (d === 1 ? ' dia' : ' dias') + '. Boa leitura!', next: 'Escolher o próximo livro',
            rotH: 'Roteiro de 8 semanas', rotNote: 'Edições de domínio público (Standard Ebooks). Cada livro cabe em uma semana com 50 minutos por dia.', week: 'Semana', words: 'mil palavras', startThis: 'Começar esta semana', preparing: 'Preparando o livro…', reading: 'em andamento', doneTag: 'lido', other: 'Ou escolha outro livro da sua biblioteca (por exemplo, um PDF que você enviou):', rotFail: 'Não consegui carregar o livro: ',
            hard: 'Palavras para ver antes de ler', hardNote: 'As mais frequentes e menos comuns do livro. Toque nas palavras durante a leitura para salvar as que importam.'
        },
        en: {
            h: 'BOOK OF THE WEEK',
            pick: 'Pick this week\'s book in English. The reading is split into daily quotas so you finish in 7 days.',
            start: 'Start the week', none: 'No English text in the library yet. Upload a book above (PDF, EPUB or pasted text).',
            day: (d) => 'Day ' + d + ' of ' + DAYS, over: 'The 7-day deadline has passed',
            progress: (r, w, p) => r + ' of ' + w + ' words (' + p + '%)',
            quota: (n, m) => 'Today\'s quota: ' + n + ' words (about ' + m + ' min of reading)',
            doneToday: (r) => 'Today\'s quota done: you read ' + r + ' words today.',
            leftToday: (n, r) => n + ' words left today · you read ' + r + '.',
            onPace: 'On pace for the week', behind: (n) => 'Behind by ' + n + ' words', ahead: (n) => 'Ahead by ' + n + ' words',
            cont: 'Continue reading', end: 'End the week', gone: 'This week\'s book is no longer in the library.',
            finished: (d) => 'Book finished in ' + d + (d === 1 ? ' day' : ' days') + '. Well read!', next: 'Pick the next book',
            rotH: '8-week reading plan', rotNote: 'Public-domain editions (Standard Ebooks). Each book fits in a week at 50 minutes a day.', week: 'Week', words: 'k words', startThis: 'Start this week', preparing: 'Preparing the book…', reading: 'in progress', doneTag: 'read', other: 'Or pick another book from your library (for example, a PDF you uploaded):', rotFail: 'Could not load the book: ',
            hard: 'Words to preview before reading', hardNote: 'The most frequent and least common words in the book. Tap words while reading to save the ones that matter.'
        }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const btn = (txt, fn, cls) => { const b = el('button', 'lb-btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const dayKey = (d) => { const x = d || new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const dayNum = (k) => { const p = k.split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / DAY); };

    // roteiro de 8 semanas: textos de domínio público em assets/livros/ (Standard Ebooks), um por semana
    const ROTEIRO = [
        { n: 1, slug: 'seneca-brevidade-da-vida', doc: 'Seneca — On the Shortness of Life', w: 10623, pt: ['Sêneca', 'Sobre a Brevidade da Vida'], en: ['Seneca', 'On the Shortness of Life'] },
        { n: 2, slug: 'epicteto-enchiridion', doc: 'Epictetus — The Enchiridion', w: 8181, pt: ['Epicteto', 'Enchiridion (Manual)'], en: ['Epictetus', 'The Enchiridion'] },
        { n: 3, slug: 'seneca-paz-de-espirito', doc: 'Seneca — On Peace of Mind', w: 13257, pt: ['Sêneca', 'Sobre a Paz de Espírito'], en: ['Seneca', 'On Peace of Mind'] },
        { n: 4, slug: 'platao-apologia', doc: 'Plato — Apology', w: 11329, pt: ['Platão', 'Apologia de Sócrates'], en: ['Plato', 'Apology'] },
        { n: 5, slug: 'thoreau-desobediencia-civil', doc: 'Thoreau — On the Duty of Civil Disobedience', w: 9370, pt: ['Thoreau', 'Desobediência Civil'], en: ['Thoreau', 'Civil Disobedience'] },
        { n: 6, slug: 'emerson-self-reliance', doc: 'Emerson — Self-Reliance', w: 10115, pt: ['Emerson', 'Confiança em Si Mesmo (Self-Reliance)'], en: ['Emerson', 'Self-Reliance'] },
        { n: 7, slug: 'tolstoi-confissao', doc: 'Tolstoy — A Confession', w: 25781, pt: ['Tolstói', 'Uma Confissão'], en: ['Tolstoy', 'A Confession'] },
        { n: 8, slug: 'stevenson-jekyll-hyde', doc: 'Stevenson — The Strange Case of Dr Jekyll and Mr Hyde', w: 25609, pt: ['Stevenson', 'O Médico e o Monstro'], en: ['Stevenson', 'Dr Jekyll and Mr Hyde'] }
    ];
    const HKEY = 'dd-ingles-semana-hist';
    const hist = () => { try { const h = JSON.parse(localStorage.getItem(HKEY) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } };
    const addHist = (e) => { try { const h = hist(); h.push(e); localStorage.setItem(HKEY, JSON.stringify(h)); } catch (err) { /* sem storage */ } };
    const loadText = (url) => new Promise((ok, no) => { const x = new XMLHttpRequest(); x.open('GET', url); x.onload = () => ((x.status === 0 || (x.status >= 200 && x.status < 300)) && x.responseText ? ok(x.responseText) : no(new Error('http ' + x.status))); x.onerror = () => no(new Error('rede')); x.send(); });
    // traz o livro do roteiro para a biblioteca (uma vez) e devolve o id do documento
    async function addRoteiro(item, metas) {
        const have = metas.find((m) => m.x && m.x.roteiro === item.slug);
        if (have) return have.id;
        await D.addText(item.doc, await loadText('assets/livros/' + item.slug + '.txt'));
        const d = D.doc; if (!d) throw new Error('não consegui ler o texto');
        d.x = Object.assign({}, d.x, { roteiro: item.slug }); D.saveMeta();
        const id = d.id; D.$('lb-back').click();
        return id;
    }
    const load = () => { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && p.docId ? p : null; } catch (e) { return null; } };
    const store = (p) => { try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch (e) { /* sem storage */ } };

    // palavras funcionais frequentes que a lista de comuns não cobre: não servem como vocabulário a ver antes
    const FUNC = new Set('without given whether although between through during against among within upon whose these those before after again being nothing something anything everything another around because however therefore whatever whoever which would could should might never always almost really rather though still every'.split(' '));
    // palavras acumuladas por parágrafo e as palavras mais frequentes e menos comuns do livro
    const cache = {};
    async function bookInfo(id) {
        if (cache[id]) return cache[id];
        const d = await D.db.get('docs', id); if (!d) return null;
        // as notas de rodapé no fim do livro (a partir de "Notes") não contam como leitura nem entram na cota
        let end = d.paras.length;
        for (let i = Math.floor(d.paras.length * 0.3); i < d.paras.length; i++) { if (/^Notes\b/.test((d.paras[i].s && d.paras[i].s[0]) || '')) { end = i; break; } }
        const cum = [0], freq = {};
        d.paras.slice(0, end).forEach((p) => {
            const text = p.s.join(' ');
            cum.push(cum[cum.length - 1] + text.split(/\s+/).filter(Boolean).length);
            if (p.t !== 'h') (text.toLowerCase().match(/\p{L}[\p{L}'’-]{4,}/gu) || []).forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
        });
        const common = (w) => (window.__ddNivel ? window.__ddNivel.isCommon(w) : false);
        const hard = Object.keys(freq).filter((w) => !common(w) && !FUNC.has(w) && !/['’]/.test(w) && w.length >= 6 && freq[w] >= 2).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b)).slice(0, 15);
        return (cache[id] = { n: end, words: cum[cum.length - 1], cum, hard });
    }
    // chegar ao último parágrafo conta o livro todo como lido
    const readWords = (info, pos) => (pos >= info.n - 1 ? info.words : info.cum[Math.max(0, Math.min(pos | 0, info.n))]);

    /* painel na biblioteca: antes da área de envio */
    const sec = el('section', 'lb-week'); sec.id = 'lb-week';
    const h2 = el('h2'); h2.id = 'lb-h-week';
    const body = el('div', 'lb-week-body'); body.id = 'lb-week-body';
    sec.append(h2, body);
    const anchor = D.$('lb-drop');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor);

    function roteiroList(plan, metas, collapsed) {
        const done = hist(), wrap = collapsed ? el('details', 'lb-rot') : el('div', 'lb-rot'); wrap.id = 'lb-rot';
        const head = collapsed ? el('summary', null, t('rotH')) : el('h3', 'lb-rot-h', t('rotH'));
        wrap.append(head, el('p', 'lb-note', t('rotNote')));
        const msg = el('p', 'lb-note'); msg.id = 'lb-rot-msg';
        ROTEIRO.forEach((it) => {
            const row = el('div', 'lb-rot-item'); row.dataset.slug = it.slug;
            const names = it[D.state.readLang];
            const info = el('div', 'lb-rot-info');
            info.append(el('strong', null, t('week') + ' ' + it.n + ' · ' + names[0] + ' — ' + names[1]), el('small', null, Math.round(it.w / 1000) + ' ' + t('words')));
            const act = el('div', 'lb-rot-act');
            if (done.some((h) => h.slug === it.slug)) { const s = el('span', 'lb-ok', '✓ ' + t('doneTag')); s.className = 'lb-ok lb-rot-done'; act.appendChild(s); }
            else if (plan && plan.slug === it.slug) act.appendChild(el('span', 'lb-rot-now', t('reading')));
            else if (!plan) {
                const b = btn(t('startThis'), async () => {
                    wrap.querySelectorAll('button').forEach((x) => { x.disabled = true; });
                    msg.textContent = t('preparing');
                    try {
                        const id = await addRoteiro(it, metas), m = (await D.db.get('meta', id)), info2 = await bookInfo(id);
                        store({ docId: id, title: m ? m.title : it.doc, slug: it.slug, start: dayKey(), startWords: readWords(info2, (m && m.pos) || 0) });
                        render();
                    } catch (e) { msg.textContent = t('rotFail') + (e && e.message ? e.message : e); wrap.querySelectorAll('button').forEach((x) => { x.disabled = false; }); }
                }, 'lb-primary'); b.id = 'lb-rot-' + it.n; act.appendChild(b);
            }
            row.append(info, act); wrap.appendChild(row);
        });
        wrap.appendChild(msg);
        return wrap;
    }

    let seq = 0;
    async function render() {
        const my = ++seq, fmt = (n) => D.nf().format(n);
        h2.textContent = t('h');
        const plan = load();
        let metas = [];
        try { metas = (await D.db.all('meta')).filter((m) => m.lang === 'en' && !(m.x && m.x.trilha)).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0)); } catch (e) { /* sem banco */ }
        if (my !== seq) return;
        body.textContent = '';
        if (!plan) {
            body.appendChild(el('p', 'lb-note', t('pick')));
            body.appendChild(roteiroList(null, metas, false));
            if (!metas.length) return;
            body.appendChild(el('p', 'lb-note', t('other')));
            const row = el('div', 'lb-week-row');
            const sel = el('select', 'lb-input'); sel.id = 'lb-week-src';
            metas.forEach((m) => { const o = el('option', null, m.title); o.value = m.id; sel.appendChild(o); });
            const go = btn(t('start'), async () => {
                go.disabled = true;
                const m = metas.find((x) => x.id === sel.value), info = await bookInfo(sel.value);
                if (!m || !info) { go.disabled = false; return; }
                store({ docId: m.id, title: m.title, start: dayKey(), startWords: readWords(info, m.pos || 0) });
                render();
            }, 'lb-primary'); go.id = 'lb-week-start';
            row.append(sel, go); body.appendChild(row);
            return;
        }
        const meta = metas.find((m) => m.id === plan.docId) || (await D.db.get('meta', plan.docId));
        const info = meta ? await bookInfo(plan.docId) : null;
        if (my !== seq) return;
        if (!meta || !info) {
            body.appendChild(el('p', 'lb-note', t('gone')));
            body.appendChild(btn(t('next'), () => { store(null); render(); }));
            return;
        }
        const today = dayKey(), idx = Math.max(1, dayNum(today) - dayNum(plan.start) + 1);
        const r = readWords(info, meta.pos || 0), pct = info.words ? Math.min(100, Math.round(r / info.words * 100)) : 0;
        if (!plan.snap || plan.snap.date !== today) { plan.snap = { date: today, words: r }; store(plan); }
        const finished = r >= info.words;
        const title = el('div', 'lb-week-title', plan.title); title.id = 'lb-week-title';
        const sub = el('div', 'lb-week-day', idx > DAYS && !finished ? t('over') : t('day')(Math.min(idx, DAYS))); sub.id = 'lb-week-day';
        body.append(title, sub);
        const bar = el('div', 'lb-bar'), fill = el('div', 'lb-bar-fill'); fill.style.width = pct + '%'; bar.appendChild(fill);
        const prog = el('p', 'lb-week-prog', t('progress')(fmt(r), fmt(info.words), pct)); prog.id = 'lb-week-prog';
        body.append(prog, bar);
        if (finished) {
            const used = Math.min(idx, DAYS) || 1;
            if (!plan.logged) { addHist({ slug: plan.slug || null, docId: plan.docId, title: plan.title, date: today, days: used }); plan.logged = true; store(plan); }
            const fin = el('p', 'lb-ok', t('finished')(used)); fin.id = 'lb-week-fin';
            body.appendChild(fin);
            body.appendChild(btn(t('next'), () => { store(null); render(); }, 'lb-primary'));
            return;
        }
        // cota de hoje: o que falta no início do dia dividido pelos dias que restam (hoje incluído)
        const daysLeft = Math.max(1, DAYS - Math.min(idx, DAYS) + 1);
        const quota = Math.ceil((info.words - plan.snap.words) / daysLeft), readToday = Math.max(0, r - plan.snap.words);
        const q = el('p', 'lb-week-quota', t('quota')(fmt(quota), Math.max(1, Math.ceil(quota / WPM)))); q.id = 'lb-week-quota';
        const st = el('p', readToday >= quota ? 'lb-ok' : 'lb-note', readToday >= quota ? t('doneToday')(fmt(readToday)) : t('leftToday')(fmt(quota - readToday), fmt(readToday))); st.id = 'lb-week-today';
        const expected = plan.startWords + (info.words - plan.startWords) * (Math.min(idx, DAYS) - 1) / DAYS, diff = Math.round(expected - r);
        const pace = el('p', 'lb-week-pace', diff > 50 ? t('behind')(fmt(diff)) : diff < -50 ? t('ahead')(fmt(-diff)) : t('onPace')); pace.id = 'lb-week-pace';
        body.append(q, st, pace);
        const acts = el('div', 'lb-week-row');
        const cont = btn(t('cont'), () => D.openDoc(plan.docId), 'lb-primary'); cont.id = 'lb-week-open';
        const end = btn(t('end'), () => { store(null); render(); }); end.id = 'lb-week-end';
        acts.append(cont, end); body.appendChild(acts);
        if (info.hard.length) {
            const det = el('details', 'lb-week-hard'); det.id = 'lb-week-hard';
            det.appendChild(el('summary', null, t('hard')));
            det.appendChild(el('p', 'lb-note', t('hardNote')));
            const chips = el('div', 'lb-week-chips');
            info.hard.forEach((w) => chips.appendChild(el('span', 'lb-week-chip', w)));
            det.appendChild(chips); body.appendChild(det);
        }
        body.appendChild(roteiroList(plan, metas, true));
    }
    D.on('close', render); D.on('lang', render); D.on('imported', render); D.on('stats-reset', render);
    render();
    // estado do plano para o livro aberto (painel do modo foco): cota de hoje e palavras lidas hoje; null se não há plano para ele
    async function status(docId, pos) {
        const plan = load(); if (!plan || plan.docId !== docId) return null;
        const info = await bookInfo(docId); if (!info) return null;
        const today = dayKey(), idx = Math.max(1, dayNum(today) - dayNum(plan.start) + 1), r = readWords(info, pos || 0);
        if (!plan.snap || plan.snap.date !== today) { plan.snap = { date: today, words: r }; store(plan); }
        const daysLeft = Math.max(1, DAYS - Math.min(idx, DAYS) + 1);
        return { quota: Math.ceil((info.words - plan.snap.words) / daysLeft), readToday: Math.max(0, r - plan.snap.words), read: r, words: info.words, idx };
    }
    window.__ddWeek = { render, bookInfo, readWords, load, store, dayKey, status };
})();
