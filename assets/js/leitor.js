/* leitor.js — lógica do leitor: navegação, tema, fonte, narração e barra lateral. */
let currentIdx = 0;
let ttsRate = 1.0;
let currentFont = 19; 
let themeState = 0; 
const themes = ['dark', 'light', 'sepia'];

function init() {
    const nav = document.getElementById('nav-container');
    let lastCat = "";
    
    structure.forEach((item, i) => {
        if(item.cat !== lastCat) {
            const cat = document.createElement('div');
            cat.className = 'nav-cat';
            cat.innerText = item.cat;
            nav.appendChild(cat);
            lastCat = item.cat;
        }
        
        const btn = document.createElement('a');
        btn.className = item.sub ? 'chapter-link chapter-sub' : 'chapter-link';
        btn.innerText = item.t;
        btn.href = "#";
        btn.onclick = (e) => { 
            e.preventDefault(); 
            loadChapter(i); 
            if(window.innerWidth < 768) toggleSidebar(); 
        };
        nav.appendChild(btn);
    });
    // Carrega o primeiro capítulo (Introdução) por padrão
    loadChapter(0);
}

function loadChapter(idx) {
    currentIdx = idx;
    const frame = document.getElementById('content-frame');
    const btnTts = document.getElementById('btn-tts');
    
    btnTts.innerText = '▶';
    btnTts.classList.remove('active');
    frame.src = structure[idx].f;
    
    const progress = ((idx + 1) / structure.length * 100);
    document.getElementById('p-bar').style.width = progress + "%";
    document.getElementById('chapter-indicator').innerText = `${(idx + 1).toString().padStart(2, '0')}/${structure.length}`;

    document.querySelectorAll('.chapter-link').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        if(i === idx) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    frame.onload = () => { syncAll(); }
}

function sendMsg(type, val) {
    const win = document.getElementById('content-frame').contentWindow;
    if(win) win.postMessage({ type, value: val }, '*');
}

function syncAll() {
    sendMsg('theme', themes[themeState]);
    sendMsg('font', currentFont);
    sendMsg('rate', ttsRate);
}

function cycleTheme() {
    themeState = (themeState + 1) % 3;
    const mode = themes[themeState];
    document.body.className = mode + '-mode';
    sendMsg('theme', mode);
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function adjustSpeed(delta) {
    ttsRate = Math.max(0.5, Math.min(3.0, ttsRate + delta));
    ttsRate = Math.round(ttsRate * 100) / 100;
    document.getElementById('speed-display').innerText = ttsRate;
    sendMsg('rate', ttsRate);
}

function adjustFont(delta) {
    currentFont = Math.max(14, Math.min(28, currentFont + delta));
    sendMsg('font', currentFont);
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('backdrop');
    
    if(window.innerWidth < 768) {
        sb.classList.toggle('open');
        bd.classList.toggle('active');
    } else {
        sb.classList.toggle('collapsed');
    }
}

function nextChapter() { if(currentIdx < structure.length - 1) loadChapter(currentIdx + 1); }
function prevChapter() { if(currentIdx > 0) loadChapter(currentIdx - 1); }

window.addEventListener('message', (e) => {
    if(e.data.type === 'tts-state') {
        const btn = document.getElementById('btn-tts');
        if(e.data.isPlaying) {
            btn.innerText = '■'; btn.classList.add('active');
        } else {
            btn.innerText = '▶'; btn.classList.remove('active');
        }
    }
});

init();