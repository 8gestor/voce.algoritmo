/*
 * capitulo.js — comportamento comum a todas as páginas de capítulo.
 *
 * Conversa com o leitor (index.html) via postMessage:
 *   recebe  { type: 'theme',      value: 'dark' | 'light' | 'sepia' }
 *   recebe  { type: 'font',       value: <px> }
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

    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'theme') document.body.className = d.value + '-mode';
        if (d.type === 'font') document.documentElement.style.setProperty('--base-size', d.value + 'px');
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