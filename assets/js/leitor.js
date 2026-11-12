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
    populateVoices();
}

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
        if (i === idx) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    renderRaioX();
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
    if (e.data && e.data.type === 'tts-state') {
        const btn = document.getElementById('btn-tts');
        if (e.data.isPlaying) { btn.innerText = '■'; btn.classList.add('active'); }
        else { btn.innerText = '▶'; btn.classList.remove('active'); }
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanels();
});

init();
