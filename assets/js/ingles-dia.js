/*
 * ingles-dia.js — Sessão do dia (50 min): quatro blocos guiados a partir do plano do Livro da semana.
 *   Leitura (25 min)      cota de palavras do dia, lida no livro da semana
 *   Vocabulário (10 min)  revisão das palavras salvas que vencem hoje
 *   Shadowing (8 min)     ouvir e repetir o trecho (abre o livro no treino de shadowing)
 *   Escrita (7 min)       resumo em 2 frases e uma objeção, com checagem por regras; o texto fica guardado
 * Cada bloco fecha sozinho quando a meta é cumprida (ou pelo botão "Marcar como feito"). Tudo fica no navegador:
 * estado do dia em "dd-ingles-dia", dias completos em "dd-ingles-dia-hist", textos escritos em "dd-ingles-escrita".
 * Depende de ingles-semana.js (plano e cota) e ingles-progresso.js (minutos, revisões e palavras ouvidas de hoje).
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const KD = 'dd-ingles-dia', KH = 'dd-ingles-dia-hist', KW = 'dd-ingles-escrita';
    const BLOCKS = [{ id: 'read', min: 25 }, { id: 'vocab', min: 10 }, { id: 'shadow', min: 8 }, { id: 'write', min: 7 }];
    const TOTAL = BLOCKS.reduce((a, b) => a + b.min, 0), HEARD_GOAL = 100, VOCAB_MAX = 15;
    const L = {
        pt: {
            h: 'SESSÃO DO DIA', total: (n) => TOTAL + ' minutos em 4 blocos · hoje você estudou ' + n + ' min',
            noPlan: 'A sessão do dia nasce do plano da semana. Comece uma semana acima para montar a sua.',
            read: 'Leitura densa', vocab: 'Vocabulário em contexto', shadow: 'Shadowing', write: 'Escrita',
            readGoal: (a, b) => 'Cota de hoje: ' + a + ' de ' + b + ' palavras', vocabGoal: (a, b) => 'Revisões: ' + a + ' de ' + b, vocabNone: 'Nenhuma palavra vence hoje. Bloco feito.',
            shadowGoal: (a) => 'Palavras ouvidas e repetidas hoje: ' + a + ' de ' + HEARD_GOAL, writeGoal: 'Resuma o trecho em 2 frases e acrescente uma objeção sua, em inglês.',
            open: 'Abrir a leitura', review: 'Revisar agora', shadowBtn: 'Abrir no shadowing', mark: 'Marcar como feito', unmark: 'Desfazer',
            done: 'feito', todo: 'a fazer', min: 'min', check: 'Verificar e salvar', saveAnyway: 'Salvar assim mesmo', placeholder: 'Escreva em inglês aqui',
            ok: 'Texto salvo.', needWords: (n) => 'Escreva pelo menos ' + n + ' palavras.', needBook: 'Use alguma palavra do livro (veja a lista de palavras da semana).', needObj: 'Inclua uma objeção sua (however, but, although, I disagree…).',
            allDone: 'Sessão do dia concluída. Bom trabalho.', streak: (n) => n + (n === 1 ? ' dia seguido' : ' dias seguidos') + ' com a sessão completa', journal: 'Seus textos', empty: 'Ainda não há textos salvos.'
        },
        en: {
            h: 'TODAY\'S SESSION', total: (n) => TOTAL + ' minutes in 4 blocks · you studied ' + n + ' min today',
            noPlan: 'Today\'s session comes from the weekly plan. Start a week above to build yours.',
            read: 'Close reading', vocab: 'Vocabulary in context', shadow: 'Shadowing', write: 'Writing',
            readGoal: (a, b) => 'Today\'s quota: ' + a + ' of ' + b + ' words', vocabGoal: (a, b) => 'Reviews: ' + a + ' of ' + b, vocabNone: 'No words due today. Block done.',
            shadowGoal: (a) => 'Words heard and repeated today: ' + a + ' of ' + HEARD_GOAL, writeGoal: 'Summarize the passage in 2 sentences and add an objection of your own, in English.',
            open: 'Open the reading', review: 'Review now', shadowBtn: 'Open in shadowing', mark: 'Mark as done', unmark: 'Undo',
            done: 'done', todo: 'to do', min: 'min', check: 'Check and save', saveAnyway: 'Save anyway', placeholder: 'Write in English here',
            ok: 'Text saved.', needWords: (n) => 'Write at least ' + n + ' words.', needBook: 'Use a word from the book (see the week\'s word list).', needObj: 'Include an objection of your own (however, but, although, I disagree…).',
            allDone: 'Today\'s session is complete. Well done.', streak: (n) => n + (n === 1 ? ' day in a row' : ' days in a row') + ' with the full session', journal: 'Your texts', empty: 'No saved texts yet.'
        }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const btn = (txt, fn, cls) => { const b = el('button', 'lb-btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const dayKey = (d) => { const x = d || new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const dayNum = (k) => { const p = k.split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000); };
    const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
    const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem storage */ } };
    const fmt = (n) => D.nf().format(n);

    // objeções e conectivos aceitos na escrita (regras simples, sem IA)
    const OBJ = /\b(however|but|although|though|yet|on the other hand|i disagree|i think|i believe|i would argue|nevertheless)\b/i;
    const prog = () => (window.__ddProg && window.__ddProg.log && window.__ddProg.log.d[dayKey()]) || { sec: 0, heard: 0, rev: 0 };

    /* painel na biblioteca, depois do Livro da semana */
    const sec = el('section', 'lb-sess'); sec.id = 'lb-sess';
    const h2 = el('h2'); h2.id = 'lb-h-sess';
    const body = el('div', 'lb-sess-body'); body.id = 'lb-sess-body';
    sec.append(h2, body);
    const anchor = D.$('lb-drop');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor);

    function streak(hist) {
        const set = new Set(hist); let n = 0, k = dayNum(dayKey());
        if (!set.has(dayKey())) k -= 1;                       // hoje ainda aberto não quebra a sequência
        const keyOf = (num) => dayKey(new Date(num * 86400000 + 12 * 3600000));
        while (set.has(keyOf(k))) { n++; k--; }
        return n;
    }
    async function dueCount() { try { return (await D.db.all('vocab')).filter((c) => c.due <= Date.now()).length; } catch (e) { return 0; } }

    let seq = 0;
    async function render() {
        const my = ++seq;
        h2.textContent = t('h');
        const td = window.__ddWeek && window.__ddWeek.today ? await window.__ddWeek.today() : null;
        const info = td ? await window.__ddWeek.bookInfo(td.plan.docId) : null;
        if (my !== seq) return;
        body.textContent = '';
        if (!td || !info) { body.appendChild(el('p', 'lb-note', t('noPlan'))); return; }
        const today = dayKey();
        let day = jget(KD, null);
        if (!day || day.date !== today) { day = { date: today, manual: {}, vocabTarget: Math.min(VOCAB_MAX, await dueCount()), written: false }; jset(KD, day); }
        const pg = prog(), fm = (n) => fmt(Math.round(n));
        // estado de cada bloco: meta cumprida ou marcado à mão
        const st = {
            read: td.readToday >= td.quota,
            vocab: day.vocabTarget === 0 || pg.rev >= day.vocabTarget,
            shadow: (pg.heard || 0) >= HEARD_GOAL,
            write: !!day.written
        };
        BLOCKS.forEach((b) => { if (day.manual[b.id]) st[b.id] = true; });
        body.appendChild(el('p', 'lb-note lb-sess-sum', t('total')(Math.floor((pg.sec || 0) / 60))));
        const list = el('div', 'lb-sess-list');
        const detail = {
            read: t('readGoal')(fm(td.readToday), fm(td.quota)),
            vocab: day.vocabTarget === 0 ? t('vocabNone') : t('vocabGoal')(Math.min(pg.rev, day.vocabTarget), day.vocabTarget),
            shadow: t('shadowGoal')(Math.min(pg.heard || 0, HEARD_GOAL)),
            write: t('writeGoal')
        };
        BLOCKS.forEach((b) => {
            const row = el('div', 'lb-sess-row' + (st[b.id] ? ' done' : '')); row.dataset.block = b.id;
            const mark = el('span', 'lb-sess-mark', st[b.id] ? '✓' : '○');
            const info1 = el('div', 'lb-sess-info');
            const title = el('strong', null, t(b.id) + ' · ' + b.min + ' ' + t('min'));
            info1.append(title, el('small', null, detail[b.id]));
            const acts = el('div', 'lb-sess-acts');
            const act = (txt, fn, cls) => { const x = btn(txt, fn, cls); x.dataset.act = b.id; acts.appendChild(x); return x; };
            if (!st[b.id] || day.manual[b.id]) {
                if (b.id === 'read') act(t('open'), () => D.openDoc(td.plan.docId), 'lb-primary');
                if (b.id === 'vocab' && day.vocabTarget > 0) act(t('review'), () => { const r = D.$('lb-vocab-review'); if (r) r.click(); }, 'lb-primary');
                if (b.id === 'shadow') act(t('shadowBtn'), async () => { await D.openDoc(td.plan.docId); const s = D.$('lb-mode'); if (s && Array.prototype.some.call(s.options, (o) => o.value === 'shadow')) { s.value = 'shadow'; s.dispatchEvent(new Event('change')); } }, 'lb-primary');
            }
            if (b.id !== 'write' || day.manual.write) {
                const m = btn(day.manual[b.id] ? t('unmark') : t('mark'), () => { if (day.manual[b.id]) delete day.manual[b.id]; else day.manual[b.id] = true; jset(KD, day); render(); });
                m.dataset.mark = b.id; if (!st[b.id] || day.manual[b.id]) acts.appendChild(m);
            }
            row.append(mark, info1, acts);
            if (b.id === 'write' && !st.write) row.appendChild(writer(td, info, day));
            list.appendChild(row);
        });
        body.appendChild(list);
        // dia completo: registra uma vez e mostra a sequência
        const hist = jget(KH, []);
        if (BLOCKS.every((b) => st[b.id])) {
            if (hist.indexOf(today) < 0) { hist.push(today); jset(KH, hist); }
            const f = el('p', 'lb-ok', t('allDone')); f.id = 'lb-sess-fin'; body.appendChild(f);
        }
        const sk = streak(jget(KH, []));
        if (sk > 0) { const s = el('p', 'lb-note', t('streak')(sk)); s.id = 'lb-sess-streak'; body.appendChild(s); }
        const entries = jget(KW, []);
        const det = el('details', 'lb-sess-journal'); det.id = 'lb-sess-journal';
        det.appendChild(el('summary', null, t('journal') + ' (' + entries.length + ')'));
        if (!entries.length) det.appendChild(el('p', 'lb-note', t('empty')));
        entries.slice(-5).reverse().forEach((e) => { const q = el('blockquote', 'lb-sess-entry'); q.append(el('small', null, e.date + ' · ' + e.title), el('div', null, e.text)); det.appendChild(q); });
        body.appendChild(det);
    }

    // escrita: 15+ palavras, uma palavra do livro e uma objeção; na segunda tentativa deixa salvar assim mesmo
    function writer(td, info, day) {
        const wrap = el('div', 'lb-sess-write');
        const ta = el('textarea', 'lb-input'); ta.id = 'lb-sess-text'; ta.rows = 3; ta.placeholder = t('placeholder'); ta.spellcheck = false;
        const out = el('div', 'lb-sess-out'); out.id = 'lb-sess-out';
        let tries = 0;
        const save = () => {
            const text = ta.value.trim(), entries = jget(KW, []);
            entries.push({ date: dayKey(), docId: td.plan.docId, title: td.plan.title, text, words: text.split(/\s+/).filter(Boolean).length });
            jset(KW, entries.slice(-200)); day.written = true; jset(KD, day);
            D.emit('written', { words: text.split(/\s+/).filter(Boolean).length });
            render();
        };
        const check = btn(t('check'), () => {
            tries++;
            const text = ta.value.trim(), n = text.split(/\s+/).filter(Boolean).length;
            const book = !info.hard.length || info.hard.some((w) => new RegExp('\\b' + w + '\\b', 'i').test(text));
            const msgs = [];
            if (n < 15) msgs.push(t('needWords')(15));
            if (!book) msgs.push(t('needBook'));
            if (!OBJ.test(text)) msgs.push(t('needObj'));
            out.textContent = '';
            if (!msgs.length) { save(); return; }
            msgs.forEach((m) => out.appendChild(el('p', 'lb-miss', m)));
            if (tries >= 2 && n >= 3 && !out.querySelector('#lb-sess-force')) { const f = btn(t('saveAnyway'), save); f.id = 'lb-sess-force'; out.appendChild(f); }
        }, 'lb-primary'); check.id = 'lb-sess-check';
        wrap.append(ta, check, out);
        return wrap;
    }

    D.on('close', render); D.on('lang', render); D.on('reviewed', render); D.on('stats-reset', render); D.on('imported', render);
    // a cada 30 s só atualiza a linha de minutos (redesenhar tudo apagaria o texto que está sendo digitado)
    setInterval(() => { const s = body.querySelector('.lb-sess-sum'); if (s && !D.doc && document.visibilityState === 'visible') s.textContent = t('total')(Math.floor((prog().sec || 0) / 60)); }, 30000);
    render();
    window.__ddDia = { render, streak, dayKey };
})();
