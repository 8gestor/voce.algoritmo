/*
 * trilha-jogo.js — a Trilha gamificada (só em trilha.html).
 *
 * Método (professor): aprender lendo, ouvindo, falando e escrevendo, sempre em contexto, sem cara de escola.
 *   Descobrir → ouve a cena e entende pelo contexto (traduz só depois de tentar)
 *   Notar     → o aluno descobre o padrão (inductive) antes de ler a regra; contraste PT × EN
 *   Praticar  → exercícios gerados dos blocos da cena; erro volta à fila e não pune
 *   Falar     → repete em voz alta (reconhecimento de voz do navegador, quando existe)
 *   Escrever  → produção guiada com checagem por regras; Professor virtual (IA local) corrige, se disponível
 * Jogo (engenheiro): mundos e missões; domínio 0–5 por palavra/bloco com revisão espaçada ("Revisão do dia"); XP e nível;
 *   sequência gentil (um escudo por semana); estrelas por precisão; chefão por mundo; conquistas. Sem ranking, sem vidas.
 * Avanço por evidência (planejamento): a missão seguinte abre com 1 estrela ou mais; sempre dá para "liberar mesmo assim".
 * Dados: currículo em trilha-conteudo.js (window.DD_CURRICULO); textos do aluno viram missões de leitura com o mesmo jogo.
 * Tudo local: progresso em localStorage (dd-jogo); nada sai do aparelho.
 */
(function () {
    'use strict';
    const D = window.DDLab, CUR = window.DD_CURRICULO;
    if (!D || !CUR || !window.DD_TRILHA) return;
    const KEY = 'dd-jogo', DAY = 86400000, INTERVALS = [0, 1, 2, 4, 8, 16];
    const now = () => (window.DD_NOW || Date.now());

    /* ------------------------------------------------------------ utilidades */
    const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const btn = (txt, fn, cls) => { const b = mk('button', 'lb-btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
    const rnd = () => (window.DD_RNG ? window.DD_RNG() : Math.random());
    const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
    const pickOne = (a) => a[Math.floor(rnd() * a.length)];
    const dayKey = (t) => { const d = new Date(t === undefined ? now() : t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const dayNum = (key) => { const p = key.split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / DAY); };

    /* ------------------------------------------------------------ comparar respostas em inglês */
    // contrações viram palavras inteiras, acento e pontuação saem: "I'm Ana." = "i am ana"
    function norm(s) {
        let x = String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'");
        x = x.replace(/\bcan't\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/\bi'm\b/g, 'i am')
            .replace(/\b(you|we|they)'re\b/g, '$1 are').replace(/\b(he|she|it|that|what|there|who|where|here|how)'s\b/g, '$1 is')
            .replace(/\b(i|you|he|she|we|they)'d\b/g, '$1 would').replace(/\b(i|you|we|they)'ve\b/g, '$1 have')
            .replace(/\b(i|you|he|she|we|they)'ll\b/g, '$1 will').replace(/(\w)n't\b/g, '$1 not');
        return x.replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const tokens = (s) => norm(s).split(' ').filter(Boolean);
    function editDist(a, b) {
        const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        return d[a.length][b.length];
    }
    // 'ok' | 'near' (uma letra fora num termo de 4+ letras) | 'bad'
    function accept(typed, variants) {
        const t = tokens(typed);
        if (!t.length) return 'bad';
        let near = false;
        for (const v of variants) {
            const w = tokens(v);
            if (w.length !== t.length) continue;
            let wrong = 0, okNear = true;
            for (let i = 0; i < w.length; i++) {
                if (w[i] === t[i]) continue;
                wrong++;
                if (w[i].length < 4 || editDist(w[i], t[i]) > 1) okNear = false;
            }
            if (!wrong) return 'ok';
            if (wrong === 1 && okNear) near = true;
        }
        return near ? 'near' : 'bad';
    }
    // quais palavras do alvo apareceram na fala (subsequência comum), para pintar acertos
    function diffWords(target, said) {
        const words = String(target).split(/\s+/).filter(Boolean), flat = [], owner = [];
        words.forEach((w, wi) => tokens(w).forEach((tk) => { flat.push(tk); owner.push(wi); }));
        const b = tokens(said), n = flat.length, m = b.length;
        const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = flat[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const hit = new Array(n).fill(false);
        let i = 0, j = 0;
        while (i < n && j < m) { if (flat[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
        const wordHit = words.map((w, wi) => { const idx = owner.map((o, k) => (o === wi ? k : -1)).filter((k) => k >= 0); return idx.length ? idx.every((k) => hit[k]) : true; });
        return { words, wordHit, score: n ? hit.filter(Boolean).length / n : 0 };
    }

    /* ------------------------------------------------------------ estado e persistência */
    const blankState = () => ({ v: 1, xp: 0, streak: { n: 0, last: '', shield: 1 }, missions: {}, items: {}, ach: {}, log: {}, texts: [], stats: { spoken: 0, written: 0, reviews: 0, bosses: 0 } });
    let S = blankState();
    try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && raw.v === 1) S = Object.assign(blankState(), raw); } catch (e) { /* sem storage */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignora */ } };
    const levelOf = (xp) => Math.floor(Math.sqrt(xp / 40)) + 1;
    const levelFloor = (lv) => 40 * (lv - 1) * (lv - 1);

    function touchDay() {
        const today = dayKey(), st = S.streak;
        if (st.last === today) return;
        if (!st.last) st.n = 1;
        else {
            const gap = dayNum(today) - dayNum(st.last);
            if (gap === 1) st.n++;
            else if (gap === 2 && st.shield > 0) { st.n++; st.shield--; }     // um escudo: faltar um dia não zera a sequência
            else st.n = 1;
            if (st.n > 0 && st.n % 7 === 0) st.shield = Math.min(2, st.shield + 1);
        }
        st.last = today;
    }
    // diário de atividade por dia (alimenta a linha do tempo da evolução)
    function logDay(field, n) {
        const k = dayKey(); S.log = S.log || {};
        const d = S.log[k] = S.log[k] || { xp: 0, ok: 0, bad: 0 };
        d[field] = (d[field] || 0) + n;
        const keys = Object.keys(S.log).sort(); while (keys.length > 120) delete S.log[keys.shift()];
    }
    function gain(n) {
        const before = levelOf(S.xp);
        S.xp += n; touchDay(); logDay('xp', n); save();
        if (levelOf(S.xp) > before) flash('Nível ' + levelOf(S.xp) + '! Você está evoluindo.');
        if (run) run.xp += n;
        renderHud();
    }

    // domínio 0–5 por item: acerto sobe e agenda a revisão mais longe; erro desce e volta hoje
    function ensureItem(key, data) {
        if (!S.items[key]) S.items[key] = Object.assign({ lvl: 0, due: now(), ok: 0, bad: 0 }, data);
        else Object.assign(S.items[key], data);
        return S.items[key];
    }
    function reviewItem(key, ok) {
        const it = S.items[key]; if (!it) return;
        if (ok) { it.lvl = Math.min(5, it.lvl + 1); it.ok++; it.due = now() + INTERVALS[it.lvl] * DAY; }
        else { it.lvl = Math.max(0, it.lvl - 1); it.bad++; it.due = now() + 10 * 60000; }
        logDay(ok ? 'ok' : 'bad', 1); save();
    }
    const dueItems = () => Object.keys(S.items).filter((k) => S.items[k].due <= now() && S.items[k].en && S.items[k].pt && !S.items[k].pattern).sort((a, b) => S.items[a].due - S.items[b].due);
    const masteredCount = () => Object.keys(S.items).filter((k) => S.items[k].lvl >= 2 && !S.items[k].pattern).length;

    /* ------------------------------------------------------------ explicação: português que vira inglês */
    // mundo 1: português (inglês opcional) · 2: português com inglês aberto · 3: inglês com português aberto · 4+: inglês (português opcional)
    function explain(obj, world) {
        if (!obj) return { main: '', aux: '', open: false };
        const enMain = world >= 3;
        return { main: (enMain ? obj.en : obj.pt) || obj.pt || obj.en || '', aux: (enMain ? obj.pt : obj.en) || '', open: world === 2 || world === 3 };
    }
    function explainNode(obj, world, cls) {
        const e = explain(obj, world), box = mk('div', cls || 'tj-explain');
        box.appendChild(mk('p', 'tj-main', e.main));
        if (e.aux && e.aux !== e.main) { const d = mk('details'); if (e.open) d.open = true; d.appendChild(mk('summary', null, world >= 3 ? 'Em português' : 'In English')); d.appendChild(mk('p', null, e.aux)); box.appendChild(d); }
        return box;
    }
    const txt = (o) => (o && (o.pt || o.en)) || '';

    /* ------------------------------------------------------------ voz: ouvir e falar */
    function say(text, slow) {
        const clean = String(text).replace(/…/g, '').replace(/\s*\/\s*/g, ', ');
        const old = D.state.rate;
        try { if (slow) D.state.rate = 0.7; D.say(clean, 'en'); } finally { D.state.rate = old; }
    }
    const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
    function listenOnce() {
        return new Promise((resolve, reject) => {
            let done = false;
            const fin = (v, bad) => { if (done) return; done = true; bad ? reject(v) : resolve(v); };
            try {
                const r = new (getSR())();
                r.lang = D.LANG_TAG.en; r.interimResults = false; r.maxAlternatives = 1;
                r.onresult = (e) => fin(e.results[0][0].transcript);
                r.onerror = (e) => fin((e && e.error) || 'erro', true);
                r.onnomatch = () => fin('');
                r.onend = () => fin('');
                r.start();
            } catch (e) { fin(e, true); }
        });
    }

    /* ------------------------------------------------------------ professor virtual (IA local do Chrome, opcional) */
    const AIOPTS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
    const ai = {
        async avail() { if (!('LanguageModel' in self)) return false; try { return (await self.LanguageModel.availability(AIOPTS)) !== 'unavailable'; } catch (e) { return false; } },
        async session(system) { return self.LanguageModel.create(Object.assign({ initialPrompts: [{ role: 'system', content: system }] }, AIOPTS)); },
        async correct(student, task) {
            const s = await this.session('You are a warm native English teacher for a Brazilian adult at A1 level. Be brief, concrete and kind. Never lecture.');
            return String(await s.prompt('Task given to the student: "' + task + '"\nStudent wrote: "' + student + '"\nShow the corrected sentence in English (if it is already correct, say so and praise it). Then explain the main mistake in at most 2 short sentences in Brazilian Portuguese.')).trim();
        },
        async react(answer, question) {
            const s = await this.session('You are a warm native English teacher talking with a Brazilian adult (A1-A2) about a text they just read. Reply in at most 2 very simple English sentences: react to what they said, then ask one short follow-up question. Do not correct them unless it blocks understanding.');
            return String(await s.prompt('Question: ' + question + '\nStudent answered: ' + answer)).trim();
        }
    };

    /* ------------------------------------------------------------ conquistas */
    const ACH = [
        { id: 'first', name: 'Primeiro passo', desc: 'Concluir a primeira missão', test: () => Object.keys(S.missions).some((k) => S.missions[k].done) },
        { id: 'speaker', name: 'Voz própria', desc: 'Falar uma frase em inglês com 80% ou mais', test: () => S.stats.spoken >= 1 },
        { id: 'writer', name: 'Primeira frase sua', desc: 'Passar numa produção escrita', test: () => S.stats.written >= 1 },
        { id: 'words30', name: '30 palavras na mão', desc: 'Chegar a 30 palavras ou blocos com domínio 2 ou mais', test: () => masteredCount() >= 30 },
        { id: 'streak3', name: 'Três dias seguidos', desc: 'Estudar em 3 dias seguidos', test: () => S.streak.n >= 3 },
        { id: 'review', name: 'Memória em dia', desc: 'Fazer uma Revisão do dia', test: () => S.stats.reviews >= 1 },
        { id: 'boss1', name: 'Quebrou o gelo', desc: 'Vencer o chefão do Mundo 1', test: () => S.stats.bosses >= 1 },
        { id: 'stars', name: 'Mão cheia', desc: 'Ganhar 3 estrelas em uma missão', test: () => Object.keys(S.missions).some((k) => S.missions[k].stars >= 3) }
    ];
    function checkAch() {
        ACH.forEach((a) => { if (!S.ach[a.id] && a.test()) { S.ach[a.id] = now(); save(); flash('Conquista: ' + a.name); S.xp += 25; save(); } });
    }

    /* ------------------------------------------------------------ avisos */
    let toastEl = null, toastTimer = null;
    function flash(msg) {
        if (!toastEl) { toastEl = mk('div', 'tj-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
        toastEl.textContent = msg; toastEl.hidden = false;
        clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3500);
    }

    /* ------------------------------------------------------------ raiz da interface */
    const lib = D.$('lb-library');
    const root = mk('section', 'tj-root'); root.id = 'tj-root';
    lib.insertBefore(root, lib.firstChild);
    const hudEl = mk('div', 'tj-hud'); hudEl.id = 'tj-hud';
    const body = mk('div', 'tj-body'); body.id = 'tj-body';
    root.append(hudEl, body);
    function renderHud() {
        hudEl.textContent = '';
        const lv = levelOf(S.xp), span = levelFloor(lv + 1) - levelFloor(lv), into = S.xp - levelFloor(lv);
        const left = mk('div', 'tj-hud-left');
        left.append(mk('strong', null, 'Nível ' + lv), mk('small', null, ' ' + S.xp + ' XP'));
        const bar = mk('div', 'lb-bar'), fill = mk('div', 'lb-bar-fill'); fill.style.width = Math.round(into / span * 100) + '%'; bar.appendChild(fill);
        left.appendChild(bar);
        const right = mk('div', 'tj-hud-right');
        right.append(mk('span', 'tj-chip', 'Sequência ' + S.streak.n + (S.streak.n === 1 ? ' dia' : ' dias')), mk('span', 'tj-chip', 'Palavras ' + masteredCount()));
        const home = btn('Mapa', () => { run = null; showMap(); }); home.id = 'tj-home';
        right.appendChild(home);
        hudEl.append(left, right);
    }
    const clear = () => { body.textContent = ''; window.scrollTo(0, 0); };

    /* ------------------------------------------------------------ mundos e missões */
    const WORLDS = CUR.worlds;
    const allMissions = () => { const out = []; WORLDS.forEach((w) => { w.missions.forEach((m) => out.push({ m, w })); if (w.boss) out.push({ m: w.boss, w, boss: true }); }); return out; };
    const doneRec = (id) => S.missions[id] || {};
    const passed = (id) => { const r = doneRec(id); return !!(r.free || (r.done && r.stars >= 1)); };
    function unlockedAt(list, i) { return i === 0 || passed(list[i - 1].m.id); }
    const worldList = (w) => w.missions.map((m) => ({ m, w })).concat(w.boss ? [{ m: w.boss, w, boss: true }] : []);

    function showMap() {
        clear(); renderHud();
        const due = dueItems();
        if (due.length >= 3) {
            const card = mk('div', 'tj-card tj-review');
            card.append(mk('strong', null, 'Revisão do dia'), mk('p', null, due.length + ' palavras e blocos pedem uma olhada rápida. Leva uns 3 minutos e fixa o que você já viu.'));
            const b = btn('Revisar agora', () => startReview(), 'lb-primary'); b.id = 'tj-review-btn';
            card.appendChild(b); body.appendChild(card);
        }
        WORLDS.forEach((w) => {
            const list = worldList(w), doneN = list.filter((x) => passed(x.m.id)).length;
            const box = mk('section', 'tj-world'); box.dataset.world = String(w.id);
            const head = mk('div', 'tj-world-head');
            head.append(mk('h2', null, 'Mundo ' + w.id + ' · ' + txt(w.name)), mk('small', null, w.level + ' · ' + doneN + '/' + list.length));
            box.append(head, mk('p', 'lb-note', txt(w.blurb)));
            list.forEach((x, i) => box.appendChild(missionNode(x, i, list)));
            body.appendChild(box);
        });
        body.appendChild(evolutionPanel());
        body.appendChild(achPanel());
        body.appendChild(teacherPanel());
    }
    function missionNode(x, i, list) {
        const m = x.m, ok = unlockedAt(list, i), r = doneRec(m.id);
        const node = mk('div', 'tj-node' + (ok ? '' : ' tj-locked') + (passed(m.id) ? ' tj-done' : '')); node.dataset.id = m.id;
        const num = mk('div', 'tj-num', x.boss ? '★' : String(m.n));
        const info = mk('div', 'tj-node-info');
        info.append(mk('strong', null, txt(m.title)), mk('small', null, txt(m.goal)));
        const stars = mk('div', 'tj-stars', r.done ? '★'.repeat(r.stars || 0) + '☆'.repeat(3 - (r.stars || 0)) : '☆☆☆');
        info.appendChild(stars);
        const acts = mk('div', 'tj-node-acts');
        if (ok) { const b = btn(r.done ? 'Jogar de novo' : 'Começar', () => startMission(m, x.w, x.boss ? 'boss' : 'curriculum'), r.done ? '' : 'lb-primary'); b.classList.add('tj-go'); acts.appendChild(b); }
        else { acts.append(mk('small', null, 'Termine a missão anterior'), btn('Liberar mesmo assim', () => { const prev = list[i - 1].m.id; S.missions[prev] = Object.assign(S.missions[prev] || {}, { free: true }); save(); showMap(); })); }
        node.append(num, info, acts);
        return node;
    }
    function achPanel() {
        const box = mk('section', 'tj-world'); box.appendChild(mk('h2', null, 'Conquistas'));
        const grid = mk('div', 'tj-ach');
        ACH.forEach((a) => { const c = mk('div', 'tj-ach-item' + (S.ach[a.id] ? ' on' : '')); c.append(mk('strong', null, S.ach[a.id] ? a.name : '???'), mk('small', null, a.desc)); grid.appendChild(c); });
        box.appendChild(grid); return box;
    }
    function teacherPanel() {
        const box = mk('section', 'tj-world tj-teacher'); box.appendChild(mk('h2', null, 'Professor virtual'));
        const st = mk('p', 'lb-note', 'Verificando se o seu navegador tem o modelo local…'); box.appendChild(st);
        ai.avail().then((v) => {
            st.textContent = v ? 'Disponível neste navegador: corrige suas frases e conversa com você. Tudo roda no seu aparelho.' : 'Indisponível neste navegador (precisa do modelo local do Chrome). O jogo funciona igual, só sem correção e conversa por IA.';
            if (v) { const b = btn('Conversar com o professor', () => startChat(), 'lb-primary'); b.id = 'tj-chat-btn'; box.appendChild(b); }
        });
        return box;
    }

    /* ------------------------------------------------------------ rodada */
    let run = null;
    const PHASE_NAMES = { scene: 'Descobrir', notice: 'Notar', practice: 'Praticar', speak: 'Falar', write: 'Escrever', boss: 'Conversa', discuss: 'Conversar' };

    function startMission(m, w, kind, extra) {
        const phases = kind === 'boss' ? ['boss', 'write'] : kind === 'text' ? ['scene', 'practice', 'speak', 'discuss', 'write'] : (m.pattern ? ['scene', 'notice', 'practice', 'speak', 'write'] : ['scene', 'practice', 'speak', 'write']);
        run = { m, w, kind, phases, pi: 0, stat: { ok: 0, n: 0 }, xp: 0, started: now(), speak: { best: 0 }, wrote: false, bossOk: 0, bossN: 0 };
        if (extra) Object.assign(run, extra);
        if (m.focus) m.focus.forEach((f) => ensureItem(m.id + ':' + f.id, { en: f.en, pt: f.pt, tip: f.tip || '', typable: isTypable(f) }));
        if (m.pattern) ensureItem(m.id + ':pattern', { pattern: true, en: '', pt: '' });
        save(); briefing();
    }
    const tally = (ok) => { if (run) { run.stat.n++; if (ok) run.stat.ok++; } };
    const accuracy = () => (run && run.stat.n ? run.stat.ok / run.stat.n : 1);
    function head(title) {
        const bar = mk('div', 'tj-phases'); bar.id = 'tj-phases';
        run.phases.forEach((p, i) => bar.appendChild(mk('span', 'tj-phase' + (i === run.pi ? ' on' : i < run.pi ? ' done' : ''), PHASE_NAMES[p])));
        body.appendChild(bar);
        if (title) body.appendChild(mk('h2', 'tj-title', title));
    }
    function nextPhase() {
        run.pi++;
        if (run.pi >= run.phases.length) return finishMission();
        renderPhase();
    }
    function renderPhase() {
        clear(); renderHud();
        const p = run.phases[run.pi];
        ({ scene: phScene, notice: phNotice, practice: phPractice, speak: phSpeak, write: phWrite, boss: phBoss, discuss: phDiscuss })[p]();
    }
    function briefing() {
        clear(); renderHud();
        const m = run.m, wi = run.w.id;
        body.appendChild(mk('div', 'tj-kicker', (run.kind === 'boss' ? 'Chefão' : run.kind === 'text' ? 'Missão de leitura' : 'Missão ' + m.n) + ' · cerca de ' + (m.minutes || 10) + ' min'));
        body.appendChild(mk('h2', 'tj-title', txt(m.title)));
        body.appendChild(mk('p', 'tj-goal', 'Objetivo: ' + txt(m.goal)));
        if (m.teach) { const t = explainNode(m.teach, wi, 'tj-teach'); t.prepend(mk('small', 'tj-who', 'Professor')); body.appendChild(t); }
        const steps = mk('ol', 'tj-steps'); run.phases.forEach((p) => steps.appendChild(mk('li', null, PHASE_NAMES[p])));
        body.append(steps);
        const go = btn('Começar', () => { renderPhase(); }, 'lb-primary'); go.id = 'tj-start';
        body.appendChild(go);
    }

    /* ---- estrutura de escolha única ---- */
    function choice(prompt, options, correct, onDone, opts) {
        opts = opts || {};
        const box = mk('div', 'tj-choice');
        if (prompt) box.appendChild(typeof prompt === 'string' ? mk('p', 'tj-q', prompt) : prompt);
        const list = mk('div', 'tj-options');
        let locked = false;
        options.forEach((o, i) => {
            const b = btn(o, () => {
                if (locked) return; locked = true;
                const ok = i === correct;
                b.classList.add(ok ? 'tj-right' : 'tj-wrong');
                list.children[correct].classList.add('tj-right');
                Array.from(list.children).forEach((c) => { c.disabled = true; });
                onDone(ok, i);
            }, 'tj-opt');
            b.dataset.i = String(i);
            list.appendChild(b);
        });
        box.appendChild(list);
        return box;
    }
    const FEED_OK = ['Isso!', 'Certo!', 'Boa!', 'Perfeito!', 'É isso mesmo.'];
    function feedback(ok, msg, onNext, label, parent) {
        const f = mk('div', 'tj-feed ' + (ok ? 'tj-feed-ok' : 'tj-feed-no')); f.id = 'tj-feed';
        f.appendChild(mk('strong', null, ok ? pickOne(FEED_OK) : 'Quase lá.'));
        if (msg) f.appendChild(mk('p', null, msg));
        const nx = btn(label || 'Continuar', onNext, 'lb-primary'); nx.id = 'tj-next';
        f.appendChild(nx);
        (parent || body).appendChild(f);
        nx.focus();
        return f;
    }

    /* ---- 1. Descobrir: cena ---- */
    function phScene() {
        const m = run.m; head('Descobrir');
        body.appendChild(mk('p', 'lb-note', 'Ouça a conversa e escolha o que cada fala significa. Não precisa saber tudo: o contexto ajuda.'));
        const chat = mk('div', 'tj-chat'); chat.id = 'tj-chat'; body.appendChild(chat);
        const zone = mk('div', 'tj-zone'); body.appendChild(zone);
        const lines = m.scene;
        const bubble = (l, reveal) => { const b = mk('div', 'tj-bubble'); b.append(mk('small', 'tj-who', l.who), mk('div', 'tj-en', l.en)); if (reveal) b.appendChild(mk('div', 'tj-pt', l.pt)); return b; };
        function step(i) {
            if (i >= lines.length) { zone.textContent = ''; const b = btn('Continuar', nextPhase, 'lb-primary'); b.id = 'tj-next'; zone.appendChild(b); return; }
            const l = lines[i], cur = bubble(l, false); chat.appendChild(cur);
            say(l.en);
            zone.textContent = '';
            const tools = mk('div', 'tj-tools');
            tools.append(btn('Ouvir de novo', () => say(l.en)), btn('Mais devagar', () => say(l.en, true)));
            const others = shuffle(lines.filter((x, k) => k !== i && x.pt !== l.pt).map((x) => x.pt)).slice(0, 2);
            const opts = shuffle([l.pt].concat(others)), correct = opts.indexOf(l.pt);
            run.ex = { kind: 'scene', answer: l.pt, i };
            zone.append(tools, choice('O que significa?', opts, correct, (ok) => {
                tally(ok); gain(ok ? 5 : 0);
                cur.appendChild(mk('div', 'tj-pt', l.pt));
                const f = mk('div', 'tj-feed ' + (ok ? 'tj-feed-ok' : 'tj-feed-no')); f.id = 'tj-feed';
                f.appendChild(mk('strong', null, ok ? pickOne(FEED_OK) : 'Era esta: "' + l.pt + '".'));
                const nx = btn(i + 1 >= lines.length ? 'Terminar a cena' : 'Próxima fala', () => (i + 1 >= lines.length ? nextPhase() : step(i + 1)), 'lb-primary'); nx.id = 'tj-next';
                f.appendChild(nx); zone.appendChild(f); nx.focus();
            }));
        }
        step(0);
    }

    /* ---- 2. Notar: descobrir o padrão ---- */
    function phNotice() {
        const m = run.m, p = m.pattern, wi = run.w.id; head('Notar');
        body.appendChild(mk('h3', 'tj-sub', txt(p.title)));
        const q = mk('div'); q.appendChild(explainNode(p.discover.q, wi, 'tj-q'));
        const wrap = mk('div'); body.appendChild(wrap);
        run.ex = { kind: 'notice', answer: p.discover.options[p.discover.answer], correct: p.discover.answer };
        wrap.appendChild(choice(q, p.discover.options, p.discover.answer, (ok) => {
            tally(ok); reviewItem(m.id + ':pattern', ok); gain(ok ? 10 : 0);
            const r = mk('div', 'tj-rule');
            r.appendChild(explainNode(p.discover.why, wi, 'tj-why'));
            const ul = mk('ul'); p.rule.forEach((x) => ul.appendChild(mk('li', null, explain(x, wi).main))); r.appendChild(ul);
            if (p.table && p.table.length) { const tb = mk('table', 'tj-table'); p.table.forEach((row) => { const tr = mk('tr'); tr.append(mk('td', 'tj-en', row[0]), mk('td', 'tj-pt', row[1])); tb.appendChild(tr); }); r.appendChild(tb); }
            if (p.contrast) r.appendChild(mk('p', 'tj-contrast', p.contrast));
            body.appendChild(r);
            const nx = btn('Continuar', nextPhase, 'lb-primary'); nx.id = 'tj-next'; body.appendChild(nx); nx.focus();
        }));
    }

    /* ---- 3. Praticar: fila de exercícios gerados ---- */
    function isTypable(f) { return !/[…\/,]/.test(f.en) && f.en.split(/\s+/).length <= 6; }
    const stripDots = (s) => String(s).replace(/…/g, '').replace(/\s+/g, ' ').trim();
    function variantsOf(f) {
        const base = stripDots(f.en), out = [base];
        if (/^i'?d like$/i.test(base.replace(/'/g, "'"))) out.push('I would like');
        return out;
    }
    function buildQueue(m) {
        const q = [], F = (m.focus || []).map((f) => Object.assign({ key: m.id + ':' + f.id }, f));
        shuffle(F).forEach((f) => q.push({ kind: 'listen_pt', f }));
        shuffle(F).forEach((f) => q.push({ kind: 'see_en', f }));
        (m.cloze || []).forEach((c, i) => q.push({ kind: 'cloze', c, key: m.id + ':cloze' + i }));
        (m.build || []).forEach((b, i) => q.push({ kind: 'build', b, key: m.id + ':build' + i }));
        shuffle(F.filter(isTypable)).forEach((f) => q.push({ kind: 'type_en', f }));
        (m.build || []).forEach((b, i) => q.push({ kind: 'dictate', b, key: m.id + ':build' + i }));
        return q;
    }
    function phPractice() {
        const m = run.m; head('Praticar');
        run.queue = run.queue || buildQueue(m); run.qi = run.qi || 0;
        practiceStep();
    }
    function startReview() {
        const keys = dueItems().slice(0, 8);
        const q = [];
        keys.forEach((k) => { const it = S.items[k]; const f = { key: k, id: k, en: it.en, pt: it.pt, tip: it.tip }; q.push({ kind: 'listen_pt', f }); q.push({ kind: 'see_en', f }); if (it.typable) q.push({ kind: 'type_en', f }); });
        run = { m: { id: 'review', title: { pt: 'Revisão do dia' } }, w: WORLDS[0], kind: 'review', phases: ['practice'], pi: 0, stat: { ok: 0, n: 0 }, xp: 0, queue: q, qi: 0, started: now() };
        renderPhase();
    }
    function allFocusPool() {
        const out = [];
        Object.keys(S.items).forEach((k) => { const it = S.items[k]; if (it.en && it.pt && !it.pattern) out.push({ key: k, en: it.en, pt: it.pt }); });
        return out;
    }
    function distractors(f, field, n) {
        const mine = run.m.focus ? run.m.focus.map((x) => ({ key: run.m.id + ':' + x.id, en: x.en, pt: x.pt })) : [];
        const pool = shuffle(mine.concat(allFocusPool())).filter((x, i, a) => x.key !== f.key && x[field] !== f[field] && a.findIndex((y) => y[field] === x[field]) === i);
        return pool.slice(0, n).map((x) => x[field]);
    }
    function requeue(ex) { const at = Math.min(run.queue.length, run.qi + 3); run.queue.splice(at, 0, Object.assign({}, ex, { again: true })); }
    function practiceStep() {
        while (body.querySelector('.tj-ex')) body.querySelector('.tj-ex').remove();
        if (run.qi >= run.queue.length) return practiceDone();
        const ex = run.queue[run.qi];
        const wrap = mk('div', 'tj-ex'); body.appendChild(wrap);
        const prog = mk('div', 'tj-prog'); const done = Math.min(run.qi, run.queue.length);
        const bar = mk('div', 'lb-bar'), fill = mk('div', 'lb-bar-fill'); fill.style.width = Math.round(done / run.queue.length * 100) + '%'; bar.appendChild(fill);
        prog.append(mk('small', null, (done + 1) + ' de ' + run.queue.length), bar); wrap.appendChild(prog);
        run.ex = ex;
        const finish = (ok, msg) => {
            const first = !ex.again; if (first) tally(ok);
            const key = ex.f ? ex.f.key : ex.key; if (first && key) reviewItem(key, ok);
            gain(ok ? (first ? 10 : 5) : 0);
            if (!ok) requeue(ex);
            feedback(ok, msg, () => { run.qi++; practiceStep(); }, undefined, wrap);
        };
        ({ listen_pt: exListen, see_en: exSee, type_en: exType, cloze: exCloze, build: exBuild, dictate: exDictate })[ex.kind](wrap, ex, finish);
    }
    function exListen(wrap, ex, finish) {
        const f = ex.f; say(f.en);
        const tools = mk('div', 'tj-tools'); tools.append(btn('Ouvir de novo', () => say(f.en)), btn('Mais devagar', () => say(f.en, true)));
        const opts = shuffle([f.pt].concat(distractors(f, 'pt', 3))), correct = opts.indexOf(f.pt);
        wrap.append(mk('div', 'tj-kind', 'Ouça e escolha o significado'), tools, choice(null, opts, correct, (ok) => finish(ok, ok ? (f.tip || '') : '"' + f.en + '" = ' + f.pt + '. ' + (f.tip || ''))));
    }
    function exSee(wrap, ex, finish) {
        const f = ex.f;
        const opts = shuffle([f.en].concat(distractors(f, 'en', 3))), correct = opts.indexOf(f.en);
        wrap.append(mk('div', 'tj-kind', 'Como se diz em inglês?'), mk('div', 'tj-big', f.pt), choice(null, opts, correct, (ok) => { if (ok) say(f.en); finish(ok, ok ? '' : 'Em inglês: "' + f.en + '". ' + (f.tip || '')); }));
    }
    function typeBox(wrap, check) {
        const ta = mk('input', 'lb-input tj-type'); ta.type = 'text'; ta.autocomplete = 'off'; ta.spellcheck = false; ta.autocapitalize = 'off'; ta.id = 'tj-ta';
        const go = btn('Verificar', null, 'lb-primary'); go.id = 'tj-check';
        const run1 = () => { if (ta.disabled) return; ta.disabled = true; go.disabled = true; check(ta.value); };
        go.addEventListener('click', run1);
        ta.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run1(); } });
        const row = mk('div', 'tj-row'); row.append(ta, go); wrap.appendChild(row);
        setTimeout(() => ta.focus(), 30);
    }
    function exType(wrap, ex, finish) {
        const f = ex.f, v = variantsOf(f);
        wrap.append(mk('div', 'tj-kind', 'Escreva em inglês'), mk('div', 'tj-big', f.pt));
        typeBox(wrap, (val) => {
            const r = accept(val, v);
            if (r !== 'bad') say(f.en);
            finish(r !== 'bad', r === 'ok' ? '' : r === 'near' ? 'Quase perfeito! Escreva "' + stripDots(f.en) + '".' : 'O certo é "' + stripDots(f.en) + '". ' + (f.tip || ''));
        });
    }
    function exCloze(wrap, ex, finish) {
        const c = ex.c, opts = shuffle(c.options), correct = opts.findIndex((o) => c.answer.map(norm).indexOf(norm(o)) >= 0);
        wrap.append(mk('div', 'tj-kind', 'Complete a frase'), mk('div', 'tj-big', c.en.replace('___', '_____')), mk('div', 'tj-pt', c.pt));
        wrap.appendChild(choice(null, opts, correct, (ok) => { if (ok) say(c.en.replace('___', c.answer[0])); finish(ok, ok ? '' : c.why); }));
    }
    function exBuild(wrap, ex, finish) {
        const b = ex.b, target = b.en[0], words = target.split(/\s+/);
        let order = shuffle(words), guard = 0; while (order.join(' ') === words.join(' ') && words.length > 1 && guard++ < 8) order = shuffle(words);
        wrap.append(mk('div', 'tj-kind', 'Monte a frase em inglês'), mk('div', 'tj-big', b.pt));
        const answer = mk('div', 'tj-tiles tj-answer'); answer.id = 'tj-answer';
        const pool = mk('div', 'tj-tiles tj-pool'); pool.id = 'tj-pool';
        const chosen = [];
        const draw = () => {
            answer.textContent = ''; pool.textContent = '';
            chosen.forEach((i, k) => { const t = btn(order[i], () => { chosen.splice(k, 1); draw(); }, 'tj-tile'); answer.appendChild(t); });
            order.forEach((w, i) => { if (chosen.indexOf(i) < 0) { const t = btn(w, () => { chosen.push(i); draw(); }, 'tj-tile'); t.dataset.w = w; pool.appendChild(t); } });
        };
        draw();
        const go = btn('Verificar', () => {
            if (go.disabled) return; go.disabled = true;
            const r = accept(chosen.map((i) => order[i]).join(' '), b.en);
            if (r !== 'bad') say(target);
            finish(r !== 'bad', r === 'bad' ? 'A frase é: "' + target + '".' : '');
        }, 'lb-primary'); go.id = 'tj-check';
        wrap.append(answer, pool, go);
    }
    function exDictate(wrap, ex, finish) {
        const b = ex.b, target = b.en[0]; say(target);
        const tools = mk('div', 'tj-tools'); tools.append(btn('Ouvir de novo', () => say(target)), btn('Mais devagar', () => say(target, true)));
        wrap.append(mk('div', 'tj-kind', 'Ouça e escreva o que você ouviu'), tools);
        typeBox(wrap, (val) => {
            const r = accept(val, b.en);
            finish(r !== 'bad', r === 'ok' ? '' : r === 'near' ? 'Quase perfeito! Escreva "' + target + '".' : 'Eu disse: "' + target + '" (' + b.pt + ').');
        });
    }
    function practiceDone() {
        const wrap = mk('div', 'tj-ex'); body.appendChild(wrap);
        const acc = accuracy();
        if (run.kind === 'review') {
            S.stats.reviews++; gain(30); save(); checkAch();
            wrap.append(mk('h3', 'tj-sub', 'Revisão feita'), mk('p', null, 'Precisão: ' + Math.round(acc * 100) + '%. As palavras que você errou voltam logo; as que acertou voltam mais tarde.'));
            const b = btn('Voltar ao mapa', () => { run = null; showMap(); }, 'lb-primary'); b.id = 'tj-next'; wrap.appendChild(b);
            return;
        }
        wrap.append(mk('h3', 'tj-sub', 'Prática concluída'), mk('p', null, 'Precisão até aqui: ' + Math.round(acc * 100) + '%. Agora é a hora de usar a voz.'));
        const b = btn('Continuar', nextPhase, 'lb-primary'); b.id = 'tj-next'; wrap.appendChild(b);
    }

    /* ---- 4. Falar ---- */
    function phSpeak() {
        const m = run.m, lines = m.speak || []; head('Falar');
        if (!lines.length) return nextPhase();
        body.appendChild(mk('p', 'lb-note', getSR() ? 'Ouça, depois fale. O navegador reconhece a sua voz e mostra o que ele entendeu.' : 'Seu navegador não reconhece voz: ouça, repita em voz alta e marque que fez. Vale como treino.'));
        const zone = mk('div', 'tj-zone'); body.appendChild(zone);
        const need = run.w.id <= 1 ? 0.6 : 0.7;
        function step(i) {
            zone.textContent = '';
            if (i >= lines.length) { const b = btn('Continuar', nextPhase, 'lb-primary'); b.id = 'tj-next'; zone.appendChild(b); return; }
            const l = lines[i]; run.ex = { kind: 'speak', answer: l.en };
            const card = mk('div', 'tj-speak');
            card.append(mk('div', 'tj-count', (i + 1) + ' de ' + lines.length), mk('div', 'tj-big tj-en', l.en), mk('div', 'tj-pt', l.pt));
            if (l.tip) card.appendChild(mk('p', 'tj-tip', 'Dica: ' + l.tip));
            const res = mk('div', 'tj-result'); res.id = 'tj-res';
            const acts = mk('div', 'tj-tools');
            acts.append(btn('Ouvir', () => say(l.en)), btn('Mais devagar', () => say(l.en, true)));
            let tries = 0;
            const mic = btn(getSR() ? 'Falar' : 'Repeti em voz alta', null, 'lb-primary'); mic.id = 'tj-mic';
            const done = (score) => {
                run.speak.best = Math.max(run.speak.best, score);
                if (score >= 0.8) { S.stats.spoken++; save(); }
                gain(score >= need ? 10 : 3); checkAch();
                zone.querySelectorAll('.tj-nextrow').forEach((n) => n.remove());
                const nx = btn(score >= need ? (i + 1 >= lines.length ? 'Terminar' : 'Próxima frase') : (tries >= 3 ? 'Seguir assim mesmo' : 'Seguir'), () => (i + 1 >= lines.length ? nextPhase() : step(i + 1)), 'lb-primary'); nx.id = 'tj-next';
                const row = mk('div', 'tj-nextrow'); row.appendChild(nx); card.appendChild(row);
            };
            mic.addEventListener('click', async () => {
                tries++;
                if (!getSR()) { res.textContent = 'Muito bem! Falar em voz alta é o que faz a diferença.'; mic.disabled = true; done(0.7); return; }
                mic.disabled = true; res.textContent = 'Ouvindo…';
                try {
                    const said = await listenOnce(), d = diffWords(l.en, said);
                    res.textContent = '';
                    const line = mk('div', 'tj-diff'); d.words.forEach((w, k) => line.appendChild(mk('span', d.wordHit[k] ? 'lb-ok' : 'lb-miss', w + ' ')));
                    res.append(line, mk('small', null, 'Entendi: ' + (said || '—') + ' · ' + Math.round(d.score * 100) + '%'));
                    if (d.score >= need) { done(d.score); }
                    else { mic.disabled = false; mic.textContent = 'Tentar de novo'; if (tries >= 3) done(d.score); }
                } catch (e) {
                    res.textContent = 'Não consegui ouvir. Veja se o microfone está liberado e tente de novo.';
                    mic.disabled = false;
                    if (tries >= 2) { const alt = btn('Repeti em voz alta', () => { res.textContent = ''; done(0.7); }); alt.id = 'tj-self'; acts.appendChild(alt); }
                }
            });
            acts.appendChild(mic);
            card.append(acts, res); zone.appendChild(card);
        }
        step(0);
    }

    /* ---- 5. Escrever ---- */
    function evalChecks(w, text) {
        const hits = w.checks.map((c) => ({ ok: new RegExp(c.re, 'i').test(text), msg: c.miss, good: c.hit }));
        return { hits, n: hits.filter((h) => h.ok).length };
    }
    function phWrite() {
        const m = run.m, w = m.write, wi = run.w.id; head('Escrever');
        if (!w) return nextPhase();
        body.appendChild(explainNode(w.prompt, wi, 'tj-q'));
        const ta = mk('textarea', 'lb-input tj-write'); ta.rows = 3; ta.id = 'tj-ta'; ta.placeholder = 'Escreva em inglês aqui'; ta.spellcheck = false;
        const out = mk('div', 'tj-result'); out.id = 'tj-res';
        const acts = mk('div', 'tj-tools');
        run.ex = { kind: 'write', answer: w.model };
        let tries = 0;
        const check = btn('Verificar', () => {
            tries++;
            const text = ta.value.trim(), r = evalChecks(w, text);
            out.textContent = '';
            const ul = mk('ul', 'tj-checks'); r.hits.forEach((h) => ul.appendChild(mk('li', h.ok ? 'lb-ok' : 'lb-miss', h.ok ? h.good : h.msg))); out.appendChild(ul);
            const ok = r.n >= w.pass && text.split(/\s+/).length >= 2;
            if (ok) {
                run.wrote = true; S.stats.written++; gain(20); checkAch();
                out.appendChild(mk('p', 'lb-ok', 'Muito bem! Um modelo para comparar: "' + w.model + '"'));
                check.disabled = true; ta.disabled = true; say(w.model);
                const nx = btn('Continuar', nextPhase, 'lb-primary'); nx.id = 'tj-next'; out.appendChild(nx);
            } else {
                out.appendChild(mk('p', null, tries >= 2 ? 'Um modelo: "' + w.model + '". Ajuste a sua frase e tente de novo, ou siga em frente.' : 'Ajuste e tente de novo. Sem pressa.'));
                if (tries >= 2 && !out.querySelector('#tj-skip')) { const sk = btn('Seguir sem passar', nextPhase); sk.id = 'tj-skip'; out.appendChild(sk); }
            }
        }, 'lb-primary'); check.id = 'tj-check';
        acts.appendChild(check);
        ai.avail().then((v) => {
            if (!v) return;
            const b = btn('Pedir ao professor', async () => {
                if (!ta.value.trim()) { out.textContent = 'Escreva algo primeiro.'; return; }
                b.disabled = true; const note = mk('div', 'tj-ai', 'O professor está lendo…'); out.appendChild(note);
                try { note.textContent = await ai.correct(ta.value.trim(), txt(w.prompt)); } catch (e) { note.textContent = 'Não consegui falar com o professor agora.'; }
                b.disabled = false;
            }); b.id = 'tj-ai-btn'; acts.appendChild(b);
        });
        body.append(ta, acts, out);
        setTimeout(() => ta.focus(), 30);
    }

    /* ---- Chefão: conversa ---- */
    function phBoss() {
        const m = run.m; head('Conversa');
        body.appendChild(mk('p', 'lb-note', 'Leo puxa conversa. Escolha a resposta mais natural; ao escolher, ela é falada em voz alta.'));
        const chat = mk('div', 'tj-chat'); chat.id = 'tj-chat'; body.appendChild(chat);
        const zone = mk('div', 'tj-zone'); body.appendChild(zone);
        function turn(i) {
            zone.textContent = '';
            if (i >= m.turns.length) {
                const b = btn('Continuar para a apresentação escrita', nextPhase, 'lb-primary'); b.id = 'tj-next'; zone.appendChild(b); return;
            }
            const t = m.turns[i], bub = mk('div', 'tj-bubble'); bub.append(mk('small', 'tj-who', 'Leo'), mk('div', 'tj-en', t.npc.en), mk('div', 'tj-pt', t.npc.pt)); chat.appendChild(bub);
            say(t.npc.en);
            const opts = shuffle(t.replies), correct = opts.findIndex((r) => r.ok);
            run.ex = { kind: 'boss', answer: t.replies.find((r) => r.ok).en, i };
            zone.appendChild(choice('Como você responde?', opts.map((o) => o.en), correct, (ok, k) => {
                run.bossN++; if (ok) run.bossOk++; tally(ok); gain(ok ? 15 : 0);
                const me = mk('div', 'tj-bubble tj-me'); me.append(mk('small', 'tj-who', 'Você'), mk('div', 'tj-en', opts[k].en)); chat.appendChild(me);
                say(opts[k].en);
                feedback(ok, ok ? opts[k].why : opts[k].why + ' Melhor: "' + t.replies.find((r) => r.ok).en + '".', () => turn(i + 1), i + 1 >= m.turns.length ? 'Terminar a conversa' : 'Seguir a conversa', zone);
            }));
        }
        turn(0);
    }

    /* ---- fim de missão ---- */
    function finishMission() {
        const m = run.m, acc = accuracy(), isBoss = run.kind === 'boss';
        let stars = acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.6 ? 1 : 0;
        if (isBoss && !(run.wrote && run.bossOk >= 4)) stars = 0;
        const prev = S.missions[m.id] || {}, first = !prev.done, hadStars = prev.stars || 0;
        S.missions[m.id] = Object.assign(prev, { done: true, stars: Math.max(hadStars, stars), best: Math.max(prev.best || 0, Math.round(acc * 100)), at: now() });
        if (isBoss && stars >= 1 && !hadStars) { S.stats.bosses++; }
        const bonus = stars > 0 ? 50 + stars * 20 + (isBoss ? 100 : 0) : 10;
        gain(bonus); save(); checkAch();
        clear(); renderHud();
        body.appendChild(mk('div', 'tj-kicker', stars > 0 ? 'Missão concluída' : 'Quase!'));
        body.appendChild(mk('h2', 'tj-title', txt(m.title)));
        body.appendChild(mk('div', 'tj-stars tj-stars-big', '★'.repeat(stars) + '☆'.repeat(3 - stars)));
        body.appendChild(mk('p', null, 'Precisão: ' + Math.round(acc * 100) + '% · XP nesta missão: ' + run.xp + (first ? ' · primeira vez' : '')));
        const learned = (m.focus || []).filter((f) => S.items[m.id + ':' + f.id] && S.items[m.id + ':' + f.id].lvl >= 1);
        if (learned.length) { const ul = mk('ul', 'tj-learned'); learned.slice(0, 10).forEach((f) => ul.appendChild(mk('li', null, f.en + ' = ' + f.pt))); body.append(mk('h3', 'tj-sub', 'Você já pegou'), ul); }
        if (stars === 0) body.appendChild(mk('p', 'lb-note', isBoss ? 'Para vencer o chefão: acerte 4 das 6 respostas e passe na apresentação escrita. Tente de novo quando quiser.' : 'Para abrir a próxima missão, refaça a prática: abaixo de 60% de acerto ela ainda não abre. Você também pode liberar no mapa.'));
        const acts = mk('div', 'tj-tools');
        const list = WORLDS.map(worldList).reduce((a, b) => a.concat(b), []), idx = list.findIndex((x) => x.m.id === m.id), nxt = list[idx + 1];
        if (stars > 0 && run.kind === 'text' && run.list) { const k = run.list.findIndex((y) => y.m.id === m.id), nt = run.list[k + 1]; if (nt) { const b = btn('Próxima parte do texto', () => startTextMission(nt), 'lb-primary'); b.id = 'tj-next-mission'; acts.appendChild(b); } }
        if (stars > 0 && nxt && run.kind !== 'text') { const b = btn('Próxima missão', () => startMission(nxt.m, nxt.w, nxt.boss ? 'boss' : 'curriculum'), 'lb-primary'); b.id = 'tj-next-mission'; acts.appendChild(b); }
        if (stars === 0) acts.appendChild(btn('Tentar de novo', () => startMission(m, run.w, run.kind), 'lb-primary'));
        const mp = btn('Mapa', () => { run = null; showMap(); }); mp.id = 'tj-map'; acts.appendChild(mp);
        if (isBoss && stars > 0) body.appendChild(mk('p', 'lb-ok', 'Você conversou, pediu, se apresentou e escreveu em inglês. O Mundo 2 vem a seguir.'));
        body.appendChild(acts);
        run.done = true;
    }

    /* ------------------------------------------------------------ Leitura: missões geradas do texto que estamos estudando */
    // Método (ver CLAUDE.md): leitura apoiada (input compreensível) -> palavras do trecho com repetição espaçada e lacunas (recuperação)
    // -> shadowing (ouvir e falar logo atrás) -> discussão (responder, não só ler) -> escrita própria. Tudo a partir das frases do texto.
    const wcOf = (p) => p.s.join(' ').split(/\s+/).filter(Boolean).length;
    function chaptersOf(paras, size) {
        const out = []; let from = 0, acc = 0;
        for (let i = 0; i < paras.length; i++) {
            acc += wcOf(paras[i]);
            if (acc >= size && i + 1 < paras.length) { out.push({ from, to: i + 1 }); from = i + 1; acc = 0; }
        }
        if (from < paras.length) out.push({ from, to: paras.length });
        if (out.length > 1 && out[out.length - 1].to - out[out.length - 1].from < 2 && acc < size * 0.4) { out[out.length - 2].to = paras.length; out.pop(); }
        return out;
    }
    const textList = (tx) => tx.chapters.map((c, i) => ({ m: { id: 't:' + tx.id + ':' + i, n: i + 1, title: { pt: tx.title + ' · parte ' + (i + 1) }, goal: { pt: 'Ler, ouvir, falar, discutir e escrever sobre este trecho.' } }, w: WORLDS[0], text: tx, ch: c }));
    const STOP = new Set('this that with from have will would there their about which could should because while where when what your they them then than into over after before every other these those'.split(' '));
    async function buildTextLesson(x) {
        const d = await D.db.get('docs', x.text.docId);
        const paras = d.paras.slice(x.ch.from, x.ch.to), sents = [];
        paras.forEach((p) => { if (p.t === 'h') return; p.s.forEach((s) => { const n = s.split(/\s+/).length; if (n >= 4 && n <= 22 && /[a-z]/i.test(s)) sents.push(s); }); });
        const scene = [];
        const ptOf = async (s) => { try { return await window.DDLab.translateText(s, 'en'); } catch (e) { return null; } };
        const first = sents.slice(0, 6);
        for (const s of first) scene.push({ who: 'Texto', en: s, pt: await ptOf(s) });
        const withPt = scene.filter((l) => l.pt);
        const common = (w) => (window.__ddNivel ? window.__ddNivel.isCommon(w) : w.length < 5);
        const seen = new Set(), cand = [];
        sents.forEach((s) => (s.match(/\p{L}[\p{L}'’-]{4,}/gu) || []).forEach((w) => { const lw = w.toLowerCase(); if (!seen.has(lw) && !common(lw) && !STOP.has(lw)) { seen.add(lw); cand.push({ w: lw, s }); } }));
        const focus = [];
        for (const c of shuffle(cand).slice(0, 10)) {
            if (focus.length >= 6) break;
            const pt = await ptOf(c.w); if (!pt || norm(pt) === norm(c.w)) continue;
            focus.push({ id: 'w_' + c.w, en: c.w, pt, tip: 'Na frase: "' + c.s + '"' });
        }
        const build = [];
        for (const s of sents.filter((z) => z.split(/\s+/).length <= 9).slice(0, 3)) { const pt = await ptOf(s); if (pt) build.push({ pt, en: [s] }); }
        const cloze = [];
        for (const f of focus.slice(0, 3)) {
            const s = sents.find((z) => new RegExp('\\b' + f.en + '\\b', 'i').test(z)); if (!s) continue;
            const others = shuffle(focus.filter((g) => g.en !== f.en).map((g) => g.en)).slice(0, 2);
            if (others.length < 2) continue;
            cloze.push({ en: s.replace(new RegExp('\\b' + f.en + '\\b', 'i'), '___'), answer: [f.en], options: [f.en].concat(others), pt: f.pt, why: 'Aqui o sentido pede "' + f.en + '" (' + f.pt + ').' });
        }
        const keys = Array.from(new Set(sents.join(' ').toLowerCase().match(/\p{L}{5,}/gu) || [])).filter((w) => !STOP.has(w)).slice(0, 80).join('|');
        const keyRe = keys ? '\\b(' + keys + ')\\b' : '\\w+';
        const title = x.text.title + ' · parte ' + x.m.n;
        const lenCheck = (n, msg) => ({ re: '(\\w+\\W+){' + (n - 1) + '}\\w+', miss: msg, hit: 'Resposta completa.' });
        return {
            id: x.m.id, n: x.m.n, minutes: 15, title: { pt: title }, goal: { pt: 'Entender, falar, discutir e escrever sobre este trecho.' },
            teach: { pt: 'Este trecho é seu. Ouça, entenda pelo contexto, fixe as palavras que mais valem a pena e depois use o inglês para dizer o que pensa.' },
            scene: (withPt.length >= 3 ? withPt : scene.map((l) => Object.assign({}, l, { pt: l.pt || '(sem tradução: ative o tradutor no Leitor de PDF)' }))),
            focus, build, cloze,
            speak: first.slice(0, 3).map((s) => ({ en: s, pt: (scene.find((l) => l.en === s) || {}).pt || '', tip: 'Shadowing: ouça uma vez e fale logo atrás da voz, com o mesmo ritmo.' })),
            discuss: [
                { q: 'What is this part about? Say it in your own words.', hint: 'Diga com suas palavras do que trata este trecho.', model: first[0] || 'This part is about the text.', checks: [lenCheck(5, 'Use pelo menos 5 palavras.'), { re: keyRe, miss: 'Use alguma palavra do trecho.', hit: 'Usou palavras do trecho.' }], pass: 2 },
                { q: 'Which idea is the most interesting to you? Why?', hint: 'Escolha uma ideia e explique por quê.', model: 'I find this idea interesting because it is part of my daily life.', checks: [lenCheck(6, 'Use pelo menos 6 palavras.'), { re: '\\b(because|since|so|but|and)\\b', miss: 'Tente explicar com "because" (porque).', hit: 'Deu uma razão.' }], pass: 2 },
                { q: 'Do you agree with the text? Yes or no, and why?', hint: 'Concorde ou discorde, com um motivo.', model: 'I agree with the text, but I would add one more example.', checks: [lenCheck(5, 'Use pelo menos 5 palavras.'), { re: '\\b(yes|no|agree|disagree|not sure|maybe|think|believe)\\b', miss: 'Diga se concorda: "I agree" ou "I disagree".', hit: 'Deu a sua posição.' }], pass: 2 }
            ],
            write: { prompt: { pt: 'Escreva, em inglês, um pequeno resumo (2 frases) do que você leu e a sua opinião.' }, model: (first[0] || 'I read this text.') + ' I think it is important.', checks: [lenCheck(8, 'Escreva pelo menos 8 palavras (duas frases curtas).'), { re: keyRe, miss: 'Use alguma palavra do trecho.', hit: 'Usou palavras do trecho.' }, { re: '\\b(I|my|me)\\b', miss: 'Inclua a sua opinião (I think…).', hit: 'Incluiu a sua opinião.' }], pass: 2 }
        };
    }
    async function startTextMission(x) {
        clear(); renderHud();
        body.appendChild(mk('p', 'lb-note', 'Preparando a sua missão a partir do texto…'));
        let lesson;
        try { lesson = await buildTextLesson(x); } catch (e) { body.textContent = ''; body.appendChild(mk('p', 'lb-error', 'Não consegui preparar este trecho.')); body.appendChild(btn('Mapa', showMap)); return; }
        if (!lesson.scene.length) { body.textContent = ''; body.appendChild(mk('p', 'lb-error', 'Este trecho não tem frases suficientes.')); body.appendChild(btn('Mapa', showMap)); return; }
        startMission(lesson, WORLDS[0], 'text', { text: x.text, list: textList(x.text) });
    }

    /* ---- Conversar: discussão sobre o trecho (responder por voz ou texto; o professor local reage, se existir) ---- */
    function phDiscuss() {
        const m = run.m, qs = m.discuss || []; head('Conversar');
        if (!qs.length) return nextPhase();
        body.appendChild(mk('p', 'lb-note', 'Agora é a sua vez de falar sobre o texto. Responda com poucas palavras: não precisa ser perfeito. Vale por voz ou escrevendo.'));
        const zone = mk('div', 'tj-zone'); body.appendChild(zone);
        function turn(i) {
            zone.textContent = '';
            if (i >= qs.length) { const b = btn('Continuar', nextPhase, 'lb-primary'); b.id = 'tj-next'; zone.appendChild(b); return; }
            const q = qs[i]; run.ex = { kind: 'discuss', answer: q.model };
            const card = mk('div', 'tj-speak');
            card.append(mk('div', 'tj-count', (i + 1) + ' de ' + qs.length), mk('div', 'tj-big tj-en', q.q), mk('div', 'tj-pt', q.hint));
            const ta = mk('textarea', 'lb-input tj-write'); ta.rows = 2; ta.id = 'tj-dta'; ta.placeholder = 'Responda em inglês'; ta.spellcheck = false;
            const out = mk('div', 'tj-result'); out.id = 'tj-dres';
            const acts = mk('div', 'tj-tools');
            acts.appendChild(btn('Ouvir a pergunta', () => say(q.q)));
            if (getSR()) {
                const mic = btn('Responder falando', async () => {
                    mic.disabled = true; out.textContent = 'Ouvindo…';
                    try { const said = await listenOnce(); ta.value = said; out.textContent = said ? 'Entendi: ' + said + ' (ajuste se quiser e verifique).' : 'Não entendi. Tente de novo ou escreva.'; }
                    catch (e) { out.textContent = 'Não consegui ouvir. Escreva a resposta.'; }
                    mic.disabled = false;
                }); mic.id = 'tj-dmic'; acts.appendChild(mic);
            }
            let tries = 0;
            const check = btn('Verificar', () => {
                tries++;
                const text = ta.value.trim(), r = evalChecks(q, text);
                out.textContent = '';
                const ul = mk('ul', 'tj-checks'); r.hits.forEach((h) => ul.appendChild(mk('li', h.ok ? 'lb-ok' : 'lb-miss', h.ok ? h.good : h.msg))); out.appendChild(ul);
                const ok = r.n >= q.pass;
                if (ok || tries >= 2) {
                    tally(ok); gain(ok ? 15 : 3); if (ok) { S.stats.discussed = (S.stats.discussed || 0) + 1; save(); }
                    out.appendChild(mk('p', ok ? 'lb-ok' : null, (ok ? 'Muito bem! ' : 'Siga em frente. ') + 'Uma resposta possível: "' + q.model + '"'));
                    check.disabled = true; ta.disabled = true; say(q.model);
                    const fin = () => { if (out.querySelector('#tj-next')) return; const nx = btn(i + 1 >= qs.length ? 'Terminar a conversa' : 'Próxima pergunta', () => turn(i + 1), 'lb-primary'); nx.id = 'tj-next'; out.appendChild(nx); };
                    if (ok && text) {
                        const reply = mk('div', 'tj-ai', ''); out.appendChild(reply);
                        ai.avail().then(async (v) => {
                            if (!v) { reply.remove(); return fin(); }
                            reply.textContent = 'O professor está lendo…';
                            try { reply.textContent = await ai.react(text, q.q); } catch (e) { reply.remove(); }
                            fin();
                        }).catch(() => { reply.remove(); fin(); });
                    } else fin();
                } else out.appendChild(mk('p', null, 'Ajuste e tente de novo. Sem pressa.'));
            }, 'lb-primary'); check.id = 'tj-dcheck';
            acts.appendChild(check);
            card.append(ta, acts, out); zone.appendChild(card);
        }
        turn(0);
    }

    /* ------------------------------------------------------------ Nossa evolução: o que já aprendemos e como estamos indo */
    // dados puros (testáveis): números gerais, itens por missão, padrões descobertos e últimos 14 dias
    function evolution() {
        const list = WORLDS.map(worldList).reduce((a, b) => a.concat(b), []);
        const missions = list.map((x) => {
            const r = doneRec(x.m.id), keys = Object.keys(S.items).filter((k) => k.indexOf(x.m.id + ':') === 0 && !S.items[k].pattern);
            const items = keys.map((k) => ({ key: k, en: S.items[k].en, pt: S.items[k].pt, lvl: S.items[k].lvl, due: S.items[k].due <= now(), ok: S.items[k].ok, bad: S.items[k].bad }));
            return { id: x.m.id, n: x.m.n, boss: !!x.boss, title: txt(x.m.title), done: !!r.done, stars: r.stars || 0, best: r.best || 0, items, pattern: x.m.pattern && (r.done || (S.items[x.m.id + ':pattern'] && S.items[x.m.id + ':pattern'].ok > 0)) ? x.m.pattern : null };
        });
        const texts = S.texts.map((tx) => {
            const ls = textList(tx), keys = Object.keys(S.items).filter((k) => k.indexOf('t:' + tx.id + ':') === 0 && !S.items[k].pattern);
            const items = keys.map((k) => ({ key: k, en: S.items[k].en, pt: S.items[k].pt, lvl: S.items[k].lvl, due: S.items[k].due <= now(), ok: S.items[k].ok, bad: S.items[k].bad }));
            return { id: tx.id, title: tx.title, parts: ls.length, done: ls.filter((x) => doneRec(x.m.id).done).length, stars: ls.reduce((a, x) => a + (doneRec(x.m.id).stars || 0), 0), items };
        });
        const done = missions.filter((m) => m.done), bests = done.map((m) => m.best);
        const days = [];
        for (let i = 13; i >= 0; i--) { const k = dayKey(now() - i * DAY), d = (S.log || {})[k] || { xp: 0, ok: 0, bad: 0 }; days.push({ key: k, xp: d.xp || 0, items: (d.ok || 0) + (d.bad || 0) }); }
        const allItems = Object.keys(S.items).filter((k) => !S.items[k].pattern && S.items[k].en);
        return {
            level: levelOf(S.xp), xp: S.xp, streak: S.streak.n, mastered: masteredCount(), seen: allItems.length, due: dueItems().length,
            spoken: S.stats.spoken, written: S.stats.written, discussed: S.stats.discussed || 0, texts, reviews: S.stats.reviews,
            missionsDone: done.length, missionsTotal: missions.length, stars: missions.reduce((a, m) => a + m.stars, 0), starsMax: missions.length * 3,
            avg: bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null, missions, days
        };
    }
    function evolutionPanel() {
        const E = evolution(), box = mk('section', 'tj-world tj-evo'); box.id = 'tj-evo';
        box.appendChild(mk('h2', null, 'Nossa evolução'));
        if (!E.seen && !E.missionsDone) { box.appendChild(mk('p', 'lb-note', 'Quando você fizer a primeira missão, aqui aparece o que aprendemos e como você está evoluindo.')); return box; }
        const nums = mk('div', 'tj-nums'); nums.id = 'tj-nums';
        [['Nível', E.level], ['XP', E.xp], ['Sequência', E.streak + (E.streak === 1 ? ' dia' : ' dias')], ['Missões', E.missionsDone + '/' + E.missionsTotal], ['Estrelas', E.stars + '/' + E.starsMax],
            ['Palavras dominadas', E.mastered + ' de ' + E.seen], ['Para revisar', E.due], ['Frases faladas', E.spoken], ['Frases escritas', E.written], ['Respostas na conversa', E.discussed], ['Precisão média', E.avg == null ? '—' : E.avg + '%']].forEach((p) => {
            const c = mk('div', 'tj-num-card'); c.append(mk('strong', null, String(p[1])), mk('small', null, p[0])); nums.appendChild(c);
        });
        box.appendChild(nums);
        // linha do tempo: barras dos últimos 14 dias (XP do dia)
        const peak = Math.max(10, ...E.days.map((d) => d.xp)), tl = mk('div', 'tj-timeline'); tl.id = 'tj-timeline'; tl.setAttribute('role', 'img');
        tl.setAttribute('aria-label', 'Atividade dos últimos 14 dias: ' + E.days.filter((d) => d.xp > 0).length + ' dias com estudo');
        E.days.forEach((d, i) => {
            const col = mk('div', 'tj-tl-col'), bar = mk('div', 'tj-tl-bar'); bar.style.height = Math.max(d.xp ? 6 : 2, Math.round(d.xp / peak * 70)) + 'px'; bar.title = d.key + ': ' + d.xp + ' XP, ' + d.items + ' itens revisados';
            if (d.xp) bar.classList.add('on');
            col.append(bar, mk('small', null, i === 13 ? 'hoje' : d.key.slice(8))); tl.appendChild(col);
        });
        box.append(mk('h3', 'tj-sub', 'Últimos 14 dias'), tl);
        // o que já aprendemos, por missão
        const learned = E.missions.filter((m) => m.items.length);
        if (learned.length) {
            box.appendChild(mk('h3', 'tj-sub', 'O que já aprendemos'));
            learned.forEach((m) => {
                const det = mk('details', 'tj-learn'); det.dataset.id = m.id;
                const known = m.items.filter((i) => i.lvl >= 2).length;
                det.appendChild(mk('summary', null, (m.boss ? 'Chefão' : m.n + '. ' + m.title) + ' · ' + known + '/' + m.items.length + ' dominadas' + (m.stars ? ' · ' + '★'.repeat(m.stars) : '')));
                const ul = mk('ul', 'tj-words');
                m.items.forEach((i) => {
                    const li = mk('li', i.due && i.lvl > 0 ? 'tj-due' : null);
                    li.append(mk('span', 'tj-en', i.en), mk('span', 'tj-pt', ' = ' + i.pt), mk('span', 'tj-dots', ' ' + '●'.repeat(i.lvl) + '○'.repeat(5 - i.lvl)));
                    li.title = 'Domínio ' + i.lvl + ' de 5 · acertos ' + i.ok + ' · erros ' + i.bad + (i.due && i.lvl > 0 ? ' · pede revisão' : '');
                    ul.appendChild(li);
                });
                det.appendChild(ul); box.appendChild(det);
            });
        }
        // palavras e progresso dos textos que estudamos (leitura)
        E.texts.forEach((tx) => {
            const det = mk('details', 'tj-learn tj-textlearn'); det.dataset.id = tx.id;
            const known = tx.items.filter((i) => i.lvl >= 2).length;
            det.appendChild(mk('summary', null, 'Do seu texto: ' + tx.title + ' · ' + tx.done + '/' + tx.parts + ' partes · ' + known + '/' + tx.items.length + ' palavras dominadas' + (tx.stars ? ' · ' + '★'.repeat(Math.min(tx.stars, 9)) : '')));
            const ul = mk('ul', 'tj-words');
            tx.items.forEach((i) => {
                const li = mk('li', i.due && i.lvl > 0 ? 'tj-due' : null);
                li.append(mk('span', 'tj-en', i.en), mk('span', 'tj-pt', ' = ' + i.pt), mk('span', 'tj-dots', ' ' + '●'.repeat(i.lvl) + '○'.repeat(5 - i.lvl)));
                ul.appendChild(li);
            });
            if (!tx.items.length) ul.appendChild(mk('li', null, 'Faça a primeira parte para as palavras do texto aparecerem aqui.'));
            det.appendChild(ul); box.appendChild(det);
        });
        // estruturas e padrões descobertos
        const pats = E.missions.filter((m) => m.pattern);
        if (pats.length) {
            box.appendChild(mk('h3', 'tj-sub', 'Estruturas que já descobrimos'));
            pats.forEach((m) => {
                const p = m.pattern, det = mk('details', 'tj-learn tj-pat'); det.dataset.id = m.id;
                det.appendChild(mk('summary', null, txt(p.title)));
                const ul = mk('ul'); p.rule.forEach((r) => ul.appendChild(mk('li', null, r.pt)));
                det.appendChild(ul);
                if (p.table && p.table.length) { const tb = mk('table', 'tj-table'); p.table.forEach((row) => { const tr = mk('tr'); tr.append(mk('td', 'tj-en', row[0]), mk('td', 'tj-pt', row[1])); tb.appendChild(tr); }); det.appendChild(tb); }
                if (p.contrast) det.appendChild(mk('p', 'tj-contrast', p.contrast));
                box.appendChild(det);
            });
        }
        return box;
    }

    /* ------------------------------------------------------------ conversa livre com o professor (IA local) */
    async function startChat() {
        clear(); renderHud();
        body.appendChild(mk('h2', 'tj-title', 'Conversa com o professor'));
        body.appendChild(mk('p', 'lb-note', 'Escreva em inglês simples. O professor responde curto e, se houver erro, dá uma dica em português. Roda no seu aparelho.'));
        const log = mk('div', 'tj-chat'); log.id = 'tj-chat'; body.appendChild(log);
        let session;
        try { session = await ai.session('You are a friendly native English teacher chatting with a Brazilian beginner (A1). Reply in 1 or 2 very simple English sentences and ask one easy follow-up question. If the student made a clear mistake, add one short tip in Brazilian Portuguese starting with "Dica:".'); }
        catch (e) { body.appendChild(mk('p', 'lb-error', 'Não consegui iniciar o professor.')); return; }
        const add = (who, text, mine) => { const b = mk('div', 'tj-bubble' + (mine ? ' tj-me' : '')); b.append(mk('small', 'tj-who', who), mk('div', 'tj-en', text)); log.appendChild(b); if (!mine) say(text.split(/Dica:/)[0]); };
        add('Professor', 'Hi! How are you today?', false);
        let turns = 0;
        const input = mk('input', 'lb-input tj-type'); input.type = 'text'; input.id = 'tj-chat-in'; input.autocomplete = 'off';
        const send = btn('Enviar', async () => {
            const v = input.value.trim(); if (!v) return;
            input.value = ''; add('Você', v, true); send.disabled = true; turns++;
            try { add('Professor', String(await session.prompt(v)).trim(), false); } catch (e) { add('Professor', 'Desculpe, tive um problema. Tente de novo.', false); }
            send.disabled = false; gain(8);
            if (turns >= 8) { gain(20); S.stats.chats = (S.stats.chats || 0) + 1; save(); input.disabled = true; send.disabled = true; flash('Boa conversa! +20 XP'); }
        }, 'lb-primary'); send.id = 'tj-chat-send';
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send.click(); } });
        const row = mk('div', 'tj-row'); row.append(input, send); body.appendChild(row);
        body.appendChild(btn('Voltar ao mapa', showMap));
    }

    /* ------------------------------------------------------------ início */
    showMap();
    window.__ddJogo = {
        norm, tokens, accept, diffWords, explain, levelOf, touchDay, gain, ensureItem, reviewItem, dueItems, masteredCount, buildQueue, evalChecks, checkAch,
        chaptersOf, startMission, startReview, showMap, startTextMission, buildTextLesson, evolution, ai, ACH, WORLDS,
        reset() { S = blankState(); save(); showMap(); }, renderPhase, nextPhase, get S() { return S; }, set S(v) { S = v; }, get run() { return run; }, save, dayKey
    };
})();
