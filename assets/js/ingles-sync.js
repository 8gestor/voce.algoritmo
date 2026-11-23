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
    const SK = 'dd-sync-sess', LK = 'dd-sync-last', DK = 'dd-sync-device', PK = 'dd-ingles-pend-docs';   // PK: posição/palavras ouvidas de livros que ainda não estão neste aparelho (vindas de um arquivo de backup); aplicadas quando o livro entrar
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
        const pend = jget(PK, {});
        const docsAll = Object.keys(pend).length ? mergeDocs(pend, docs) : docs;                  // o que veio de backup e ainda não tem livro aqui também vai para a nuvem e para novos backups
        return { v: 1, at: Date.now(), device: deviceId, log: jget(K.log, { d: {} }), diaHist: jget(K.diaHist, null), semHist: jget(K.semHist, []), escrita: jget(K.escrita, []), vocab: vocab || [], docs: docsAll };
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
    let lastErr = '';                                              // motivo técnico da última falha (aparece na tela para facilitar achar o problema)
    const why = (r) => r.status + ((r.json && (r.json.msg || r.json.message || r.json.error_description || r.json.error_code || r.json.error)) ? ': ' + (r.json.msg || r.json.message || r.json.error_description || r.json.error_code || r.json.error) : '');
    async function sendCode(email) {
        pendingEmail = email; lastErr = '';
        const r = await http('/auth/v1/otp', { method: 'POST', body: { email, create_user: true } }, false);
        if (!r.ok) lastErr = why(r);
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
        status.textContent = state === 'sync' ? t('syncing') : msg === 'sent' ? t('sent') : msg === 'fail' && lastErr ? t('fail') + ' (' + lastErr + ')' : msg && L[D.state.readLang][msg] ? t(msg) : (inS && lastAt.at ? t('ok') : '');
        bNow.disabled = state === 'sync';
        box.dataset.state = state;
        paintBackup();
    }
    bSend.addEventListener('click', async () => {
        const email = inEmail.value.trim(); if (!/.+@.+\..+/.test(email)) { msg = 'fail'; paint(); return; }
        bSend.disabled = true; let ok = false; try { ok = await sendCode(email); } catch (e) { ok = false; lastErr = (D.state.readLang === 'en' ? 'network: ' : 'rede: ') + String(e && e.message || e); }
        bSend.disabled = false; msg = ok ? 'sent' : 'fail'; if (!ok) pendingEmail = ''; paint();
    });
    bEnter.addEventListener('click', async () => {
        bEnter.disabled = true; let ok = false; try { ok = await verify(pendingEmail, inCode.value.trim()); } catch (e) { ok = false; }
        bEnter.disabled = false;
        if (ok) { state = 'in'; msg = ''; pendingEmail = ''; inCode.value = ''; paint(); run('login'); } else { msg = 'bad'; paint(); }
    });
    bNow.addEventListener('click', () => run('manual'));
    bOut.addEventListener('click', () => { sess = null; try { localStorage.removeItem(SK); } catch (e) { /* ignora */ } state = 'out'; msg = ''; pendingEmail = ''; paint(); });

    /* ------------------------------------------------------------ backup do progresso em arquivo (levar o progresso de um site/aparelho para outro, sem conta)
     * Exportar = o mesmo snapshot() da nuvem (sem o texto dos livros), embrulhado em { app, v, exportedAt, data }.
     * Importar = merge() com o que já existe aqui (nunca apaga: maior valor, cartão mais revisado, posição mais recente, listas em união).
     * Funciona em qualquer aparelho: baixar arquivo, carregar arquivo ou copiar/colar o texto (leitor de e-books e TV nem sempre baixam arquivos). */
    const BK_APP = 'ingles-progresso';
    const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
    function cleanBackup(raw) {                                      // valida e normaliza um arquivo de backup; devolve null se não for um backup nosso
        let o = raw; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { return null; } }
        if (!isObj(o) || o.app !== BK_APP || o.v !== 1 || !isObj(o.data)) return null;
        const d = o.data;
        return {
            v: 1, at: Date.now(), device: String(d.device || ''),
            log: isObj(d.log) && isObj(d.log.d) ? d.log : { d: {} },
            diaHist: d.diaHist == null ? null : d.diaHist,
            semHist: Array.isArray(d.semHist) ? d.semHist : [],
            escrita: Array.isArray(d.escrita) ? d.escrita : [],
            vocab: (Array.isArray(d.vocab) ? d.vocab : []).filter((c) => c && typeof c.id === 'string'),
            docs: isObj(d.docs) ? d.docs : {}
        };
    }
    async function exportData() {
        const s = await snapshot();
        return JSON.stringify({ app: BK_APP, v: 1, exportedAt: new Date().toISOString(), data: s });
    }
    async function applyPending() {                                  // livros que entraram depois do backup recebem a posição e as palavras ouvidas guardadas
        const pend = jget(PK, {}); if (!Object.keys(pend).length) return;
        await apply(await snapshot());
        const metas = (await D.db.all('meta').catch(() => [])) || [], left = {};
        Object.keys(pend).forEach((k) => {
            const m = metas.find((x) => norm(x.title) + '|' + x.lang === k), r = pend[k];
            if (!m || (r.savedAt || 0) > (m.savedAt || 0) || (r.heard || 0) > (m.heard || 0)) left[k] = r;      // ainda há o que aplicar (ex.: o livro está aberto agora)
        });
        jset(PK, left);
    }
    async function importData(raw) {
        const inc = cleanBackup(raw); if (!inc) throw new Error('formato');
        const before = await snapshot();
        const merged = merge(before, inc);
        const have = new Set(((await D.db.all('meta').catch(() => [])) || []).map((m) => norm(m.title) + '|' + m.lang));
        const pend = jget(PK, {}); Object.keys(merged.docs).forEach((k) => { if (!have.has(k)) pend[k] = merged.docs[k]; });
        jset(PK, pend);                                                  // guarda antes de aplicar: se algo falhar no meio, nada se perde
        await apply(merged);
        await applyPending();
        const after = await snapshot();
        return { days: Object.keys(after.log.d || {}).length - Object.keys(before.log.d || {}).length, cards: after.vocab.length - before.vocab.length, books: Object.keys(inc.docs).length, daysTotal: Object.keys(after.log.d || {}).length };
    }
    const LB = {
        pt: { h: 'Backup do progresso (arquivo)', p: 'Leve o seu progresso de um site ou aparelho para outro, sem precisar de conta: baixe o arquivo aqui e carregue lá. Nada é apagado, os dados são somados. O texto dos livros não vai no arquivo.', dl: 'Baixar progresso', up: 'Carregar progresso', paste: 'Colar texto', go: 'Importar texto colado', ph: 'Cole aqui o conteúdo do arquivo de progresso', done: 'Progresso carregado', days: 'dias de estudo', cards: 'palavras salvas novas', books: 'livros com posição guardada (aplicada quando o livro entrar na biblioteca)', saved: 'Arquivo gerado.', copy: 'Este aparelho não baixa arquivos. Copie o texto abaixo e guarde (ou cole no outro aparelho).', bad: 'Este arquivo não é um backup de progresso deste site.', fail: 'Não foi possível ler o arquivo.' },
        en: { h: 'Progress backup (file)', p: 'Take your progress from one site or device to another without an account: download the file here and load it there. Nothing is deleted, data is added together. Book text is not in the file.', dl: 'Download progress', up: 'Load progress', paste: 'Paste text', go: 'Import pasted text', ph: 'Paste the content of the progress file here', done: 'Progress loaded', days: 'study days', cards: 'new saved words', books: 'books with a saved position (applied when the book enters the library)', saved: 'File created.', copy: 'This device cannot download files. Copy the text below and keep it (or paste it on the other device).', bad: 'This file is not a progress backup for this site.', fail: 'The file could not be read.' }
    };
    const tb = (k) => LB[D.state.readLang][k];
    const bkBox = el('section', 'lb-sync'); bkBox.id = 'lb-backup';
    const bkH = el('h2', 'lb-head'), bkP = el('p', 'lb-sync-line'), bkForm = el('div', 'lb-sync-form'), bkSt = el('p', 'lb-sync-status');
    const bDl = el('button', 'lb-btn'), bUp = el('button', 'lb-btn'), bPaste = el('button', 'lb-btn'), bGo = el('button', 'lb-btn'), bkFile = el('input'), bkTxt = el('textarea', 'lb-input');
    [bDl, bUp, bPaste, bGo].forEach((b) => { b.type = 'button'; });
    bDl.id = 'lb-bk-down'; bUp.id = 'lb-bk-up'; bPaste.id = 'lb-bk-paste'; bGo.id = 'lb-bk-go'; bkFile.id = 'lb-bk-file'; bkTxt.id = 'lb-bk-text'; bkSt.id = 'lb-bk-status';
    bkFile.type = 'file'; bkFile.accept = '.json,application/json,text/plain'; bkFile.hidden = true;
    bkTxt.hidden = true; bkTxt.rows = 6; bkTxt.style.cssText = 'flex:1 1 100%;width:100%;font:12px/1.4 monospace;min-height:120px'; bGo.hidden = true;
    bkForm.append(bDl, bUp, bPaste, bkFile, bkTxt, bGo);
    bkBox.append(bkH, bkP, bkForm, bkSt);
    let bkMsg = null;                                                // { k: chave do texto, extra: texto a somar }
    function paintBackup() {
        const h = host(); if (h && bkBox.parentNode !== h) h.appendChild(bkBox);
        bkH.textContent = tb('h'); bkP.textContent = tb('p'); bDl.textContent = tb('dl'); bUp.textContent = tb('up'); bPaste.textContent = tb('paste'); bGo.textContent = tb('go'); bkTxt.placeholder = tb('ph');
        bkSt.textContent = bkMsg ? tb(bkMsg.k) + (bkMsg.extra ? ': ' + bkMsg.extra : '') : '';
    }
    function bkSay(k, extra) { bkMsg = { k, extra: extra || '' }; paintBackup(); }
    function bkReport(r) {
        const n = (x) => (x > 0 ? '+' + x : String(x));
        bkSay('done', n(r.days) + ' ' + tb('days') + ', ' + n(r.cards) + ' ' + tb('cards') + ', ' + r.books + ' ' + tb('books'));
    }
    async function bkImportText(txt) {
        try { bkReport(await importData(txt)); }
        catch (e) { bkSay(String(e && e.message) === 'formato' ? 'bad' : 'fail'); }
    }
    bDl.addEventListener('click', async () => {
        let txt = ''; try { txt = await exportData(); } catch (e) { bkSay('fail'); return; }
        let ok = false;
        try {
            if (window.Blob && window.URL && URL.createObjectURL) {
                const a = document.createElement('a'), u = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
                a.href = u; a.download = 'progresso-ingles-' + new Date().toISOString().slice(0, 10) + '.json'; a.style.display = 'none';
                document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); ok = typeof a.download === 'string';
            }
        } catch (e) { ok = false; }
        if (ok) bkSay('saved'); else { bkTxt.hidden = false; bkTxt.value = txt; bkTxt.select && bkTxt.select(); bkSay('copy'); }
    });
    bUp.addEventListener('click', () => { bkFile.value = ''; bkFile.click(); });
    bkFile.addEventListener('change', () => {
        const f = bkFile.files && bkFile.files[0]; if (!f) return;
        if (f.size > 8 * 1024 * 1024) { bkSay('bad'); return; }
        const rd = new FileReader(); rd.onload = () => bkImportText(String(rd.result || '')); rd.onerror = () => bkSay('fail'); rd.readAsText(f);
    });
    bPaste.addEventListener('click', () => { bkTxt.hidden = !bkTxt.hidden; bGo.hidden = bkTxt.hidden; if (!bkTxt.hidden) { bkTxt.value = ''; bkTxt.focus(); } });
    bGo.addEventListener('click', () => { const v = bkTxt.value.trim(); if (!v) { bkSay('bad'); return; } bkImportText(v); });

    /* ------------------------------------------------------------ quando sincronizar */    D.on('close', () => soon(2500)); D.on('vocab-saved', () => soon(15000)); D.on('reviewed', () => soon(15000)); D.on('written', () => soon(5000)); D.on('imported', (d) => {
        soon(5000);
        try {                                                         // livro novo que já tinha posição num backup: abre no ponto certo (o objeto passa por aqui antes de abrir)
            const pend = jget(PK, {}), k = d && norm(d.title) + '|' + d.lang, r = k && pend[k];
            if (r) { d.pos = Math.max(0, Math.min(r.pos | 0, ((d.paras || []).length || 1) - 1)); d.heard = Math.max(d.heard || 0, r.heard || 0); delete pend[k]; jset(PK, pend); }
        } catch (e) { /* ignora */ }
    });
    D.on('lang', paint); D.on('open', paint);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') soon(200); else soon(500); });
    setInterval(() => { if (document.visibilityState === 'visible' && sess && !busy) snapshot().then((s) => { if (hash(stable(s)) !== lastAt.hash) run('periodico'); }).catch(() => {}); }, 60000);
    D.sync = { merge, snapshot, apply, run, exportData, importData, applyPending, status: () => ({ state, msg, configured: isOn(), signedIn: !!sess }), _test: { sendCode, verify } };
    paint();
    if (isOn() && sess) soon(1500);
})();
