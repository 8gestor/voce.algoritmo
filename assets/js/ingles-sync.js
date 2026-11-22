/*
 * ingles-sync.js — guarda o PROGRESSO na nuvem para usar o estudo em qualquer aparelho (PC, celular, tablet, TV, leitor de e-books)
 * sem perder o histórico. Local primeiro: tudo continua funcionando e salvando no aparelho; a nuvem só COPIA e MESCLA o progresso.
 *
 * O que sincroniza (pequeno, sem direitos autorais): estatísticas por dia, vocabulário (cartões e repetição espaçada), posição de leitura e
 * palavras ouvidas de cada livro (casadas por título + idioma), histórico do roteiro e do dia, textos de escrita. O TEXTO dos livros que você
 * envia NUNCA sai do aparelho; os livros do roteiro vêm do próprio site em qualquer aparelho.
 * Mescla sem perder nada: dia/campo = maior valor; cartão = o mais revisado; livro = a posição mais recente e o maior nº de palavras ouvidas;
 * listas = união. Nuvem: Supabase (Postgres + login por código enviado ao e-mail), pela API REST com fetch, sem biblioteca e sem build.
 * Configuração em assets/js/sync-config.js (url e chave pública anon; vazios = recurso desligado, o site segue normal). Ver supabase/LEIAME.md.
 * API: DDLab.sync = { merge, snapshot, apply, run, status }.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const conf = () => window.DD_SYNC || {};                      // lido na hora de usar (a configuração pode chegar depois)
    const isOn = () => !!(conf().url && conf().key);
    const K = { log: 'dd-ingles-log', diaHist: 'dd-ingles-dia-hist', semHist: 'dd-ingles-semana-hist', escrita: 'dd-ingles-escrita' };
    const SK = 'dd-sync-sess', LK = 'dd-sync-last', DK = 'dd-sync-device';
    const jget = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } };
    const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem storage */ } };
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); };
    let deviceId = '';
    try { deviceId = localStorage.getItem(DK) || ''; if (!deviceId) { deviceId = 'd' + Math.random().toString(36).slice(2, 10); localStorage.setItem(DK, deviceId); } } catch (e) { deviceId = 'd0'; }

    /* ------------------------------------------------------------ mesclar (puro: não mexe em nada fora do que recebe) */
    function mergeLog(a, b) {
        const out = { d: {} };
        [a, b].forEach((l) => Object.keys((l && l.d) || {}).forEach((day) => {
            const r = out.d[day] || (out.d[day] = {}), s = l.d[day] || {};
            Object.keys(s).forEach((f) => { if (typeof s[f] === 'number') r[f] = Math.max(r[f] || 0, s[f]); });
        }));
        return out;
    }
    function mergeList(a, b, keyOf) {
        const out = [], seen = new Set();
        (Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []).forEach((x) => { const k = keyOf(x); if (!seen.has(k)) { seen.add(k); out.push(x); } });
        return out;
    }
    function mergeAny(a, b) {                                   // histórico do dia: lista (união) ou mapa (união de chaves, o local manda)
        if (Array.isArray(a) || Array.isArray(b)) return mergeList(a, b, (x) => JSON.stringify(x));
        if (a && typeof a === 'object') return Object.assign({}, b && typeof b === 'object' ? b : {}, a);
        return b == null ? a : b;
    }
    const cardScore = (c) => (c.reps || 0) + (c.lapses || 0);
    function mergeVocab(a, b) {
        const m = new Map();
        (a || []).concat(b || []).forEach((c) => { if (!c || !c.id) return; const o = m.get(c.id); if (!o || cardScore(c) > cardScore(o) || (cardScore(c) === cardScore(o) && (c.due || 0) > (o.due || 0))) m.set(c.id, c); });
        return Array.from(m.values());
    }
    function mergeDocs(a, b) {
        const out = {};
        [a, b].forEach((o) => Object.keys(o || {}).forEach((k) => {
            const x = o[k], y = out[k];
            if (!y) { out[k] = Object.assign({}, x); return; }
            const newer = (x.savedAt || 0) > (y.savedAt || 0) ? x : y;
            out[k] = Object.assign({}, y, newer, { heard: Math.max(x.heard || 0, y.heard || 0), savedAt: Math.max(x.savedAt || 0, y.savedAt || 0) });
        }));
        return out;
    }
    function merge(a, b) {
        a = a || {}; b = b || {};
        return {
            v: 1, at: Date.now(), device: deviceId,
            log: mergeLog(a.log, b.log),
            diaHist: mergeAny(a.diaHist, b.diaHist),
            semHist: mergeList(a.semHist, b.semHist, (x) => JSON.stringify(x)),
            escrita: mergeList(a.escrita, b.escrita, (x) => (x && (x.date + '|' + (x.kind || '') + '|' + (x.title || '') + '|' + String(x.text || '').slice(0, 80)))).slice(-200),
            vocab: mergeVocab(a.vocab, b.vocab),
            docs: mergeDocs(a.docs, b.docs)
        };
    }

    /* ------------------------------------------------------------ ler e gravar o estado local */
    async function snapshot() {
        const metas = await D.db.all('meta').catch(() => []), docs = {};
        (metas || []).forEach((m) => { docs[norm(m.title) + '|' + m.lang] = { title: m.title, lang: m.lang, pos: m.pos || 0, heard: m.heard || 0, words: m.words || 0, sentences: m.sentences || 0, savedAt: m.savedAt || m.lastOpened || 0 }; });
        const vocab = await D.db.all('vocab').catch(() => []);
        return { v: 1, at: Date.now(), device: deviceId, log: jget(K.log, { d: {} }), diaHist: jget(K.diaHist, null), semHist: jget(K.semHist, []), escrita: jget(K.escrita, []), vocab: vocab || [], docs };
    }
    const stable = (s) => JSON.stringify({ log: s.log, diaHist: s.diaHist, semHist: s.semHist, escrita: s.escrita, vocab: (s.vocab || []).slice().sort((x, y) => (x.id < y.id ? -1 : 1)), docs: s.docs });
    async function apply(m) {
        if (JSON.stringify(m.log) !== JSON.stringify(jget(K.log, { d: {} }))) jset(K.log, m.log);
        if (m.diaHist != null && JSON.stringify(m.diaHist) !== JSON.stringify(jget(K.diaHist, null))) jset(K.diaHist, m.diaHist);
        if (JSON.stringify(m.semHist) !== JSON.stringify(jget(K.semHist, []))) jset(K.semHist, m.semHist);
        if (JSON.stringify(m.escrita) !== JSON.stringify(jget(K.escrita, []))) jset(K.escrita, m.escrita);
        const have = new Map(((await D.db.all('vocab').catch(() => [])) || []).map((c) => [c.id, c]));
        for (const c of m.vocab || []) { const o = have.get(c.id); if (!o || JSON.stringify(o) !== JSON.stringify(c)) { try { await D.db.put('vocab', c); } catch (e) { /* ignora */ } } }
        const metas = (await D.db.all('meta').catch(() => [])) || [];
        for (const meta of metas) {
            const r = m.docs[norm(meta.title) + '|' + meta.lang];
            if (!r || (D.doc && D.doc.id === meta.id)) continue;               // o livro aberto agora não muda por baixo do leitor
            if ((r.savedAt || 0) > (meta.savedAt || 0) || (r.heard || 0) > (meta.heard || 0)) {
                const upd = Object.assign({}, meta, { heard: Math.max(meta.heard || 0, r.heard || 0) });
                if ((r.savedAt || 0) > (meta.savedAt || 0)) { upd.pos = r.pos; upd.savedAt = r.savedAt; }
                try { await D.db.put('meta', upd); } catch (e) { /* ignora */ }
            }
        }
        try { if (D.renderDocs && !D.doc) D.renderDocs(); } catch (e) { /* ignora */ }
    }

    /* ------------------------------------------------------------ nuvem (Supabase pela API REST, sem biblioteca) */
    let sess = jget(SK, null), busy = false, lastAt = jget(LK, { at: 0, hash: '' }), state = sess ? 'in' : 'out', msg = '', pendingEmail = '';
    const base = () => String(conf().url || '').replace(/\/+$/, '');
    async function http(path, opt, authed) {
        const o = opt || {}, headers = Object.assign({ apikey: conf().key, 'Content-Type': 'application/json' }, o.headers || {});
        if (authed) { await ensureToken(); headers.Authorization = 'Bearer ' + (sess ? sess.access_token : conf().key); }
        const r = await fetch(base() + path, { method: o.method || 'GET', headers, body: o.body ? JSON.stringify(o.body) : undefined });
        let j = null; try { j = await r.json(); } catch (e) { /* sem corpo */ }
        return { ok: r.ok, status: r.status, json: j };
    }
    function keepSession(j) {
        if (!j || !j.access_token) return false;
        sess = { access_token: j.access_token, refresh_token: j.refresh_token || (sess && sess.refresh_token), expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000, uid: (j.user && j.user.id) || (sess && sess.uid), email: (j.user && j.user.email) || (sess && sess.email) || pendingEmail };
        jset(SK, sess); return true;
    }
    async function ensureToken() {
        if (!sess || sess.expires_at - Date.now() > 60000) return;
        const r = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: sess.refresh_token } }, false);
        if (r.ok && keepSession(r.json)) return;
        if (r.status === 400 || r.status === 401) { sess = null; try { localStorage.removeItem(SK); } catch (e) { /* ignora */ } state = 'out'; throw new Error('session'); }
        throw new Error('rede');
    }
    async function sendCode(email) {
        pendingEmail = email;
        const r = await http('/auth/v1/otp', { method: 'POST', body: { email, create_user: true } }, false);
        return r.ok;
    }
    async function verify(email, code) {
        let r = await http('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token: code } }, false);
        if (!r.ok) r = await http('/auth/v1/verify', { method: 'POST', body: { type: 'magiclink', email, token: code } }, false);
        if (!r.ok) r = await http('/auth/v1/verify', { method: 'POST', body: { type: 'signup', email, token: code } }, false);      // conta nova: o e-mail de confirmação também traz o código
        return r.ok && keepSession(r.json);
    }
    async function getRow() {
        const r = await http('/rest/v1/progress?select=data,updated_at&limit=1', {}, true);
        if (!r.ok) throw new Error('get ' + r.status);
        return Array.isArray(r.json) && r.json[0] ? r.json[0] : null;
    }
    async function putRow(data, prev) {
        const now = new Date().toISOString();
        if (!prev) {
            const r = await http('/rest/v1/progress', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { user_id: sess.uid, data, device: deviceId, updated_at: now } }, true);
            if (r.status === 409) return false;                                       // outro aparelho criou antes: relê e mescla
            if (!r.ok) throw new Error('post ' + r.status);
            return true;
        }
        const r = await http('/rest/v1/progress?user_id=eq.' + encodeURIComponent(sess.uid) + '&updated_at=eq.' + encodeURIComponent(prev), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { data, device: deviceId, updated_at: now } }, true);
        if (!r.ok) throw new Error('patch ' + r.status);
        return Array.isArray(r.json) && r.json.length > 0;                            // vazio = outro aparelho gravou no meio: relê e mescla
    }
    async function run(reason) {
        if (!isOn() || !sess || busy) return false;
        busy = true; state = 'sync'; paint();
        try {
            try { D.flush(); } catch (e) { /* ignora */ }
            for (let attempt = 0; attempt < 4; attempt++) {
                const row = await getRow(), local = await snapshot();
                const merged = row ? merge(local, row.data) : local;
                await apply(merged);
                const final = await snapshot(), h = hash(stable(final));
                if (row && hash(stable(merge(final, row.data))) === hash(stable(row.data)) && h === hash(stable(row.data))) { lastAt = { at: Date.now(), hash: h }; jset(LK, lastAt); state = 'in'; msg = ''; busy = false; paint(); return true; }
                if (await putRow(merge(final, row ? row.data : null), row ? row.updated_at : null)) { lastAt = { at: Date.now(), hash: h }; jset(LK, lastAt); state = 'in'; msg = ''; busy = false; paint(); return true; }
            }
            throw new Error('conflito');
        } catch (e) {
            state = sess ? 'in' : 'out'; msg = String(e && e.message) === 'session' ? 'session' : 'offline';
        }
        busy = false; paint(); return false;
    }
    let timer = null;
    const soon = (ms) => { if (!isOn() || !sess) return; clearTimeout(timer); timer = setTimeout(() => run('evento'), ms); };

    /* ------------------------------------------------------------ tela: "Conta e sincronização" na página da Biblioteca */
    const L = {
        pt: { h: 'Conta e sincronização', off: 'A sincronização ainda não foi ativada neste site. O progresso fica salvo neste aparelho.', out: 'Entre para levar o progresso para o celular, o tablet e outros aparelhos. Só o progresso é enviado (nunca o texto dos livros).', email: 'Seu e-mail', send: 'Enviar código', code: 'Código recebido por e-mail', enter: 'Entrar', sent: 'Código enviado. Digite os 6 dígitos que chegaram no seu e-mail.', bad: 'Código inválido ou vencido.', fail: 'Não foi possível enviar o código. Confira o e-mail e a conexão.', in: 'Conectado', as: 'como', last: 'Última sincronização', never: 'ainda não', now: 'Sincronizar agora', out2: 'Sair', syncing: 'Sincronizando…', offline: 'Sem conexão: o progresso continua salvo aqui e sobe quando voltar.', session: 'A sessão venceu. Entre de novo.', ok: 'Tudo sincronizado.' },
        en: { h: 'Account and sync', off: 'Sync has not been turned on for this site yet. Progress stays saved on this device.', out: 'Sign in to take your progress to your phone, tablet and other devices. Only progress is sent (never the text of books).', email: 'Your email', send: 'Send code', code: 'Code received by email', enter: 'Sign in', sent: 'Code sent. Type the 6 digits that arrived in your email.', bad: 'Invalid or expired code.', fail: 'The code could not be sent. Check the email and your connection.', in: 'Signed in', as: 'as', last: 'Last sync', never: 'not yet', now: 'Sync now', out2: 'Sign out', syncing: 'Syncing…', offline: 'Offline: progress stays saved here and uploads when you are back.', session: 'The session expired. Sign in again.', ok: 'Everything synced.' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const box = el('section', 'lb-sync'); box.id = 'lb-sync';
    const h2 = el('h2', 'lb-head'), line = el('p', 'lb-sync-line'), form = el('div', 'lb-sync-form');
    const inEmail = el('input', 'lb-input'), bSend = el('button', 'lb-btn'), inCode = el('input', 'lb-input'), bEnter = el('button', 'lb-btn');
    const bNow = el('button', 'lb-btn'), bOut = el('button', 'lb-btn'), status = el('p', 'lb-sync-status');
    inEmail.type = 'email'; inEmail.autocomplete = 'email'; inEmail.id = 'lb-sync-email'; inCode.inputMode = 'numeric'; inCode.autocomplete = 'one-time-code'; inCode.maxLength = 8; inCode.id = 'lb-sync-code';
    [bSend, bEnter, bNow, bOut].forEach((b) => { b.type = 'button'; });
    bSend.id = 'lb-sync-send'; bEnter.id = 'lb-sync-enter'; bNow.id = 'lb-sync-now'; bOut.id = 'lb-sync-out';
    form.append(inEmail, bSend, inCode, bEnter, bNow, bOut);
    box.append(h2, line, form, status);
    function host() { return D.$('lb-library'); }
    function paint() {
        const h = host(); if (h && box.parentNode !== h) h.appendChild(box);
        h2.textContent = t('h');
        inEmail.placeholder = t('email'); inCode.placeholder = t('code'); bSend.textContent = t('send'); bEnter.textContent = t('enter'); bNow.textContent = t('now'); bOut.textContent = t('out2');
        const off = !isOn(), outS = !off && state === 'out', code = outS && !!pendingEmail && msg === 'sent', inS = !off && (state === 'in' || state === 'sync');
        inEmail.hidden = bSend.hidden = !outS; inCode.hidden = bEnter.hidden = !code; bNow.hidden = bOut.hidden = !inS;
        if (off) line.textContent = t('off');
        else if (outS) line.textContent = t('out');
        else line.textContent = t('in') + ' ' + t('as') + ' ' + ((sess && sess.email) || '') + ' · ' + t('last') + ': ' + (lastAt.at ? new Date(lastAt.at).toLocaleString(D.state.readLang === 'en' ? 'en-US' : 'pt-BR') : t('never'));
        status.textContent = state === 'sync' ? t('syncing') : msg === 'sent' ? t('sent') : msg && L[D.state.readLang][msg] ? t(msg) : (inS && lastAt.at ? t('ok') : '');
        bNow.disabled = state === 'sync';
        box.dataset.state = state;
    }
    bSend.addEventListener('click', async () => {
        const email = inEmail.value.trim(); if (!/.+@.+\..+/.test(email)) { msg = 'fail'; paint(); return; }
        bSend.disabled = true; let ok = false; try { ok = await sendCode(email); } catch (e) { ok = false; }
        bSend.disabled = false; msg = ok ? 'sent' : 'fail'; if (!ok) pendingEmail = ''; paint();
    });
    bEnter.addEventListener('click', async () => {
        bEnter.disabled = true; let ok = false; try { ok = await verify(pendingEmail, inCode.value.trim()); } catch (e) { ok = false; }
        bEnter.disabled = false;
        if (ok) { state = 'in'; msg = ''; pendingEmail = ''; inCode.value = ''; paint(); run('login'); } else { msg = 'bad'; paint(); }
    });
    bNow.addEventListener('click', () => run('manual'));
    bOut.addEventListener('click', () => { sess = null; try { localStorage.removeItem(SK); } catch (e) { /* ignora */ } state = 'out'; msg = ''; pendingEmail = ''; paint(); });

    /* ------------------------------------------------------------ quando sincronizar */
    D.on('close', () => soon(2500)); D.on('vocab-saved', () => soon(15000)); D.on('reviewed', () => soon(15000)); D.on('written', () => soon(5000)); D.on('imported', () => soon(5000));
    D.on('lang', paint); D.on('open', paint);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') soon(200); else soon(500); });
    setInterval(() => { if (document.visibilityState === 'visible' && sess && !busy) snapshot().then((s) => { if (hash(stable(s)) !== lastAt.hash) run('periodico'); }).catch(() => {}); }, 60000);
    D.sync = { merge, snapshot, apply, run, status: () => ({ state, msg, configured: isOn(), signedIn: !!sess }), _test: { sendCode, verify } };
    paint();
    if (isOn() && sess) soon(1500);
})();
