/*
 * ingles-compreensao.js — perguntas de compreensão sobre o trecho que você está lendo.
 *
 * Usa o modelo de linguagem LOCAL do navegador (API de prompt do Chrome: window.LanguageModel). O texto nunca sai
 * do aparelho. Se o navegador não oferecer o modelo, o botão simplesmente não aparece.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const L = {
        pt: { btn: '? Perguntas', title: 'Perguntas sobre o trecho', loading: 'Preparando as perguntas…', fail: 'Não consegui gerar as perguntas agora.',
              answer: 'Sua resposta', fix: 'Corrigir minha resposta', model: 'Ver resposta sugerida', close: 'Fechar', thinking: 'Pensando…',
              intro: 'Responda no idioma que preferir. O modelo roda neste aparelho e pode errar: use como apoio.' },
        en: { btn: '? Questions', title: 'Questions about the passage', loading: 'Preparing the questions…', fail: 'Could not generate questions right now.',
              answer: 'Your answer', fix: 'Check my answer', model: 'Show suggested answer', close: 'Close', thinking: 'Thinking…',
              intro: 'Answer in whichever language you like. The model runs on this device and can be wrong: use it as a guide.' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const OPTS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

    const tb = document.querySelector('.lb-toolbar');
    const btn = el('button', 'lb-btn', ''); btn.type = 'button'; btn.id = 'lb-quiz'; btn.hidden = true;
    if (tb) tb.insertBefore(btn, D.$('lb-status'));

    async function available() {
        if (!('LanguageModel' in self)) return false;
        try { const a = await self.LanguageModel.availability(OPTS); return a !== 'unavailable'; } catch (e) { return false; }
    }
    async function refresh() { btn.textContent = t('btn'); btn.hidden = !(D.doc && D.doc.lang === 'en' && await available()); }
    D.on('open', refresh); D.on('lang', refresh); D.on('close', () => { btn.hidden = true; closePanel(); });

    // texto do trecho: parágrafos a partir do que está na tela (até ~1.800 caracteres)
    function passage() {
        const doc = D.doc; let i = Math.max(0, D.firstVisible()), out = '';
        for (; i < doc.paras.length && out.length < 1800; i++) if (doc.paras[i].t === 'p') out += doc.paras[i].s.join(' ') + '\n';
        return out.trim();
    }
    let session = null;
    async function ask(prompt) {
        if (!session) session = await self.LanguageModel.create(Object.assign({ initialPrompts: [{ role: 'system', content: 'You are a patient English teacher. Be concise.' }] }, OPTS));
        return String(await session.prompt(prompt)).trim();
    }
    const parseQuestions = (txt) => txt.split('\n').map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim()).filter((l) => l.length > 8 && /\?$/.test(l)).slice(0, 3);

    let panel = null;
    function closePanel() { if (panel) { panel.remove(); panel = null; } session = null; }
    btn.onclick = async () => {
        closePanel();
        panel = el('div', 'lb-quizbox'); panel.setAttribute('role', 'dialog');
        const head = el('div', 'lb-quiz-head');
        const x = el('button', 'lb-btn', '✕'); x.type = 'button'; x.title = t('close'); x.onclick = closePanel;
        head.append(el('strong', null, t('title')), x);
        const body = el('div', 'lb-quiz-body'); body.append(el('p', 'lb-note', t('loading')));
        panel.append(head, body);
        document.body.appendChild(panel);
        const text = passage();
        let qs = [];
        try { qs = parseQuestions(await ask('Read this passage and write exactly 3 short comprehension questions about it, one per line, numbered. Output only the questions.\n\nPASSAGE:\n' + text)); } catch (e) { qs = []; }
        if (!panel) return;
        body.textContent = '';
        if (!qs.length) { body.append(el('p', 'lb-error', t('fail'))); return; }
        body.append(el('p', 'lb-note', t('intro')));
        qs.forEach((q) => {
            const box = el('div', 'lb-q');
            box.append(el('strong', null, q));
            const ta = el('textarea', 'lb-input'); ta.rows = 2; ta.placeholder = t('answer');
            const out = el('div', 'lb-q-out');
            const row = el('div', 'lb-pop-acts');
            const fix = el('button', 'lb-btn lb-primary', t('fix')); fix.type = 'button';
            const mod = el('button', 'lb-btn', t('model')); mod.type = 'button';
            const reply = D.state.readLang === 'en' ? 'English' : 'Brazilian Portuguese';
            const run = async (p) => { out.textContent = t('thinking'); try { out.textContent = await ask(p); } catch (e) { out.textContent = t('fail'); } };
            fix.onclick = () => run('Passage:\n' + text + '\n\nQuestion: ' + q + '\nStudent answer: ' + (ta.value || '(empty)') + '\n\nIn at most 2 short sentences, say whether the answer is right and correct it if needed. Reply in ' + reply + '.');
            mod.onclick = () => run('Passage:\n' + text + '\n\nQuestion: ' + q + '\n\nGive a brief correct answer based only on the passage. Reply in ' + reply + '.');
            row.append(fix, mod);
            box.append(ta, row, out);
            body.appendChild(box);
        });
    };
    window.__ddQuiz = { parseQuestions, refresh };
})();
