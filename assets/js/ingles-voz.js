/*
 * ingles-voz.js — voz neural LOCAL (Piper) para a narração do Estudo de Inglês. Opcional e desligada por padrão.
 *
 * - Só carrega a biblioteca (assets/vendor/piper) quando a voz está ativa e alguma frase vai ser falada.
 * - Baixa um modelo de ~60 MB por idioma, uma única vez (guardado no navegador, funciona offline depois).
 * - O texto lido NUNCA é enviado: a síntese roda no aparelho. Só os arquivos do modelo/WASM vêm da internet.
 * - Qualquer falha cai automaticamente para a voz do navegador.
 * Encaixa-se no núcleo por DDLab.neural = { active, speak, stop }.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const LIB = new URL('../vendor/piper/piper-tts-web.js', document.currentScript ? document.currentScript.src : location.href).href;
    const KEY = 'dd-ingles-neural';
    const VOICES = {
        en: [['en_US-lessac-medium', 'Lessac'], ['en_US-amy-medium', 'Amy'], ['en_US-ryan-medium', 'Ryan'], ['en_US-hfc_female-medium', 'HFC (feminina)']],
        pt: [['pt_BR-faber-medium', 'Faber'], ['pt_BR-edresson-low', 'Edresson (qualidade menor)']]
    };
    const SAMPLE = { en: 'Hello! This is the local neural voice.', pt: 'Olá! Esta é a voz neural local.' };
    const L = {
        pt: { h: 'VOZ NEURAL LOCAL (OPCIONAL)',
              intro: 'Voz sintética de melhor qualidade que roda neste aparelho (Piper). Baixa cerca de 60 MB por idioma, uma única vez; depois funciona sem internet. O texto que você lê nunca é enviado a ninguém.',
              download: 'Baixar e ativar', on: 'Ativar', off: 'Desativar', remove: 'Remover', active: 'Ativa', ready: 'Baixada, desativada', none: 'Não baixada',
              downloading: 'Baixando', loading: 'Carregando a voz…', retry: 'Tentar de novo', fail: 'Voz neural indisponível agora; usando a voz do navegador.',
              confirm: 'Baixar a voz neural (~60 MB)?\n\nOs arquivos vêm de: huggingface.co (modelo), cdn.jsdelivr.net (fonemas) e cdnjs.cloudflare.com (motor).\nSó esses arquivos são baixados: o texto que você lê não sai do aparelho.\n\nContinuar?',
              unsupported: 'Este navegador não suporta a voz neural local.' },
        en: { h: 'LOCAL NEURAL VOICE (OPTIONAL)',
              intro: 'A higher-quality synthetic voice that runs on this device (Piper). Downloads about 60 MB per language, once; afterwards it works offline. The text you read is never sent to anyone.',
              download: 'Download and enable', on: 'Enable', off: 'Disable', remove: 'Remove', active: 'On', ready: 'Downloaded, off', none: 'Not downloaded',
              downloading: 'Downloading', loading: 'Loading the voice…', retry: 'Try again', fail: 'Neural voice unavailable right now; using the browser voice.',
              confirm: 'Download the neural voice (~60 MB)?\n\nFiles come from: huggingface.co (model), cdn.jsdelivr.net (phonemes) and cdnjs.cloudflare.com (engine).\nOnly those files are downloaded: the text you read never leaves this device.\n\nContinue?',
              unsupported: 'This browser does not support the local neural voice.' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

    /* ------------------------------------------------------------------ preferências */
    let prefs = { en: { on: false, voice: VOICES.en[0][0] }, pt: { on: false, voice: VOICES.pt[0][0] }, ready: {} };
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) prefs = Object.assign(prefs, s, { en: Object.assign(prefs.en, s.en), pt: Object.assign(prefs.pt, s.pt), ready: s.ready || {} }); } catch (e) { /* sem storage */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignora */ } };
    const supported = () => !!window.DD_NEURAL_FACTORY || (typeof WebAssembly === 'object' && !!(navigator.storage && navigator.storage.getDirectory));
    const voiceOf = (lang) => prefs[lang].voice;
    const failed = {};      // desligada nesta sessão por falha
    const active = (lang) => !!(prefs[lang] && prefs[lang].on && prefs.ready[voiceOf(lang)] && !failed[lang] && supported());

    /* ------------------------------------------------------------------ biblioteca e síntese */
    let lib = null, libP = null;
    function loadLib() {
        if (lib) return Promise.resolve(lib);
        if (!libP) libP = (window.DD_NEURAL_FACTORY ? Promise.resolve(window.DD_NEURAL_FACTORY()) : import(LIB)).then((m) => { lib = m; return m; }).catch((e) => { libP = null; throw e; });
        return libP;
    }
    const sessions = {};
    function session(voiceId) {
        if (!sessions[voiceId]) {
            sessions[voiceId] = loadLib().then(async (m) => {
                if (!window.DD_NEURAL_FACTORY) {         // modelo apagado do navegador? não baixar escondido: avisar
                    const have = await m.stored();
                    if (have.indexOf(voiceId) < 0) { prefs.ready[voiceId] = false; save(); throw new Error('modelo ausente'); }
                }
                return m.TtsSession.create({ voiceId });
            }).catch((e) => { delete sessions[voiceId]; throw e; });
        }
        return sessions[voiceId];
    }
    // fila única (um modelo por vez) + cache das últimas frases
    let chain = Promise.resolve();
    const cache = new Map();
    function synth(text, lang) {
        const k = voiceOf(lang) + '|' + text;
        if (cache.has(k)) return cache.get(k);
        const p = chain.then(async () => { const s = await session(voiceOf(lang)); return URL.createObjectURL(await s.predict(text)); });
        chain = p.catch(() => {});
        cache.set(k, p);
        p.catch(() => cache.delete(k));
        if (cache.size > 30) { const old = cache.keys().next().value; const op = cache.get(old); cache.delete(old); op.then((u) => URL.revokeObjectURL(u)).catch(() => {}); }
        return p;
    }

    /* ------------------------------------------------------------------ reprodução */
    let cur = null, tok = 0;
    function stopAudio() {
        tok++;
        if (cur) { const c = cur; cur = null; c.a.pause(); clearInterval(c.timer); c.res('cancel'); }
    }
    function fail(lang, e) {
        failed[lang] = true;
        console.warn('[voz neural]', e);
        const s = D.$('lb-status'); if (s) s.textContent = t('fail');
        render();
    }
    async function speak(text, lang, rate, onProg) {
        const my = ++tok;
        let url;
        try { url = await synth(text, lang); } catch (e) { fail(lang, e); return 'fallback'; }
        if (my !== tok) return 'cancel';
        return new Promise((res) => {
            const a = new Audio(url);
            a.playbackRate = rate || 1; a.preservesPitch = true;
            const c = { a, res, timer: 0 };
            cur = c;
            const done = (r) => { clearInterval(c.timer); if (cur === c) cur = null; res(r); };
            a.onplay = () => {
                c.timer = setInterval(() => { if (onProg && a.duration) onProg(Math.min(text.length - 1, Math.floor(a.currentTime / a.duration * text.length)), text.length); }, 60);
            };
            a.onended = () => done('end');
            a.onerror = () => { fail(lang, new Error('áudio')); done('fallback'); };
            a.play().catch((e) => { done('fallback'); });
        });
    }
    D.neural = { active, speak, stop: stopAudio };
    D.on('stop', stopAudio);
    D.on('restartspeech', stopAudio);

    // prepara as próximas frases enquanto a atual toca
    D.on('sentence', ({ p, s }) => {
        const lang = D.state.audioLang, doc = D.doc;
        if (!doc || !active(lang)) return;
        let n = 0, pp = p, ss = s + 1;
        while (n < 2 && pp < doc.paras.length) {
            if (ss >= doc.paras[pp].s.length) { pp++; ss = 0; continue; }
            const txt = lang === doc.lang ? doc.paras[pp].s[ss] : (doc.tr[pp] && doc.tr[pp][ss]);
            if (txt && /\p{L}/u.test(txt)) synth(txt, lang).catch(() => {});
            n++; ss++;
        }
    });

    /* ------------------------------------------------------------------ painel na biblioteca */
    const box = el('div', 'lb-neural'); box.id = 'lb-neural';
    const anchor = D.$('lb-voice');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    const busy = {};      // lang -> { text }
    const errs = {};

    async function download(lang) {
        const id = voiceOf(lang);
        if (!window.DD_NEURAL_FACTORY && !confirm(t('confirm'))) return;
        errs[lang] = ''; busy[lang] = { text: t('downloading') + ' 0%' }; render();
        try {
            const m = await loadLib();
            let last = -1;
            // Cria a sessão da voz: baixa o modelo, grava no navegador (esperando terminar) e carrega. Não usamos m.download():
            // ele grava sem esperar e a leitura seguinte não acha o arquivo.
            delete sessions[id];
            sessions[id] = m.TtsSession.create({ voiceId: id, progress: (p) => { const pc = p && p.total ? Math.round(p.loaded / p.total * 100) : 0; if (pc !== last) { last = pc; busy[lang] = { text: t('downloading') + ' ' + pc + '%' }; render(); } } });
            await sessions[id];
            prefs.ready[id] = true; prefs[lang].on = true; failed[lang] = false; save();
            busy[lang] = { text: t('loading') }; render();
            const url = await synth(SAMPLE[lang], lang);       // confere que funciona e já fala uma amostra
            const a = new Audio(url); a.play().catch(() => {});
        } catch (e) {
            errs[lang] = String(e && e.message ? e.message : e);
            delete sessions[id];
            prefs.ready[id] = false; prefs[lang].on = false; save();
        }
        delete busy[lang]; render();
    }
    async function removeVoice(lang) {
        const id = voiceOf(lang);
        try { const m = await loadLib(); await m.remove(id); } catch (e) { /* ignora */ }
        prefs.ready[id] = false; prefs[lang].on = false; delete sessions[id]; cache.clear(); save(); render();
    }

    function render() {
        box.textContent = '';
        box.append(el('h3', 'lb-group', t('h')), el('p', 'lb-note', t('intro')));
        if (!supported()) { box.append(el('p', 'lb-note', t('unsupported'))); return; }
        ['pt', 'en'].forEach((lang) => {
            const row = el('div', 'lb-eng-row');
            row.append(el('strong', null, D.langName(lang)));
            const sel = el('select', 'lb-input');
            VOICES[lang].forEach(([id, name]) => { const o = el('option', null, name); o.value = id; sel.appendChild(o); });
            sel.value = voiceOf(lang);
            sel.disabled = !!busy[lang];
            sel.onchange = () => { prefs[lang].voice = sel.value; prefs[lang].on = !!prefs.ready[sel.value] && prefs[lang].on; save(); render(); };
            row.appendChild(sel);
            const ready = !!prefs.ready[voiceOf(lang)];
            const st = el('span', 'lb-eng-st', busy[lang] ? busy[lang].text : failed[lang] ? t('fail') : ready ? (prefs[lang].on ? '★ ' + t('active') : t('ready')) : t('none'));
            row.appendChild(st);
            const mk = (label, fn, cls) => { const b = el('button', 'lb-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; return b; };
            if (!busy[lang]) {
                if (!ready) row.appendChild(mk(errs[lang] || failed[lang] ? t('retry') : t('download'), () => { failed[lang] = false; download(lang); }, 'lb-primary'));
                else {
                    row.appendChild(mk(prefs[lang].on && !failed[lang] ? t('off') : t('on'), () => { failed[lang] = false; prefs[lang].on = !(prefs[lang].on && !failed[lang]); save(); render(); }));
                    row.appendChild(mk(t('remove'), () => removeVoice(lang)));
                }
            }
            if (errs[lang]) row.appendChild(el('span', 'lb-eng-err', errs[lang]));
            box.appendChild(row);
        });
    }
    D.on('lang', render);
    render();
    window.__ddVoz = { prefs: () => prefs, synth, active, download, VOICES, get cur() { return cur; }, get errs() { return errs; }, get failed() { return failed; } };
})();
