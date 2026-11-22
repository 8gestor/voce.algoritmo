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
            closeH: 'Fechamento da semana', cDays: 'dias de leitura', cWords: 'palavras lidas', cMin: 'min estudados', cRdLs: 'min lendo / ouvindo', cSaved: 'palavras salvas', cRev: 'revisões feitas', cSess: 'sessões do dia completas', cTexts: 'textos escritos',
            closeAsk: 'Escreva, em inglês, um resumo de cerca de 150 palavras: o argumento central do livro e uma objeção sua.', counter: (n) => n + ' / 150 palavras', closeSave: 'Salvar o fechamento', saveAnyway: 'Salvar assim mesmo',
            needWords: (n) => 'Escreva pelo menos ' + n + ' palavras.', needBook: (n) => 'Use pelo menos ' + n + ' palavras do livro (veja a lista da semana).', needObj: 'Inclua uma objeção sua (however, but, although, I disagree…).',
            closeSaved: (n) => 'Fechamento salvo (' + n + ' palavras).', nextH: 'Próximo livro', nextSuggest: (n, a, ti) => 'Segue no roteiro: semana ' + n + ' · ' + a + ' — ' + ti, nextStart: (n) => 'Começar a semana ' + n, nextOther: 'Escolher outro livro', nextDone: 'Você concluiu os 8 livros do roteiro. Escolha outro livro da sua biblioteca.',
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
            closeH: 'Week closing', cDays: 'reading days', cWords: 'words read', cMin: 'min studied', cRdLs: 'min reading / listening', cSaved: 'words saved', cRev: 'reviews done', cSess: 'full daily sessions', cTexts: 'texts written',
            closeAsk: 'Write a summary of about 150 words in English: the book\'s central argument and an objection of your own.', counter: (n) => n + ' / 150 words', closeSave: 'Save the closing', saveAnyway: 'Save anyway',
            needWords: (n) => 'Write at least ' + n + ' words.', needBook: (n) => 'Use at least ' + n + ' words from the book (see the week\'s list).', needObj: 'Include an objection of your own (however, but, although, I disagree…).',
            closeSaved: (n) => 'Closing saved (' + n + ' words).', nextH: 'Next book', nextSuggest: (n, a, ti) => 'Next in the plan: week ' + n + ' · ' + a + ' — ' + ti, nextStart: (n) => 'Start week ' + n, nextOther: 'Pick another book', nextDone: 'You finished all 8 books of the plan. Pick another book from your library.',
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

    async function startItem(it, metas) {
        const id = await addRoteiro(it, metas), m = await D.db.get('meta', id), info2 = await bookInfo(id);
        store({ docId: id, title: m ? m.title : it.doc, slug: it.slug, start: dayKey(), startWords: readWords(info2, (m && m.pos) || 0) });
    }
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
                        await startItem(it, metas);
                        render();
                    } catch (e) { msg.textContent = t('rotFail') + (e && e.message ? e.message : e); wrap.querySelectorAll('button').forEach((x) => { x.disabled = false; }); }
                }, 'lb-primary'); b.id = 'lb-rot-' + it.n; act.appendChild(b);
            }
            row.append(info, act); wrap.appendChild(row);
        });
        wrap.appendChild(msg);
        return wrap;
    }

    /* fechamento da semana: revisão com números reais, resumo de ~150 palavras com objeção e o próximo livro */
    const OBJ = /\b(however|but|although|though|yet|on the other hand|i disagree|i think|i believe|i would argue|nevertheless)\b/i;
    const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
    const inWeek = (key, plan) => { const n = dayNum(key); return n >= dayNum(plan.start) && n <= dayNum(dayKey()); };
    async function weekStats(plan, days) {
        const log = (window.__ddProg && window.__ddProg.log && window.__ddProg.log.d) || {}, s = { sec: 0, rd: 0, ls: 0, rev: 0 };
        Object.keys(log).forEach((k) => { if (inWeek(k, plan)) { s.sec += log[k].sec || 0; s.rd += log[k].rd || 0; s.ls += log[k].ls || 0; s.rev += log[k].rev || 0; } });
        const since = new Date(plan.start + 'T00:00:00').getTime();
        let saved = 0; try { saved = (await D.db.all('vocab')).filter((c) => c.doc === plan.title && (c.added || 0) >= since).length; } catch (e) { /* sem banco */ }
        const texts = jget('dd-ingles-escrita', []).filter((e) => e.kind !== 'semana' && inWeek(e.date, plan)).length;
        const sess = jget('dd-ingles-dia-hist', []).filter((k) => inWeek(k, plan)).length;
        return { days, sec: s.sec, rd: s.rd, ls: s.ls, rev: s.rev, saved, texts, sess };
    }
    function closingCard(plan, info, metas, st) {
        const card = el('div', 'lb-close'); card.id = 'lb-close';
        card.appendChild(el('h3', 'lb-close-h', t('closeH')));
        const grid = el('div', 'lb-close-grid');
        [[st.days, t('cDays')], [fmtN(info.words), t('cWords')], [Math.round(st.sec / 60), t('cMin')], [Math.round(st.rd / 60) + ' / ' + Math.round(st.ls / 60), t('cRdLs')], [st.saved, t('cSaved')], [st.rev, t('cRev')], [st.sess, t('cSess')], [st.texts, t('cTexts')]].forEach((p) => {
            const c = el('div', 'lb-close-stat'); c.append(el('strong', null, String(p[0])), el('small', null, p[1])); grid.appendChild(c);
        });
        card.appendChild(grid);
        if (plan.closing) {
            const done = el('p', 'lb-ok', t('closeSaved')(plan.closing.words)); done.id = 'lb-close-saved';
            card.append(done, el('blockquote', 'lb-close-quote', plan.closing.text));
        } else {
            card.appendChild(el('p', 'lb-note', t('closeAsk')));
            const ta = el('textarea', 'lb-input'); ta.id = 'lb-close-text'; ta.rows = 7; ta.spellcheck = false;
            const cnt = el('p', 'lb-close-count', t('counter')(0)); cnt.id = 'lb-close-count';
            const out = el('div', 'lb-close-out'); out.id = 'lb-close-out';
            const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
            ta.addEventListener('input', () => { cnt.textContent = t('counter')(words(ta.value)); });
            let tries = 0;
            const save = () => {
                const text = ta.value.trim(), n = words(text);
                plan.closing = { date: dayKey(), words: n, text }; store(plan);
                const h = hist(); for (let i = h.length - 1; i >= 0; i--) { if (h[i].docId === plan.docId) { h[i].closed = dayKey(); h[i].stats = { days: st.days, minutes: Math.round(st.sec / 60), saved: st.saved, rev: st.rev, sess: st.sess }; break; } }
                try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch (e) { /* sem storage */ }
                const entries = jget('dd-ingles-escrita', []); entries.push({ date: dayKey(), docId: plan.docId, title: plan.title, text, words: n, kind: 'semana' });
                try { localStorage.setItem('dd-ingles-escrita', JSON.stringify(entries.slice(-200))); } catch (e) { /* sem storage */ }
                D.emit('written', { words: n });
                render();
            };
            const check = btn(t('closeSave'), () => {
                tries++;
                const text = ta.value, n = words(text), need = Math.min(3, info.hard.length);
                const hits = info.hard.filter((w) => new RegExp('\\b' + w + '\\b', 'i').test(text)).length;
                const msgs = [];
                if (n < 100) msgs.push(t('needWords')(100));
                if (hits < need) msgs.push(t('needBook')(need));
                if (!OBJ.test(text)) msgs.push(t('needObj'));
                out.textContent = '';
                if (!msgs.length) { save(); return; }
                msgs.forEach((m) => out.appendChild(el('p', 'lb-miss', m)));
                if (tries >= 2 && n >= 20 && !out.querySelector('#lb-close-force')) { const f = btn(t('saveAnyway'), save); f.id = 'lb-close-force'; out.appendChild(f); }
            }, 'lb-primary'); check.id = 'lb-close-save';
            card.append(ta, cnt, check, out);
        }
        // próximo livro: o primeiro do roteiro que ainda não foi lido
        const lido = hist(), nxt = ROTEIRO.find((it) => !lido.some((h) => h.slug === it.slug) && it.slug !== plan.slug);
        const nb = el('div', 'lb-close-next'); nb.appendChild(el('h3', 'lb-close-h', t('nextH')));
        const msg = el('p', 'lb-note'); msg.id = 'lb-close-msg';
        if (nxt) {
            const names = nxt[D.state.readLang];
            nb.appendChild(el('p', null, t('nextSuggest')(nxt.n, names[0], names[1])));
            const go = btn(t('nextStart')(nxt.n), async () => {
                go.disabled = true; msg.textContent = t('preparing');
                try { await startItem(nxt, metas); render(); } catch (e) { msg.textContent = t('rotFail') + (e && e.message ? e.message : e); go.disabled = false; }
            }, 'lb-primary'); go.id = 'lb-close-next';
            nb.appendChild(go);
        } else nb.appendChild(el('p', 'lb-note', t('nextDone')));
        const other = btn(t('nextOther'), () => { store(null); render(); }); other.id = 'lb-close-other';
        nb.append(other, msg); card.appendChild(nb);
        return card;
    }
    const fmtN = (n) => D.nf().format(n);

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
            const wst = await weekStats(plan, used);
            if (my !== seq) return;
            body.appendChild(closingCard(plan, info, metas, wst));
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
    // plano de hoje para a sessão do dia: cota, palavras lidas hoje e o plano; null sem plano ou sem o livro
    async function today() {
        const plan = load(); if (!plan) return null;
        const m = await D.db.get('meta', plan.docId); if (!m) return null;
        const st = await status(plan.docId, m.pos || 0); if (!st) return null;
        return Object.assign({ plan }, st);
    }
    window.__ddWeek = { render, bookInfo, readWords, load, store, dayKey, status, today, hist };
})();
