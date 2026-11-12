/*
 * leitor.js — lógica do leitor: navegação, temas, painel Aa, Raio-X, narração e barra lateral.
 *
 * Preferências (tema, tamanho, fonte, margens, alinhamento, velocidade) ficam salvas no
 * navegador (localStorage, chave "dd-settings") e são reenviadas a cada capítulo carregado.
 * Depende de: assets/js/sumario.js (const structure) e assets/js/raiox.js (const RAIOX).
 */
const THEMES = [
    { id: 'paper', label: 'Papel' },
    { id: 'dark', label: 'Terminal' },
    { id: 'light', label: 'Claro' },
    { id: 'sepia', label: 'Sépia' }
];
const DEFAULTS = {
    theme: 'paper', font: 19, face: 'serif', margin: 'medium', align: 'left', rate: 1.0,
    readLang: 'pt', audioLang: 'pt', voices: { pt: '', en: '' }
};
const SETTINGS_KEY = 'dd-settings';
const OPT_TO_MSG = {
    theme: 'theme', face: 'typeface', margin: 'margins', align: 'align',
    readLang: 'readlang', audioLang: 'audiolang'
};
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

let settings = Object.assign({}, DEFAULTS);
try { settings = Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* sem storage */ }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignora */ } }

let currentIdx = 0;

const frameEl = () => document.getElementById('content-frame');

function sendMsg(type, value) {
    const win = frameEl().contentWindow;
    if (win) win.postMessage({ type, value }, '*');
}

function syncAll() {
    sendMsg('theme', settings.theme);
    sendMsg('font', settings.font);
    sendMsg('typeface', settings.face);
    sendMsg('margins', settings.margin);
    sendMsg('align', settings.align);
    sendMsg('readlang', settings.readLang);
    sendMsg('audiolang', settings.audioLang);
    sendMsg('voice', { lang: 'pt', name: settings.voices.pt });
    sendMsg('voice', { lang: 'en', name: settings.voices.en });
    sendMsg('rate', settings.rate);
}

/* ---------- interface do leitor ---------- */
function refreshControls() {
    document.body.className = settings.theme + '-mode';
    document.documentElement.dataset.face = settings.face;     // o menu lateral acompanha a fonte do texto
    document.getElementById('speed-select').value = String(SPEEDS.reduce((a, b) => (Math.abs(b - settings.rate) < Math.abs(a - settings.rate) ? b : a)));
    document.documentElement.lang = settings.readLang === 'en' ? 'en' : 'pt-BR';
    document.getElementById('font-display').innerText = settings.font + ' px';
    applyUiLang();
    document.querySelectorAll('[data-opt]').forEach((b) => {
        const on = String(settings[b.dataset.opt]) === b.dataset.val;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('on', on);
    });
}

function setOption(key, val) {
    settings[key] = val;
    saveSettings();
    refreshControls();
    sendMsg(OPT_TO_MSG[key], val);
}

function adjustFont(delta) {
    settings.font = Math.max(14, Math.min(28, settings.font + delta));
    saveSettings(); refreshControls(); sendMsg('font', settings.font);
}

// Só define a velocidade da voz: a narração continua na mesma palavra.
function setSpeed(v) {
    settings.rate = Number(v) || 1;
    saveSettings(); refreshControls(); sendMsg('rate', settings.rate);
}

function setVoice(lang, name) {
    settings.voices[lang] = name;
    saveSettings();
    sendMsg('voice', { lang: lang, name: name });
}

// Preenche os seletores de voz com o que o navegador oferece (a lista chega de forma assíncrona).
function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    const all = speechSynthesis.getVoices();
    const enUi = settings.readLang === 'en';
    [['pt', enUi ? 'Automatic (Portuguese)' : 'Automática (português)'],
     ['en', enUi ? 'Automatic (English)' : 'Automática (inglês)']].forEach(([lang, auto]) => {
        const sel = document.getElementById('voice-' + lang);
        if (!sel) return;
        sel.textContent = '';
        const o0 = document.createElement('option'); o0.value = ''; o0.textContent = auto; sel.appendChild(o0);
        all.filter((v) => v.lang.toLowerCase().indexOf(lang) === 0).forEach((v) => {
            const o = document.createElement('option');
            o.value = v.name; o.textContent = v.name.replace(/^Microsoft /, '').replace(/ - .*$/, '') + ' (' + v.lang + ')';
            sel.appendChild(o);
        });
        sel.value = settings.voices[lang] || '';
    });
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = populateVoices;

function cycleTheme() {
    const i = THEMES.findIndex((t) => t.id === settings.theme);
    setOption('theme', THEMES[(i + 1) % THEMES.length].id);
}

function togglePanel(id) {
    ['aa-panel', 'raiox'].forEach((x) => {
        const el = document.getElementById(x);
        if (x === id) el.classList.toggle('open'); else el.classList.remove('open');
    });
    document.getElementById('btn-aa').setAttribute('aria-expanded', String(document.getElementById('aa-panel').classList.contains('open')));
    document.getElementById('btn-raiox').setAttribute('aria-expanded', String(document.getElementById('raiox').classList.contains('open')));
}
function closePanels() { togglePanel(null); }

/* ---------- Raio-X: conceitos do capítulo, tirados do glossário ---------- */
function renderRaioX() {
    const en = settings.readLang === 'en';
    const list = document.getElementById('raiox-list');
    const items = (typeof RAIOX !== 'undefined' && RAIOX[structure[currentIdx].f]) || [];
    list.textContent = '';
    const n = items.length;
    document.getElementById('raiox-count').innerText = en
        ? n + (n === 1 ? ' concept' : ' concepts')
        : n + (n === 1 ? ' conceito' : ' conceitos');
    if (!n) {
        const p = document.createElement('p');
        p.className = 'raiox-empty';
        p.textContent = en
            ? 'No glossary concepts are mapped to this chapter.'
            : 'Nenhum conceito do glossário está mapeado neste capítulo.';
        list.appendChild(p);
        return;
    }
    items.forEach((it) => {
        const box = document.createElement('div');
        box.className = 'raiox-item';
        const t = document.createElement('strong'); t.textContent = en && it.te ? it.te : it.t;
        const d = document.createElement('span'); d.className = 'raiox-def'; d.textContent = en && it.de ? it.de : it.d;
        const r = document.createElement('span'); r.className = 'raiox-ref'; r.textContent = 'REF: ' + (en && it.re ? it.re : it.r);
        box.append(t, d, r);
        list.appendChild(box);
    });
}

/* ---------- idioma da interface (acompanha o idioma de leitura) ---------- */
const navItems = [];   // { el, pt, en } — títulos do menu lateral

function applyUiLang() {
    const en = settings.readLang === 'en';
    document.querySelectorAll('[data-en]').forEach((el) => {
        if (el.dataset.pt === undefined) el.dataset.pt = el.textContent;
        el.textContent = en ? el.dataset.en : el.dataset.pt;
    });
    navItems.forEach((n) => { n.el.innerText = en && n.en ? n.en : n.pt; });
    renderRaioX();
    updateHud();
    populateVoices();
}

/* ---------- estatísticas: tempo de leitura e palavras (barras superior e inferior) ----------
 * Os totais por capítulo vêm de assets/js/estatisticas-dados.js (gerado por tools/stats.ps1).
 * O avanço da leitura chega do capítulo (mensagens 'dd-progress' e 'dd-listen') e é guardado no
 * navegador (chave "dd-stats"). Cada capítulo é dividido em NB trechos iguais; um trecho conta
 * como lido uma única vez por idioma, de modo que reler não infla os números. Saltos grandes de
 * rolagem (ir direto ao fim) não contam como leitura. */
const STATS_KEY = 'dd-stats';
const NB = 50;
let dstats = { v: 1, ch: {} };
try { const s = JSON.parse(localStorage.getItem(STATS_KEY) || 'null'); if (s && s.ch) dstats = s; } catch (e) { /* sem storage */ }
let statsDirty = false, ttsPlaying = false, lastActivity = 0;
const seenAt = {};      // posição (0..1) vista por último nesta sessão, por arquivo+idioma

function saveStats() {
    if (!statsDirty) return;
    statsDirty = false;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(dstats)); } catch (e) { /* ignora */ }
}
function chStat(f) {
    const c = dstats.ch[f] || (dstats.ch[f] = {});
    const zero = '0'.repeat(NB);
    c.b = c.b || {};
    ['pt', 'en'].forEach((l) => { if (typeof c.b[l] !== 'string' || c.b[l].length !== NB) c.b[l] = zero; });
    c.ls = c.ls || { pt: 0, en: 0 };
    c.sec = c.sec || 0;
    return c;
}
function frOf(st, lang) { let n = 0; const s = st.b[lang]; for (let i = 0; i < s.length; i++) if (s[i] === '1') n++; return n / NB; }
function creditRange(st, lang, a, b) {
    const lo = Math.max(0, Math.min(NB - 1, Math.floor(Math.min(a, b) * NB)));
    const hi = Math.max(0, Math.min(NB - 1, Math.floor(Math.max(a, b) * NB)));
    const arr = st.b[lang].split('');
    let changed = false;
    for (let i = lo; i <= hi; i++) if (arr[i] !== '1') { arr[i] = '1'; changed = true; }
    if (changed) st.b[lang] = arr.join('');
    return changed;
}

const HUD_TXT = {
    pt: { reading: 'LEITURA', words: 'PALAVRAS', left: 'restam', book: 'LIVRO', done: 'concluído', heard: 'Ouvidas' },
    en: { reading: 'READING', words: 'WORDS', left: 'left', book: 'BOOK', done: 'done', heard: 'Heard' }
};
const hudShown = {};
function numFmt() { return new Intl.NumberFormat(settings.readLang === 'en' ? 'en-US' : 'pt-BR'); }
function fmtMin(m) {
    if (m < 1) return '< 1 min';
    if (m < 60) return Math.round(m) + ' min';
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return h + ' h' + (r ? ' ' + r + ' min' : '');
}
// Número que "carrega": sobe até o valor novo em vez de trocar de repente.
function tweenNum(el, to) {
    const from = hudShown[el.id] != null ? hudShown[el.id] : 0;
    hudShown[el.id] = to;
    clearInterval(el._iv);
    // Aba oculta (o navegador pausa animações) ou nada a animar: mostra o valor final já.
    if (document.hidden || Math.round(from) === Math.round(to)) { el.textContent = numFmt().format(Math.round(to)); return; }
    const t0 = performance.now(), dur = 450;
    // Temporizador (não requestAnimationFrame): termina sempre, mesmo em aba em segundo plano.
    el._iv = setInterval(() => {
        const k = Math.max(0, Math.min(1, (performance.now() - t0) / dur));
        el.textContent = numFmt().format(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
        if (k >= 1) clearInterval(el._iv);
    }, 40);
}
function bookTotals() {
    const t = { pt: 0, en: 0, readPt: 0, readEn: 0 };
    Object.keys(STATS.chapters).forEach((f) => {
        const S = STATS.chapters[f], st = dstats.ch[f] ? chStat(f) : null;
        t.pt += S.pt; t.en += S.en;
        if (st) { t.readPt += frOf(st, 'pt') * S.pt; t.readEn += frOf(st, 'en') * S.en; }
    });
    return t;
}

function updateHud() {
    if (typeof STATS === 'undefined') return;
    const lang = settings.readLang === 'en' ? 'en' : 'pt', T = HUD_TXT[lang], n = numFmt(), rd = STATS.wpm.read;
    const f = structure[currentIdx].f, S = STATS.chapters[f];
    let tot, read;
    if (S) { tot = S; read = frOf(chStat(f), lang) * S[lang]; }
    else { const b = bookTotals(); tot = b; read = lang === 'en' ? b.readEn : b.readPt; }

    document.getElementById('hud-top').innerHTML =
        (S ? '' : '<b>' + T.book + '</b><span class="ht-sep">·</span>') +
        T.reading + ' ≈ <b>' + fmtMin(tot.pt / rd.pt) + '</b> PT<span class="ht-sep">/</span><b>' + fmtMin(tot.en / rd.en) + '</b> EN' +
        '<span class="ht-sep ht-words">|</span><span class="ht-words">' + T.words + ' PT <b>' + n.format(tot.pt) + '</b> · EN <b>' + n.format(tot.en) + '</b></span>';

    tweenNum(document.getElementById('hl-read'), read);
    document.getElementById('hl-total').textContent = n.format(tot[lang]);
    document.getElementById('hl-lang').textContent = lang.toUpperCase();
    const leftMin = (tot[lang] - read) / rd[lang];
    document.getElementById('hl-left').textContent = tot[lang] - read < 1 ? '✓ ' + T.done : T.left + ' ≈ ' + fmtMin(leftMin);
    document.getElementById('read-line').style.width = (tot[lang] ? Math.min(100, read / tot[lang] * 100) : 0) + '%';
    if (S) {
        const st = chStat(f);
        document.getElementById('hud-live').title = T.heard + ': PT ' + n.format(st.ls.pt) + ' · EN ' + n.format(st.ls.en);
    }
}

function onProgress(d) {
    if (typeof STATS === 'undefined') return;
    const f = d.page + '.html';
    if (!STATS.chapters[f] || f !== structure[currentIdx].f) return;
    const lang = settings.readLang === 'en' ? 'en' : 'pt', st = chStat(f), key = f + '|' + lang;
    const frac = Math.max(0, Math.min(1, Number(d.frac) || 0));
    let changed = false;
    if (d.kind === 'load') { changed = creditRange(st, lang, 0, frac); lastActivity = Date.now(); }
    else if (d.kind === 'lang') { /* trocou o idioma: só marca a posição, não credita leitura */ }
    else {
        lastActivity = Date.now();
        const from = seenAt[key] != null ? seenAt[key] : frac;
        if (Math.abs(frac - from) <= 0.25) changed = creditRange(st, lang, from, frac);
    }
    seenAt[key] = frac;
    if (changed) { statsDirty = true; updateHud(); }
}
function onListen(d) {
    if (typeof STATS === 'undefined') return;
    const f = d.page + '.html';
    if (!STATS.chapters[f] || f !== structure[currentIdx].f || !(d.words > 0)) return;
    const st = chStat(f), lang = d.lang === 'en' ? 'en' : 'pt';
    st.ls[lang] += Math.round(d.words);
    statsDirty = true; lastActivity = Date.now();
    updateHud();
}

// Tempo realmente gasto no capítulo: só conta com a aba visível e com atividade recente (ou narração tocando).
setInterval(() => {
    if (typeof STATS === 'undefined' || document.visibilityState !== 'visible') return;
    const f = structure[currentIdx].f;
    if (!STATS.chapters[f]) return;
    if (ttsPlaying || Date.now() - lastActivity < 90000) { chStat(f).sec += 1; statsDirty = true; }
}, 1000);
setInterval(saveStats, 4000);
window.addEventListener('pagehide', saveStats);
document.addEventListener('visibilitychange', saveStats);
['pointerdown', 'keydown', 'wheel'].forEach((ev) => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));

/* ---------- navegação ---------- */
function init() {
    const nav = document.getElementById('nav-container');
    let lastCat = '';

    structure.forEach((item, i) => {
        if (item.cat !== lastCat) {
            const cat = document.createElement('div');
            cat.className = 'nav-cat';
            cat.innerText = item.cat;
            navItems.push({ el: cat, pt: item.cat, en: CATEGORIES_EN[item.cat] });
            nav.appendChild(cat);
            lastCat = item.cat;
        }
        const btn = document.createElement('a');
        btn.className = item.sub ? 'chapter-link chapter-sub' : 'chapter-link';
        btn.innerText = item.t;
        navItems.push({ el: btn, pt: item.t, en: TITLES_EN[item.f] });
        btn.href = '#' + item.f.replace('.html', '');
        btn.onclick = (e) => {
            e.preventDefault();
            loadChapter(i);
            if (window.innerWidth < 768) toggleSidebar();
        };
        nav.appendChild(btn);
    });

    // abre direto no capítulo indicado na URL (#cap03), se houver
    const wanted = location.hash.replace('#', '');
    const start = structure.findIndex((s) => s.f.replace('.html', '') === wanted);
    refreshControls();
    populateVoices();
    loadChapter(start >= 0 ? start : 0);
}

function loadChapter(idx) {
    saveStats();                 // grava o avanço do capítulo que está saindo (a página de estatísticas lê daqui)
    currentIdx = idx;
    const frame = frameEl();
    const btnTts = document.getElementById('btn-tts');

    btnTts.innerText = '▶';
    btnTts.classList.remove('active');
    closePanels();
    frame.src = structure[idx].f;
    try { history.replaceState(null, '', '#' + structure[idx].f.replace('.html', '')); } catch (e) { /* file:// */ }

    const progress = ((idx + 1) / structure.length * 100);
    document.getElementById('p-bar').style.width = progress + '%';
    document.getElementById('chapter-indicator').innerText = `${(idx + 1).toString().padStart(2, '0')}/${structure.length}`;

    document.querySelectorAll('.chapter-link').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        if (i === idx) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    renderRaioX();
    updateHud();
    frame.onload = () => { syncAll(); };
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('backdrop');
    if (window.innerWidth < 768) {
        sb.classList.toggle('open');
        bd.classList.toggle('active');
    } else {
        sb.classList.toggle('collapsed');
    }
}

function nextChapter() { if (currentIdx < structure.length - 1) loadChapter(currentIdx + 1); }
function prevChapter() { if (currentIdx > 0) loadChapter(currentIdx - 1); }

window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'dd-goto') {
        const i = structure.findIndex((s) => s.f === e.data.file);
        if (i >= 0) loadChapter(i);
    }
    if (e.data && e.data.type === 'dd-stats-reset') {
        dstats = { v: 1, ch: {} };
        Object.keys(seenAt).forEach((k) => delete seenAt[k]);
        statsDirty = true; saveStats(); updateHud();
    }
    if (e.data && e.data.type === 'dd-progress') onProgress(e.data);
    if (e.data && e.data.type === 'dd-listen') onListen(e.data);
    if (e.data && e.data.type === 'tts-state') {
        const btn = document.getElementById('btn-tts');
        ttsPlaying = !!e.data.isPlaying;
        if (e.data.isPlaying) { btn.innerText = '■'; btn.classList.add('active'); }
        else { btn.innerText = '▶'; btn.classList.remove('active'); }
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanels();
});

init();
