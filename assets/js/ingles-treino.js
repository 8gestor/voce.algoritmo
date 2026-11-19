/*
 * ingles-treino.js — modos de treino de escuta do Estudo de Inglês.
 *   Normal   · lê o texto em sequência
 *   Repetir  · cada frase duas vezes (a segunda mais devagar)
 *   Shadowing· pausa do tamanho da frase para você repetir em voz alta
 *   Ditado   · toca a frase, você escreve o que ouviu e a página mostra os acertos
 * Encaixa-se no núcleo por DDLab.afterSentence (chamado ao fim de cada frase falada).
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const KEY = 'dd-ingles-mode';
    const L = {
        pt: { label: 'Treino', modes: { normal: 'Normal', repeat: 'Repetir frase', shadow: 'Shadowing', dict: 'Ditado' },
              repeatNow: 'Ouvindo de novo, mais devagar…', shadowNow: '🎤 Sua vez: repita em voz alta…',
              dictTitle: 'Ditado: escreva o que ouviu', check: 'Verificar', again: 'Ouvir de novo', skip: 'Pular', next: 'Continuar',
              placeholder: 'Digite a frase aqui', score: 'acertos', stop: 'Parar o ditado' },
        en: { label: 'Practice', modes: { normal: 'Normal', repeat: 'Repeat sentence', shadow: 'Shadowing', dict: 'Dictation' },
              repeatNow: 'Listening again, slower…', shadowNow: '🎤 Your turn: repeat aloud…',
              dictTitle: 'Dictation: type what you heard', check: 'Check', again: 'Listen again', skip: 'Skip', next: 'Continue',
              placeholder: 'Type the sentence here', score: 'correct', stop: 'Stop dictation' }
    };
    const t = (k) => L[D.state.readLang][k];
    let mode = 'normal';
    try { mode = localStorage.getItem(KEY) || 'normal'; } catch (e) { /* sem storage */ }
    if (!L.pt.modes[mode]) mode = 'normal';

    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

    /* seletor na barra do leitor */
    const tb = document.querySelector('.lb-toolbar');
    const wrap = el('label', 'lb-mode');
    const lab = el('span');
    const sel = el('select', 'lb-input'); sel.id = 'lb-mode';
    wrap.append(lab, sel);
    if (tb) tb.insertBefore(wrap, D.$('lb-status'));
    function fillSel() {
        lab.textContent = t('label') + ' ';
        sel.textContent = '';
        Object.keys(L.pt.modes).forEach((k) => { const o = el('option', null, t('modes')[k]); o.value = k; sel.appendChild(o); });
        sel.value = mode;
    }
    sel.addEventListener('change', () => { mode = sel.value; try { localStorage.setItem(KEY, mode); } catch (e) { /* ignora */ } reset(); });
    D.on('lang', fillSel);
    fillSel();

    /* estado por frase */
    let rep = null;          // { key, n } — passada atual da frase em "repetir"
    let pending = null;      // { resolve } — espera do shadowing/ditado
    function reset() { D.rateScale = 1; rep = null; cancelPending(); closeDict(); setNote(''); }
    function cancelPending() { if (pending) { const r = pending.resolve; pending = null; r('cancel'); } }
    function setNote(txt) { const s = D.$('lb-status'); if (s) s.dataset.note = txt || ''; if (txt) s.textContent = txt; else D.setStatus(); }
    const sleep = (ms) => new Promise((resolve) => { const id = setTimeout(() => { pending = null; resolve('ok'); }, ms); pending = { resolve: (v) => { clearTimeout(id); resolve(v); } }; });

    /* ditado */
    let dictEl = null;
    function closeDict() { if (dictEl) { dictEl.remove(); dictEl = null; } }
    const norm = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []).map((w) => w.replace(/’/g, "'"));
    // LCS por palavras: quais palavras da frase correta o usuário acertou (em ordem)
    function diff(correct, typed) {
        const a = norm(correct), b = norm(typed), n = a.length, m = b.length;
        const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const hit = new Array(n).fill(false);
        let i = 0, j = 0;
        while (i < n && j < m) { if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
        return { words: correct.split(/\s+/), hit, norm: a, score: n ? hit.filter(Boolean).length / n : 0 };
    }
    function dictation(ctx) {
        return new Promise((resolve) => {
            closeDict();
            dictEl = el('div', 'lb-dict'); dictEl.setAttribute('role', 'dialog');
            const title = el('strong', null, t('dictTitle'));
            const ta = el('textarea', 'lb-input'); ta.rows = 2; ta.placeholder = t('placeholder'); ta.autocomplete = 'off'; ta.spellcheck = false;
            const res = el('div', 'lb-dict-res');
            const row = el('div', 'lb-pop-acts');
            const bCheck = el('button', 'lb-btn lb-primary', t('check')); bCheck.type = 'button';
            const bAgain = el('button', 'lb-btn', t('again')); bAgain.type = 'button';
            const bSkip = el('button', 'lb-btn', t('skip')); bSkip.type = 'button';
            const bStop = el('button', 'lb-btn', '✕'); bStop.type = 'button'; bStop.title = t('stop');
            row.append(bCheck, bAgain, bSkip, bStop);
            dictEl.append(title, ta, res, row);
            document.body.appendChild(dictEl);
            ta.focus();
            let checked = false;
            const finish = (v) => { pending = null; closeDict(); resolve(v); };
            pending = { resolve: (v) => { closeDict(); resolve(v); } };
            bAgain.onclick = () => D.speakAgain && D.speakAgain(ctx.text, ctx.lang);
            bSkip.onclick = () => finish('ok');
            bStop.onclick = () => { finish('ok'); D.stopTts(); };
            bCheck.onclick = () => {
                if (checked) { finish('ok'); return; }
                checked = true;
                const d = diff(ctx.text, ta.value);
                res.textContent = '';
                const line = el('div', 'lb-dict-line');
                let wi = 0;
                d.words.forEach((w) => {
                    const has = norm(w).length > 0;
                    const sp = el('span', has && d.hit[wi] ? 'lb-ok' : has ? 'lb-miss' : null, w + ' ');
                    if (has) wi++;
                    line.appendChild(sp);
                });
                res.append(line, el('small', null, Math.round(d.score * 100) + '% ' + t('score')));
                bCheck.textContent = t('next');
                D.emit('dictation', { score: d.score, words: d.norm.length });
            };
            ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); bCheck.click(); } });
        });
    }

    D.speakAgain = (text, lang) => D.say(text, lang);

    D.afterSentence = async (ctx) => {
        if (mode === 'normal') return null;
        const key = ctx.p + ':' + ctx.s;
        if (mode === 'repeat') {
            if (!rep || rep.key !== key) rep = { key, n: 1 };
            if (rep.n === 1) { rep.n = 2; D.rateScale = 0.7; setNote(t('repeatNow')); return 'repeat'; }
            rep = null; D.rateScale = 1; setNote('');
            return null;
        }
        if (mode === 'shadow') {
            setNote(t('shadowNow'));
            await sleep(Math.min(20000, ctx.ms * 1.1 + 700));
            setNote('');
            return null;
        }
        if (mode === 'dict') { await dictation(ctx); return null; }
        return null;
    };

    D.on('stop', () => { D.rateScale = 1; rep = null; cancelPending(); setNote(''); });
    D.on('close', reset);
    window.__ddTreino = { diff, norm, get mode() { return mode; }, setMode: (m) => { mode = m; sel.value = m; reset(); } };
})();
