/*
 * capitulo.js — comportamento comum a todas as páginas de capítulo.
 *
 * Conversa com o leitor (index.html) via postMessage:
 *   recebe  { type: 'theme',      value: 'paper' | 'dark' | 'light' | 'sepia' }
 *   recebe  { type: 'font',       value: <px> }
 *   recebe  { type: 'typeface',   value: 'serif' | 'legible' | 'mono' }
 *   recebe  { type: 'margins',    value: 'narrow' | 'medium' | 'wide' }
 *   recebe  { type: 'align',      value: 'left' | 'justify' }
 *   recebe  { type: 'rate',       value: <velocidade da narração> }
 *   recebe  { type: 'tts-toggle' }
 *   envia   { type: 'tts-state',  isPlaying: <bool> }
 *
 * A narração lê, em ordem, cada elemento com a classe .speakable.
 */
(function () {
    'use strict';

    const synthesis = window.speechSynthesis;
    let queue = [];
    let index = 0;
    let rate = 1.0;
    let isPlaying = false;

    // Preferências salvas pelo leitor (tema, fonte, margens...). Um capítulo aberto
    // diretamente também nasce no tema Papel, sem esperar a mensagem do leitor.
    const root = document.documentElement;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('dd-settings') || '{}'); } catch (err) { saved = {}; }
    document.body.className = (saved.theme || 'paper') + '-mode';
    if (saved.font) root.style.setProperty('--base-size', saved.font + 'px');
    root.dataset.face = saved.face || 'serif';
    root.dataset.margin = saved.margin || 'medium';
    root.dataset.align = saved.align || 'left';

    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'theme') document.body.className = d.value + '-mode';
        if (d.type === 'font') root.style.setProperty('--base-size', d.value + 'px');
        if (d.type === 'typeface') root.dataset.face = d.value;
        if (d.type === 'margins') root.dataset.margin = d.value;
        if (d.type === 'align') root.dataset.align = d.value;
        if (d.type === 'rate') {
            rate = d.value;
            if (isPlaying) { synthesis.cancel(); speakStep(false); }
        }
        if (d.type === 'tts-toggle') toggleTTS();
    });

    function getVoice() {
        const voices = synthesis.getVoices();
        return voices.find((v) => v.lang === 'pt-BR' && v.name.includes('Google')) ||
               voices.find((v) => v.lang === 'pt-BR');
    }

    function loadQueue() {
        queue = Array.from(document.querySelectorAll('.speakable'));
    }

    function toggleTTS() {
        if (queue.length === 0) loadQueue();

        if (isPlaying) {
            synthesis.cancel();
            isPlaying = false;
            highlight(null);
            reportState(false);
        } else {
            isPlaying = true;
            reportState(true);
            if (index >= queue.length) index = 0;
            speakStep(false);
        }
    }

    function speakStep(advance) {
        if (!isPlaying) return;
        if (advance) index++;

        if (index >= queue.length) {
            isPlaying = false;
            reportState(false);
            highlight(null);
            index = 0;
            return;
        }

        const el = queue[index];
        highlight(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const utterance = new SpeechSynthesisUtterance(el.innerText);
        utterance.lang = 'pt-BR';
        utterance.rate = rate;
        utterance.voice = getVoice();
        utterance.onend = () => { if (isPlaying) speakStep(true); };
        utterance.onerror = () => { if (isPlaying) speakStep(true); };

        synthesis.speak(utterance);
    }

    function highlight(el) {
        document.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
        if (el) el.classList.add('speaking');
    }

    function reportState(playing) {
        window.parent.postMessage({ type: 'tts-state', isPlaying: playing }, '*');
    }

    // Clicar em um parágrafo começa a narração a partir dele.
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('.speakable');
        if (!target) return;
        if (queue.length === 0) loadQueue();
        const i = queue.indexOf(target);
        if (i === -1) return;
        synthesis.cancel();
        index = i;
        isPlaying = true;
        reportState(true);
        speakStep(false);
    });

    window.addEventListener('beforeunload', () => synthesis.cancel());
})();