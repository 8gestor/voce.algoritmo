/*
 * ingles-importar.js — mais formas de trazer texto para o Estudo de Inglês: EPUB e texto colado.
 *
 * EPUB é um ZIP: lemos o índice do ZIP e descompactamos com DecompressionStream (nativo do navegador), então
 * não há biblioteca extra. Páginas de sites ficam de fora: o navegador bloqueia a leitura de outros sites;
 * para um artigo da web, cole o texto ou salve como PDF e envie.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const L = {
        pt: { hint: 'Também aceita EPUB. Ou cole um texto:', paste: 'Colar texto', title: 'Título', text: 'Cole o texto aqui', add: 'Adicionar à biblioteca', cancel: 'Cancelar', empty: 'Cole algum texto antes.', epubFail: 'Este EPUB não pôde ser lido (protegido ou fora do padrão).' },
        en: { hint: 'EPUB also works. Or paste some text:', paste: 'Paste text', title: 'Title', text: 'Paste the text here', add: 'Add to library', cancel: 'Cancel', empty: 'Paste some text first.', epubFail: 'This EPUB could not be read (protected or non-standard).' }
    };
    const t = (k) => L[D.state.readLang][k];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

    /* ------------------------------------------------------------------ ZIP mínimo */
    const dec = new TextDecoder('utf-8');
    async function openZip(buf) {
        const dv = new DataView(buf), u8 = new Uint8Array(buf);
        let e = u8.length - 22;
        while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
        if (e < 0) throw new Error('zip');
        const n = dv.getUint16(e + 10, true);
        let p = dv.getUint32(e + 16, true);
        const files = {};
        for (let i = 0; i < n; i++) {
            if (dv.getUint32(p, true) !== 0x02014b50) break;
            const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
            const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
            files[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csize, lo };
            p += 46 + nl + xl + cl;
        }
        return {
            has: (name) => !!files[name],
            async text(name) {
                const f = files[name];
                if (!f) return null;
                const start = f.lo + 30 + dv.getUint16(f.lo + 26, true) + dv.getUint16(f.lo + 28, true);
                const data = u8.subarray(start, start + f.csize);
                if (f.method === 0) return dec.decode(data);
                if (f.method === 8) return dec.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
                throw new Error('método ZIP não suportado');
            }
        };
    }
    function resolve(base, href) {
        const parts = (base ? base.split('/').slice(0, -1) : []).concat(decodeURIComponent(href.split('#')[0]).split('/'));
        const out = [];
        parts.forEach((x) => { if (x === '..') out.pop(); else if (x && x !== '.') out.push(x); });
        return out.join('/');
    }

    /* ------------------------------------------------------------------ EPUB -> parágrafos */
    const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote';
    async function extractEpub(file, onProgress) {
        const zip = await openZip(await file.arrayBuffer());
        const container = await zip.text('META-INF/container.xml');
        if (!container) throw new Error(t('epubFail'));
        const opfPath = new DOMParser().parseFromString(container, 'application/xml').querySelector('rootfile').getAttribute('full-path');
        const opf = new DOMParser().parseFromString(await zip.text(opfPath), 'application/xml');
        const manifest = {};
        opf.querySelectorAll('manifest > item').forEach((i) => { manifest[i.getAttribute('id')] = i.getAttribute('href'); });
        const spine = Array.from(opf.querySelectorAll('spine > itemref')).map((r) => manifest[r.getAttribute('idref')]).filter(Boolean);
        const titleEl = opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0];
        const paras = [];
        for (let i = 0; i < spine.length; i++) {
            const html = await zip.text(resolve(opfPath, spine[i]));
            onProgress(i + 1, spine.length);
            if (!html) continue;
            const body = new DOMParser().parseFromString(html, 'text/html').body;
            if (!body) continue;
            body.querySelectorAll('script,style,nav').forEach((n) => n.remove());
            body.querySelectorAll(BLOCKS).forEach((b) => {
                if (b.querySelector(BLOCKS)) return;                          // só o bloco mais interno
                const txt = b.textContent.replace(/\s+/g, ' ').trim();
                if (txt.length < 2 || !/\p{L}/u.test(txt)) return;
                paras.push({ t: /^H[1-6]$/.test(b.tagName) && txt.length < 140 ? 'h' : 'p', text: txt });
            });
            if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
        }
        // EPUB não tem páginas fixas: estimamos ~280 palavras por página para a barra inferior
        let words = 0;
        paras.forEach((p) => { p.pg = Math.floor(words / 280) + 1; words += p.text.split(/\s+/).length; });
        return { title: titleEl ? titleEl.textContent.trim() : '', pageCount: Math.max(1, Math.ceil(words / 280)), paras };
    }
    D.importers.push({
        test: (name) => /\.epub$/i.test(name),
        run: async (file, onProgress) => { try { return await extractEpub(file, onProgress); } catch (e) { throw new Error(e && e.message ? e.message : t('epubFail')); } }
    });

    /* ------------------------------------------------------------------ interface: aceitar .epub + colar texto */
    const input = D.$('lb-file');
    if (input) input.accept = (input.accept ? input.accept + ',' : '') + '.epub,application/epub+zip';
    const drop = D.$('lb-drop');
    const box = el('div', 'lb-paste');
    const hint = el('p', 'lb-note');
    const open = el('button', 'lb-btn'); open.type = 'button'; open.id = 'lb-paste-open';
    const form = el('div', 'lb-paste-form'); form.hidden = true;
    const ti = el('input', 'lb-input'); ti.type = 'text'; ti.maxLength = 120;
    const ta = el('textarea', 'lb-input'); ta.rows = 6;
    const row = el('div', 'lb-actions');
    const ok = el('button', 'lb-btn lb-primary'); ok.type = 'button'; ok.id = 'lb-paste-add';
    const no = el('button', 'lb-btn'); no.type = 'button';
    row.append(ok, no);
    const msg = el('p', 'lb-error'); msg.hidden = true;
    form.append(ti, ta, msg, row);
    box.append(hint, open, form);
    if (drop && drop.parentNode) drop.parentNode.insertBefore(box, drop.nextSibling);
    function labels() { hint.textContent = t('hint'); open.textContent = t('paste'); ti.placeholder = t('title'); ta.placeholder = t('text'); ok.textContent = t('add'); no.textContent = t('cancel'); }
    open.onclick = () => { form.hidden = !form.hidden; open.hidden = !form.hidden; if (!form.hidden) ta.focus(); };
    no.onclick = () => { form.hidden = true; open.hidden = false; msg.hidden = true; };
    ok.onclick = async () => {
        const txt = ta.value.trim();
        if (!txt) { msg.textContent = t('empty'); msg.hidden = false; return; }
        msg.hidden = true;
        const name = (ti.value.trim() || txt.slice(0, 40)).replace(/[\\/:*?"<>|]/g, ' ');
        ta.value = ''; ti.value = ''; form.hidden = true; open.hidden = false;
        await D.addText(name, txt);
    };
    D.on('lang', labels);
    labels();
    window.__ddImport = { openZip, resolve };
})();
