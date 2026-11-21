/*
 * ingles-trilha.js — Trilha por capítulos (só na página trilha.html).
 *
 * Divide um documento da biblioteca em capítulos (cada capítulo vira um documento próprio, marcado com x.trilha, que a
 * biblioteca normal não lista) e só libera o próximo depois de cinco etapas, cada uma nos DOIS idiomas:
 *   Ler      · rolou o capítulo até o fim em PT e em EN (barra LER)
 *   Ouvir    · ouviu 90% das frases em PT e em EN (barra OUVIR + ▶)
 *   Falar    · repete 5 frases em voz alta (reconhecimento de voz do navegador) e acerta 70% em média
 *   Palavras · 8 palavras do capítulo com significado e frase de contexto nos dois idiomas; as que não sabia vão para o vocabulário
 *   Escrever · ditado de 5 frases; média de 70%
 * Reaproveita o núcleo (DDLab): leitor, narração, tradução por frase, vocabulário (__ddVocab) e comparação de palavras (__ddTreino.diff).
 * Progresso em localStorage (dd-trilhas). "Liberar mesmo assim" existe para quando falta microfone ou tradutor.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !window.DD_TRILHA) return;
    const KEY = 'dd-trilhas', STAGES = ['read', 'listen', 'speak', 'words', 'write'], LANGS = ['pt', 'en'];
    const PASS = 0.7, ROUND = 5, NWORDS = 8;

    const L = {
        pt: {
            title: 'TRILHA POR CAPÍTULOS', intro: 'Divida um texto em capítulos e avance um de cada vez: leia, ouça, fale, estude as palavras e escreva nos dois idiomas antes de liberar o próximo.',
            hNew: 'Criar uma trilha', source: 'Documento', none: 'Nenhum documento na biblioteca. Envie um PDF ou texto acima e volte aqui.',
            byHead: 'Pelos títulos do texto', bySize: 'Por tamanho', perCh: 'palavras por capítulo', preview: 'Capítulos propostos (você pode renomear)',
            create: 'Criar trilha', creating: 'Criando…', noHead: 'Este texto não tem títulos detectados.', chapters: 'capítulos', words: 'palavras',
            hTrails: 'Suas trilhas', noTrails: 'Nenhuma trilha ainda.', open: 'Abrir', locked: 'Termine o capítulo anterior', free: 'Liberar mesmo assim',
            del: 'Excluir trilha', confirm: 'Excluir a trilha e os capítulos dela? O documento original continua na biblioteca.', done: 'concluído',
            read: 'Ler', listen: 'Ouvir', speak: 'Falar', words2: 'Palavras', write: 'Escrever',
            hRead: 'Leia o capítulo até o fim em PT e em EN (botões LER).', hListen: 'Ouça o capítulo em PT e em EN (botões OUVIR e ▶).',
            step: 'Capítulo', next: 'Próximo capítulo ▸', all: 'Capítulo concluído! Você pode seguir.', lastDone: 'Trilha concluída!', back: '◂ Trilha',
            hear: '🔊 Ouvir', mic: '🎤 Falar', noMic: 'Seu navegador não reconhece voz: use a autoavaliação.', said: 'Repeti em voz alta', heardTxt: 'Entendi', score: 'acertos',
            again: 'Tentar de novo', continue: 'Continuar', check: 'Verificar', typeHere: 'Escreva o que ouviu', hearAgain: '🔊 Ouvir de novo',
            round: 'média da rodada', passed: 'Etapa concluída!', failed: 'Média abaixo de 70%. Tente de novo.', micErr: 'Não consegui ouvir. Tente de novo ou use a autoavaliação.',
            noTr: 'Tradução indisponível: ative o tradutor no leitor ou use "Liberar mesmo assim".', showMean: 'Mostrar significado', knew: 'Já sabia', notYet: 'Ainda não (salvar)',
            guess: 'Qual o significado? (opcional)', inCtx: 'No contexto', meaning: 'Significado', pickLang: 'Idioma', close: 'Fechar', wordsDone: 'palavras revisadas',
            noWords: 'Poucas palavras novas neste capítulo: etapa concluída.', sec: 'frase', preparing: 'Preparando…'
        },
        en: {
            title: 'CHAPTER PATH', intro: 'Split a text into chapters and move one at a time: read, listen, speak, study the words and write in both languages before the next one unlocks.',
            hNew: 'Create a path', source: 'Document', none: 'No documents in the library. Upload a PDF or text above and come back.',
            byHead: 'By the text headings', bySize: 'By size', perCh: 'words per chapter', preview: 'Proposed chapters (you can rename them)',
            create: 'Create path', creating: 'Creating…', noHead: 'No headings detected in this text.', chapters: 'chapters', words: 'words',
            hTrails: 'Your paths', noTrails: 'No paths yet.', open: 'Open', locked: 'Finish the previous chapter', free: 'Unlock anyway',
            del: 'Delete path', confirm: 'Delete the path and its chapters? The original document stays in the library.', done: 'done',
            read: 'Read', listen: 'Listen', speak: 'Speak', words2: 'Words', write: 'Write',
            hRead: 'Read the chapter to the end in PT and in EN (READ buttons).', hListen: 'Listen to the chapter in PT and in EN (LISTEN buttons and ▶).',
            step: 'Chapter', next: 'Next chapter ▸', all: 'Chapter complete! You can move on.', lastDone: 'Path complete!', back: '◂ Path',
            hear: '🔊 Listen', mic: '🎤 Speak', noMic: 'Your browser has no speech recognition: use self-assessment.', said: 'I repeated aloud', heardTxt: 'Heard', score: 'correct',
            again: 'Try again', continue: 'Continue', check: 'Check', typeHere: 'Type what you heard', hearAgain: '🔊 Listen again',
            round: 'round average', passed: 'Step complete!', failed: 'Average below 70%. Try again.', micErr: 'Could not hear you. Try again or use self-assessment.',
            noTr: 'Translation unavailable: enable the translator in the reader or use "Unlock anyway".', showMean: 'Show meaning', knew: 'I knew it', notYet: 'Not yet (save)',
            guess: 'What does it mean? (optional)', inCtx: 'In context', meaning: 'Meaning', pickLang: 'Language', close: 'Close', wordsDone: 'words reviewed',
            noWords: 'Few new words in this chapter: step complete.', sec: 'sentence', preparing: 'Preparing…'
        }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const button = (txt, fn, cls) => { const b = el('button', 'lb-btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
    const LN = { pt: 'PT', en: 'EN' };

    /* ------------------------------------------------------------ dados */
    const blank = () => { const o = {}; STAGES.forEach((s) => { o[s] = { pt: false, en: false }; }); return o; };
    let trails = [];
    try { trails = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { trails = []; }
    trails.forEach((tr) => tr.chapters.forEach((c) => { c.done = Object.assign(blank(), c.done || {}); c.heard = c.heard || { pt: [], en: [] }; }));
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(trails)); } catch (e) { /* sem storage */ } };
    const complete = (c) => STAGES.every((s) => LANGS.every((l) => c.done[s][l]));
    const passed = (c) => !!(c.free || complete(c));
    const unlocked = (tr, i) => i === 0 || passed(tr.chapters[i - 1]);
    function find(docId) {
        for (const tr of trails) { const i = tr.chapters.findIndex((c) => c.id === docId); if (i >= 0) return { tr, i, ch: tr.chapters[i] }; }
        return null;
    }

    /* ------------------------------------------------------------ divisão em capítulos */
    const wcOf = (p) => p.s.join(' ').split(/\s+/).filter(Boolean).length;
    const wordsIn = (paras, a, b) => { let n = 0; for (let i = a; i < b; i++) n += wcOf(paras[i]); return n; };
    // por títulos: cada parágrafo t==='h' abre um capítulo; capítulos muito curtos se juntam ao seguinte
    function byHeadings(paras, minWords) {
        const hs = []; paras.forEach((p, i) => { if (p.t === 'h') hs.push(i); });
        if (hs.length < 2) return null;
        let cuts = hs.map((i) => ({ title: String(paras[i].s[0] || '').slice(0, 80), from: i }));
        if (hs[0] > 0) { if (wordsIn(paras, 0, hs[0]) >= 100) cuts.unshift({ title: 'Início', from: 0 }); else cuts[0].from = 0; }
        cuts.forEach((c, k) => { c.to = k + 1 < cuts.length ? cuts[k + 1].from : paras.length; });
        for (let k = 0; k < cuts.length;) {
            if (cuts.length > 1 && wordsIn(paras, cuts[k].from, cuts[k].to) < (minWords || 150)) {
                if (k + 1 < cuts.length) { cuts[k + 1].from = cuts[k].from; cuts.splice(k, 1); } else { cuts[k - 1].to = cuts[k].to; cuts.splice(k, 1); k--; }
            } else k++;
        }
        return cuts.length > 1 ? cuts : null;
    }
    // por tamanho: corta no fim do parágrafo quando passa do alvo; a sobra pequena se junta ao capítulo anterior
    function bySize(paras, size) {
        size = Math.max(100, Number(size) || 800);
        const out = []; let from = 0, acc = 0;
        for (let i = 0; i < paras.length; i++) {
            acc += wcOf(paras[i]);
            if (acc >= size && i + 1 < paras.length) { out.push({ from, to: i + 1 }); from = i + 1; acc = 0; }
        }
        if (from < paras.length) out.push({ from, to: paras.length });
        if (out.length > 1 && wordsIn(paras, out[out.length - 1].from, out[out.length - 1].to) < size * 0.4) { out[out.length - 2].to = paras.length; out.pop(); }
        out.forEach((c, k) => { c.title = (D.state.readLang === 'en' ? 'Part ' : 'Parte ') + (k + 1); });
        return out;
    }
    function splitChapters(paras, mode, size) {
        if (mode === 'head') return byHeadings(paras) || bySize(paras, size);
        return bySize(paras, size);
    }

    async function createTrail(srcId, chapters) {
        const d = await D.db.get('docs', srcId), m = await D.db.get('meta', srcId);
        if (!d || !m) throw new Error('documento não encontrado');
        const tid = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const rec = { id: tid, title: m.title, lang: d.lang, created: Date.now(), chapters: [] };
        for (let n = 0; n < chapters.length; n++) {
            const c = chapters[n], paras = d.paras.slice(c.from, c.to), id = tid + '-c' + (n + 1);
            const sentences = paras.reduce((a, p) => a + p.s.length, 0), words = wordsIn(paras, 0, paras.length);
            await D.db.put('docs', { id, lang: d.lang, paras });
            await D.db.put('meta', { id, title: m.title + ' — ' + (n + 1) + '. ' + c.title, lang: d.lang, pages: 0, sentences, words, added: Date.now(), trDone: 0, trTotal: paras.length, pos: 0, heard: 0, lastOpened: 0, x: { trilha: tid, n: n + 1 } });
            for (let i = c.from; i < c.to; i++) {                       // aproveita traduções que o documento original já tinha
                const tr = await D.db.get('tr', srcId + ':' + i).catch(() => null);
                if (tr) await D.db.put('tr', tr, id + ':' + (i - c.from)).catch(() => {});
            }
            rec.chapters.push({ id, title: c.title, words, sentences, done: blank(), heard: { pt: [], en: [] }, free: false });
        }
        trails.push(rec); save();
        return rec;
    }
    async function deleteTrail(tid) {
        const tr = trails.find((x) => x.id === tid); if (!tr) return;
        for (const c of tr.chapters) {
            try { await D.db.del('meta', c.id); await D.db.del('docs', c.id); await D.delRange('tr', c.id + ':', c.id + ':￿'); } catch (e) { /* ignora */ }
        }
        trails = trails.filter((x) => x.id !== tid); save();
    }

    /* ------------------------------------------------------------ marcar etapas */
    let cur = null;                                  // { tr, i, ch } do capítulo aberto
    let toastEl = null, toastTimer = null;
    function flash(msg) {
        if (!toastEl) { toastEl = el('div', 'tr-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
        toastEl.textContent = msg; toastEl.hidden = false;
        clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3500);
    }
    function mark(stage, lang) {
        if (!cur || cur.ch.done[stage][lang]) return false;
        cur.ch.done[stage][lang] = true; save(); renderSteps();
        flash(t(stage === 'words' ? 'words2' : stage) + ' ' + LN[lang] + ' ✓');
        if (complete(cur.ch)) flash(t('all'));
        return true;
    }

    /* ------------------------------------------------------------ barra de etapas dentro do leitor */
    const reader = D.$('lb-reader');
    const bar = el('div', 'tr-steps'); bar.id = 'tr-steps'; bar.hidden = true;
    reader.insertBefore(bar, reader.firstChild);
    function renderSteps() {
        bar.textContent = '';
        if (!cur) { bar.hidden = true; return; }
        bar.hidden = false;
        const { tr, i, ch } = cur;
        const head = el('div', 'tr-steps-head');
        head.append(button(t('back'), () => { D.stopTts(); document.getElementById('lb-back').click(); }),
            el('strong', null, t('step') + ' ' + (i + 1) + '/' + tr.chapters.length + ' · ' + ch.title));
        bar.appendChild(head);
        const row = el('div', 'tr-chips');
        STAGES.forEach((s) => {
            const lab = t(s === 'words' ? 'words2' : s);
            const box = el('div', 'tr-chip');
            box.dataset.stage = s;
            box.appendChild(el('span', 'tr-chip-name', lab));
            LANGS.forEach((l) => {
                const interactive = s === 'speak' || s === 'words' || s === 'write';
                const b = button(LN[l] + (ch.done[s][l] ? ' ✓' : ''), interactive ? () => openStage(s, l) : () => flash(t(s === 'read' ? 'hRead' : 'hListen')), ch.done[s][l] ? 'tr-ok' : '');
                b.dataset.lang = l; b.dataset.stage = s;
                box.appendChild(b);
            });
            row.appendChild(box);
        });
        bar.appendChild(row);
        if (passed(ch)) {
            const nx = tr.chapters[i + 1];
            const foot = el('div', 'tr-steps-foot');
            foot.appendChild(el('span', null, nx ? t('all') : t('lastDone')));
            if (nx) foot.appendChild(button(t('next'), () => { D.stopTts(); closeOverlay(); D.openDoc(nx.id); }, 'lb-primary'));
            bar.appendChild(foot);
        }
    }

    /* acompanha leitura (rolou até o fim, com tempo mínimo) e escuta (frases ouvidas até o fim) */
    let readSince = Date.now(), lastPiece = null, docKey = '';
    function atBottom() { return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120; }
    setInterval(() => {
        if (!cur || reader.hidden || document.hidden) return;
        const lang = D.state.readLang;
        if (cur.ch.done.read[lang]) return;
        const need = Math.min(90000, cur.ch.words * 120);
        if (atBottom() && Date.now() - readSince >= need) mark('read', lang);
    }, 1000);
    D.on('lang', () => { readSince = Date.now(); if (cur) renderSteps(); titles(); });
    D.on('piece', (ev) => { lastPiece = ev; });
    D.on('heard', (ev) => {
        if (!cur || !lastPiece) return;
        const lang = lastPiece.lang, k = ev.p + ':' + ev.s, set = cur.ch.heard[lang];
        if (!set || set.indexOf(k) >= 0) return;
        set.push(k);
        const total = D.doc ? D.doc.paras.reduce((a, p) => a + p.s.length, 0) : cur.ch.sentences;
        if (!cur.ch.done.listen[lang] && set.length >= Math.ceil(total * 0.9)) mark('listen', lang); else save();
    });
    D.on('open', (doc) => {
        cur = find(doc.id); readSince = Date.now(); lastPiece = null; docKey = doc.id;
        document.body.classList.toggle('tr-chapter', !!cur);
        renderSteps();
    });
    D.on('close', () => { cur = null; closeOverlay(); document.body.classList.remove('tr-chapter'); renderSteps(); setTimeout(renderLibrary, 50); });

    /* ------------------------------------------------------------ amostra de frases e textos nos dois idiomas */
    async function sentenceText(p, s, lang) {
        const doc = D.doc;
        if (!doc || !doc.paras[p] || doc.paras[p].s[s] == null) return null;
        if (lang === doc.lang) return doc.paras[p].s[s];
        if (doc.tr[p] && doc.tr[p][s] != null) return doc.tr[p][s];
        return D.trSentence(p, s);
    }
    // n frases espalhadas pelo capítulo; `offset` troca a amostra a cada nova rodada
    function pick(n, minW, maxW, offset) {
        const doc = D.doc, all = [];
        doc.paras.forEach((pp, p) => { if (pp.t === 'h') return; pp.s.forEach((s, k) => { const w = s.split(/\s+/).filter(Boolean).length; if (w >= minW && w <= maxW) all.push([p, k]); }); });
        if (!all.length) doc.paras.forEach((pp, p) => pp.s.forEach((s, k) => { if (/\p{L}/u.test(s)) all.push([p, k]); }));
        if (all.length <= n) return all;
        const out = [], step = all.length / n;
        for (let i = 0; i < n; i++) out.push(all[(Math.floor(i * step) + (offset || 0) * 3) % all.length]);
        return out.filter((x, i, a) => a.findIndex((y) => y[0] === x[0] && y[1] === x[1]) === i);
    }

    /* ------------------------------------------------------------ janela de prática */
    let ov = null;
    function closeOverlay() { if (ov) { ov.remove(); ov = null; } }
    function overlay(title, lang, onLang) {
        closeOverlay();
        ov = el('div', 'tr-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', title);
        const top = el('div', 'tr-ov-top');
        const tabs = el('div', 'tr-tabs');
        LANGS.forEach((l) => { const b = button(LN[l], () => onLang(l), l === lang ? 'tr-on' : ''); b.dataset.lang = l; tabs.appendChild(b); });
        top.append(el('strong', null, title), tabs, button('✕', () => { closeOverlay(); renderSteps(); }));
        const body = el('div', 'tr-ov-body');
        ov.append(top, body); document.body.appendChild(ov);
        return body;
    }
    const diffOf = (a, b) => (window.__ddTreino ? window.__ddTreino.diff(a, b) : { words: a.split(/\s+/), hit: [], norm: [], score: a.trim().toLowerCase() === (b || '').trim().toLowerCase() ? 1 : 0 });
    function showDiff(box, d) {
        box.textContent = '';
        const line = el('div', 'lb-dict-line');
        let wi = 0;
        d.words.forEach((w) => {
            const has = window.__ddTreino ? window.__ddTreino.norm(w).length > 0 : true;
            line.appendChild(el('span', has && d.hit[wi] ? 'lb-ok' : has ? 'lb-miss' : null, w + ' '));
            if (has) wi++;
        });
        box.append(line, el('small', null, Math.round(d.score * 100) + '% ' + t('score')));
    }
    const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
    function listenOnce(lang) {
        return new Promise((resolve, reject) => {
            let done = false;
            const fin = (v, bad) => { if (done) return; done = true; bad ? reject(v) : resolve(v); };
            try {
                const r = new (getSR())();
                r.lang = D.LANG_TAG[lang]; r.interimResults = false; r.maxAlternatives = 1;
                r.onresult = (e) => fin(e.results[0][0].transcript);
                r.onerror = (e) => fin((e && e.error) || 'erro', true);
                r.onnomatch = () => fin('');
                r.onend = () => fin('');
                r.start();
            } catch (e) { fin(e, true); }
        });
    }

    /* uma rodada de ROUND frases (Falar ou Escrever); a etapa conclui com média >= 70% */
    let rounds = {};
    async function sentenceRound(kind, lang) {
        const stage = kind;
        const body = overlay(t(stage) + ' · ' + LN[lang], lang, (l) => sentenceRound(kind, l));
        if (!D.doc || !cur) return;
        const rk = kind + lang, off = rounds[rk] || 0;
        body.appendChild(el('p', 'lb-note', t('preparing')));
        const coords = pick(ROUND, 4, 22, off);
        const texts = [];
        for (const [p, s] of coords) { const x = await sentenceText(p, s, lang); if (x) texts.push(x); }
        if (!ov) return;
        body.textContent = '';
        if (!texts.length) { body.appendChild(el('p', 'lb-error', t('noTr'))); return; }
        const scores = [];
        const step = (k) => {
            body.textContent = '';
            if (k >= texts.length) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                body.appendChild(el('p', 'tr-avg', t('round') + ': ' + Math.round(avg * 100) + '%'));
                if (avg >= PASS) { body.appendChild(el('p', 'lb-ok', t('passed'))); mark(stage, lang); }
                else { body.appendChild(el('p', 'lb-miss', t('failed'))); }
                body.appendChild(button(avg >= PASS ? t('close') : t('again'), () => { if (avg >= PASS) { closeOverlay(); renderSteps(); } else { rounds[rk] = off + 1; sentenceRound(kind, lang); } }, 'lb-primary'));
                return;
            }
            const text = texts[k];
            body.appendChild(el('div', 'tr-count', (k + 1) + '/' + texts.length));
            const sent = el('div', 'tr-sent', kind === 'speak' ? text : '…'); sent.id = 'tr-sent';
            if (kind === 'write') sent.hidden = true;
            const res = el('div', 'lb-dict-res'); res.id = 'tr-res';
            const acts = el('div', 'lb-pop-acts');
            const hear = button(kind === 'speak' ? t('hear') : t('hearAgain'), () => D.say(text, lang)); hear.id = 'tr-hear';
            const finish = (score) => { scores.push(score); const nx = button(t('continue'), () => step(k + 1), 'lb-primary'); nx.id = 'tr-next'; acts.textContent = ''; acts.appendChild(nx); };
            body.append(sent);
            if (kind === 'speak') {
                const mic = button(getSR() ? t('mic') : t('said'), null, 'lb-primary'); mic.id = 'tr-mic';
                mic.addEventListener('click', async () => {
                    if (!getSR()) { res.textContent = ''; finish(1); return; }
                    mic.disabled = true; res.textContent = '…';
                    try {
                        const said = await listenOnce(lang);
                        const d = diffOf(text, said);
                        showDiff(res, d); res.appendChild(el('div', 'lb-note', t('heardTxt') + ': ' + (said || '—')));
                        finish(d.score);
                    } catch (e) { res.textContent = t('micErr'); mic.disabled = false; if (!getSR() || (e && /not-allowed|service-not-allowed|audio-capture/.test(String(e)))) { acts.appendChild(button(t('said'), () => { res.textContent = ''; finish(1); })); } }
                });
                acts.append(hear, mic);
                if (!getSR()) body.appendChild(el('p', 'lb-note', t('noMic')));
            } else {
                const ta = el('textarea', 'lb-input'); ta.rows = 2; ta.placeholder = t('typeHere'); ta.id = 'tr-ta'; ta.autocomplete = 'off'; ta.spellcheck = false;
                const chk = button(t('check'), null, 'lb-primary'); chk.id = 'tr-check';
                chk.addEventListener('click', () => { const d = diffOf(text, ta.value); showDiff(res, d); ta.disabled = true; finish(d.score); });
                body.appendChild(ta);
                acts.append(hear, chk);
                setTimeout(() => D.say(text, lang), 150);
            }
            body.append(acts, res);
        };
        step(0);
    }

    /* palavras do capítulo: significado + frase de contexto nos dois idiomas */
    async function wordsRound(lang) {
        const body = overlay(t('words2') + ' · ' + LN[lang], lang, (l) => wordsRound(l));
        if (!D.doc || !cur) return;
        body.appendChild(el('p', 'lb-note', t('preparing')));
        const coords = pick(NWORDS * 3, 6, 30, 0), cards = [], seen = new Set();
        const texts = await Promise.all(coords.map(([p, s]) => sentenceText(p, s, lang)));
        if (!ov) return;
        const common = (w) => (lang === 'en' && window.__ddNivel ? window.__ddNivel.isCommon(w) : false);
        const minLen = lang === 'en' ? 5 : 7;
        coords.forEach(([p, s], i) => {
            const text = texts[i]; if (!text || cards.length >= NWORDS) return;
            const toks = (text.match(/\p{L}[\p{L}'’-]*/gu) || []).map((w) => w.toLowerCase()).filter((w) => w.length >= minLen && !seen.has(w) && !common(w));
            if (!toks.length) return;
            const w = toks.sort((a, b) => b.length - a.length)[0];
            seen.add(w); cards.push({ word: w, text, p, s });
        });
        body.textContent = '';
        if (!cards.length) { body.appendChild(el('p', 'lb-ok', t('noWords'))); mark('words', lang); return; }
        const other = D.other(lang);
        let known = 0;
        const step = async (k) => {
            body.textContent = '';
            if (k >= cards.length) {
                body.appendChild(el('p', 'lb-ok', t('passed') + ' (' + cards.length + ' ' + t('wordsDone') + ')'));
                mark('words', lang);
                body.appendChild(button(t('close'), () => { closeOverlay(); renderSteps(); }, 'lb-primary'));
                return;
            }
            const c = cards[k];
            body.appendChild(el('div', 'tr-count', (k + 1) + '/' + cards.length));
            const w = el('div', 'tr-word', c.word); w.id = 'tr-word';
            const ctx = el('div', 'tr-ctx');
            const at = c.text.toLowerCase().indexOf(c.word);
            if (at >= 0) { ctx.append(c.text.slice(0, at), el('mark', null, c.text.slice(at, at + c.word.length)), c.text.slice(at + c.word.length)); } else ctx.textContent = c.text;
            const back = el('div', 'tr-back'); back.hidden = true; back.id = 'tr-back';
            const acts = el('div', 'lb-pop-acts');
            const guess = el('textarea', 'lb-input'); guess.rows = 1; guess.placeholder = t('guess');
            const show = button(t('showMean'), async () => {
                show.disabled = true;
                back.hidden = false; back.textContent = '…';
                const mean = await D.translateText(c.word, lang);
                const other2 = lang === D.doc.lang ? await D.trSentence(c.p, c.s) : D.doc.paras[c.p].s[c.s];
                back.textContent = '';
                back.append(el('div', 'tr-mean', t('meaning') + ' (' + LN[other] + '): ' + (mean || '—')));
                if (other2) back.append(el('div', 'tr-ctx2', t('inCtx') + ' (' + LN[other] + '): ' + other2));
                acts.textContent = '';
                const done = (sabia) => {
                    if (sabia) known++;
                    else saveVocab(lang, c, mean, other2);
                    step(k + 1);
                };
                const b1 = button(t('knew'), () => done(true), 'lb-primary'), b2 = button(t('notYet'), () => done(false));
                b1.id = 'tr-knew'; b2.id = 'tr-notyet';
                acts.append(b1, b2);
            }, 'lb-primary');
            show.id = 'tr-show';
            acts.append(button(t('hear'), () => D.say(c.word, lang)), show);
            body.append(w, ctx, guess, back, acts);
        };
        step(0);
    }
    async function saveVocab(lang, c, mean, sentOther) {
        try {
            const V = window.__ddVocab; if (!V) return;
            const id = V.key(lang, c.word), list = await V.loadAll();
            if (list.find((x) => x.id === id)) return;
            const card = { id, word: c.word, lang, tr: mean || '', sent: c.text, sentTr: sentOther || '', doc: D.doc ? D.doc.title : '', added: Date.now(), due: Date.now(), ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
            list.push(card); await D.db.put('vocab', card); D.emit('vocab-saved', card);
        } catch (e) { /* ignora */ }
    }

    function openStage(stage, lang) {
        if (stage === 'speak') sentenceRound('speak', lang);
        else if (stage === 'write') sentenceRound('write', lang);
        else if (stage === 'words') wordsRound(lang);
    }

    /* ------------------------------------------------------------ biblioteca: criar e listar trilhas */
    const root = el('section', 'tr-root'); root.id = 'tr-root';
    const anchor = D.$('lb-intro');
    anchor.parentNode.insertBefore(root, anchor.nextSibling);
    let draft = { src: '', mode: 'head', size: 800, chapters: [], paras: null, hasHead: false };

    function titles() {
        D.$('lb-title').textContent = t('title');
        D.$('lb-intro').textContent = t('intro');
        renderLibrary();
    }
    async function loadDraft() {
        draft.paras = null; draft.chapters = [];
        if (!draft.src) return;
        const d = await D.db.get('docs', draft.src);
        if (!d) return;
        draft.paras = d.paras;
        draft.hasHead = !!byHeadings(d.paras);
        if (!draft.hasHead && draft.mode === 'head') draft.mode = 'size';
        draft.chapters = splitChapters(d.paras, draft.mode, draft.size).map((c) => Object.assign({}, c));
    }
    async function renderLibrary() {
        if (!reader.hidden) return;
        let metas = [];
        try { metas = (await D.db.all('meta')).filter((m) => !(m.x && m.x.trilha)); } catch (e) { /* sem banco */ }
        if (!draft.src || !metas.find((m) => m.id === draft.src)) { draft.src = metas.length ? metas[0].id : ''; await loadDraft(); }
        root.textContent = '';
        root.appendChild(el('h2', null, t('hNew')));
        if (!metas.length) root.appendChild(el('p', 'lb-note', t('none')));
        else {
            const sel = el('select', 'lb-input'); sel.id = 'tr-src'; sel.setAttribute('aria-label', t('source'));
            metas.forEach((m) => { const o = el('option', null, m.title); o.value = m.id; sel.appendChild(o); });
            sel.value = draft.src;
            sel.addEventListener('change', async () => { draft.src = sel.value; await loadDraft(); renderLibrary(); });
            root.appendChild(sel);
            const modes = el('div', 'tr-modes');
            const mk = (val, label, disabled) => {
                const lab = el('label', 'tr-mode'), r = el('input'); r.type = 'radio'; r.name = 'tr-mode'; r.value = val; r.checked = draft.mode === val; r.disabled = !!disabled;
                r.addEventListener('change', async () => { draft.mode = val; await loadDraft(); renderLibrary(); });
                lab.append(r, ' ' + label + (disabled ? ' — ' + t('noHead') : '')); return lab;
            };
            modes.append(mk('head', t('byHead'), !draft.hasHead), mk('size', t('bySize')));
            const size = el('input', 'lb-input'); size.type = 'number'; size.min = '100'; size.step = '100'; size.value = String(draft.size); size.id = 'tr-size'; size.setAttribute('aria-label', t('perCh'));
            size.addEventListener('change', async () => { draft.size = Math.max(100, Number(size.value) || 800); await loadDraft(); renderLibrary(); });
            const sizeLab = el('label', 'tr-mode'); sizeLab.append(size, ' ' + t('perCh'));
            if (draft.mode === 'size') modes.appendChild(sizeLab);
            root.appendChild(modes);
            if (draft.chapters.length) {
                root.appendChild(el('p', 'lb-note', t('preview') + ' · ' + draft.chapters.length + ' ' + t('chapters')));
                const list = el('ol', 'tr-prev'); list.id = 'tr-prev';
                draft.chapters.forEach((c, k) => {
                    const li = el('li'), inp = el('input', 'lb-input'); inp.value = c.title; inp.setAttribute('aria-label', t('step') + ' ' + (k + 1));
                    inp.addEventListener('input', () => { c.title = inp.value.trim() || c.title; });
                    li.append(inp, el('small', null, ' ' + wordsIn(draft.paras, c.from, c.to) + ' ' + t('words')));
                    list.appendChild(li);
                });
                root.appendChild(list);
                const go = button(t('create'), async () => {
                    go.disabled = true; go.textContent = t('creating');
                    try { await createTrail(draft.src, draft.chapters); } catch (e) { /* ignora */ }
                    renderLibrary();
                }, 'lb-primary');
                go.id = 'tr-create';
                root.appendChild(go);
            }
        }
        root.appendChild(el('h2', null, t('hTrails')));
        if (!trails.length) root.appendChild(el('p', 'lb-note', t('noTrails')));
        trails.slice().reverse().forEach((tr) => root.appendChild(trailCard(tr)));
    }
    function trailCard(tr) {
        const card = el('div', 'tr-card'); card.dataset.trail = tr.id;
        const doneN = tr.chapters.filter(passed).length;
        const head = el('div', 'tr-card-head');
        head.append(el('strong', null, tr.title), el('small', null, ' ' + doneN + '/' + tr.chapters.length + ' ' + t('done')), button(t('del'), async () => { if (confirm(t('confirm'))) { await deleteTrail(tr.id); renderLibrary(); } }));
        const track = el('div', 'lb-bar'), fill = el('div', 'lb-bar-fill'); fill.style.width = Math.round(doneN / tr.chapters.length * 100) + '%'; track.appendChild(fill);
        card.append(head, track);
        tr.chapters.forEach((c, i) => {
            const row = el('div', 'tr-ch'); row.dataset.n = String(i + 1);
            const ok = unlocked(tr, i);
            const info = el('div', 'tr-ch-info');
            info.append(el('strong', null, (i + 1) + '. ' + c.title), el('small', null, ' ' + c.words + ' ' + t('words')));
            const chips = el('div', 'tr-mini');
            STAGES.forEach((s) => { const n = LANGS.filter((l) => c.done[s][l]).length; chips.appendChild(el('span', n === 2 ? 'tr-mini-ok' : null, t(s === 'words' ? 'words2' : s) + ' ' + n + '/2')); });
            info.appendChild(chips);
            const acts = el('div', 'lb-doc-acts');
            if (ok) { const b = button(passed(c) ? '✓ ' + t('open') : t('open'), () => D.openDoc(c.id), 'lb-primary'); b.classList.add('tr-open'); acts.appendChild(b); }
            else { acts.append(el('small', null, '🔒 ' + t('locked')), button(t('free'), () => { tr.chapters[i - 1].free = true; save(); renderLibrary(); })); }
            row.append(info, acts); card.appendChild(row);
        });
        return card;
    }

    titles();
    window.__ddTrilha = {
        splitChapters, byHeadings, bySize, createTrail, deleteTrail, mark, unlocked, passed, complete, pick, find, renderLibrary,
        get trails() { return trails; }, get cur() { return cur; }, sentenceRound, wordsRound, openStage
    };
})();
