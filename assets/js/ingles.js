/*
 * ingles.js — "Estudo de Inglês": sobe um PDF (ou .txt), trata o texto e deixa ler num idioma e ouvir no outro,
 * com a mesma lógica do livro (LER PT/EN · OUVIR PT/EN, velocidade e voz do leitor).
 *
 * PRIVACIDADE. Nada sai do aparelho: o PDF é lido no navegador (pdf.js local, assets/vendor/pdfjs), a biblioteca
 * fica no IndexedDB e a tradução usa o Tradutor embutido do Chrome (modelo local, window.Translator).
 *
 * PARIDADE. Cada frase é traduzida sozinha, então o documento tem sempre o mesmo número de frases nos dois idiomas
 * (mesma regra do livro): a frase destacada e a frase falada são sempre a mesma, mesmo com idiomas diferentes.
 *
 * Mensagens do leitor (index.html), iguais às de capitulo.js:
 *   recebe  theme · font · typeface · margins · align · readlang · audiolang · voice · rate · tts-toggle
 *   envia   { type: 'tts-state', isPlaying }
 *
 * Para testes: window.DD_TRANSLATOR_FACTORY(src, dst) pode devolver { translate(texto) } no lugar do Chrome.
 */
(function () {
    'use strict';

    const root = document.documentElement;
    const synth = window.speechSynthesis;
    const LANG_TAG = { pt: 'pt-BR', en: 'en-US' };
    const other = (l) => (l === 'en' ? 'pt' : 'en');
    const $ = (id) => document.getElementById(id);

    const MODES = ['single', 'wide', 'side', 'focus', 'tele'];   // modos de leitura: coluna única, larga, lado a lado, foco com painel (ver ingles-modos.js)
    const state = { readLang: 'pt', audioLang: 'pt', voices: { pt: '', en: '' }, rate: 1, mode: (() => { try { const m = localStorage.getItem('dd-ingles-modo'); return MODES.indexOf(m) >= 0 ? m : 'single'; } catch (e) { return 'single'; } })() };
    state.side = state.mode === 'side';

    // Pequeno barramento de eventos: os módulos (ingles-*.js) se encaixam aqui sem tocar no núcleo.
    const hooks = {};
    const on = (n, f) => { (hooks[n] = hooks[n] || []).push(f); };
    const emit = (n, d) => { (hooks[n] || []).forEach((f) => { try { f(d); } catch (e) { console.error('[ingles:' + n + ']', e); } }); };
    const importers = [];   // { test(name, file), run(file, onProgress) -> { title, pageCount, paras:[{t,text,pg}] } }

    /* ------------------------------------------------------------------ textos da interface */
    const T = {
        pt: {
            meta: 'ESTUDO DE INGLÊS // BIBLIOTECA',
            title: 'Biblioteca',
            lead: 'Leia em um idioma, ouça no outro.',
            intro: 'Envie um artigo ou e-book em PDF. A página extrai o texto, limpa cabeçalhos e quebras de linha e traduz frase por frase, para você ler em um idioma e ouvir no outro, como no livro. Tudo acontece neste aparelho: o arquivo não é enviado a ninguém.',
            dropMain: 'Toque ou arraste um PDF aqui',
            dropSub: 'PDF com texto selecionável (ou .txt). PDFs escaneados, só com imagem, não funcionam.',
            hDocs: 'SUA BIBLIOTECA', empty: 'Nenhum documento ainda. Envie o primeiro acima.',
            hEngine: 'TRADUÇÃO NO NAVEGADOR',
            note: 'A tradução usa o Tradutor embutido do Chrome para computador (versão 138 ou superior), que baixa o modelo de idioma uma única vez e depois funciona sem internet. É tradução automática: serve para estudar, não substitui uma tradução revisada. Sem o tradutor, ainda dá para ler e ouvir o texto no idioma original.',
            open: 'Abrir', del: 'Excluir', flip: 'Trocar idioma original', confirmDel: 'Excluir este documento da biblioteca?',
            origin: 'Original', pages: 'páginas', sentences: 'frases', words: 'palavras', translated: 'traduzido',
            pairEnPt: 'Inglês → Português', pairPtEn: 'Português → Inglês',
            stAvailable: 'Pronta (traduz neste aparelho)', stDownloadable: 'Precisa baixar o modelo (uma vez)',
            stDownloading: 'Baixando o modelo…', stUnsupported: 'Indisponível neste navegador. Use o Chrome para computador (138+), em https.',
            activate: 'Ativar tradução',
            back: '← Biblioteca', study: 'ESTUDO', studyGroup: 'Ferramentas de estudo', transAll: 'Traduzir tudo agora', transStop: 'Parar de traduzir',
            reading: 'Lendo', extracting: 'Extraindo o texto', page: 'página', saving: 'Salvando…',
            errNoText: 'Não encontrei texto neste arquivo. Se for um PDF escaneado (imagens de páginas), ele precisa de OCR antes.',
            errRead: 'Não consegui ler este arquivo: ', errType: 'Formato não suportado. Envie um PDF ou .txt.',
            errPdfjs: 'O leitor de PDF não carregou. Recarregue a página.',
            stIdle: '', stNeedEngine: 'Aguardando o modelo de tradução (veja o aviso acima).', stTranslating: 'Traduzindo…',
            stNoTranslator: 'Sem tradutor neste navegador: o texto aparece só no idioma original.',
            stError: 'A tradução falhou:', search: 'Buscar na biblioteca', sortRecent: 'Organizar: por uso recente', sortTitle: 'Organizar: por título', sortProgress: 'Organizar: por progresso', sortAdded: 'Organizar: por data de envio', gContinue: 'CONTINUAR LENDO', gNew: 'NOVOS', gDone: 'CONCLUÍDOS', gAll: 'DOCUMENTOS', read: 'lido', resume: 'Continuar', rename: 'Renomear', renamePrompt: 'Novo nome do documento:', storage: 'Espaço usado pela biblioteca neste navegador:', noMatch: 'Nenhum documento encontrado.', hVoice: 'VOZ DA NARRAÇÃO', vHint: 'Esta voz é a padrão do navegador e soa mais robótica. Vozes neurais gratuitas e bem mais naturais (marcadas com ★ Natural) existem no Microsoft Edge: abra esta página nele. Também dá para escolher outra voz no painel Aa.', bnDownload: 'Para ler ou ouvir neste idioma, o navegador precisa baixar o modelo de tradução (uma vez só). Toque no botão e aguarde.', bnRetry: 'Tentar de novo', stDone: 'Documento todo traduzido.', stPartial: 'traduzido', stWait: 'Traduzindo a próxima frase…',
            langPt: 'Português', langEn: 'Inglês', noStorage: 'Armazenamento do navegador indisponível: o documento vale só nesta sessão.'
        },
        en: {
            meta: 'ENGLISH STUDY // LIBRARY',
            title: 'Library',
            lead: 'Read in one language, listen in the other.',
            intro: 'Upload an article or e-book as a PDF. The page extracts the text, cleans headers and line breaks, and translates sentence by sentence, so you can read in one language and listen in the other, as in the book. Everything happens on this device: the file is not sent to anyone.',
            dropMain: 'Tap or drag a PDF here',
            dropSub: 'PDF with selectable text (or .txt). Scanned, image-only PDFs will not work.',
            hDocs: 'YOUR LIBRARY', empty: 'No documents yet. Upload the first one above.',
            hEngine: 'IN-BROWSER TRANSLATION',
            note: 'Translation uses the built-in Translator of desktop Chrome (version 138 or later), which downloads the language model once and then works offline. It is machine translation: good for studying, not a substitute for a reviewed translation. Without the translator you can still read and listen in the original language.',
            open: 'Open', del: 'Delete', flip: 'Switch original language', confirmDel: 'Delete this document from the library?',
            origin: 'Original', pages: 'pages', sentences: 'sentences', words: 'words', translated: 'translated',
            pairEnPt: 'English → Portuguese', pairPtEn: 'Portuguese → English',
            stAvailable: 'Ready (translates on this device)', stDownloadable: 'Needs a one-time model download',
            stDownloading: 'Downloading the model…', stUnsupported: 'Unavailable in this browser. Use desktop Chrome (138+) over https.',
            activate: 'Enable translation',
            back: '← Library', study: 'STUDY', studyGroup: 'Study tools', transAll: 'Translate all now', transStop: 'Stop translating',
            reading: 'Reading', extracting: 'Extracting text', page: 'page', saving: 'Saving…',
            errNoText: 'I found no text in this file. If it is a scanned PDF (page images), it needs OCR first.',
            errRead: 'Could not read this file: ', errType: 'Unsupported format. Upload a PDF or .txt.',
            errPdfjs: 'The PDF reader did not load. Reload the page.',
            stIdle: '', stNeedEngine: 'Waiting for the translation model (see the notice above).', stTranslating: 'Translating…',
            stNoTranslator: 'No translator in this browser: text shows only in the original language.',
            stError: 'Translation failed:', search: 'Search the library', sortRecent: 'Sort: recently used', sortTitle: 'Sort: by title', sortProgress: 'Sort: by progress', sortAdded: 'Sort: by upload date', gContinue: 'KEEP READING', gNew: 'NEW', gDone: 'FINISHED', gAll: 'DOCUMENTS', read: 'read', resume: 'Resume', rename: 'Rename', renamePrompt: 'New document name:', storage: 'Space used by the library in this browser:', noMatch: 'No documents found.', hVoice: 'NARRATION VOICE', vHint: 'This is the browser default voice and sounds more robotic. Free neural voices that sound far more natural (marked ★ Natural) are available in Microsoft Edge: open this page there. You can also pick another voice in the Aa panel.', bnDownload: 'To read or listen in this language, the browser must download the translation model (one time only). Tap the button and wait.', bnRetry: 'Try again', stDone: 'Whole document translated.', stPartial: 'translated', stWait: 'Translating the next sentence…',
            langPt: 'Portuguese', langEn: 'English', noStorage: 'Browser storage unavailable: the document only lasts for this session.'
        }
    };
    const tx = (k) => T[state.readLang][k];
    const nf = () => new Intl.NumberFormat(state.readLang === 'en' ? 'en-US' : 'pt-BR');
    const langName = (l) => (l === 'en' ? tx('langEn') : tx('langPt'));

    /* ------------------------------------------------------------------ armazenamento (IndexedDB) */
    let persist = true, dbErr = null;
    let dbp = null;
    function openDb() {
        if (dbp) return dbp;
        dbp = new Promise((res, rej) => {
            if (!window.indexedDB) return rej(new Error('sem IndexedDB'));
            const rq = indexedDB.open('dd-ingles', 2);
            rq.onupgradeneeded = () => {
                const db = rq.result, has = (n) => db.objectStoreNames.contains(n);
                if (!has('meta')) db.createObjectStore('meta', { keyPath: 'id' });
                if (!has('docs')) db.createObjectStore('docs', { keyPath: 'id' });
                if (!has('tr')) db.createObjectStore('tr');
                if (!has('vocab')) db.createObjectStore('vocab', { keyPath: 'id' });   // palavras salvas (cartões)
            };
            rq.onsuccess = () => res(rq.result);
            rq.onerror = () => rej(rq.error);
        });
        return dbp;
    }
    function idb(store, mode, fn) {
        return openDb().then((db) => new Promise((res, rej) => {
            const t = db.transaction(store, mode);
            let out;
            try { out = fn(t.objectStore(store)); } catch (e) { return rej(e); }
            t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
            t.onerror = () => rej(t.error);
            t.onabort = () => rej(t.error);
        }));
    }
    const dbPut = (s, v, k) => idb(s, 'readwrite', (st) => (k === undefined ? st.put(v) : st.put(v, k)));
    const dbGet = (s, k) => idb(s, 'readonly', (st) => st.get(k));
    const dbAll = (s) => idb(s, 'readonly', (st) => st.getAll());
    const dbDel = (s, k) => idb(s, 'readwrite', (st) => st.delete(k));
    const dbDelRange = (s, a, b) => idb(s, 'readwrite', (st) => st.delete(IDBKeyRange.bound(a, b)));
    function dbTrOf(id) {
        return openDb().then((db) => new Promise((res, rej) => {
            const out = {};
            const rq = db.transaction('tr', 'readonly').objectStore('tr').openCursor(IDBKeyRange.bound(id + ':', id + ':￿'));
            rq.onsuccess = () => {
                const c = rq.result;
                if (!c) return res(out);
                out[Number(String(c.key).slice(id.length + 1))] = c.value;
                c.continue();
            };
            rq.onerror = () => rej(rq.error);
        }));
    }

    /* ------------------------------------------------------------------ extração do PDF */
    const TERMINAL = /[.!?…:;”"’')\]»]$/;
    const LOWER_START = /^[("“'‘]?\p{Ll}/u;
    const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    const tick = () => new Promise((r) => setTimeout(r, 0));

    // Itens de texto do pdf.js -> linhas (na ordem do fluxo do PDF, o que preserva a ordem das colunas).
    function buildLines(items) {
        const lines = [];
        let cur = null;
        for (const it of items) {
            if (typeof it.str !== 'string') continue;
            const x = it.transform[4], y = it.transform[5];
            const h = Math.abs(it.transform[3]) || it.height || 10, w = it.width || 0;
            if (cur && Math.abs(y - cur.y) <= 0.5 * Math.max(h, cur.h) && x >= cur.endX - 2 * h) {
                const gap = x - cur.endX;
                const space = gap > 0.18 * h && !/\s$/.test(cur.text) && !/^\s/.test(it.str);
                cur.text += (space ? ' ' : '') + it.str;
                cur.endX = x + w; cur.h = Math.max(cur.h, h);
            } else {
                if (cur) lines.push(cur);
                cur = { text: it.str, x, y, h, endX: x + w };
            }
        }
        if (cur) lines.push(cur);
        lines.forEach((l) => { l.text = l.text.replace(/\s+/g, ' ').trim(); });
        return lines.filter((l) => l.text);
    }

    const PAGE_NUM = /^(page|p\.|pág\.?|página)?\s*\d+(\s*(of|de|\/)\s*\d+)?$/i;

    // Páginas (com linhas) -> parágrafos { t: 'p'|'h'|'v', text } ('v' = estrofe de versos, com lines[])
    function buildParagraphs(pages) {
        const n = pages.length;
        // cabeçalhos e rodapés: texto que se repete nas margens de várias páginas, e números de página
        const seen = new Map();
        pages.forEach((pg, pi) => {
            pg.lines.forEach((l) => {
                l.margin = l.y > pg.h * 0.92 || l.y < pg.h * 0.08;
                if (l.margin) {
                    l.key = l.text.toLowerCase().replace(/\d+/g, '#');
                    if (!seen.has(l.key)) seen.set(l.key, new Set());
                    seen.get(l.key).add(pi);
                }
            });
        });
        const minPages = Math.max(3, Math.ceil(n * 0.3));
        pages.forEach((pg) => {
            pg.lines = pg.lines.filter((l) => !(l.margin && (PAGE_NUM.test(l.text) || (n >= 3 && seen.get(l.key).size >= minPages))));
        });

        const all = [].concat(...pages.map((p) => p.lines));
        if (!all.length) return [];
        const bodyH = median(all.map((l) => l.h));
        const gaps = [];
        pages.forEach((pg) => { for (let i = 1; i < pg.lines.length; i++) { const g = pg.lines[i - 1].y - pg.lines[i].y; if (g > 0 && g < bodyH * 4) gaps.push(g); } });
        const medGap = median(gaps) || bodyH * 1.25;

        const paras = [];
        let cur = null;
        const flush = () => { if (cur && /\p{L}/u.test(cur.text)) paras.push({ t: cur.t, text: cur.text.trim(), pg: cur.pg }); cur = null; };

        pages.forEach((pg, pgi) => {
            let prev = null;
            pg.lines.forEach((line) => {
                const isHead = line.h > bodyH * 1.25 && line.text.length < 140;
                const gap = prev ? prev.y - line.y : null;
                let join = false;
                if (cur) {
                    if (cur.t === 'h') {
                        join = isHead && gap !== null && gap > 0 && gap < medGap * 1.6 * (line.h / bodyH) && Math.abs(line.h - cur.h) < 1.5;
                    } else if (!isHead) {
                        if (gap === null) join = !TERMINAL.test(cur.text);                       // virada de página
                        else if (gap < 0 || gap > medGap * 1.55) join = !TERMINAL.test(cur.text) && LOWER_START.test(line.text);   // coluna nova ou espaço grande
                        else if (line.x > prev.x + 1.2 * line.h && TERMINAL.test(cur.text)) join = false;   // recuo de parágrafo
                        else join = true;
                    }
                }
                if (join) {
                    if (/\p{L}-$/u.test(cur.text) && LOWER_START.test(line.text)) cur.text = cur.text.slice(0, -1) + line.text;
                    else cur.text += ' ' + line.text;
                } else {
                    flush();
                    cur = { t: isHead ? 'h' : 'p', text: line.text, h: line.h, pg: pgi + 1 };
                }
                prev = line;
            });
        });
        flush();
        return paras;
    }

    // o leitor de PDF (320 KB) só é baixado quando alguém importa um PDF: a biblioteca abre mais rápido
    let pdfLoad = null;
    function loadPdfjs() {
        if (window.pdfjsLib) return Promise.resolve();
        if (!pdfLoad) pdfLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/vendor/pdfjs/pdf.min.js'; s.onload = res; s.onerror = () => { pdfLoad = null; rej(new Error(tx('errPdfjs'))); }; document.head.appendChild(s); });
        return pdfLoad;
    }
    async function extractPdf(file, onProgress) {
        await loadPdfjs();
        if (!window.pdfjsLib) throw new Error(tx('errPdfjs'));
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const vp = page.getViewport({ scale: 1 });
            const tc = await page.getTextContent();
            pages.push({ h: vp.height, lines: buildLines(tc.items) });
            page.cleanup();
            onProgress(i, pdf.numPages);
            if (i % 5 === 0) await tick();
        }
        let title = '';
        try { const m = await pdf.getMetadata(); title = (m && m.info && m.info.Title) || ''; } catch (e) { /* sem metadados */ }
        return { title, pageCount: pdf.numPages, paras: buildParagraphs(pages) };
    }

    // Versos: bloco de linhas curtas, quase todas começando em maiúscula e poucas terminando em ponto final (poema, letra, soneto).
    // Cada linha vira uma unidade narrada e o bloco é a estrofe. Texto corrido quebrado em colunas (linhas ~70 caracteres, que
    // começam no meio da frase) e diálogos curtos terminados em ponto continuam sendo prosa.
    function looksVerse(lines) {
        const L = lines.map((x) => String(x).trim()).filter(Boolean);
        if (L.length < 2 || L.length > 40) return false;
        const len = L.map((x) => x.length), avg = len.reduce((a, b) => a + b, 0) / L.length, max = Math.max.apply(null, len);
        const cap = L.filter((x) => /^[\p{Lu}"“'‘(\[¡¿—-]/u.test(x)).length / L.length;
        const ender = L.filter((x) => /[.!?]["”')\]]*$/.test(x)).length / L.length;
        return avg <= 62 && max <= 90 && cap >= 0.8 && ender < 0.75;
    }
    async function extractTxt(file) {
        const raw = (await file.text()).replace(/\r\n?/g, '\n');
        const paras = raw.split(/\n\s*\n/).map((b) => {
            const L = b.split('\n').map((x) => x.trim()).filter(Boolean);
            if (looksVerse(L)) return { t: 'v', lines: L, text: L.join(' ') };
            let t = '';
            L.forEach((ln) => {
                if (/\p{L}-$/u.test(t) && LOWER_START.test(ln)) t = t.slice(0, -1) + ln; else t += (t ? ' ' : '') + ln;
            });
            return { t: 'p', text: t };
        }).filter((p) => /\p{L}/u.test(p.text));
        return { title: '', pageCount: 0, paras };
    }

    /* ------------------------------------------------------------------ idioma e frases */
    const STOP = {
        en: 'the and of to in is that it for with as was on are this be by have not but at from or an they which you we his her their will would there been has had were can all one our more'.split(' '),
        pt: 'de que e o a do da em um para com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você'.split(' ')
    };
    function detectLang(paras) {
        const sample = paras.slice(0, 400).map((p) => p.text).join(' ').toLowerCase().match(/\p{L}+/gu) || [];
        const en = new Set(STOP.en), pt = new Set(STOP.pt);
        let a = 0, b = 0;
        sample.forEach((w) => { if (en.has(w)) a++; if (pt.has(w)) b++; });
        return b > a ? 'pt' : 'en';
    }

    function splitLong(s, max) {
        const out = [];
        while (s.length > max) {
            let cut = -1;
            const re = /[;:,—–] /g;
            let m;
            while ((m = re.exec(s)) && m.index < max) if (m.index >= 120) cut = m.index + 1;
            if (cut < 0) cut = s.lastIndexOf(' ', max);
            if (cut < 40) cut = max;
            out.push(s.slice(0, cut).trim());
            s = s.slice(cut).trim();
        }
        if (s) out.push(s);
        return out;
    }
    function splitSentences(text, lang) {
        let parts;
        if (window.Intl && Intl.Segmenter) parts = Array.from(new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(text), (x) => x.segment);
        else parts = text.match(/[^.!?…]+[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g) || [text];
        const out = [];
        parts.forEach((p) => {
            p = p.replace(/\s+/g, ' ').trim();
            if (!p) return;
            if (out.length && !/\p{L}|\p{N}/u.test(p)) { out[out.length - 1] += ' ' + p; return; }   // pontuação solta
            splitLong(p, 320).forEach((q) => out.push(q));
        });
        return out;
    }

    /* ------------------------------------------------------------------ tradutor (Chrome, local) */
    const TR = { insts: {}, avail: {}, progress: {}, pending: {}, err: {} };
    const pairKey = (a, b) => a + '>' + b;
    async function trAvailability(a, b) {
        if (window.DD_TRANSLATOR_FACTORY) return 'available';
        if (!('Translator' in self)) return 'unsupported';
        try { return await Translator.availability({ sourceLanguage: a, targetLanguage: b }); } catch (e) { return 'unsupported'; }
    }
    async function trCreate(a, b) {
        if (window.DD_TRANSLATOR_FACTORY) return window.DD_TRANSLATOR_FACTORY(a, b);
        return Translator.create({
            sourceLanguage: a, targetLanguage: b,
            monitor(m) { m.addEventListener('downloadprogress', (e) => { TR.progress[pairKey(a, b)] = e.loaded; renderEngine(); setStatus(); }); }
        });
    }
    // Instância pronta do par (cria sozinha só se o modelo já está baixado; senão espera o clique do usuário).
    async function getInst(a, b) {
        const k = pairKey(a, b);
        if (TR.insts[k]) return TR.insts[k];
        if (TR.pending[k]) return TR.pending[k];
        const av = await trAvailability(a, b);
        TR.avail[k] = av;
        if (av !== 'available') { renderEngine(); return null; }
        TR.pending[k] = trCreate(a, b).then((i) => { TR.insts[k] = i; renderEngine(); return i; }).catch((e) => { TR.avail[k] = 'downloadable'; TR.err[k] = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : e); return null; }).finally(() => { delete TR.pending[k]; });
        return TR.pending[k];
    }
    async function activatePair(a, b) {   // precisa de gesto do usuário (baixa o modelo)
        const k = pairKey(a, b);
        TR.avail[k] = 'downloading'; renderEngine(); setStatus();
        try { TR.insts[k] = await trCreate(a, b); TR.avail[k] = 'available'; TR.err[k] = ''; }
        catch (e) { TR.avail[k] = 'downloadable'; TR.err[k] = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : e); }
        trError = ''; renderEngine(); setStatus(); pump();
    }

    function renderVoice() {
        const box = $('lb-voice');
        if (!box) return;
        box.textContent = '';
        const vs = synth ? synth.getVoices() : [];
        let allNatural = vs.length > 0;
        ['pt', 'en'].forEach((l) => {
            const v = pickVoice(l);
            const row = document.createElement('div'); row.className = 'lb-eng-row';
            const name = document.createElement('strong'); name.textContent = langName(l);
            const st = document.createElement('span'); st.className = 'lb-eng-st';
            const nat = !!v && /natural|neural/i.test(v.name);
            if (!nat) allNatural = false;
            st.textContent = v ? (nat ? '★ ' : '') + v.name.replace(/^Microsoft /, '') + ' (' + v.lang + ')' : '—';
            row.append(name, st);
            box.appendChild(row);
        });
        if (vs.length && !allNatural) { const h = document.createElement('p'); h.className = 'lb-note'; h.textContent = tx('vHint'); box.appendChild(h); }
    }
    function renderEngine() {
        const box = $('lb-engine');
        if (!box) return;
        box.textContent = '';
        [['en', 'pt', 'pairEnPt'], ['pt', 'en', 'pairPtEn']].forEach(([a, b, lab]) => {
            const k = pairKey(a, b);
            const row = document.createElement('div'); row.className = 'lb-eng-row';
            const name = document.createElement('strong'); name.textContent = tx(lab);
            const st = document.createElement('span'); st.className = 'lb-eng-st';
            const av = TR.insts[k] ? 'available' : TR.avail[k];
            if (av === 'available') st.textContent = tx('stAvailable');
            else if (av === 'downloadable') st.textContent = tx('stDownloadable');
            else if (av === 'downloading') st.textContent = tx('stDownloading') + (TR.progress[k] ? ' ' + Math.round(TR.progress[k] * 100) + '%' : '');
            else if (av === 'unsupported' || av === 'unavailable') st.textContent = tx('stUnsupported');
            else st.textContent = '…';
            row.append(name, st);
            if (TR.err[k]) { const er = document.createElement('span'); er.className = 'lb-eng-err'; er.textContent = TR.err[k]; row.append(er); }
            if (av === 'downloadable') {
                const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'lb-btn'; btn.textContent = tx('activate');
                btn.onclick = () => activatePair(a, b);
                row.append(btn);
            }
            box.appendChild(row);
        });
    }
    async function probeEngine() {
        for (const [a, b] of [['en', 'pt'], ['pt', 'en']]) {
            const k = pairKey(a, b);
            if (!TR.insts[k]) TR.avail[k] = await trAvailability(a, b);
        }
        renderEngine();
    }

    /* ------------------------------------------------------------------ documento aberto */
    let doc = null;            // { id, title, lang, pages, paras:[{t,s:[]}], tr:{i:[]}, words, pos }
    let fullMode = false, anchor = 0, pumpRunning = false, trError = '';
    const waiters = {};
    let trSaveTimer = null;

    let wantBoth = false;                                  // a legenda pede sempre os dois idiomas
    const needTranslation = () => doc && (state.readLang !== doc.lang || state.audioLang !== doc.lang || fullMode || wantBoth || state.side || state.mode === 'tele');
    const trCount = () => (doc ? Object.keys(doc.tr).length : 0);

    function nextPending() {
        const N = doc.paras.length;
        const end = fullMode ? N : Math.min(N, anchor + 40);
        for (let i = anchor; i < end; i++) if (!doc.tr[i]) return i;
        if (fullMode) for (let i = 0; i < anchor; i++) if (!doc.tr[i]) return i;
        return -1;
    }

    // Tradução imediata de uma frase: a narração e a legenda não esperam o parágrafo inteiro ficar pronto.
    const sentTr = {};
    function trSentence(p, s) {
        if (!doc) return Promise.resolve(null);
        if (doc.tr[p] && doc.tr[p][s] != null) return Promise.resolve(doc.tr[p][s]);
        const src = doc.paras[p] && doc.paras[p].s[s];
        if (src == null) return Promise.resolve(null);
        if (!/\p{L}/u.test(src)) return Promise.resolve(src);
        const key = doc.id + ':' + p + ':' + s, from = doc.lang;
        if (!sentTr[key]) {
            sentTr[key] = (async () => {
                const inst = await getInst(from, other(from));
                if (!inst) return null;
                return String(await inst.translate(src)).trim() || null;
            })().catch(() => null).then((r) => { if (r === null) delete sentTr[key]; return r; });
        }
        return sentTr[key];
    }

    async function translatePara(i, inst) {
        const d0 = doc;
        const out = await Promise.all(d0.paras[i].s.map(async (s, k) => {       // frases do parágrafo em paralelo
            if (!/\p{L}/u.test(s)) return s;
            const c = sentTr[d0.id + ':' + i + ':' + k];
            if (c) { const r0 = await c; if (r0) return r0; }
            const r = String(await inst.translate(s)).trim();
            if (!r) throw new Error('tradução vazia');
            return r;
        }));
        if (doc !== d0) return;
        doc.tr[i] = out;
        if (persist) dbPut('tr', out, doc.id + ':' + i).catch(() => {});
        paintPara(i);
        if (waiters[i]) { waiters[i].forEach((r) => r()); delete waiters[i]; }
        scheduleMetaSave();
    }

    async function pump() {
        if (pumpRunning || !doc || !needTranslation()) { setStatus(); return; }
        pumpRunning = true;
        const mine = doc;
        try {
            const inst = await getInst(doc.lang, other(doc.lang));
            if (!inst) { releaseWaiters(); return; }
            while (doc === mine && needTranslation()) {
                const i = nextPending();
                if (i < 0) break;
                setStatus(true);
                try { await translatePara(i, inst); trError = ''; }
                catch (e) { trError = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : e); releaseWaiters(); break; }
            }
        } finally { pumpRunning = false; setStatus(); }
    }
    function releaseWaiters() { Object.keys(waiters).forEach((k) => { waiters[k].forEach((r) => r()); delete waiters[k]; }); }

    // Garante a tradução de um parágrafo (usada pela narração). Resolve mesmo sem tradutor.
    function ensureTr(i) {
        if (!doc || doc.tr[i]) return Promise.resolve();
        anchor = i;
        return new Promise((res) => { (waiters[i] = waiters[i] || []).push(res); pump(); });
    }

    // Espelho síncrono da leitura em andamento (localStorage): o banco grava de forma assíncrona e pode ser cortado se a aba fechar.
    // Ao reabrir o livro, vale o mais recente entre o banco (meta.savedAt) e o espelho.
    const MIRROR = 'dd-ingles-sessao';
    function mirror() { if (!doc) return; try { localStorage.setItem(MIRROR, JSON.stringify({ id: doc.id, pos: doc.pos || 0, heard: doc.heard || 0, t: Date.now() })); } catch (e) { /* sem storage */ } }
    function flush() { mirror(); saveMeta(); }
    function scheduleMetaSave() {
        mirror();
        clearTimeout(trSaveTimer);
        trSaveTimer = setTimeout(saveMeta, 1500);
    }
    function metaOf() {
        return { id: doc.id, title: doc.title, lang: doc.lang, pages: doc.pages, sentences: doc.sentences, words: doc.words, added: doc.added, trDone: trCount(), trTotal: doc.paras.length, pos: doc.pos, heard: doc.heard || 0, lastOpened: doc.lastOpened || 0, x: doc.x || {}, savedAt: Date.now() };
    }
    function saveMeta() { if (doc && persist) dbPut('meta', metaOf()).catch(() => {}); }

    function setStatus(busy) {
        const st = $('lb-status'), ta = $('lb-translate-all');
        if (!st || !doc) return;
        const pct = Math.round(trCount() / doc.paras.length * 100);
        const k = pairKey(doc.lang, other(doc.lang));
        let txt = '';
        if (needTranslation()) {
            const av = TR.insts[k] ? 'available' : TR.avail[k];
            if (trError) txt = tx('stError') + ' ' + trError;
            else if (av === 'unsupported' || av === 'unavailable') txt = tx('stNoTranslator');
            else if (av === 'downloadable' || av === 'downloading') txt = tx('stNeedEngine');
            else if (busy || pumpRunning) txt = tx('stTranslating') + ' ' + pct + '%';
            else txt = pct >= 100 ? tx('stDone') : pct + '% ' + tx('stPartial');
        } else if (trCount()) txt = pct + '% ' + tx('stPartial');
        st.textContent = txt;
        // aviso grande, com botão, quando falta o modelo de tradução ou ela falhou
        const av2 = TR.insts[k] ? 'available' : TR.avail[k];
        const bn = $('lb-banner'), bt = $('lb-banner-text'), bb = $('lb-banner-btn');
        let msg = '', act = false;
        if (needTranslation()) {
            if (trError) { msg = tx('stError') + ' ' + trError; act = true; }
            else if (av2 === 'downloadable') { msg = tx('bnDownload'); act = true; }
            else if (av2 === 'downloading') msg = tx('stDownloading') + (TR.progress[k] ? ' ' + Math.round(TR.progress[k] * 100) + '%' : '');
            else if (av2 === 'unsupported' || av2 === 'unavailable') msg = tx('stUnsupported');
        }
        bn.hidden = !msg; bt.textContent = msg;
        bb.hidden = !act; bb.textContent = trError ? tx('bnRetry') : tx('activate');
        ta.textContent = fullMode ? tx('transStop') : tx('transAll');
        ta.classList.toggle('on', fullMode);
    }

    /* ------------------------------------------------------------------ texto na tela */
    function paraEl(i) { return $('lb-text').children[i]; }

    function paintPara(i) {
        const el = paraEl(i);
        if (!el || !doc) return;
        const p = doc.paras[i], tr = doc.tr[i], toOther = state.readLang !== doc.lang;
        el.textContent = '';
        if (state.side && p.t !== 'h') {          // lado a lado: original à esquerda (frases clicáveis e narradas) e tradução à direita
            const colL = document.createElement('span'), colR = document.createElement('span');
            colL.className = 'lb-col lb-col-src'; colR.className = 'lb-col lb-col-tr' + (tr ? '' : ' pending');
            p.s.forEach((src, k) => { const sp = document.createElement('span'); sp.className = 'lb-s'; sp.dataset.k = String(k); sp.textContent = src; colL.append(sp, ' '); });
            if (tr) tr.forEach((x, k) => { const tsp = document.createElement('span'); tsp.className = 'lb-t'; tsp.dataset.k = String(k); tsp.textContent = x; colR.append(tsp, p.t === 'v' ? '\n' : ' '); });
            el.append(colL, colR);
            if (tts.mark && tts.mark.p === i) { tts.word = -1; markSpan(true); }
            return;
        }
        p.s.forEach((src, k) => {
            const sp = document.createElement('span');
            sp.className = 'lb-s'; sp.dataset.k = String(k);
            let t = src;
            if (toOther) { if (tr && tr[k] != null) t = tr[k]; else sp.classList.add('pending'); }
            sp.textContent = t;
            el.append(sp, ' ');
        });
        if (tts.mark && tts.mark.p === i) { tts.word = -1; markSpan(true); }
    }

    function buildText() {
        const host = $('lb-text');
        host.textContent = '';
        const frag = document.createDocumentFragment();
        doc.paras.forEach((p, i) => {
            const el = document.createElement(p.t === 'h' ? 'h2' : 'p');
            el.className = 'lb-para' + (p.t === 'h' ? ' lb-head' : '') + (p.t === 'v' ? ' lb-verse' : '');
            el.dataset.i = String(i);
            frag.appendChild(el);
        });
        host.appendChild(frag);
        host.classList.toggle('lb-big', doc.paras.length > 300);
        paintAll(Math.min(anchor, doc.paras.length - 1));
    }
    // Documentos grandes: pinta primeiro o que está perto da leitura e o resto aos poucos (a tela abre rápido).
    let paintRun = 0;
    function paintAll(center) {
        const N = doc.paras.length, run = ++paintRun, mine = doc;
        if (N <= 300) { for (let i = 0; i < N; i++) paintPara(i); return; }
        const order = [];
        for (let d = 0; d < N; d++) { if (center + d < N) order.push(center + d); if (d && center - d >= 0) order.push(center - d); }
        let k = 0;
        const step = (n) => { for (let j = 0; j < n && k < order.length; j++) paintPara(order[k++]); };
        step(80);
        const later = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 200 }) : (f) => setTimeout(f, 16);
        const loop = () => { if (run !== paintRun || doc !== mine) return; step(40); if (k < order.length) later(loop); };
        later(loop);
    }
    function repaintAll() { if (doc) paintAll(doc.paras.length > 300 ? firstVisible() : 0); }

    function firstVisible() {
        const kids = $('lb-text').children;
        let lo = 0, hi = kids.length - 1, ans = 0;
        while (lo <= hi) {                         // busca binária: primeiro parágrafo cujo fim está abaixo do topo
            const mid = (lo + hi) >> 1;
            if (kids[mid].getBoundingClientRect().bottom > 8) { ans = mid; hi = mid - 1; } else lo = mid + 1;
        }
        return ans;
    }
    // A rolagem em pixels não acompanha o refluxo do texto. Quando a largura muda (o menu do site recolhe no modo foco, a janela é
    // redimensionada, o modo de leitura troca) o texto continua reflundo por algumas centenas de milissegundos (transições de CSS), o parágrafo
    // visível muda sozinho e o app gravaria a posição errada por cima da certa. Então: enquanto o layout não assenta, nenhuma posição é gravada;
    // quando a altura do documento fica estável, volta ao parágrafo que estava em leitura.
    let stableW = 0, settling = false, settleTimer = null;   // stableW: largura da página quando a posição foi aceita pela última vez
    const pageW = () => document.documentElement.clientWidth;
    function keepPlace(i) { const el = doc && paraEl(Math.max(0, Math.min(i | 0, doc.paras.length - 1))); if (el) el.scrollIntoView({ block: 'start' }); }
    function settleAndKeep(keep) {
        settling = true; clearTimeout(settleTimer); clearTimeout(scrollTimer);
        let lastH = -1, still = 0, tries = 0;
        const step = () => {
            if (!doc || $('lb-reader').hidden) { settling = false; return; }
            const h = document.documentElement.scrollHeight;
            if (h === lastH) still++; else { still = 0; lastH = h; }
            if (still >= 3 || ++tries > 30) { keepPlace(keep); stableW = pageW(); settling = false; return; }
            settleTimer = setTimeout(step, 80);
        };
        step();
    }
    window.addEventListener('resize', () => {
        if (!doc || $('lb-reader').hidden) return;
        if (!settling) keepPos = doc.pos || 0;
        settleAndKeep(keepPos);
    });
    let keepPos = 0;
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (!doc || $('lb-reader').hidden || settling) return;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            // a largura mudou desde a última posição aceita: o texto refluiu e o parágrafo visível mudou sozinho. Não grava esse parágrafo.
            if (stableW && Math.abs(pageW() - stableW) > 1) { keepPos = doc.pos || 0; settleAndKeep(keepPos); return; }
            const i = firstVisible();
            stableW = pageW();
            doc.pos = i;
            emit('progress', { pos: i });
            if (!tts.playing) { anchor = i; pump(); }
            scheduleMetaSave();
            sendHud();
        }, 250);
    }, { passive: true });

    $('lb-text').addEventListener('click', (e) => {
        const sp = e.target.closest && e.target.closest('.lb-s');
        if (!sp || !doc) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && !sel.isCollapsed) return;
        const p = Number(sp.parentNode.dataset.i), s = Number(sp.dataset.k);
        const ev = { e, sp, p, s, handled: false };
        emit('tap', ev);
        if (!ev.handled) startTts(p, s);
    });

    /* ------------------------------------------------------------------ narração */
    const tts = { playing: false, token: 0, cursor: null, mark: null, word: -1, restart: false, pre: null };
    function postParent(msg) { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); }

    // Preferência de voz: neural ("Natural", Edge) > Google (rede) > locais; o idioma exato (en-US, pt-BR) desempata.
    function voiceRank(v, lang) {
        const l = v.lang.replace('_', '-').toLowerCase();
        return (/natural|neural/i.test(v.name) ? 10 : 0) + (/online/i.test(v.name) ? 2 : 0) + (l === LANG_TAG[lang].toLowerCase() ? 4 : 0) +
            (/google/i.test(v.name) ? 1 : 0) + (v.localService ? 0.5 : 0);
    }
    function pickVoice(lang) {
        if (!synth) return null;
        const vs = synth.getVoices();
        const name = state.voices[lang];
        const chosen = name && vs.find((x) => x.name === name);
        if (chosen) return chosen;
        return vs.filter((x) => x.lang.toLowerCase().indexOf(lang) === 0).sort((a, b) => voiceRank(b, lang) - voiceRank(a, lang))[0] || null;
    }

    // Velocidade média da fala (caracteres por segundo a 1×): começa num valor típico e se ajusta a cada frase.
    // Medida em caracteres ponderados (pausas de vírgula e ponto contam mais), por idioma e por voz.
    const CPS = { pt: 16, en: 17 };
    const PAUSE = { ',': 4, ';': 4, ':': 4, '—': 4, '–': 4, '.': 8, '!': 8, '?': 8, '…': 8 };

    // onProg(charIndex, length): posição da fala dentro do texto falado (evento da voz ou estimativa por tempo)
    // Fala uma frase: voz neural local (módulo ingles-voz.js) quando ativa; senão (ou se falhar) a voz do navegador.
    async function speakOne(text, lang, onProg, ahead) {
        const nv = window.DDLab && window.DDLab.neural;
        if (nv && nv.active(lang)) {
            const r = await nv.speak(text, lang, state.rate * ((window.DDLab && window.DDLab.rateScale) || 1), onProg);
            if (r !== 'fallback') return tts.restart ? (tts.restart = false, 'restart') : r;
        }
        return speakBrowser(text, lang, onProg, ahead);
    }
    // Uma fala do navegador com ganchos (começou, palavra, terminou) que podem ser ligados depois de criada:
    // é isso que permite enfileirar a frase seguinte enquanto a atual ainda toca (sem a lacuna entre frases).
    function newUtt(text, lang, rate) {
        const u = new SpeechSynthesisUtterance(text), v = pickVoice(lang);
        u.lang = LANG_TAG[lang]; u.rate = rate; if (v) { u.voice = v; u.lang = v.lang; }
        const h = { u, v, text, lang, rate, started: false, t0: 0, ended: null, onstart: null, onboundary: null, onend: null };
        u.onstart = () => { h.started = true; h.t0 = performance.now(); if (h.onstart) h.onstart(); };
        u.onboundary = (e) => { if (h.onboundary) h.onboundary(e); };
        u.onend = () => { h.ended = 'end'; if (h.onend) h.onend('end'); };
        u.onerror = (e) => { h.ended = e && (e.error === 'canceled' || e.error === 'interrupted') ? 'cancel' : 'error'; if (h.onend) h.onend(h.ended); };
        return h;
    }
    const curRate = () => state.rate * ((window.DDLab && window.DDLab.rateScale) || 1);   // módulos podem desacelerar a repetição
    // Frase seguinte já pronta para falar (texto no idioma de áudio disponível agora, sem esperar tradução), ou null
    function nextPiece(p, s) {
        if (!doc) return null;
        let q = p, k = s;
        for (let guard = 0; guard < 4; guard++) {
            k++;
            if (k >= doc.paras[q].s.length) { q++; k = 0; if (q >= doc.paras.length) return null; }
            const x = state.audioLang === doc.lang ? doc.paras[q].s[k] : (doc.tr[q] && doc.tr[q][k]);
            if (x == null) return null;
            if (/\p{L}|\p{N}/u.test(x)) return { text: x, lang: state.audioLang };
        }
        return null;
    }
    function canQueueAhead() {
        const tr = window.DDLab && window.DDLab.trainMode;
        return !!synth && synth.speaking === true && synth.pending === false && (!tr || tr() === 'normal');   // só com motor que informa fila e fora dos modos de treino
    }
    function speakBrowser(text, lang, onProg, ahead) {
        return new Promise((resolve) => {
            const rate = curRate();
            let h = tts.pre && tts.pre.text === text && tts.pre.lang === lang && tts.pre.rate === rate ? tts.pre : null;
            if (tts.pre && !h) { synth.cancel(); }                       // sobrou frase enfileirada que não é esta (o fluxo mudou): limpa a fila
            tts.pre = null;                                              // a frase já estava na fila do motor: só assume os ganchos
            const fresh = !h; if (!h) h = newUtt(text, lang, rate);
            const v = h.v;
            let settled = false, t0 = 0, gotB = false, timer = null;
            const ck = lang + '|' + (v ? v.name : ''), cps = CPS[ck] || CPS[lang];
            const cum = new Float32Array(text.length + 1);                   // tempo acumulado esperado por caractere, com as pausas da pontuação
            for (let i = 0; i < text.length; i++) cum[i + 1] = cum[i] + 1 + (PAUSE[text[i]] || 0);
            const WT = cum[text.length];
            const done = (r) => {
                if (settled) return; settled = true; clearInterval(timer);
                if (r === 'end' && t0 && text.length > 25) {
                    const dur = (performance.now() - t0) / 1000;
                    if (dur > 0.5) CPS[ck] = Math.max(6, Math.min(40, cps * 0.7 + (WT / (dur * rate)) * 0.3));
                }
                resolve(tts.restart ? (tts.restart = false, 'restart') : r);
            };
            const begin = () => {
                t0 = h.t0 || performance.now();
                timer = setInterval(() => {      // vozes sem evento de palavra: segue pelo tempo estimado
                    if (gotB || !onProg) return;
                    const el = (performance.now() - t0) / 1000;
                    const target = Math.min(WT, el * cps * rate);                  // posição esperada: busca binária no tempo acumulado
                    let lo = 0, hi = text.length - 1;
                    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid + 1] > target) hi = mid; else lo = mid + 1; }
                    onProg(lo, text.length);
                }, 60);
                if (ahead && !tts.pre && canQueueAhead()) {                      // buffer: a próxima frase entra na fila agora e o motor a fala sem lacuna
                    const nx = ahead();
                    if (nx) { tts.pre = newUtt(nx.text, nx.lang, rate); synth.speak(tts.pre.u); }
                }
            };
            h.onstart = begin;
            h.onboundary = (e) => { if (e && e.name && e.name !== 'word') return; gotB = true; if (onProg) onProg(e.charIndex || 0, text.length); };
            h.onend = (r) => done(r);
            if (h.started) begin();
            if (h.ended) done(h.ended); else if (fresh) synth.speak(h.u);
        });
    }

    /* Marcação em quatro camadas: parágrafo (.speaking) · linha (faixa .lb-band) · frase (.w.seg) · palavra (.w.now) */
    function wrapWords(sp) {
        if (sp._w) return sp._w;
        const txt = sp.textContent;
        sp._orig = txt; sp.textContent = '';
        const words = [];
        let pos = 0;
        txt.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) sp.append(part);
            else { const w = document.createElement('span'); w.className = 'wd'; w.textContent = part; sp.append(w); words.push({ el: w, s: pos, e: pos + part.length }); }
            pos += part.length;
        });
        sp._w = words;
        return words;
    }
    function unwrapWords(sp) { if (sp && sp._w) { sp.textContent = sp._orig; sp._w = null; } }
    function curSpan() {
        if (!tts.mark) return null;
        const el = paraEl(tts.mark.p);
        return el ? el.querySelector('.lb-s[data-k="' + tts.mark.s + '"]') : null;
    }
    function moveBand(target) {
        const band = $('lb-band');
        if (!target || state.mode === 'tele') { band.style.display = 'none'; return; }      // teleprompter: a faixa fica escondida, nem calcula
        const c = $('lb-wrap').getBoundingClientRect(), r = target.getBoundingClientRect();
        band.style.display = 'block';
        band.style.top = Math.round(r.top - c.top - 2) + 'px';
        band.style.height = Math.round(r.height + 4) + 'px';
    }
    function keepInView(el) {
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: state.mode === 'tele' ? 'auto' : 'smooth' });   // no teleprompter o texto está coberto: rolagem suave só competiria com a animação da legenda
    }
    // charIndex dentro do texto falado -> palavra da frase na tela (mesma posição, ou proporcional se o idioma da tela é outro)
    function setWordAt(charIndex, len, spokenText, spokenLang) {
        const sp = curSpan();
        if (!sp || !len) return;
        const words = wrapWords(sp);
        if (!words.length) return;
        const D = sp._orig.length;
        // idioma da tela diferente do falado: alinha palavra a palavra (adjetivo e substantivo trocam de lugar), senão proporcional
        const pos = sp._orig === spokenText ? charIndex : (window.DDLab && window.DDLab.mapPos ? window.DDLab.mapPos(spokenText, charIndex, sp._orig, spokenLang) : (charIndex / len) * D);
        let k = 0;
        while (k < words.length - 1 && words[k].e <= pos) k++;
        if (k === tts.word) return;
        if (tts.word >= 0 && words[tts.word]) words[tts.word].el.className = 'wd';
        tts.word = k;
        words[k].el.className = 'wd w now';
        moveBand(words[k].el);
        keepInView(words[k].el);
    }

    function markSpan(on) {
        if (!tts.mark) return;
        const el = paraEl(tts.mark.p);
        if (!el) return;
        el.classList.toggle('speaking', on);
        const sp = el.querySelector('.lb-s[data-k="' + tts.mark.s + '"]');
        if (sp) { sp.classList.toggle('w', on); sp.classList.toggle('seg', on); if (!on) unwrapWords(sp); }
        const tsp = el.querySelector('.lb-t[data-k="' + tts.mark.s + '"]');         // lado a lado: a mesma frase na coluna da tradução
        if (tsp) tsp.classList.toggle('seg', on);
        return sp;
    }
    function setMark(p, s) {
        markSpan(false);
        const pe = paraEl(p); if (pe && !pe.firstChild) paintPara(p);        // pintura em partes: garante o parágrafo falado
        tts.mark = { p, s }; tts.word = -1;
        const sp = markSpan(true);
        if (sp) { moveBand(sp); keepInView(sp); }
        sendHud();
        emit('sentence', { p, s });
    }
    function clearMark() { markSpan(false); tts.mark = null; tts.word = -1; moveBand(null); }
    // Texto da frase no idioma pedido; se a tradução não existe, cai para o original (e a voz acompanha).
    async function textFor(p, s, lang, token) {
        if (lang === doc.lang) return { text: doc.paras[p].s[s], lang };
        if (!(doc.tr[p] && doc.tr[p][s] != null)) {          // caminho rápido: só esta frase, enquanto o resto traduz atrás
            anchor = p;
            const q = await trSentence(p, s);
            if (token !== tts.token) return null;
            if (q != null) { pump(); return { text: q, lang }; }
        }
        if (!doc.tr[p]) { setStatus(true); await ensureTr(p); }
        if (token !== tts.token) return null;
        const t = doc.tr[p] && doc.tr[p][s];
        return t != null ? { text: t, lang } : { text: doc.paras[p].s[s], lang: doc.lang };
    }

    async function runTts(token) {
        let errors = 0, resume = null;
        while (token === tts.token && doc) {
            const c = tts.cursor;
            if (c.p >= doc.paras.length) break;
            if (c.s >= doc.paras[c.p].s.length) { tts.cursor = { p: c.p + 1, s: 0 }; continue; }
            const piece = await textFor(c.p, c.s, state.audioLang, token);
            if (!piece || token !== tts.token) return;
            setMark(c.p, c.s);
            emit('piece', { p: c.p, s: c.s, text: piece.text, lang: piece.lang });      // texto exato que será falado (a legenda usa)
            anchor = c.p;
            if (!/\p{L}|\p{N}/u.test(piece.text)) { tts.cursor = { p: c.p, s: c.s + 1 }; continue; }
            if (c.s === 0 || c.s === doc.paras[c.p].s.length - 1) pump();     // mantém a tradução à frente da voz
            if (state.audioLang !== doc.lang) {                                  // já traduz a próxima frase enquanto esta toca
                const nx = c.s + 1 < doc.paras[c.p].s.length ? [c.p, c.s + 1] : (c.p + 1 < doc.paras.length ? [c.p + 1, 0] : null);
                if (nx) trSentence(nx[0], nx[1]);
            }
            const tStart = performance.now();
            let off = 0;                                                         // trocou velocidade/voz no meio da frase: continua da palavra falada
            if (resume && resume.p === c.p && resume.s === c.s && resume.text === piece.text) { off = piece.text.lastIndexOf(' ', Math.max(0, resume.ci - 1)) + 1; }
            resume = null;
            let lastCi = off;
            const r = await speakOne(off ? piece.text.slice(off) : piece.text, piece.lang, (ci, len) => { if (token === tts.token) { lastCi = ci + off; setWordAt(lastCi, piece.text.length, piece.text, piece.lang); emit('wordpos', { ci: lastCi, len: piece.text.length, text: piece.text, lang: piece.lang }); } }, () => nextPiece(c.p, c.s));
            if (token !== tts.token) return;
            if (r === 'end') { const hw = piece.text.split(/\s+/).length; doc.heard = (doc.heard || 0) + hw; scheduleMetaSave(); emit('heard', { words: hw, p: c.p, s: c.s }); }
            if (r === 'restart') { resume = { p: c.p, s: c.s, text: piece.text, ci: lastCi }; continue; }
            if (r === 'end' && window.DDLab && window.DDLab.afterSentence) {      // modos de treino: repetir, shadowing, ditado
                const act = await window.DDLab.afterSentence({ p: c.p, s: c.s, text: piece.text, lang: piece.lang, ms: performance.now() - tStart });
                if (token !== tts.token) return;
                if (act === 'repeat') continue;
            }
            if (r === 'error' && ++errors > 3) break;
            tts.cursor = { p: c.p, s: c.s + 1 };
        }
        if (token === tts.token) stopTts();
    }

    function startTts(p, s) {
        if (!synth || !doc) return;
        tts.pre = null; synth.cancel();
        tts.token++;
        emit('stop');
        tts.restart = false;
        if (p == null) {
            const c = tts.cursor;
            if (c && c.p < doc.paras.length) { p = c.p; s = c.s; } else { p = firstVisible(); s = 0; }
        }
        tts.cursor = { p, s: s || 0 };
        tts.playing = true;
        postParent({ type: 'tts-state', isPlaying: true });
        emit('playstate', { playing: true });
        runTts(tts.token);
    }
    // Setas ← →: frase anterior/próxima. Tocando, a voz segue de lá; parado, só a marca e a posição andam (▶ continua dali).
    function stepSentence(dir) {
        if (!doc) return;
        const cur = tts.mark || tts.cursor || { p: firstVisible(), s: 0 };
        let p = cur.p, s = cur.s + dir;
        for (let guard = 0; guard < 4; guard++) {
            if (s < 0) { p--; if (p < 0) return; s = doc.paras[p].s.length - 1; }
            else if (s >= doc.paras[p].s.length) { p++; if (p >= doc.paras.length) return; s = 0; }
            if (s >= 0 && doc.paras[p].s[s] != null) break;
        }
        if (tts.playing) startTts(p, s);
        else { tts.cursor = { p, s }; setMark(p, s); }
    }
    window.addEventListener('keydown', (e) => {
        if (!doc || state.mode === 'tele' || ($('lb-reader') && $('lb-reader').hidden)) return;
        if (e.altKey || e.ctrlKey || e.metaKey || /^(input|textarea|select)$/i.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable)) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stepSentence(e.key === 'ArrowRight' ? 1 : -1); }
    });
    function stopTts() {
        tts.token++;
        emit('stop');
        tts.pre = null; if (synth) synth.cancel();
        if (tts.playing) { tts.playing = false; postParent({ type: 'tts-state', isPlaying: false }); emit('playstate', { playing: false }); }
        if (tts.mark) { markSpan(false); moveBand(null); tts.word = -1; markSpan(true); }
    }
    function restartCurrent() { if (tts.playing && synth) { tts.restart = true; tts.pre = null; synth.cancel(); emit('restartspeech'); } }

    /* ------------------------------------------------------------------ barra inferior do leitor: páginas e avanço */
    let cw = [], totalW = 0, hudTimer = null;
    const wordsIn = (s) => s.split(/\s+/).filter(Boolean).length;
    function buildCum() {
        cw = []; let a = 0;
        doc.paras.forEach((p) => { cw.push(a); a += wordsIn(p.s.join(' ')); });
        totalW = a;
    }
    function sendHud() {
        if (!doc) { clearTimeout(hudTimer); postParent({ type: 'dd-lab-hud', hud: null }); return; }
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => {
            if (!doc) return;
            const i = Math.max(0, Math.min((tts.playing && tts.cursor ? tts.cursor.p : doc.pos) || 0, doc.paras.length - 1));
            let read = cw[i] || 0;
            if (tts.playing && tts.cursor && tts.cursor.p === i) for (let k = 0; k < tts.cursor.s; k++) read += wordsIn(doc.paras[i].s[k]);
            const pg = doc.paras[i].pg || (doc.pages ? Math.max(1, Math.ceil((read / Math.max(1, totalW)) * doc.pages)) : 0);
            postParent({ type: 'dd-lab-hud', hud: { title: doc.title, lang: doc.lang, page: pg, pages: doc.pages || 0, read, total: totalW, heard: doc.heard || 0 } });
        }, 120);
    }

    /* ------------------------------------------------------------------ biblioteca (tela inicial) */
    function showError(msg) { const e = $('lb-error'); e.hidden = !msg; e.textContent = msg || ''; }
    function showProgress(txt, frac) {
        const box = $('lb-progress');
        box.hidden = txt == null;
        if (txt == null) return;
        $('lb-progress-text').textContent = txt;
        $('lb-progress-fill').style.width = Math.round((frac || 0) * 100) + '%';
    }

    const UI_KEY = 'dd-ingles-ui';
    let libSort = 'recent';
    try { libSort = (JSON.parse(localStorage.getItem(UI_KEY) || '{}').sort) || 'recent'; } catch (e) { /* sem storage */ }
    const progOf = (m) => (m.trTotal > 1 ? Math.max(0, Math.min(100, Math.round((m.pos || 0) / (m.trTotal - 1) * 100))) : 0);
    const isDone = (m) => progOf(m) >= 97;

    function docRow(m) {
        const n = nf(), pr = progOf(m);
        const row = document.createElement('div'); row.className = 'lb-doc';
        const info = document.createElement('div'); info.className = 'lb-doc-info';
        const name = document.createElement('strong'); name.textContent = m.title;
        const meta = document.createElement('span');
        const pct = m.trTotal ? Math.round(m.trDone / m.trTotal * 100) : 0;
        meta.textContent = tx('origin') + ': ' + langName(m.lang) + ' · ' + (m.pages ? n.format(m.pages) + ' ' + tx('pages') + ' · ' : '') +
            n.format(m.sentences) + ' ' + tx('sentences') + ' · ' + n.format(m.words) + ' ' + tx('words') + ' · ' + pct + '% ' + tx('translated');
        const badge = window.DDLab && window.DDLab.badge ? window.DDLab.badge(m) : '';
        const bdg = badge ? document.createElement('small') : null;
        if (bdg) bdg.textContent = badge;
        const bar = document.createElement('div'); bar.className = 'lb-doc-prog';
        const track = document.createElement('div'); track.className = 'lb-bar';
        const fill = document.createElement('div'); fill.className = 'lb-bar-fill'; fill.style.width = pr + '%';
        track.appendChild(fill);
        const lab = document.createElement('small'); lab.textContent = pr + '% ' + tx('read');
        bar.append(track, lab);
        info.append(name, meta);
        if (bdg) info.append(bdg);
        info.append(bar);
        const acts = document.createElement('div'); acts.className = 'lb-doc-acts';
        const bOpen = btn(pr > 0 && !isDone(m) ? tx('resume') : tx('open'), () => openDoc(m.id));
        bOpen.classList.add('lb-primary');
        const bName = btn('✎', () => renameDoc(m.id, m.title)); bName.title = tx('rename'); bName.setAttribute('aria-label', tx('rename'));
        const bFlip = btn('⇄', () => flipLang(m.id)); bFlip.title = tx('flip'); bFlip.setAttribute('aria-label', tx('flip'));
        const bDel = btn(tx('del'), () => delDoc(m.id));
        acts.append(bOpen, bName, bFlip, bDel);
        row.append(info, acts);
        return row;
    }

    let renderSeq = 0;
    async function renderDocs() {
        const my = ++renderSeq, host = $('lb-docs');
        let list = [];
        if (persist) { try { list = (await dbAll('meta')).filter((m) => !(m.x && m.x.trilha)); } catch (e) { persist = false; dbErr = e; } }
        if (my !== renderSeq) return;      // outra renderização mais nova assumiu
        host.textContent = '';
        if (!persist) { const p = document.createElement('p'); p.className = 'lb-note'; p.textContent = tx('noStorage'); host.appendChild(p); }
        $('lb-tools').hidden = !list.length;
        if (!list.length) { if (persist) { const p = document.createElement('p'); p.className = 'lb-empty'; p.textContent = tx('empty'); host.appendChild(p); } renderStorage(); return; }

        const q = ($('lb-search').value || '').trim().toLowerCase();
        const items = list.filter((m) => !q || m.title.toLowerCase().indexOf(q) >= 0);
        const used = (m) => m.lastOpened || m.added;
        const sorters = {
            recent: (a, b) => used(b) - used(a),
            title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
            progress: (a, b) => progOf(b) - progOf(a) || used(b) - used(a),
            added: (a, b) => b.added - a.added
        };
        items.sort(sorters[libSort] || sorters.recent);
        if (!items.length) { const p = document.createElement('p'); p.className = 'lb-empty'; p.textContent = tx('noMatch'); host.appendChild(p); renderStorage(); return; }

        const section = (label, arr) => {
            if (!arr.length) return;
            const h = document.createElement('h3'); h.className = 'lb-group'; h.textContent = label + ' · ' + arr.length;
            host.appendChild(h);
            arr.forEach((m) => host.appendChild(docRow(m)));
        };
        if (libSort === 'recent') {       // agrupa por situação de leitura
            section(tx('gContinue'), items.filter((m) => progOf(m) > 0 && !isDone(m)));
            section(tx('gNew'), items.filter((m) => progOf(m) === 0));
            section(tx('gDone'), items.filter(isDone));
        } else section(tx('gAll'), items);
        renderStorage();
    }

    async function renderStorage() {
        const el = $('lb-storage');
        if (!el) return;
        el.textContent = '';
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const e = await navigator.storage.estimate();
                if (e && e.usage != null) el.textContent = tx('storage') + ' ' + (e.usage / 1048576).toFixed(1).replace('.', state.readLang === 'en' ? '.' : ',') + ' MB';
            }
        } catch (err) { /* sem estimativa */ }
    }

    async function renameDoc(id, cur) {
        const nm = (prompt(tx('renamePrompt'), cur) || '').trim().slice(0, 140);
        if (!nm || nm === cur) return;
        try { const m = await dbGet('meta', id); if (m) { m.title = nm; await dbPut('meta', m); } } catch (e) { /* ignora */ }
        renderDocs();
    }
    function btn(label, fn) { const b = document.createElement('button'); b.type = 'button'; b.className = 'lb-btn'; b.textContent = label; b.onclick = fn; return b; }

    async function delDoc(id) {
        if (!confirm(tx('confirmDel'))) return;
        try { await dbDel('meta', id); await dbDel('docs', id); await dbDelRange('tr', id + ':', id + ':￿'); } catch (e) { /* ignora */ }
        renderDocs();
    }
    async function flipLang(id) {
        try {
            const m = await dbGet('meta', id), d = await dbGet('docs', id);
            if (!m || !d) return;
            m.lang = d.lang = other(m.lang); m.trDone = 0;
            await dbPut('meta', m); await dbPut('docs', d); await dbDelRange('tr', id + ':', id + ':￿');
        } catch (e) { /* ignora */ }
        renderDocs();
    }

    async function importFile(file) {
        showError('');
        const name = file.name || 'documento';
        const isPdf = /\.pdf$/i.test(name) || file.type === 'application/pdf';
        const isTxt = /\.txt$/i.test(name) || file.type === 'text/plain';
        const imp = importers.find((i) => i.test(name, file));
        if (!isPdf && !isTxt && !imp) return showError(tx('errType'));
        try {
            showProgress(tx('extracting') + '…', 0);
            const prog = (i, n) => showProgress(tx('extracting') + ': ' + tx('page') + ' ' + i + '/' + n, i / n);
            const ex = imp ? await imp.run(file, prog) : isPdf ? await extractPdf(file, prog) : await extractTxt(file);
            if (!ex.paras.length) { showProgress(null); return showError(tx('errNoText')); }
            showProgress(tx('saving'), 1);
            await tick();
            const lang = detectLang(ex.paras);
            const paras = ex.paras.map((p) => ({ t: p.t, pg: p.pg, s: p.t === 'h' ? [p.text] : p.t === 'v' ? p.lines.slice() : splitSentences(p.text, lang) })).filter((p) => p.s.length);
            const words = paras.reduce((a, p) => a + p.s.join(' ').split(/\s+/).length, 0);
            const d = {
                id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                title: (ex.title && ex.title.trim().length > 3 ? ex.title.trim() : name.replace(/\.(pdf|txt)$/i, '')).slice(0, 140),
                lang, pages: ex.pageCount, paras, words, added: Date.now(), pos: 0, x: {},
                sentences: paras.reduce((a, p) => a + p.s.length, 0)
            };
            let saving = null;                                  // grava em segundo plano: o documento abre sem esperar o disco
            if (persist) {
                saving = (async () => {
                    try {
                        await dbPut('docs', { id: d.id, lang: d.lang, paras: d.paras });
                        await dbPut('meta', { id: d.id, title: d.title, lang: d.lang, pages: d.pages, sentences: d.sentences, words: d.words, added: d.added, trDone: 0, trTotal: paras.length, pos: 0, heard: 0, lastOpened: 0, x: d.x || {} });
                    } catch (e) { persist = false; dbErr = e; }
                })();
            }
            if (saving) await saving;                           // (o disco é rápido; a ordem segura evita corrida com a biblioteca)
            showProgress(null);
            emit('imported', d);
            enterDoc(Object.assign(d, { tr: {} }));
        } catch (e) {
            showProgress(null);
            showError(tx('errRead') + (e && e.message ? e.message : e));
        }
    }

    async function openDoc(id) {
        const m = await dbGet('meta', id), d = await dbGet('docs', id);
        if (!m || !d) return;
        const tr = await dbTrOf(id).catch(() => ({}));
        Object.keys(tr).forEach((i) => {   // versões antigas gravavam o original como "tradução" quando o tradutor falhava
            const src = d.paras[i] && d.paras[i].s;
            if (!src || src.every((s, k) => tr[i][k] === s && /\p{L}{3}/u.test(s))) { delete tr[i]; if (persist) dbDel('tr', id + ':' + i).catch(() => {}); }
        });
        let pos = m.pos || 0, heard = m.heard || 0, restored = false;
        try {   // o espelho mais novo que o banco (aba fechada antes de gravar) vale mais
            const s = JSON.parse(localStorage.getItem(MIRROR) || 'null');
            if (s && s.id === id && s.t > (m.savedAt || 0)) { pos = Math.max(0, Math.min((s.pos | 0), d.paras.length - 1)); heard = Math.max(heard, s.heard || 0); restored = pos !== (m.pos || 0) || heard !== (m.heard || 0); }
        } catch (e) { /* espelho inválido */ }
        enterDoc({ id, title: m.title, lang: d.lang, pages: m.pages, paras: d.paras, tr, words: m.words, sentences: m.sentences, added: m.added, pos, heard, lastOpened: m.lastOpened || 0, x: m.x || {} });
        if (restored) saveMeta();
    }

    function enterDoc(d) {
        stopTts();
        tts.cursor = null; tts.mark = null; tts.word = -1; fullMode = false;
        doc = d;
        d.lastOpened = Date.now();
        buildCum();
        anchor = d.pos || 0;
        $('lb-library').hidden = true;
        $('lb-reader').hidden = false;
        applyMode();
        $('lb-doc-title').textContent = d.title;
        renderDocMeta();
        buildText();
        const el = paraEl(Math.min(anchor, d.paras.length - 1));
        if (el) el.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
        stableW = pageW();
        setStatus();
        pump();
        sendHud();
        emit('open', doc);
    }
    function renderDocMeta() {
        const n = nf();
        $('lb-doc-meta').textContent = tx('origin') + ': ' + langName(doc.lang) + ' · ' + (doc.pages ? n.format(doc.pages) + ' ' + tx('pages') + ' · ' : '') + n.format(doc.sentences) + ' ' + tx('sentences') + ' · ' + n.format(doc.words) + ' ' + tx('words');
    }
    // modo de leitura: classes no <body> só enquanto há um documento aberto (a biblioteca mantém a largura normal)
    function applyMode() { const open = !!doc && !$('lb-reader').hidden; MODES.forEach((m) => document.body.classList.toggle('lb-' + m + '-open', open && state.mode === m)); }
    function setMode(m) {
        state.mode = MODES.indexOf(m) >= 0 ? m : 'single'; state.side = state.mode === 'side';
        try { localStorage.setItem('dd-ingles-modo', state.mode); } catch (e) { /* sem storage */ }
        applyMode();
        if (doc) { const keep = doc.pos || 0; repaintAll(); pump(); setStatus(); keepPos = keep; settleAndKeep(keep); }
        emit('mode', state.mode);
    }
    function closeDoc() {
        MODES.forEach((m) => document.body.classList.remove('lb-' + m + '-open'));
        stopTts();
        clearMark();
        saveMeta();
        emit('close', doc);
        doc = null; fullMode = false;
        sendHud();
        releaseWaiters();
        $('lb-text').textContent = '';
        $('lb-reader').hidden = true;
        $('lb-library').hidden = false;
        window.scrollTo(0, 0);
        renderDocs(); renderEngine();
    }

    /* ------------------------------------------------------------------ textos fixos e eventos */
    function applyUi() {
        document.documentElement.lang = state.readLang === 'en' ? 'en' : 'pt-BR';
        $('lb-meta').textContent = tx('meta');
        $('lb-title').textContent = tx('title');
        $('lb-lead').textContent = tx('lead');
        $('lb-intro').textContent = tx('intro');
        $('lb-drop-main').textContent = tx('dropMain');
        $('lb-drop-sub').textContent = tx('dropSub');
        $('lb-h-docs').textContent = tx('hDocs');
        $('lb-h-engine').textContent = tx('hEngine');
        $('lb-h-voice').textContent = tx('hVoice');
        $('lb-search').placeholder = tx('search');
        const so = $('lb-sort');
        so.textContent = '';
        [['recent', 'sortRecent'], ['title', 'sortTitle'], ['progress', 'sortProgress'], ['added', 'sortAdded']].forEach(([v, k]) => {
            const o = document.createElement('option'); o.value = v; o.textContent = tx(k); so.appendChild(o);
        });
        so.value = libSort;
        $('lb-note').textContent = tx('note');
        $('lb-back').textContent = tx('back');
        $('lb-study-label').textContent = tx('study'); $('lb-study').setAttribute('aria-label', tx('studyGroup'));
        if (doc) { renderDocMeta(); setStatus(); } else renderDocs();
        renderEngine(); renderVoice();
    }

    const drop = $('lb-drop'), input = $('lb-file');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { const f = input.files && input.files[0]; input.value = ''; if (f) importFile(f); });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) importFile(f); });
    $('lb-search').addEventListener('input', () => renderDocs());
    $('lb-sort').addEventListener('change', () => { libSort = $('lb-sort').value; try { localStorage.setItem(UI_KEY, JSON.stringify({ sort: libSort })); } catch (e) { /* ignora */ } renderDocs(); });
    $('lb-back').addEventListener('click', closeDoc);
    $('lb-banner-btn').addEventListener('click', () => {
        if (!doc) return;
        const a = doc.lang, b = other(doc.lang), k = pairKey(a, b);
        if (trError) { trError = ''; delete TR.insts[k]; TR.avail[k] = 'unknown'; getInst(a, b).then((i) => { if (i) pump(); else activatePair(a, b); }); }
        else activatePair(a, b);
    });
    $('lb-translate-all').addEventListener('click', () => { fullMode = !fullMode; setStatus(); if (fullMode) pump(); });

    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'step' && doc && (d.value === 1 || d.value === -1)) { if (state.mode === 'tele') emit('step', { d: d.value }); else stepSentence(d.value); }
        if (d.type === 'lab-tele' && doc) setMode(state.mode === 'tele' ? 'single' : 'tele');   // botao Teleprompter do leitor
        if (d.type === 'theme') document.body.className = d.value + '-mode';
        if (d.type === 'font') root.style.setProperty('--base-size', d.value + 'px');
        if (d.type === 'typeface') root.dataset.face = d.value;
        if (d.type === 'margins') root.dataset.margin = d.value;
        if (d.type === 'align') root.dataset.align = d.value;
        if (d.type === 'readlang') {
            const v = d.value === 'en' ? 'en' : 'pt';
            if (v !== state.readLang) { state.readLang = v; applyUi(); repaintAll(); pump(); emit('lang', v); }
        }
        if (d.type === 'audiolang') {
            const v = d.value === 'en' ? 'en' : 'pt';
            if (v !== state.audioLang) { state.audioLang = v; restartCurrent(); pump(); emit('audiolang', v); emit('lang', state.readLang); }
        }
        if (d.type === 'voice' && d.value && LANG_TAG[d.value.lang]) {
            state.voices[d.value.lang] = d.value.name || '';
            renderVoice();
            if (d.value.lang === state.audioLang) restartCurrent();
        }
        if (d.type === 'rate') { const v = Number(d.value); if (v > 0 && v !== state.rate) { state.rate = v; restartCurrent(); } }
        if (d.type === 'tts-toggle') { if (tts.playing) stopTts(); else if (doc) startTts(); }
    });
    // gravar ao sair, ao ocultar a aba (celular, troca de aba) e antes de descarregar a página
    window.addEventListener('pagehide', () => { stopTts(); flush(); });
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    if (synth) { synth.getVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', renderVoice); }

    applyUi();
    probeEngine();

    // API para os módulos (ingles-*.js)
    async function translateText(text, src) {
        try { const inst = await getInst(src, other(src)); return inst ? String(await inst.translate(text)).trim() : null; } catch (e) { return null; }
    }
    window.DDLab = {
        rateScale: 1, afterSentence: null, neural: null,
        // fala avulsa (palavra do cartão, "ouvir de novo" do ditado): voz neural se ativa, senão a do navegador
        say(text, lang) {
            if (tts.playing) stopTts();
            if (this.neural && this.neural.active(lang)) { this.neural.stop(); this.neural.speak(text, lang, Math.min(1, state.rate), null); return; }
            if (!synth) return;
            synth.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = LANG_TAG[lang]; u.rate = Math.min(1, state.rate);
            const v = pickVoice(lang); if (v) { u.voice = v; u.lang = v.lang; }
            synth.speak(u);
        },
        needBoth(on) { wantBoth = !!on; if (wantBoth) pump(); else setStatus(); },
        setRate(v) { v = Number(v); if (v > 0 && v !== state.rate) { state.rate = v; restartCurrent(); } },
        state, on, emit, importers, $, translateText, pickVoice, startTts, stopTts, paraEl, firstVisible, postParent, trSentence, other, langName, nf, tx, LANG_TAG,
        get doc() { return doc; }, tts,
        db: { get: dbGet, put: dbPut, all: dbAll, del: dbDel },
        renderDocs, setStatus, ensureTr, flush, looksVerse, setMode, MODES, repaintAll, importFile, saveMeta, openDoc, delRange: dbDelRange, addText: (title, text) => importFile(new File([text], (title || 'texto') + '.txt', { type: 'text/plain' }))
    };

    // gancho de teste
    window.__ddLab = { buildParagraphs, buildLines, splitSentences, detectLang, importFile, get doc() { return doc; }, get dbErr() { return dbErr && String(dbErr); }, get persist() { return persist; }, tts, state, openDoc, closeDoc };
})();
