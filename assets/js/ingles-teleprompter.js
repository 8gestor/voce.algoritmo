/*
 * ingles-teleprompter.js — modo de leitura Teleprompter: uma LEGENDA CORRIDA, como as de TV e cinema.
 * - A linha grande mostra a frase no idioma de LEITURA ("Ler") e corre da direita para a esquerda: a frase nova entra pela direita e a palavra
 *   falada fica sempre no ponto de leitura (um pouco à direita do centro, 62% da largura), destacada, em sincronia com a narração.
 * - A narração fala no idioma de ÁUDIO ("Ouvir"), que pode ser outro: ler em português e ouvir em inglês, ou o contrário. Como o texto da
 *   linha e o texto falado têm tamanhos diferentes, a posição da palavra falada é mapeada proporcionalmente (igual ao texto corrido).
 * - Embaixo, em letra menor, a frase no outro idioma (o que se ouve, ou a tradução).
 * - O resto da tela some: o site pai esconde menu, barra de comandos e rodapé (mensagem dd-lab-immersive). Ficam a legenda, os controles
 *   mínimos (sair, frase anterior/próxima, ler/pausar, velocidade, tamanho, Ler PT/EN, Ouvir PT/EN) e o acompanhamento (frase N de M, %).
 * Ao escolher o modo no seletor a narração começa sozinha; ao reabrir um livro já no modo, espera o ▶ (o navegador exige um toque).
 * Eventos do núcleo: `sentence`, `piece` (texto exato falado e idioma), `wordpos`, `stop`, `open`, `close`, `mode`, `lang`.
 * Teclado: Espaço = ler/pausar, ← e → = frase anterior/próxima, + e − = tamanho, Esc = sair. Tamanho em localStorage dd-ingles-tele-size.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D || !D.setMode) return;
    const KEY = 'dd-ingles-tele-size', RATES = Array.from({ length: 12 }, (_, i) => (i + 1) * 0.25), READ_AT = 0.62;
    const L = {
        pt: { prev: 'Frase anterior', next: 'Próxima frase', play: 'Ler', pause: 'Pausar', speed: 'Velocidade', smaller: 'Letra menor', bigger: 'Letra maior', exit: 'Sair do teleprompter', wait: 'traduzindo…', read: 'Ler', listen: 'Ouvir', count: (a, b, p) => 'Frase ' + a + ' de ' + b + ' · ' + p + '%', group: 'Teleprompter' },
        en: { prev: 'Previous sentence', next: 'Next sentence', play: 'Play', pause: 'Pause', speed: 'Speed', smaller: 'Smaller text', bigger: 'Bigger text', exit: 'Leave the teleprompter', wait: 'translating…', read: 'Read', listen: 'Listen', count: (a, b, p) => 'Sentence ' + a + ' of ' + b + ' · ' + p + '%', group: 'Teleprompter' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const WORD = /[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;

    let size = 1, rate = 1, cur = null, spoken = null, words = [], wi = -1, immersive = false, cumSent = null, lastBase = '', pendingNext = '', asked = '', nx = null, pf = new Set(), painted = null, lastArr = 0, cpsEst = 0.013, subWords = [], subTxt = '', exK = -1;
    try { size = Math.min(1.7, Math.max(0.6, Number(localStorage.getItem(KEY)) || 1)); } catch (e) { /* sem storage */ }
    const saveSize = () => { try { localStorage.setItem(KEY, String(size)); } catch (e) { /* ignora */ } };

    /* ------------------------------------------------------------ montagem */
    const root = el('section', 'lb-tele'); root.id = 'lb-tele'; root.hidden = true; root.tabIndex = -1; root.setAttribute('role', 'region');
    const bar = el('div', 'tl-bar');
    const bExit = el('button', 'tl-b tl-exit', '✕'), bPrev = el('button', 'tl-b', '⏮'), bPlay = el('button', 'tl-b tl-play', '▶'), bNext = el('button', 'tl-b', '⏭');
    const bRate = el('select', 'tl-b tl-rate'), bMin = el('button', 'tl-b', 'A−'), bMax = el('button', 'tl-b', 'A+');
    [bExit, bPrev, bPlay, bNext, bMin, bMax].forEach((b) => { b.type = 'button'; });
    RATES.forEach((v) => { const o = document.createElement('option'); o.value = String(v); bRate.appendChild(o); });
    // idiomas: ler num e ouvir em outro (e o contrário); o site pai guarda a escolha e atualiza os botões LER/OUVIR dele
    const langs = el('div', 'tl-langs'), groups = {};
    [['readLang', 'read'], ['audioLang', 'listen']].forEach((g) => {
        const box = el('div', 'tl-lg'), lab = el('span', 'tl-lab'); box.appendChild(lab); groups[g[0]] = { lab, key: g[1], btns: {} };
        ['pt', 'en'].forEach((v) => {
            const b = el('button', 'tl-b tl-lang', v.toUpperCase()); b.type = 'button'; b.id = 'lb-tele-' + (g[0] === 'readLang' ? 'read' : 'listen') + '-' + v; b.dataset.opt = g[0]; b.dataset.val = v;
            b.addEventListener('click', () => setOpt(g[0], v)); box.appendChild(b); groups[g[0]].btns[v] = b;
        });
        langs.appendChild(box);
    });
    const count = el('div', 'tl-count'); count.id = 'lb-tele-count';
    bar.append(bExit, count, langs, bPrev, bPlay, bNext, bRate, bMin, bMax);
    const stage = el('div', 'tl-stage'), view = el('div', 'tl-view'), track = el('div', 'tl-track'), head = el('div', 'tl-head'), sub = el('div', 'tl-sub');
    track.id = 'lb-tele-line'; sub.id = 'lb-tele-sub'; head.style.left = (READ_AT * 100) + '%';
    view.append(head, track); stage.append(view, sub);
    const prog = el('div', 'tl-prog'), fill = el('div', 'tl-prog-fill'); prog.appendChild(fill);
    root.append(bar, stage, prog);
    document.body.appendChild(root);

    function setOpt(key, val) {
        if (window.parent && window.parent !== window) D.postParent({ type: 'dd-set-option', key, value: val });
        else window.postMessage({ type: key === 'readLang' ? 'readlang' : 'audiolang', value: val }, '*');
    }

    /* ------------------------------------------------------------ texto de uma frase em um idioma */
    function textIn(p, s, lang) {
        const doc = D.doc;
        if (!doc || !doc.paras[p] || doc.paras[p].s[s] == null) return null;
        if (lang === doc.lang) return doc.paras[p].s[s];
        const tr = doc.tr[p];
        return tr && tr[s] != null ? tr[s] : null;
    }
    function neighbour(p, s, d) {
        const doc = D.doc; if (!doc) return null;
        let q = p, k = s + d;
        for (let guard = 0; guard < 4; guard++) {
            if (k < 0) { q--; if (q < 0) return null; k = doc.paras[q].s.length - 1; }
            else if (k >= doc.paras[q].s.length) { q++; if (q >= doc.paras.length) return null; k = 0; }
            if (k >= 0 && doc.paras[q] && doc.paras[q].s[k] != null) return { p: q, s: k };
        }
        return null;
    }
    function position() {
        const doc = D.doc; if (!doc) return null;
        if (D.tts.mark) return { p: D.tts.mark.p, s: D.tts.mark.s };
        if (D.tts.cursor && D.tts.cursor.p < doc.paras.length) return { p: D.tts.cursor.p, s: D.tts.cursor.s };
        return { p: Math.min(D.firstVisible(), doc.paras.length - 1), s: 0 };
    }
    function sentIndex(p, s) {
        const doc = D.doc; if (!doc) return { n: 0, total: 0 };
        if (!cumSent || cumSent.id !== doc.id) { const c = [0]; doc.paras.forEach((q) => c.push(c[c.length - 1] + q.s.length)); cumSent = { id: doc.id, c }; }
        return { n: cumSent.c[Math.min(p, cumSent.c.length - 2)] + s + 1, total: cumSent.c[cumSent.c.length - 1] };
    }

    /* ------------------------------------------------------------ a linha corrida */
    const active = () => D.state.mode === 'tele' && !!D.doc && !D.$('lb-reader').hidden;
    // x (no track) do centro da palavra k que deve ficar no ponto de leitura; antes da 1ª palavra, o começo da linha fica nele
    function target(k) {
        const vw = view.clientWidth;
        if (!words.length) return vw * READ_AT;
        if (k < 0 || !words[k]) return vw * READ_AT - words[0].el.offsetLeft;
        const c = (i) => words[i].el.offsetLeft + words[i].el.offsetWidth / 2;
        // alvo = meio caminho entre esta palavra e a próxima: durante a fala da palavra a linha desliza até lá, então ela fica centrada em média
        return vw * READ_AT - (words[k + 1] ? (c(k) + c(k + 1)) / 2 : c(k));
    }
    // dur (ms) = deslize contínuo e linear até o alvo, no ritmo da fala; sem dur, a animação padrão (entrada de frase, redimensionar)
    function place(k, dur) {
        track.style.transition = dur ? 'transform ' + dur + 'ms linear' : '';
        track.style.transform = 'translateX(' + Math.round(target(k)) + 'px)';
    }
    // modo: 'slide' = frase nova entra pela direita; 'carry' = a frase que já aparecia à direita como prévia vira a atual e a linha segue contínua; 'stay' = só repinta
    function paintLine(text, lang, mode, nextText) {
        const carry = mode === 'carry' && nx ? new DOMMatrix(getComputedStyle(track).transform).m41 + nx.offsetLeft : null;   // onde a prévia estava na tela
        track.textContent = ''; nx = null; words = []; lastArr = 0; wi = -1; track.dataset.lang = lang || ''; track.lang = lang || ''; track.dataset.text = text == null ? '' : text;
        if (text != null) {
            let pos = 0, m;
            WORD.lastIndex = 0;
            while ((m = WORD.exec(text))) {
                if (m.index > pos) track.append(text.slice(pos, m.index));
                const w = el('span', 'tl-w', m[0]);
                track.append(w); words.push({ el: w, s: m.index, e: m.index + m[0].length });
                pos = m.index + m[0].length;
            }
            if (pos < text.length) track.append(text.slice(pos));
        }
        setPreview(nextText);
        painted = { sig: (text || '') + '|' + (lang || ''), next: nextText || '' };
        if (carry != null) {
            track.style.transition = 'none';
            track.style.transform = 'translateX(' + Math.round(carry) + 'px)';
            void track.offsetWidth;
            track.style.transition = '';
            requestAnimationFrame(() => place(wi));
        } else if (mode === 'slide') {                          // frase nova: entra pela direita e corre até o ponto de leitura
            track.style.transition = 'none';
            track.style.transform = 'translateX(' + view.clientWidth + 'px)';
            void track.offsetWidth;
            track.style.transition = '';
            requestAnimationFrame(() => place(wi));
        } else place(wi);
    }
    // buffer: a frase seguinte já está carregada à direita, esmaecida; só a atual é destacada. Trocar só a prévia não mexe na frase atual.
    function setPreview(nextText) {
        if (nx) { if (nx.previousSibling && nx.previousSibling.className === 'tl-gap') nx.previousSibling.remove(); nx.remove(); nx = null; }
        if (!nextText) return;
        track.append(el('span', 'tl-gap'));
        nx = el('span', 'tl-nx', nextText); nx.dataset.text = nextText; track.append(nx);
    }
    // a linha de baixo (outro idioma) em palavras, para destacar a equivalente da palavra falada ou explorada, em outra cor
    function paintSub(text) {
        sub.textContent = ''; subWords = []; subTxt = text || '';
        let pos = 0, m; WORD.lastIndex = 0;
        while ((m = WORD.exec(subTxt))) {
            if (m.index > pos) sub.append(subTxt.slice(pos, m.index));
            const w = el('span', 'tl-sw', m[0]); sub.append(w); subWords.push({ el: w, s: m.index, e: m.index + m[0].length });
            pos = m.index + m[0].length;
        }
        if (pos < subTxt.length) sub.append(subTxt.slice(pos));
    }
    function markSub(k) {
        subWords.forEach((w) => w.el.classList.remove('now2'));
        if (!subWords.length || sub.classList.contains('wait') || k < 0 || !words[k]) return;
        const txt = track.dataset.text || '', c = D.mapPos ? D.mapPos(txt, words[k].s, subTxt, track.dataset.lang || D.state.readLang) : 0;
        let j = 0; subWords.forEach((w, i) => { if (w.s <= c) j = i; });
        subWords[j].el.classList.add('now2');
    }
    // setas: palavra a palavra, parando a narração (Shift + seta = frase)
    function exploreStep(dir) {
        if (!cur || !words.length) return;
        if (D.tts.playing) D.stopTts();
        let k = (exK >= 0 ? exK : (wi >= 0 ? wi : (dir > 0 ? -1 : words.length))) + dir;
        if (k < 0) { const n = neighbour(cur.p, cur.s, -1); if (!n) k = 0; else { cur = { p: n.p, s: n.s }; spoken = null; render(); k = words.length - 1; } }
        else if (k >= words.length) { const n = neighbour(cur.p, cur.s, 1); if (!n) k = words.length - 1; else { cur = { p: n.p, s: n.s }; spoken = null; render(); k = 0; } }
        exK = Math.max(0, k);
        mark(exK); markSub(exK);
    }
    function mark(k) {
        if (k === wi) return;
        words.forEach((w, i) => { w.el.classList.toggle('now', i === k); w.el.classList.toggle('past', i < k); });
        const prev = wi, now = performance.now();
        wi = k;
        if (lastArr && prev >= 0 && k === prev + 1) {                    // aprende o ritmo da voz (caracteres por ms) para o deslize casar com a fala
            const sample = (words[prev].e - words[prev].s + 1) / Math.max(1, now - lastArr);
            cpsEst = 0.6 * cpsEst + 0.4 * Math.min(0.05, Math.max(0.004, sample));
        }
        lastArr = now;
        place(k, Math.min(1400, Math.max(90, (words[k].e - words[k].s + 1) / cpsEst)));
    }
    function render() {
        const doc = D.doc;
        if (!active() || !doc || !cur) return;
        const rl = D.state.readLang;
        let mainText = textIn(cur.p, cur.s, rl), mainLang = rl;
        if (mainText == null) { mainText = textIn(cur.p, cur.s, doc.lang); mainLang = doc.lang; }     // a tradução ainda não chegou: mostra o original
        const base = cur.p + ':' + cur.s + ':' + rl;               // mesma frase e mesmo idioma: só repinta (a tradução chegando não faz a linha entrar de novo)
        const nb = neighbour(cur.p, cur.s, 1), nbText = nb ? textIn(nb.p, nb.s, mainLang) : null;
        const how = base === lastBase ? 'stay' : (lastBase && base === pendingNext ? 'carry' : 'slide');
        if (how === 'stay' && painted && painted.sig === (mainText || '') + '|' + (mainLang || '')) {
            if (painted.next !== (nbText || '')) { setPreview(nbText); painted.next = nbText || ''; }     // só a prévia mudou: a linha atual e o destaque ficam como estão (sem refazer, sem pulo)
        } else paintLine(mainText, mainLang, how, nbText);
        lastBase = base; pendingNext = nb && nbText != null ? nb.p + ':' + nb.s + ':' + rl : '';
        prefetch(nb); if (nb) prefetch(neighbour(nb.p, nb.s, 1));
        const otherLang = D.other(mainLang), subText = textIn(cur.p, cur.s, otherLang);
        paintSub(subText != null ? subText : t('wait'));
        sub.classList.toggle('wait', subText == null); sub.lang = otherLang;
        if (wi >= 0) markSub(wi);
        if ((subText == null || mainLang !== rl) && asked !== base) {     // traduz só esta frase (rápido); uma vez por frase, para não repetir sem tradutor
            asked = base;
            const want = { p: cur.p, s: cur.s };
            const job = D.trSentence ? D.trSentence(want.p, want.s) : D.ensureTr(want.p);
            job.then(() => { if (cur && active() && cur.p === want.p && cur.s === want.s) render(); });
        }
        const ix = sentIndex(cur.p, cur.s), pct = ix.total ? Math.round(ix.n / ix.total * 100) : 0;
        count.textContent = t('count')(D.nf().format(ix.n), D.nf().format(ix.total), pct);
        fill.style.width = pct + '%';
        root.style.setProperty('--tl-size', String(size));
        labels();
    }
    // buffer à frente: traduz as próximas frases enquanto a atual é lida, para a prévia e a troca nunca esperarem a tradução
    function prefetch(n) {
        if (!n || !D.doc || !D.trSentence) return;
        const key = D.doc.id + ':' + n.p + ':' + n.s;
        if (pf.has(key) || (textIn(n.p, n.s, 'pt') != null && textIn(n.p, n.s, 'en') != null)) return;
        pf.add(key);
        D.trSentence(n.p, n.s).then(() => { if (cur && active()) { const a = neighbour(cur.p, cur.s, 1); if (a && a.p === n.p && a.s === n.s) render(); } });
    }
    function labels() {
        bPrev.title = bPrev.ariaLabel = t('prev'); bNext.title = bNext.ariaLabel = t('next');
        const pl = D.tts.playing;
        bPlay.textContent = pl ? '❚❚' : '▶'; bPlay.title = bPlay.ariaLabel = pl ? t('pause') : t('play');
        { const sel = bRate, near = RATES.reduce((b, x) => (Math.abs(x - D.state.rate) < Math.abs(b - D.state.rate) ? x : b), RATES[0]); Array.prototype.forEach.call(sel.options, (o) => { o.textContent = String(o.value).replace('.', D.state.readLang === 'en' ? '.' : ',') + '×'; }); sel.value = String(near); sel.title = sel.ariaLabel = t('speed'); }
        bMin.title = bMin.ariaLabel = t('smaller'); bMax.title = bMax.ariaLabel = t('bigger'); bExit.title = bExit.ariaLabel = t('exit');
        Object.keys(groups).forEach((k) => {
            const g = groups[k]; g.lab.textContent = t(g.key);
            Object.keys(g.btns).forEach((v) => { const on = D.state[k] === v; g.btns[v].classList.toggle('on', on); g.btns[v].setAttribute('aria-pressed', on ? 'true' : 'false'); });
        });
        root.setAttribute('aria-label', t('group'));
    }

    /* ------------------------------------------------------------ ligar e desligar com o modo (o resto da tela some) */
    function setImmersive(on) { if (on === immersive) return; immersive = on; D.postParent({ type: 'dd-lab-immersive', on }); }
    function sync(autoplay) {
        const show = active();
        root.hidden = !show;
        setImmersive(show);
        if (show) {
            cur = cur && D.doc.paras[cur.p] ? cur : position(); spoken = null; lastBase = ''; painted = null; render();
            try { root.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
            if (autoplay && !D.tts.playing && cur) setTimeout(() => { if (active() && !D.tts.playing) D.startTts(cur.p, cur.s); }, 150);
        } else labels();
    }

    /* ------------------------------------------------------------ eventos do núcleo */
    D.on('sentence', (ev) => { cur = { p: ev.p, s: ev.s }; spoken = null; render(); });
    D.on('piece', (ev) => { exK = -1; if (!cur || cur.p !== ev.p || cur.s !== ev.s) { cur = { p: ev.p, s: ev.s }; render(); } spoken = ev; });
    D.on('wordpos', (ev) => {
        if (!active() || !words.length || !spoken || spoken.text !== ev.text) return;
        const text = track.dataset.text || '';
        const pos = text === ev.text ? ev.ci : (D.mapPos ? D.mapPos(ev.text, ev.ci, text, ev.lang || D.state.audioLang) : (ev.ci / Math.max(1, ev.len || ev.text.length)) * text.length);   // outro idioma: alinhamento palavra a palavra
        let k = 0;
        while (k < words.length - 1 && words[k].e <= pos) k++;
        mark(k); markSub(k);
    });
    D.on('stop', labels); D.on('restartspeech', labels);
    D.on('open', () => { cur = null; spoken = null; setTimeout(() => sync(false), 40); });
    D.on('close', () => { cur = null; spoken = null; pf.clear(); pendingNext = ''; painted = null; root.hidden = true; setImmersive(false); });
    D.on('mode', () => { cur = null; spoken = null; sync(true); });
    D.on('lang', () => { asked = ''; pf.clear(); labels(); render(); });
    window.addEventListener('resize', () => { if (!root.hidden) place(wi); });
    D.on('step', (ev) => { if (root.hidden) return; if (ev.word) exploreStep(ev.d); else (ev.d > 0 ? bNext : bPrev).click(); });      // seta do site (quando o foco está fora da legenda)
    D.on('playstate', () => { if (!root.hidden) labels(); });      // ▶/❚❚ acompanha a narração iniciada de fora (sem sondar a cada instante)

    /* ------------------------------------------------------------ controles */
    function go(n) { if (!n) return; cur = { p: n.p, s: n.s }; spoken = null; render(); D.startTts(n.p, n.s); }
    bPrev.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, -1)); });
    bNext.addEventListener('click', () => { if (cur) go(neighbour(cur.p, cur.s, 1)); });
    bPlay.addEventListener('click', () => { if (D.tts.playing) D.stopTts(); else if (cur) D.startTts(cur.p, cur.s); labels(); });
    bRate.addEventListener('change', () => { if (D.setRate) D.setRate(Number(bRate.value)); labels(); bRate.blur(); });
    bMin.addEventListener('click', () => { size = Math.max(0.6, Math.round((size - 0.1) * 10) / 10); saveSize(); render(); place(wi); });
    bMax.addEventListener('click', () => { size = Math.min(1.7, Math.round((size + 0.1) * 10) / 10); saveSize(); render(); place(wi); });
    bExit.addEventListener('click', () => { D.stopTts(); D.setMode('single'); });
    window.addEventListener('keydown', (e) => {
        if (root.hidden || (e.target && /^(input|textarea|select)$/i.test(e.target.tagName))) return;
        if (e.key === ' ') { e.preventDefault(); bPlay.click(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); if (e.shiftKey) bPrev.click(); else exploreStep(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) bNext.click(); else exploreStep(1); }
        else if (e.key === 'F11') { e.preventDefault(); D.postParent({ type: 'dd-fullscreen' }); }
        else if (e.key === '+' || e.key === '=') bMax.click();
        else if (e.key === '-') bMin.click();
        else if (e.key === 'Escape') bExit.click();
    });
    // toque numa palavra da linha: mesmo cartão do texto (significado, pronúncia, salvar)
    track.addEventListener('click', (e) => {
        if (!cur || !D.doc) return;
        D.emit('tap', { e, sp: track, p: cur.p, s: cur.s, handled: false, wlang: track.dataset.lang || D.state.readLang, sentHere: (track.dataset.text || '').trim(), sentOther: sub.classList.contains('wait') ? '' : sub.textContent.trim() });
    });
    labels();
})();
