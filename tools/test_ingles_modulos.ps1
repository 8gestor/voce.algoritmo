<#
  test_ingles_modulos.ps1 — confere, no Chrome, os módulos do Estudo de Inglês (ingles-*.js), um por seção:
    A  toque na palavra + vocabulário com revisão espaçada   (ingles-palavras.js)
    B  nível de dificuldade do texto                          (ingles-nivel.js)
    C  modos de treino: repetir, shadowing, ditado             (ingles-treino.js)
    D  perguntas de compreensão (modelo local simulado)         (ingles-compreensao.js)
    E  painel de progresso: sequência, minutos, palavras        (ingles-progresso.js)
    F  importar EPUB e texto colado                             (ingles-importar.js)
    G  voz neural local (biblioteca simulada, sem baixar nada)   (ingles-voz.js)
  (tradutor e voz simulados; usa texto colado, sem PDF)
  Uso: .\tools\test_ingles_modulos.ps1 [-Chrome <caminho>]
#>
param([string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dd-mod-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
robocopy $repo $tmp /E /XD .git .github /NFL /NDL /NJH /NJS /NP | Out-Null

$test = @'
<script>
(function () {
  var out = [], fails = 0;
  function live() { var p = document.getElementById('result'); if (!p) { p = document.createElement('pre'); p.id = 'result'; p.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden'; document.body.appendChild(p); } p.textContent = out.join(String.fromCharCode(10)); }
  function ok(name, cond, extra) { if (!cond) fails++; out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); live(); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var $ = function (id) { return document.getElementById(id); };
  function ifr() { return $('content-frame'); }
  function W() { return ifr().contentWindow; }
  function D() { return W().DDLab; }
  function idoc() { return ifr().contentDocument; }
  function post(m) { W().postMessage(m, '*'); }
  async function until(fn, ms) { var t = Date.now(); while (Date.now() - t < (ms || 15000)) { try { if (fn()) return true; } catch (e) {} await wait(100); } return false; }
  function clickAt(el, fx) { var r = el.getBoundingClientRect(); var x = r.left + Math.max(2, r.width * (fx || 0.1)), y = r.top + r.height / 2; el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); }
  var TEXT = 'Algorithms decide what we read and what we buy. They shape our choices every day. Nobody explains how they work, and few people ask.\n\nUnderstanding that fact is the first step towards resisting it. The people who build these systems are rarely asked to explain them.';

  window.addEventListener('load', async function () {
    try {
      await wait(1200);
      var links = document.querySelectorAll('.chapter-link'); links[links.length - 2].click();   // Biblioteca (o último é o Manual)
      await until(function () { return ifr().contentWindow.DDLab; }, 8000);
      var w = W(), spoken = [];
      w.DD_TRANSLATOR_FACTORY = function (a, b) { return { translate: async function (t) { await wait(2); return '[' + b + '] ' + t; } }; };
      w.speechSynthesis.cancel = function () { if (w.__cur) { var u = w.__cur; w.__cur = null; u.onerror && u.onerror({ error: 'canceled' }); } };
      w.speechSynthesis.speak = function (u) { spoken.push({ text: u.text, lang: u.lang, rate: u.rate, at: performance.now() }); w.__cur = u; u.onstart && u.onstart(); setTimeout(function () { if (w.__cur === u) { w.__cur = null; u.onend && u.onend(); } }, 100); };
      post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'pt' });
      await wait(300);
      await D().addText('Texto de teste', TEXT);
      await until(function () { return D().doc && D().doc.paras.length >= 2; }, 20000);
      ok('0 texto colado vira documento', !!D().doc && D().doc.lang === 'en', D().doc && D().doc.paras.length + ' parágrafos');

      // ===================== A. toque na palavra + vocabulário =====================
      post({ type: 'readlang', value: 'en' }); await wait(400);
      var sp = idoc().querySelector('.lb-para:not(.lb-head) .lb-s');
      clickAt(sp, 0.05);
      await until(function () { return idoc().querySelector('.lb-pop'); }, 3000);
      var pop = idoc().querySelector('.lb-pop');
      ok('A1 tocar numa palavra abre o cartão', !!pop && /^Algorithms$/.test(pop.querySelector('.lb-pop-word').textContent), pop && pop.querySelector('.lb-pop-word').textContent);
      ok('A2 tocar na palavra não inicia a narração', D().tts.playing === false);
      var gotTr = await until(function () { return /^\[pt\] algorithms$/.test(idoc().querySelector('.lb-pop-tr').textContent); }, 4000);
      ok('A3 mostra a tradução da palavra', gotTr, idoc().querySelector('.lb-pop-tr').textContent);
      ok('A4 mostra a frase de contexto', /Algorithms decide what we read/.test(idoc().querySelector('.lb-pop-ctx').textContent));
      var btns = idoc().querySelectorAll('.lb-pop-acts .lb-btn');
      btns[0].click();   // ouvir
      ok('A5 pronuncia a palavra em inglês', spoken.length && spoken[spoken.length - 1].text === 'Algorithms' && spoken[spoken.length - 1].lang === 'en-US', JSON.stringify(spoken[spoken.length - 1]));
      btns[1].click();   // salvar
      await until(function () { return /Salva|Saved/.test(idoc().querySelector('.lb-pop-acts .lb-primary').textContent); }, 3000);
      var cards = await W().__ddVocab.loadAll();
      ok('A6 salvar grava o cartão', cards.length === 1 && cards[0].word === 'algorithms' && cards[0].lang === 'en' && cards[0].tr === '[pt] algorithms', JSON.stringify(cards[0] || {}).slice(0, 100));
      // segunda palavra, outra frase
      idoc().querySelector('.lb-pop-acts .lb-btn:last-child').click();
      var sp2 = idoc().querySelectorAll('.lb-para:not(.lb-head)')[1].querySelector('.lb-s');
      clickAt(sp2, 0.05);
      await until(function () { return idoc().querySelector('.lb-pop'); }, 3000);
      await wait(300);
      idoc().querySelectorAll('.lb-pop-acts .lb-btn')[1].click(); await wait(300);
      cards = await W().__ddVocab.loadAll();
      ok('A7 segunda palavra salva', cards.length === 2, cards.map(function (c) { return c.word; }).join(','));
      // clicar fora de palavra (espaço) cai no padrão: ler daqui — aqui só conferimos que a tecla Esc fecha
      idoc().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await wait(100);
      ok('A8 Esc fecha o cartão', !idoc().querySelector('.lb-pop'));

      // repetição espaçada (unidade)
      var G = W().__ddVocab.grade;
      var c1 = { reps: 0, ivl: 0, ease: 2.5, lapses: 0, due: 0 };
      G(c1, 2); var i1 = c1.ivl; G(c1, 2); var i2 = c1.ivl; G(c1, 2); var i3 = c1.ivl;
      ok('A9 intervalos crescem: 1d → 3d → ~8d', i1 === 1 && i2 === 3 && i3 >= 7, [i1, i2, i3].join(' → '));
      G(c1, 0);
      ok('A10 errar zera o avanço e volta em minutos', c1.reps === 0 && c1.due - Date.now() < 10 * 60000 && c1.ease < 2.5);

      // biblioteca + revisão
      D().$('lb-back').click();
      await until(function () { return /2 palavras|2 words/.test(idoc().getElementById('lb-vocab-sum').textContent); }, 8000);
      ok('A11 biblioteca mostra o resumo do vocabulário', /2 saved words · 2 due now/.test(idoc().getElementById('lb-vocab-sum').textContent), idoc().getElementById('lb-vocab-sum').textContent);
      idoc().getElementById('lb-vocab-review').click();
      await until(function () { return idoc().querySelector('.lb-review .lb-card'); }, 3000);
      ok('A12 revisão abre com o cartão da palavra', !!idoc().querySelector('.lb-card-word'), idoc().querySelector('.lb-card-word') && idoc().querySelector('.lb-card-word').textContent);
      for (var k = 0; k < 2; k++) {
        await until(function () { return idoc().querySelector('.lb-review-acts .lb-primary') && !idoc().querySelector('.lb-review-acts .lb-primary').disabled; }, 40000);
        idoc().querySelector('.lb-review-acts .lb-primary').click();
        idoc().querySelectorAll('.lb-review-acts .lb-btn')[2].click();   // Bom
        await wait(300);
      }
      await until(function () { return idoc().querySelector('.lb-card-done'); }, 40000);
      ok('A13 terminar a revisão mostra a conclusão', !!idoc().querySelector('.lb-card-done'));
      cards = await W().__ddVocab.loadAll();
      ok('A14 cartões revisados ficam para depois', cards.every(function (c) { return c.due > Date.now() + 3600000 && c.reps === 1; }), cards.map(function (c) { return c.ivl + 'd'; }).join(','));
      idoc().querySelector('.lb-review .lb-btn').click();
      await wait(300);
      ok('A15 sair da revisão fecha a tela', !idoc().querySelector('.lb-review'));


      // ===================== B. nível de dificuldade =====================
      var N = W().__ddNivel;
      function mk(sents) { return { lang: 'en', paras: [{ t: 'p', s: sents }] }; }
      var easy = []; for (var q = 0; q < 12; q++) easy.push('The dog ran to the house and the boy was happy to see his mother.');
      var hard = []; for (var q2 = 0; q2 < 8; q2++) hard.push('Epistemological presuppositions undergird algorithmic governmentality, notwithstanding heterogeneous infrastructural contingencies and neoliberal biopolitical rationalities.');
      var me = N.measure(mk(easy)), mh = N.measure(mk(hard));
      ok('B1 texto simples sai como Fácil', me && me.lv === 0, JSON.stringify(me));
      ok('B2 texto acadêmico sai como Difícil ou pior', mh && mh.lv >= 2, JSON.stringify(mh));
      ok('B3 lista reconhece flexões e rejeita palavras raras', N.isCommon('running') && N.isCommon('books') && N.isCommon('quickly') && !N.isCommon('epistemological'), N.size + ' palavras na lista');
      ok('B4 português não recebe nível', N.measure({ lang: 'pt', paras: [{ t: 'p', s: easy }] }) === null);
      await D().addText('Texto de nivel', easy.join(' '));
      await until(function () { return D().doc && D().doc.title === 'Texto de nivel'; }, 20000);
      ok('B5 o documento aberto mostra a dificuldade', await until(function () { return /Dificuldade|Difficulty/.test(idoc().getElementById('lb-doc-meta').textContent); }, 4000), idoc().getElementById('lb-doc-meta').textContent.slice(-60));
      ok('B6 o nível fica gravado no documento', !!(D().doc.x && D().doc.x.lvl && D().doc.x.lvl.v === 1), JSON.stringify(D().doc.x));
      D().$('lb-back').click();
      ok('B7 a biblioteca mostra o nível no documento', await until(function () { var r = idoc().querySelector('.lb-doc'); return r && /Dificuldade|Difficulty/.test(r.textContent); }, 8000), (idoc().querySelector('.lb-doc') || {}).textContent && idoc().querySelector('.lb-doc').textContent.slice(0, 90));

      // ===================== C. treino de escuta =====================
      var TR = W().__ddTreino;
      var dd = TR.diff('The cat sat on the mat.', 'the dog sat on mat');
      ok('C1 ditado compara palavra a palavra (ordem, caixa e pontuação ignoradas)', Math.abs(dd.score - 4 / 6) < 0.01 && dd.hit.filter(function (h) { return !h; }).length === 2, Math.round(dd.score * 100) + '%');
      await D().addText('Treino', 'Algorithms decide what we read. They shape our choices every day. Nobody explains how they work. Few people ask.');
      await until(function () { return D().doc && D().doc.title === 'Treino'; }, 20000);
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      // repetir
      TR.setMode('repeat'); spoken.length = 0;
      post({ type: 'tts-toggle' });
      await until(function () { return spoken.length >= 3; }, 8000);
      ok('C2 repetir: a frase toca duas vezes', spoken[0].text === spoken[1].text && spoken[2].text !== spoken[1].text, spoken.slice(0, 3).map(function (s) { return s.text.slice(0, 12); }).join(' | '));
      ok('C3 repetir: a segunda passada é mais lenta', spoken[1].rate < spoken[0].rate, spoken[0].rate + ' → ' + spoken[1].rate);
      post({ type: 'tts-toggle' }); await wait(400);
      ok('C4 voltar à velocidade normal ao parar', D().rateScale === 1);
      // shadowing
      TR.setMode('shadow'); D().tts.cursor = null; spoken.length = 0;
      post({ type: 'tts-toggle' });
      await until(function () { return spoken.length >= 2; }, 12000);
      ok('C5 shadowing: pausa entre frases para repetir', spoken.length >= 2 && spoken[1].at - spoken[0].at > 700, Math.round(spoken[1].at - spoken[0].at) + ' ms');
      post({ type: 'tts-toggle' }); await wait(400);
      // ditado
      TR.setMode('dict'); D().tts.cursor = null; spoken.length = 0;
      post({ type: 'tts-toggle' });
      await until(function () { return idoc().querySelector('.lb-dict'); }, 8000);
      ok('C6 ditado: abre a caixa de escrita depois da frase', !!idoc().querySelector('.lb-dict textarea'));
      var first = D().doc.paras[0].s[0], words = first.split(' ');
      idoc().querySelector('.lb-dict textarea').value = words.slice(0, words.length - 1).join(' ');
      idoc().querySelector('.lb-dict .lb-primary').click();
      ok('C7 ditado: mostra acertos e a palavra que faltou', idoc().querySelectorAll('.lb-dict .lb-miss').length >= 1 && /%/.test(idoc().querySelector('.lb-dict small').textContent), idoc().querySelector('.lb-dict small').textContent);
      var n0 = spoken.length;
      idoc().querySelector('.lb-dict .lb-primary').click();   // continuar
      await until(function () { return spoken.length > n0; }, 6000);
      ok('C8 ditado: continuar segue para a próxima frase', spoken.length > n0 && spoken[spoken.length - 1].text === D().doc.paras[0].s[1], spoken[spoken.length - 1] && spoken[spoken.length - 1].text.slice(0, 20));
      await until(function () { return idoc().querySelector('.lb-dict'); }, 6000);
      post({ type: 'tts-toggle' }); await wait(400);
      ok('C9 parar a narração fecha o ditado', !idoc().querySelector('.lb-dict') && D().tts.playing === false);
      TR.setMode('normal');

      // ===================== D. perguntas de compreensão =====================
      D().$('lb-back').click(); await wait(300);
      delete w.LanguageModel;
      await D().addText('Quiz', TEXT + '\n\n' + TEXT);
      await until(function () { return D().doc && D().doc.title === 'Quiz'; }, 20000);
      await wait(400);
      ok('D1 sem modelo local o botão não aparece', idoc().getElementById('lb-quiz').hidden === true);
      D().$('lb-back').click(); await wait(300);
      var asked = [];
      w.LanguageModel = { availability: async function () { return 'available'; }, create: async function () { return { prompt: async function (p) { asked.push(p); if (/exactly 3/.test(p)) return '1. What do algorithms decide for us?\n2. Why is the process not neutral?\n3. Who is rarely asked to explain the systems?'; return 'Looks right.'; } }; } };
      await D().addText('Quiz2', TEXT + '\n\n' + TEXT);
      await until(function () { return D().doc && D().doc.title === 'Quiz2'; }, 20000);
      ok('D2 com modelo local o botão aparece', await until(function () { return idoc().getElementById('lb-quiz').hidden === false; }, 4000));
      idoc().getElementById('lb-quiz').click();
      await until(function () { return idoc().querySelectorAll('.lb-q').length === 3; }, 6000);
      ok('D3 gera 3 perguntas sobre o trecho', idoc().querySelectorAll('.lb-q').length === 3 && /Algorithms decide/.test(asked[0]), idoc().querySelectorAll('.lb-q').length + ' perguntas');
      idoc().querySelector('.lb-q textarea').value = 'They decide what we read';
      idoc().querySelector('.lb-q .lb-primary').click();
      await until(function () { return /Looks right/.test(idoc().querySelector('.lb-q-out').textContent); }, 4000);
      ok('D4 corrige a resposta do aluno', /Looks right/.test(idoc().querySelector('.lb-q-out').textContent) && /They decide what we read/.test(asked[asked.length - 1]));
      idoc().querySelector('.lb-quizbox .lb-btn').click();
      ok('D5 fechar remove o painel', !idoc().querySelector('.lb-quizbox'));

      // ===================== E. painel de progresso =====================
      D().$('lb-back').click(); await wait(300);
      var P = W().__ddProg, base = new Date();
      function dk(off) { var x = new Date(base); x.setDate(x.getDate() - off); return P.dayKey(x); }
      P.add('sec', 600, dk(2)); P.add('heard', 300, dk(2)); P.add('sec', 900, dk(1)); P.add('rev', 5, dk(1));
      var before = (P.log.d[dk(0)] || {}).heard || 0;
      D().emit('heard', { words: 40 }); D().emit('vocab-saved', {}); D().emit('reviewed', { grade: 2 }); D().emit('dictation', { score: 1 });
      var today = P.log.d[dk(0)];
      ok('E1 eventos do estudo entram no registro do dia', today.heard === before + 40 && today.saved >= 1 && today.rev >= 1 && today.dict >= 1, JSON.stringify(today));
      ok('E2 sequência conta dias seguidos até hoje', P.streak() === 3, P.streak() + ' dias');
      P.render();
      ok('E3 painel mostra a sequência e os blocos do dia', idoc().querySelectorAll('.lb-prog .lb-tile').length === 6 && /^3/.test(idoc().querySelector('.lb-prog .lb-tile-big').textContent), idoc().querySelector('.lb-prog .lb-tile-big').textContent);
      ok('E4 gráfico dos últimos 7 dias', idoc().querySelectorAll('.lb-prog-col').length === 7);
      ok('E5 grava no navegador', (function () { P.render(); try { return JSON.parse(localStorage.getItem('dd-ingles-log')).d[dk(1)].sec === 900; } catch (e) { return false; } })());
      // tempo de estudo corre com o documento aberto e atividade
      await D().addText('Tempo', TEXT);
      await until(function () { return D().doc && D().doc.title === 'Tempo'; }, 20000);
      var s0 = (P.log.d[dk(0)] || {}).sec || 0;
      w.dispatchEvent(new Event('wheel')); await wait(4500);
      ok('E6 conta o tempo de estudo com o documento aberto', ((P.log.d[dk(0)] || {}).sec || 0) >= s0 + 2, s0 + ' → ' + ((P.log.d[dk(0)] || {}).sec || 0));

      // ===================== F. EPUB e texto colado =====================
      D().$('lb-back').click(); await wait(300);
      async function zipOf(files) {   // monta um ZIP (deflate) só para o teste
        var enc = new TextEncoder(), parts = [], central = [], off = 0;
        function u16(n) { return [n & 255, (n >> 8) & 255]; } function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
        for (var name of Object.keys(files)) {
          var raw = enc.encode(files[name]);
          var cs = new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw')));
          var comp = new Uint8Array(await cs.arrayBuffer()), nm = enc.encode(name);
          var local = [].concat([0x50, 0x4b, 3, 4], u16(20), u16(0), u16(8), u16(0), u16(0), u32(0), u32(comp.length), u32(raw.length), u16(nm.length), u16(0));
          parts.push(new Uint8Array(local), nm, comp);
          central.push(new Uint8Array([].concat([0x50, 0x4b, 1, 2], u16(20), u16(20), u16(0), u16(8), u16(0), u16(0), u32(0), u32(comp.length), u32(raw.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
          off += local.length + nm.length + comp.length;
        }
        var cdSize = central.reduce(function (a, x) { return a + x.length; }, 0), n = Object.keys(files).length;
        var end = new Uint8Array([].concat([0x50, 0x4b, 5, 6], u16(0), u16(0), u16(n), u16(n), u32(cdSize), u32(off), u16(0)));
        return new Blob(parts.concat(central, [end]));
      }
      var BODY1 = '<p>Algorithms decide what we read and what we buy every day.</p><p>They shape our choices and nobody explains how they work.</p>';
      var epub = await zipOf({
        'mimetype': 'application/epub+zip',
        'META-INF/container.xml': '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
        'OEBPS/content.opf': '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Mini Book</dc:title></metadata><manifest><item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>',
        'OEBPS/text/ch1.xhtml': '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter One</h1>' + BODY1 + '</body></html>',
        'OEBPS/text/ch2.xhtml': '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter Two</h1><blockquote><p>The people who build these systems are rarely asked to explain them.</p></blockquote></body></html>'
      });
      await D().importFile(new File([epub], 'mini.epub', { type: 'application/epub+zip' }));
      await until(function () { return D().doc && D().doc.title === 'Mini Book'; }, 30000);
      var ed = D().doc;
      ok('F1 EPUB importado com o título do livro', !!ed && ed.title === 'Mini Book' && ed.lang === 'en', ed && ed.title);
      ok('F2 capítulos viram títulos e o texto vira parágrafos', !!ed && ed.paras.filter(function (p) { return p.t === 'h'; }).length === 2 && ed.paras.some(function (p) { return /Algorithms decide/.test(p.s[0]); }), ed && ed.paras.map(function (p) { return p.t; }).join(''));
      ok('F3 bloco aninhado não duplica o texto', ed && ed.paras.filter(function (p) { return /rarely asked/.test(p.s.join(' ')); }).length === 1);
      ok('F4 EPUB ganha páginas estimadas para a barra inferior', ed && ed.pages >= 1 && ed.paras.every(function (p) { return p.pg >= 1; }), ed && ed.pages + ' pág');
      D().$('lb-back').click(); await wait(300);
      // texto colado pela interface
      var d2 = idoc();
      d2.getElementById('lb-paste-open').click();
      d2.querySelector('.lb-paste-form input').value = 'Meu artigo';
      d2.querySelector('.lb-paste-form textarea').value = TEXT;
      d2.getElementById('lb-paste-add').click();
      await until(function () { return D().doc && D().doc.title === 'Meu artigo'; }, 30000);
      ok('F5 texto colado vira documento com o título dado', !!D().doc && D().doc.title === 'Meu artigo' && D().doc.paras.length >= 2, D().doc && D().doc.title);
      ok('F6 o seletor de arquivo aceita EPUB', /epub/.test(d2.getElementById('lb-file').accept), d2.getElementById('lb-file').accept);

      // ===================== G. voz neural local (biblioteca simulada) =====================
      D().$('lb-back').click(); await wait(400);
      function wavBlob(ms) { var n = 8 * ms, b = new ArrayBuffer(44 + n * 2), v = new DataView(b); function s(o, t2) { for (var i = 0; i < t2.length; i++) v.setUint8(o + i, t2.charCodeAt(i)); } s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true); return new Blob([b], { type: 'audio/wav' }); }
      var nPred = 0, predMode = 'ok', downloaded = [];
      w.DD_NEURAL_FACTORY = function () { return {
        remove: async function () {}, stored: async function () { return []; },
        TtsSession: { create: async function (o) { downloaded.push(o.voiceId); if (o.progress) { o.progress({ loaded: 1, total: 2 }); o.progress({ loaded: 2, total: 2 }); } return { predict: async function () { nPred++; if (predMode === 'fail') throw new Error('falha simulada'); return wavBlob(400); } }; } }
      }; };
      var NV = idoc().getElementById('lb-neural');
      ok('G1 painel da voz neural lista português e inglês, desligada por padrão', !!NV && NV.querySelectorAll('.lb-eng-row').length === 2 && /Not downloaded|Não baixada/.test(NV.textContent) && !W().__ddVoz.active('en'), NV && NV.textContent.slice(0, 80));
      var rows = NV.querySelectorAll('.lb-eng-row');
      rows[1].querySelector('.lb-primary').click();   // inglês: baixar e ativar
      await until(function () { return W().__ddVoz.active('en'); }, 8000);
      ok('G2 baixar e ativar liga a voz neural do inglês', W().__ddVoz.active('en') && downloaded[0] === 'en_US-lessac-medium' && !W().__ddVoz.active('pt'), downloaded.join(','));
      ok('G3 painel mostra "ativa"', /Active|On|Ativa/.test(idoc().getElementById('lb-neural').textContent) && /★/.test(idoc().getElementById('lb-neural').textContent));
      // narração com voz neural
      await D().addText('Voz', 'Algorithms decide what we read. They shape our choices every day. Nobody explains how they work. Few people ask.');
      await until(function () { return D().doc && D().doc.title === 'Voz'; }, 20000);
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      spoken.length = 0; nPred = 0;
      post({ type: 'tts-toggle' });
      await until(function () { return D().tts.playing && nPred >= 2; }, 8000);
      ok('G4 a narração usa a voz neural (e não a do navegador)', D().tts.playing && nPred >= 1 && spoken.length === 0, 'predições=' + nPred + ' navegador=' + spoken.length);
      ok('G5 prepara as próximas frases enquanto toca', nPred >= 2, 'predições=' + nPred);
      var wnow = await until(function () { return idoc().querySelector('.lb-s.seg .wd.now'); }, 6000);
      ok('G6 a palavra marcada acompanha o áudio neural', wnow, wnow ? 'ok' : 'sem palavra marcada');
      var cs0 = D().tts.cursor.s;
      W().__ddVoz.cur.a.dispatchEvent(new Event('ended'));   // (o relógio virtual não termina o áudio de verdade)
      var adv = await until(function () { return D().tts.cursor && D().tts.cursor.s > cs0; }, 6000);
      ok('G7 ao terminar uma frase segue para a próxima', adv, cs0 + ' → ' + JSON.stringify(D().tts.cursor));
      post({ type: 'tts-toggle' }); await wait(400);
      ok('G8 parar interrompe o áudio', D().tts.playing === false);
      // palavra avulsa
      var n1 = nPred;
      D().say('algorithms', 'en');
      await wait(500);
      ok('G9 palavra avulsa (cartão) também usa a voz neural', nPred > n1, 'predições ' + n1 + ' → ' + nPred);
      D().stopTts && D().stopTts(); W().DDLab.neural.stop();
      // queda para a voz do navegador
      predMode = 'fail'; spoken.length = 0;
      await D().addText('Falha', 'Machines translate every sentence quickly. Nobody notices the small mistakes.');
      await until(function () { return D().doc && D().doc.title === 'Falha'; }, 20000);
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      post({ type: 'tts-toggle' });
      await until(function () { return spoken.length >= 1; }, 8000);
      ok('G10 se a voz neural falhar, cai para a voz do navegador sem travar', spoken.length >= 1 && !W().__ddVoz.active('en'), 'navegador=' + spoken.length);
      post({ type: 'tts-toggle' }); await wait(300);
      predMode = 'ok';
      // remover
      D().$('lb-back').click(); await wait(500);
      idoc().querySelectorAll('#lb-neural .lb-eng-row')[1].querySelectorAll('.lb-btn')[1].click();   // Remover
      await until(function () { return !W().__ddVoz.prefs().ready['en_US-lessac-medium']; }, 5000);
      ok('G11 remover apaga a voz baixada', !W().__ddVoz.prefs().ready['en_US-lessac-medium'] && !W().__ddVoz.active('en'));
      // ===================== H. destaque de palavras incomuns =====================
      D().$('lb-back').click(); await wait(300);
      await D().addText('Destaque', 'Surveillance capitalism harvests behavioural surplus. Then Maria reads every day. People believe the machine.');
      await until(function () { return D().doc && D().doc.title === 'Destaque'; }, 20000);
      post({ type: 'readlang', value: 'en' }); await wait(400);
      var hb = idoc().getElementById('lb-highlight');
      var HL = function () { var h = idoc().defaultView.CSS.highlights.get('dd-incomum'); return h ? Array.from(h).map(function (r) { return r.toString(); }) : []; };
      ok('H1 botão Destacar existe e começa desligado', !!hb && hb.getAttribute('aria-pressed') === 'false' && HL().length === 0);
      hb.click(); await wait(400);
      var hw = HL();
      ok('H2 ligar destaca palavras incomuns', hw.indexOf('capitalism') >= 0 && hw.indexOf('surplus') >= 0, hw.join(','));
      ok('H3 palavra comum e nome próprio no meio da frase não são destacados', hw.indexOf('every') < 0 && hw.indexOf('People') < 0 && hw.indexOf('Maria') < 0 && hw.indexOf('believe') < 0, hw.join(','));
      post({ type: 'readlang', value: 'pt' }); await wait(600);
      ok('H4 lendo em português não destaca nada', HL().length === 0);
      post({ type: 'readlang', value: 'en' }); await wait(500);
      ok('H5 voltando ao inglês o destaque volta', HL().indexOf('capitalism') >= 0);
      hb.click(); await wait(300);
      ok('H6 desligar limpa o destaque', HL().length === 0 && hb.getAttribute('aria-pressed') === 'false');
      // ===================== I. configurações separadas da experiência de leitura =====================
      var st = idoc().getElementById('lb-study');
      ok('I1 controles de estudo ficam num grupo próprio', !!st && !!st.querySelector('#lb-translate-all') && !!st.querySelector('#lb-mode') && !!st.querySelector('#lb-highlight'), st && st.children.length + ' itens');
      ok('I2 voltar e status ficam fora do grupo de estudo', !!idoc().getElementById('lb-back') && !st.contains(idoc().getElementById('lb-back')) && !st.contains(idoc().getElementById('lb-status')));
      ok('I3 grupo de estudo tem rótulo acessível', !!st.getAttribute('aria-label') && idoc().getElementById('lb-study-label').textContent.length > 0, st.getAttribute('aria-label'));
      var topd = W().parent.document;
      ok('I4 voz da narração fica no painel Voz, não no Aa', !!topd.querySelector('#voz-panel #voice-pt') && !!topd.querySelector('#voz-panel #voice-en') && !topd.querySelector('#aa-panel #voice-pt'));
      topd.getElementById('btn-voz').click(); await wait(100);
      ok('I5 botão Voz abre só o painel de voz', topd.getElementById('voz-panel').classList.contains('open') && !topd.getElementById('aa-panel').classList.contains('open') && topd.getElementById('btn-voz').getAttribute('aria-expanded') === 'true');
      topd.getElementById('btn-aa').click(); await wait(100);
      ok('I6 abrir Aa fecha o painel de voz', topd.getElementById('aa-panel').classList.contains('open') && !topd.getElementById('voz-panel').classList.contains('open') && topd.getElementById('btn-voz').getAttribute('aria-expanded') === 'false');
      topd.getElementById('btn-aa').click();
      // ===================== J. legenda sincronizada com a narração =====================
      D().$('lb-back').click(); await wait(300);
      await D().addText('Legenda', 'Algorithms decide what we read. They shape our behavioural surplus every day. Nobody explains how they work. Few people ask.');
      await until(function () { return D().doc && D().doc.title === 'Legenda'; }, 20000);
      post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'en' }); await wait(500);
      var oldSpeak = w.speechSynthesis.speak;
      w.speechSynthesis.speak = function (u) { w.__cur = u; u.onstart && u.onstart(); setTimeout(function () { if (w.__cur === u) { w.__cur = null; u.onend && u.onend(); } }, 6000); };   // frase longa: deixa a legenda parada para conferir
      var jP0 = D().doc.paras[0].s;
      var jlb = idoc().getElementById('lb-legend-btn'), jdk = idoc().getElementById('lb-legenda');
      var jLM = function () { return idoc().getElementById('lb-leg-main').textContent; };
      var jLS = function () { return idoc().getElementById('lb-leg-sub').textContent; };
      ok('J1 botão Legenda fica no grupo Estudo e a faixa começa fechada', !!jlb && !!idoc().getElementById('lb-study').contains(jlb) && jlb.getAttribute('aria-pressed') === 'false' && jdk.hidden === true);
      jlb.click(); await wait(500);
      ok('J2 ligar abre a faixa com a frase da posição atual', jdk.hidden === false && jLM() === jP0[0], jLM());
      var gotSub = await until(function () { return /^\[pt\] /.test(jLS()); }, 4000);
      ok('J3 a tradução aparece na linha de baixo', gotSub, jLS());
      ok('J4 a próxima frase aparece esmaecida e não há anterior na primeira', idoc().querySelector('.lg-next').textContent.indexOf(jP0[1].slice(0, 20)) === 0 && idoc().querySelector('.lg-prev').hidden === true);
      idoc().querySelectorAll('.lg-bar .lg-b')[2].click();            // ⏭
      var movedNext = await until(function () { return jLM() === jP0[1]; }, 3000);
      ok('J5 próxima frase leva a legenda e a narração para a frase 2', movedNext && D().tts.playing === true && D().tts.mark && D().tts.mark.s === 1, jLM());
      ok('J6 a frase anterior passa a aparecer', idoc().querySelector('.lg-prev').hidden === false && idoc().querySelector('.lg-prev').textContent.indexOf(jP0[0].slice(0, 20)) === 0);
      D().emit('wordpos', { ci: 0, len: 5, text: jP0[1] });
      var jnowW = idoc().querySelector('.lg-w.now');
      ok('J7 a palavra falada fica marcada', !!jnowW && jnowW.textContent === 'They', jnowW && jnowW.textContent);
      D().emit('wordpos', { ci: jP0[1].indexOf(' ') + 1, len: 5, text: jP0[1] });
      jnowW = idoc().querySelector('.lg-w.now');
      ok('J8 a marca anda para a palavra seguinte', !!jnowW && jnowW.textContent === 'shape' && idoc().querySelectorAll('.lg-w.now').length === 1, jnowW && jnowW.textContent);
      var jpb = idoc().querySelector('.lg-play');
      jpb.click(); await wait(200);
      ok('J9 pausar para a narração e mostra ▶', D().tts.playing === false && jpb.textContent === String.fromCharCode(0x25b6), jpb.textContent);
      jpb.click(); await wait(200);
      ok('J10 ler retoma a partir da frase mostrada', D().tts.playing === true && D().tts.mark && D().tts.mark.s === 1 && jpb.textContent === String.fromCharCode(0x275a, 0x275a), jpb.textContent);
      D().stopTts();
      var fs0 = parseFloat(idoc().defaultView.getComputedStyle(idoc().getElementById('lb-leg-main')).fontSize);
      idoc().querySelectorAll('.lg-bar .lg-b')[6].click(); await wait(100);      // A+
      var fs1 = parseFloat(idoc().defaultView.getComputedStyle(idoc().getElementById('lb-leg-main')).fontSize);
      ok('J11 A+ aumenta a letra da legenda', fs1 > fs0, fs0 + ' -> ' + fs1);
      clickAt(idoc().querySelector('.lg-w'), 0.5);
      var popOk = await until(function () { return idoc().querySelector('.lb-pop'); }, 3000);
      ok('J12 tocar numa palavra da legenda abre o cartão da palavra', popOk && /^They$/i.test(idoc().querySelector('.lb-pop-word').textContent) && !!idoc().querySelector('.lb-pop-ctx'), popOk && idoc().querySelector('.lb-pop-word').textContent);
      idoc().querySelector('.lb-pop .lb-btn:last-child').click();
      var jhlBtn = idoc().getElementById('lb-highlight'); if (jhlBtn.getAttribute('aria-pressed') !== 'true') jhlBtn.click(); await wait(500);
      var jhlr = idoc().defaultView.CSS.highlights.get('dd-incomum'), jinLeg = false;
      if (jhlr) Array.from(jhlr).forEach(function (r) { if (idoc().getElementById('lb-leg-main').contains(r.startContainer)) jinLeg = true; });
      ok('J13 destacar incomuns também marca palavras na legenda', jinLeg, 'texto=' + jLM() + ' ranges=' + (jhlr ? jhlr.size : 0) + ' lang=' + idoc().getElementById('lb-leg-main').dataset.lang);
      jhlBtn.click();
      idoc().querySelector('.lg-off').click(); await wait(200);
      ok('J14 fechar a legenda esconde a faixa e solta o botão', jdk.hidden === true && jlb.getAttribute('aria-pressed') === 'false');
      jlb.click(); await wait(400);
      topd.defaultView.setOption('readLang', 'pt'); topd.defaultView.setOption('audioLang', 'en'); await wait(200);   // a barra principal guarda as opções
      idoc().querySelector('.lg-swap').click();
      var swapped =await until(function () { return D().state.readLang === 'en' && D().state.audioLang === 'pt'; }, 3000);
      ok('J15 inverter troca o idioma do texto e o da legenda/áudio', swapped, D().state.readLang + '/' + D().state.audioLang);
      idoc().querySelector('.lg-swap').click();
      var swapped2 = await until(function () { return D().state.readLang === 'pt' && D().state.audioLang === 'en'; }, 3000);
      ok('J16 inverter de novo volta ao original', swapped2, D().state.readLang + '/' + D().state.audioLang);
      var t0s = Date.now(); var sq = await D().trSentence(0, 3);
      ok('J17 traduz uma frase isolada sem esperar o parágrafo', typeof sq === 'string' && sq.length > 0 && Date.now() - t0s < 1500, String(sq));
      idoc().querySelector('.lg-off').click(); await wait(200);
      w.speechSynthesis.speak = oldSpeak;
      // ===================== L. livro da semana =====================
      post({ type: 'readlang', value: 'pt' }); await wait(300);
      var lbk = function (k) { return 'Surveillance capitalism harvests behavioural surplus from ordinary people every single day, and platforms predict what citizens will do tomorrow morning. Nobody explains how these hidden systems really work, so people rarely notice this quiet economic exchange number ' + k + '.'; };
      await D().addText('Livro da semana teste', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(lbk).join('\n\n'));
      await until(function () { return D().doc && D().doc.title === 'Livro da semana teste'; }, 20000);
      var lid = D().doc.id; W().localStorage.removeItem('dd-ingles-semana');
      D().$('lb-back').click(); await wait(300); await W().__ddWeek.render();
      await until(function () { return idoc().getElementById('lb-week-src'); }, 5000);
      ok('L1 livro da semana: oferece os livros em inglês da biblioteca e o botão de começar', !!idoc().getElementById('lb-week') && !!idoc().getElementById('lb-week-start') && Array.prototype.some.call(idoc().querySelectorAll('#lb-week-src option'), function (o) { return o.textContent === 'Livro da semana teste'; }) && /7 dias/.test(idoc().getElementById('lb-week').textContent));
      idoc().getElementById('lb-week-src').value = lid; idoc().getElementById('lb-week-start').click();
      await until(function () { return idoc().getElementById('lb-week-title'); }, 5000);
      var winfo = await W().__ddWeek.bookInfo(lid);
      var quotaTxt = idoc().getElementById('lb-week-quota').textContent;
      ok('L2 começar a semana (ainda sem ler): título, dia 1 de 7, progresso zerado, cota = livro dividido em 7 e ritmo em dia (não atrasado)', idoc().getElementById('lb-week-title').textContent === 'Livro da semana teste' && /Dia 1 de 7/.test(idoc().getElementById('lb-week-day').textContent) && /\(0%\)/.test(idoc().getElementById('lb-week-prog').textContent) && quotaTxt.indexOf(String(Math.ceil(winfo.words / 7)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')) >= 0 && /No ritmo/.test(idoc().getElementById('lb-week-pace').textContent), quotaTxt + ' | ' + idoc().getElementById('lb-week-pace').textContent);
      ok('L3 o plano fica guardado no navegador e as palavras difíceis aparecem para ver antes de ler', JSON.parse(W().localStorage.getItem('dd-ingles-semana')).docId === lid && !!idoc().getElementById('lb-week-hard') && idoc().querySelectorAll('.lb-week-chip').length >= 3 && Array.prototype.some.call(idoc().querySelectorAll('.lb-week-chip'), function (c) { return c.textContent === 'surveillance'; }) && !Array.prototype.some.call(idoc().querySelectorAll('.lb-week-chip'), function (c) { return /['’]/.test(c.textContent) || c.textContent.length < 6; }), idoc().querySelectorAll('.lb-week-chip').length + ' palavras');
      var wm = await D().db.get('meta', lid); wm.pos = 7; await D().db.put('meta', wm); await W().__ddWeek.render();
      ok('L4 ler metade do livro: progresso sobe para ~50% e a cota de hoje fica cumprida', /\((4[5-9]|5[0-5])%\)/.test(idoc().getElementById('lb-week-prog').textContent) && /cumprida/.test(idoc().getElementById('lb-week-today').textContent) && /Adiantado/.test(idoc().getElementById('lb-week-pace').textContent), idoc().getElementById('lb-week-prog').textContent + ' | ' + idoc().getElementById('lb-week-pace').textContent);
      var wp = W().__ddWeek.load(); wp.start = W().__ddWeek.dayKey(new Date(Date.now() - 3 * 86400000)); wp.snap = null; wp.startWords = 0; W().__ddWeek.store(wp);
      wm.pos = 1; await D().db.put('meta', wm); await W().__ddWeek.render();
      ok('L5 no dia 4 com pouca leitura: mostra atraso e a cota sobe para o que falta dividido pelos dias que restam', /Dia 4 de 7/.test(idoc().getElementById('lb-week-day').textContent) && /Atrasado/.test(idoc().getElementById('lb-week-pace').textContent) && /Faltam/.test(idoc().getElementById('lb-week-today').textContent), idoc().getElementById('lb-week-quota').textContent);
      wm.pos = winfo.n - 1; await D().db.put('meta', wm); await W().__ddWeek.render();
      ok('L6 chegar ao fim do livro mostra livro concluído e a escolha do próximo', !!idoc().getElementById('lb-week-fin') && /(100%)/.test(idoc().getElementById('lb-week-prog').textContent) && !idoc().getElementById('lb-week-open'));
      var nxt = idoc().getElementById('lb-close-other');
      nxt.click(); await until(function () { return idoc().getElementById('lb-week-src'); }, 5000);
      ok('L7 escolher o próximo livro apaga o plano e volta à seleção', W().localStorage.getItem('dd-ingles-semana') === null && !!idoc().getElementById('lb-week-start'));
      var nbook = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lbk).join('\n\n') + '\n\nNotes\n\n' + [1, 2, 3, 4, 5].map(function (k) { return k + '. A long footnote about the sources of the passage, with the references and the editorial comments that nobody reads as part of the book itself number ' + k + '.'; }).join('\n\n');
      await D().addText('Livro com notas teste', nbook);
      await until(function () { return D().doc && D().doc.title === 'Livro com notas teste'; }, 20000);
      var nid = D().doc.id, ndoc = await D().db.get('docs', nid), ninfo = await W().__ddWeek.bookInfo(nid);
      var allWords = ndoc.paras.reduce(function (a, p) { return a + p.s.join(' ').split(/\s+/).length; }, 0);
      ok('L8 as notas de rodapé no fim do livro não entram no total nem na cota', ninfo.n === 10 && ninfo.words < allWords && ninfo.words === ninfo.cum[10] && ndoc.paras.length >= 15, ninfo.n + ' parágrafos de corpo de ' + ndoc.paras.length + ' | ' + ninfo.words + ' de ' + allWords + ' palavras');
      D().$('lb-back').click(); await wait(200);      // ----- roteiro de 8 semanas (livros de domínio público em assets/livros/) -----
      W().localStorage.removeItem('dd-ingles-semana'); W().localStorage.removeItem('dd-ingles-semana-hist');
      await W().__ddWeek.render(); await until(function () { return idoc().getElementById('lb-rot-2'); }, 5000);
      var rrows = idoc().querySelectorAll('#lb-rot .lb-rot-item');
      ok('L9 roteiro: 8 semanas com autor, título e tamanho, e um botão para começar cada uma', rrows.length === 8 && /Semana 1 · Sêneca — Sobre a Brevidade da Vida/.test(rrows[0].textContent) && /Semana 8 · Stevenson/.test(rrows[7].textContent) && /mil palavras/.test(rrows[0].textContent) && idoc().querySelectorAll('#lb-rot button').length === 8);
      var slugs = ['seneca-brevidade-da-vida', 'epicteto-enchiridion', 'seneca-paz-de-espirito', 'platao-apologia', 'thoreau-desobediencia-civil', 'emerson-self-reliance', 'tolstoi-confissao', 'stevenson-jekyll-hyde'], rbad = [];
      for (var si = 0; si < slugs.length; si++) {
        var rtxt = await new Promise(function (res, rej) { var xr = new (W().XMLHttpRequest)(); xr.open('GET', 'assets/livros/' + slugs[si] + '.txt'); xr.onload = function () { res(xr.responseText); }; xr.onerror = function () { rej('erro'); }; xr.send(); }).catch(function () { return ''; });
        var rw = rtxt.split(/\s+/).filter(Boolean).length, rthe = (rtxt.match(/\bthe\b/gi) || []).length;
        if (rw < 6000 || rw > 30000 || rthe < 150 || /Standard Ebooks|Project Gutenberg/i.test(rtxt)) rbad.push(slugs[si] + ':' + rw + '/' + rthe);
      }
      ok('L9b os 8 arquivos do roteiro existem, são texto em inglês, cabem em 50 min por dia (até 30 mil palavras) e não trazem cabeçalho de edição', rbad.length === 0, rbad.join(' | '));
      idoc().getElementById('lb-rot-2').click();
      await until(function () { return idoc().getElementById('lb-week-title'); }, 40000);
      var rm = (await D().db.all('meta')).filter(function (m) { return m.x && m.x.roteiro === 'epicteto-enchiridion'; })[0];
      var rinfo = rm ? await W().__ddWeek.bookInfo(rm.id) : null;
      ok('L10 começar a semana 2 traz o livro de domínio público para a biblioteca e inicia o plano', !!rm && rm.title === 'Epictetus — The Enchiridion' && rm.lang === 'en' && idoc().getElementById('lb-week-title').textContent === 'Epictetus — The Enchiridion' && JSON.parse(W().localStorage.getItem('dd-ingles-semana')).slug === 'epicteto-enchiridion' && !!rinfo && rinfo.words > 7500 && rinfo.words < 9000 && /Dia 1 de 7/.test(idoc().getElementById('lb-week-day').textContent), rinfo && (rinfo.words + ' palavras'));
      ok('L11 durante o plano o roteiro fica recolhido e marca a semana atual como em andamento, sem botões de começar outra', !!idoc().querySelector('details#lb-rot') && /em andamento/.test(idoc().querySelector('.lb-rot-item[data-slug="epicteto-enchiridion"]').textContent) && idoc().querySelectorAll('#lb-rot button').length === 0);
      rm.pos = rinfo.n - 1; await D().db.put('meta', rm); await W().__ddWeek.render();
      var rh = JSON.parse(W().localStorage.getItem('dd-ingles-semana-hist') || '[]');
      ok('L12 terminar o livro registra no histórico uma única vez, mesmo renderizando de novo', rh.length === 1 && rh[0].slug === 'epicteto-enchiridion' && !!idoc().getElementById('lb-week-fin'), JSON.stringify(rh));
      await W().__ddWeek.render();
      ok('L12b renderizar de novo não duplica o registro', JSON.parse(W().localStorage.getItem('dd-ingles-semana-hist')).length === 1);
      idoc().getElementById('lb-close-other').click();
      await until(function () { return idoc().getElementById('lb-rot-1'); }, 5000);
      ok('L13 depois de ler, a semana 2 aparece como lida e as outras 7 continuam disponíveis', /lido/.test(idoc().querySelector('.lb-rot-item[data-slug="epicteto-enchiridion"] .lb-rot-done').textContent) && !idoc().getElementById('lb-rot-2') && idoc().querySelectorAll('#lb-rot button.lb-primary').length === 7 && !!idoc().getElementById('lb-rot-open-2') && !!idoc().getElementById('lb-rot-again-2'));
      idoc().getElementById('lb-rot-again-2').click();
      await until(function () { var p = W().__ddWeek.load(); return p && p.slug === 'epicteto-enchiridion'; }, 5000);

      await until(function () { return idoc().getElementById('lb-week-open'); }, 5000);
      ok('L14 livro concluído pode ser relido: nova semana começa do início e o histórico da anterior fica', !!idoc().getElementById('lb-week-open') && !idoc().getElementById('lb-week-fin') && /\b0 de /.test(idoc().getElementById('lb-week-prog').textContent) && JSON.parse(W().localStorage.getItem('dd-ingles-semana-hist')).length === 1, idoc().getElementById('lb-week-prog') && idoc().getElementById('lb-week-prog').textContent);      W().localStorage.removeItem('dd-ingles-semana'); W().localStorage.removeItem('dd-ingles-semana-hist');      // ===================== M. modos de leitura (seletor único) e cabeçalho do leitor =====================
      post({ type: 'readlang', value: 'pt' }); await wait(200);
      W().localStorage.removeItem('dd-ingles-modo');
      var sbook = [1, 2, 3, 4, 5, 6].map(function (k) { return 'Of things some are in our power, and others are not, so we must learn to tell them apart number ' + k + '. Nobody can compel you unless you let that happen to you.'; }).join('\n\n');
      await D().addText('Modos de leitura teste', sbook);
      await until(function () { return D().doc && D().doc.title === 'Modos de leitura teste'; }, 20000);
      var msel = idoc().getElementById('lb-read-mode');
      ok('M1 um seletor reúne os 4 modos de leitura, começa em coluna única e o corpo não tem classe de modo', !!msel && idoc().querySelector('.lb-toolbar').contains(msel) && Array.prototype.map.call(msel.options, function (o) { return o.value; }).join(',') === 'single,wide,side,focus,tele' && msel.value === 'single' && !/lb-(wide|side|focus)-open/.test(idoc().body.className) && /Coluna única/.test(msel.options[0].textContent));
      var tb = idoc().querySelector('.lb-toolbar').getBoundingClientRect(), bk = idoc().getElementById('lb-back').getBoundingClientRect(), md = idoc().getElementById('lb-readmode').getBoundingClientRect(), stu = idoc().getElementById('lb-study').getBoundingClientRect();
      ok('M2 cabeçalho simétrico: voltar encosta na esquerda, o modo na direita e a barra de estudo ocupa a largura toda', Math.abs(bk.left - tb.left) < 3 && Math.abs(md.right - tb.right) < 3 && stu.width >= tb.width - 3 && Math.abs(stu.left - tb.left) < 3, 'toolbar ' + Math.round(tb.width) + 'px | estudo ' + Math.round(stu.width) + 'px');
      var w1 = idoc().body.getBoundingClientRect().width;
      msel.value = 'wide'; msel.dispatchEvent(new Event('change')); await wait(150);
      var w2 = idoc().body.getBoundingClientRect().width;
      ok('M3 coluna larga: o cartão de leitura fica mais largo e a escolha é guardada', idoc().body.classList.contains('lb-wide-open') && (idoc().documentElement.clientWidth < 1200 ? w2 >= w1 : w2 > w1 + 40) && w2 <= idoc().documentElement.clientWidth && W().localStorage.getItem('dd-ingles-modo') === 'wide', Math.round(w1) + ' px -> ' + Math.round(w2) + ' px');
      msel.value = 'side'; msel.dispatchEvent(new Event('change'));
      await until(function () { return idoc().querySelectorAll('.lb-col-tr:not(.pending)').length >= 2; }, 15000);
      var s1 = idoc().querySelector('.lb-para:not(.lb-head)');
      ok('M4 lado a lado: original à esquerda com frases clicáveis, tradução à direita e rótulos das colunas', idoc().body.classList.contains('lb-side-open') && !idoc().body.classList.contains('lb-wide-open') && !!s1.querySelector('.lb-col-src .lb-s[data-k="0"]') && /Of things some/.test(s1.querySelector('.lb-col-src').textContent) && /^\[pt\]/.test(idoc().querySelector('.lb-col-tr:not(.pending)').textContent) && /INGLÊS/.test(idoc().getElementById('lb-side-head').textContent) && /PORTUGUÊS/.test(idoc().getElementById('lb-side-head').textContent), idoc().querySelectorAll('.lb-col-tr:not(.pending)').length + ' parágrafos traduzidos');
      ok('M5 as duas colunas ficam lado a lado, na mesma altura', idoc().querySelector('.lb-col-src').getBoundingClientRect().left < idoc().querySelector('.lb-col-tr').getBoundingClientRect().left && Math.abs(idoc().querySelector('.lb-col-src').getBoundingClientRect().top - idoc().querySelector('.lb-col-tr').getBoundingClientRect().top) < 4);
      D().$('lb-back').click(); await wait(200);
      ok('M6 voltar à biblioteca devolve a largura normal e reabrir o livro mantém o modo escolhido', !/lb-(wide|side|focus)-open/.test(idoc().body.className));
      await D().openDoc((await D().db.all('meta')).filter(function (m) { return m.title === 'Modos de leitura teste'; })[0].id);
      await until(function () { return D().doc && idoc().querySelectorAll('.lb-col-src').length >= 2; }, 8000);
      ok('M7 reabrir mantém lado a lado e o seletor mostra o modo', idoc().body.classList.contains('lb-side-open') && idoc().getElementById('lb-read-mode').value === 'side');
      var mid = D().doc.id; W().__ddWeek.store({ docId: mid, title: 'Modos de leitura teste', start: W().__ddWeek.dayKey(), startWords: 0 });
      msel = idoc().getElementById('lb-read-mode'); msel.value = 'focus'; msel.dispatchEvent(new Event('change'));
      await until(function () { return idoc().querySelectorAll('#lb-focus-panel section').length === 4; }, 40000);
      var fp = idoc().getElementById('lb-focus-panel');
      ok('M8 foco com painel: menu do site recolhido, texto em coluna única e painel ao lado com hoje, livro e palavras', idoc().body.classList.contains('lb-focus-open') && document.getElementById('sidebar').classList.contains('collapsed') && idoc().querySelectorAll('.lb-col').length === 0 && fp.getBoundingClientRect().left > idoc().getElementById('lb-wrap').getBoundingClientRect().right - 2 && /HOJE/.test(fp.textContent) && /Cota de hoje: \d+ palavras/.test(fp.textContent) && /PROGRESSO/.test(fp.textContent) && /AGORA/.test(fp.textContent) && /PALAVRAS SALVAS/.test(fp.textContent), 'foco=' + idoc().body.classList.contains('lb-focus-open') + ' menu=' + document.getElementById('sidebar').classList.contains('collapsed') + ' cols=' + idoc().querySelectorAll('.lb-col').length + ' painelLeft=' + Math.round(fp.getBoundingClientRect().left) + ' wrapRight=' + Math.round(idoc().getElementById('lb-wrap').getBoundingClientRect().right) + ' iframeW=' + idoc().documentElement.clientWidth);
      msel.value = 'single'; msel.dispatchEvent(new Event('change')); await wait(300);
      ok('M9 sair do modo foco reabre o menu do site e esconde o painel', !document.getElementById('sidebar').classList.contains('collapsed') && !/lb-focus-open/.test(idoc().body.className) && idoc().getElementById('lb-focus-panel').getBoundingClientRect().width === 0);
      W().localStorage.removeItem('dd-ingles-semana'); W().localStorage.removeItem('dd-ingles-modo');
      D().$('lb-back').click(); await wait(200);      // ===================== N. gravar a leitura ao fechar a aba e zerar estatísticas =====================
      var nbook = Array.apply(null, Array(60)).map(function (_, k) { return 'Paragraph ' + (k + 1) + ': of things some are in our power, and others are not, so we must learn to tell them apart and to act only on what truly depends on us, every single day of our short lives, without complaint.'; }).join('\n\n');
      await D().addText('Salvar leitura teste', nbook);
      await until(function () { return D().doc && D().doc.title === 'Salvar leitura teste'; }, 20000);
      var nid2 = D().doc.id; await wait(1200);   // deixa os eventos da abertura terminarem
      var npos = 4; D().doc.pos = npos; D().doc.heard = 120;   // (no teste com tempo virtual a rolagem por código não gera evento; o teste de ponta a ponta, tools/test_autosave.ps1, rola de verdade)
      Object.defineProperty(W().document, 'visibilityState', { get: function () { return 'hidden'; }, configurable: true });
      W().document.dispatchEvent(new (W().Event)('visibilitychange'));
      Object.defineProperty(W().document, 'visibilityState', { get: function () { return 'visible'; }, configurable: true });
      var mirRaw = W().localStorage.getItem('dd-ingles-sessao'), mir = JSON.parse(mirRaw || 'null');   // lido no mesmo instante da gravação (um evento tardio de rolagem poderia regravar depois)
      await wait(300);
      var mdb = await D().db.get('meta', nid2);
      ok('N1 ao ocultar ou fechar a aba, a posição e as palavras ouvidas são gravadas na hora (espelho síncrono e banco)', !!mir && mir.id === nid2 && mir.pos === npos && mir.heard === 120 && mdb.pos === npos && mdb.heard === 120 && mdb.savedAt > 0, JSON.stringify(mir));
      D().$('lb-back').click(); await wait(250);
      var mold = await D().db.get('meta', nid2); mold.pos = 1; mold.heard = 10; mold.savedAt = 1000; await D().db.put('meta', mold);
      W().localStorage.setItem('dd-ingles-sessao', mirRaw);   // o espelho gravado na hora, intacto, como depois de uma queda
      await D().openDoc(nid2); await until(function () { return D().doc && D().doc.id === nid2; }, 5000);
      ok('N2 se o banco ficou para trás (aba fechada antes de gravar), ao reabrir vale o espelho mais novo', D().doc.pos === npos && D().doc.heard === 120, 'esperado=' + npos + ' pos=' + D().doc.pos + ' ouvidas=' + D().doc.heard);
      D().$('lb-back').click(); await wait(250);
      W().__ddProg.add('sec', 600); W().__ddProg.add('heard', 300); W().__ddProg.render();
      var mh = await D().db.get('meta', nid2); mh.heard = 500; mh.pos = 5; await D().db.put('meta', mh);
      W().localStorage.setItem('dd-ingles-semana-hist', JSON.stringify([{ slug: 'x', days: 3 }]));
      var vBefore = (await D().db.all('vocab')).length, dBefore = (await D().db.all('meta')).length;
      W().__ddProg.render();
      await until(function () { return idoc().getElementById('lb-prog-actions') && !idoc().getElementById('lb-prog-actions').hidden; }, 5000);
      ok('N3 o botão Zerar estatísticas aparece quando há o que zerar', !!idoc().getElementById('lb-prog-reset') && !idoc().getElementById('lb-prog-actions').hidden && /Zerar estatísticas/.test(idoc().getElementById('lb-prog-reset').textContent));
      idoc().getElementById('lb-prog-reset').click();
      ok('N4 pede confirmação explicando o que será zerado e o que fica, e cancelar não apaga nada', !idoc().getElementById('lb-prog-ask').hidden && /posição de leitura/.test(idoc().getElementById('lb-prog-ask').textContent) && Object.keys(W().__ddProg.log.d).length > 0);
      idoc().getElementById('lb-prog-reset-no').click();
      ok('N4b cancelar volta ao botão e mantém as estatísticas', idoc().getElementById('lb-prog-ask').hidden && !idoc().getElementById('lb-prog-reset').hidden && Object.keys(W().__ddProg.log.d).length > 0);
      idoc().getElementById('lb-prog-reset').click(); idoc().getElementById('lb-prog-reset-yes').click();
      var mz = await D().db.get('meta', nid2);
      for (var rt = 0; rt < 60 && mz.heard !== 0; rt++) { await wait(100); mz = await D().db.get('meta', nid2); }   // espera o banco terminar de gravar (o IndexedDB não anda com o tempo virtual)
      await until(function () { return Object.keys(W().__ddProg.log.d).length === 0; }, 5000);
      ok('N5 zerar apaga minutos, palavras ouvidas, contadores dos livros e histórico, e mantém posição, livros e palavras salvas', Object.keys(JSON.parse(W().localStorage.getItem('dd-ingles-log')).d).length === 0 && mz.heard === 0 && mz.pos === 5 && W().localStorage.getItem('dd-ingles-semana-hist') === null && W().localStorage.getItem('dd-ingles-sessao') === null && (await D().db.all('vocab')).length === vBefore && (await D().db.all('meta')).length === dBefore, 'ouvidas=' + mz.heard + ' pos=' + mz.pos);
      ok('N6 depois de zerar o botão some e o painel volta ao convite inicial', idoc().getElementById('lb-prog-actions').hidden && /Comece a ler/.test(idoc().getElementById('lb-prog').textContent));      // ===================== O. sessão do dia (4 blocos a partir do plano da semana) =====================
      post({ type: 'readlang', value: 'pt' }); await wait(200);
      await W().__ddProg.resetAll();
      ['dd-ingles-dia', 'dd-ingles-dia-hist', 'dd-ingles-escrita', 'dd-ingles-semana'].forEach(function (k) { W().localStorage.removeItem(k); });
      var obk = function (k) { return 'Surveillance capitalism harvests behavioural surplus from ordinary people every single day, and platforms predict what citizens will do tomorrow morning. Nobody explains how these hidden systems really work, so people rarely notice this quiet economic exchange number ' + k + '.'; };
      await D().addText('Sessão do dia teste', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(obk).join('\n\n'));
      await until(function () { return D().doc && D().doc.title === 'Sessão do dia teste'; }, 20000);
      var oid = D().doc.id;
      await D().db.put('vocab', { id: 'en:testdue', word: 'testdue', lang: 'en', tr: 'teste', sent: '', doc: 'Sessão do dia teste', added: Date.now(), due: Date.now() - 1000, ivl: 0, ease: 2.5, reps: 0, lapses: 0 });
      D().$('lb-back').click(); await wait(300); await W().__ddDia.render();
      ok('O1 sem plano da semana, a sessão do dia explica que nasce do plano e não mostra blocos', !!idoc().getElementById('lb-sess') && /nasce do plano/.test(idoc().getElementById('lb-sess').textContent) && idoc().querySelectorAll('.lb-sess-row').length === 0);
      W().__ddWeek.store({ docId: oid, title: 'Sessão do dia teste', start: W().__ddWeek.dayKey(), startWords: 0 });
      await W().__ddDia.render();
      var orows = idoc().querySelectorAll('.lb-sess-row');
      ok('O2 com plano: 4 blocos (leitura 25, vocabulário 10, shadowing 8, escrita 7 min = 50) com metas do dia', orows.length === 4 && Array.prototype.map.call(orows, function (r) { return r.dataset.block; }).join(',') === 'read,vocab,shadow,write' && /25 min/.test(orows[0].textContent) && /10 min/.test(orows[1].textContent) && /8 min/.test(orows[2].textContent) && /7 min/.test(orows[3].textContent) && /50 minutos/.test(idoc().getElementById('lb-sess').textContent) && /Cota de hoje: 0 de \d+ palavras/.test(orows[0].textContent) && !!idoc().getElementById('lb-sess-text') && idoc().querySelectorAll('.lb-sess-row.done').length === 0, orows[0].textContent.replace(/\s+/g, ' '));
      var om = await D().db.get('meta', oid); om.pos = 7; await D().db.put('meta', om); await W().__ddDia.render();
      await until(function () { var r = idoc().querySelector('.lb-sess-row[data-block="read"]'); return r && r.classList.contains('done'); }, 8000);   // o painel redesenha de forma assíncrona (era a falha intermitente de textContent nulo)
      ok('O3 ler a cota do dia fecha o bloco de leitura sozinho', !!idoc().querySelector('.lb-sess-row[data-block="read"].done'));
      var odia = JSON.parse(W().localStorage.getItem('dd-ingles-dia')), vt = odia.vocabTarget;
      ok('O4 o bloco de vocabulário usa as palavras que vencem hoje como meta e abre a revisão', vt >= 1 && vt <= 15 && /Revisões: 0 de/.test(idoc().querySelector('.lb-sess-row[data-block="vocab"]').textContent) && !!idoc().querySelector('[data-act="vocab"]') && !idoc().querySelector('.lb-sess-row[data-block="vocab"]').classList.contains('done'), 'meta=' + vt);
      W().__ddProg.add('rev', vt); await W().__ddDia.render();
      ok('O5 cumprir as revisões fecha o bloco de vocabulário', idoc().querySelector('.lb-sess-row[data-block="vocab"]').classList.contains('done'));
      idoc().querySelector('[data-mark="shadow"]').click(); await until(function () { return idoc().querySelector('.lb-sess-row[data-block="shadow"]').classList.contains('done'); }, 15000);
      ok('O6 "Marcar como feito" fecha o shadowing e fica guardado no dia', idoc().querySelector('.lb-sess-row[data-block="shadow"]').classList.contains('done') && JSON.parse(W().localStorage.getItem('dd-ingles-dia')).manual.shadow === true);
      idoc().getElementById('lb-sess-text').value = 'ok'; idoc().getElementById('lb-sess-check').click();
      ok('O7 escrita curta recebe dicas (palavras, vocabulário do livro e objeção) e não é salva', /pelo menos 15 palavras/.test(idoc().getElementById('lb-sess-out').textContent) && /palavra do livro/.test(idoc().getElementById('lb-sess-out').textContent) && /objeção/.test(idoc().getElementById('lb-sess-out').textContent) && JSON.parse(W().localStorage.getItem('dd-ingles-escrita') || '[]').length === 0);
      idoc().getElementById('lb-sess-text').value = 'Surveillance capitalism harvests behavioural surplus from ordinary people every day; however, I disagree that citizens never notice this quiet economic exchange at all.';
      idoc().getElementById('lb-sess-check').click(); await until(function () { return !!idoc().getElementById('lb-sess-fin'); }, 15000);
      var oent = JSON.parse(W().localStorage.getItem('dd-ingles-escrita') || '[]');
      ok('O8 escrita completa é salva, fecha o bloco e aparece em "Seus textos"', oent.length === 1 && oent[0].words >= 15 && oent[0].docId === oid && idoc().querySelector('.lb-sess-row[data-block="write"]').classList.contains('done') && /Seus textos \(1\)/.test(idoc().getElementById('lb-sess-journal').textContent));
      var ohist = JSON.parse(W().localStorage.getItem('dd-ingles-dia-hist') || '[]');
      ok('O9 com os 4 blocos feitos: sessão concluída, dia registrado uma vez e sequência de 1 dia', !!idoc().getElementById('lb-sess-fin') && ohist.length === 1 && ohist[0] === W().__ddDia.dayKey() && /1 dia seguido/.test(idoc().getElementById('lb-sess-streak').textContent));
      await W().__ddDia.render();
      ok('O10 renderizar de novo não duplica o registro do dia', JSON.parse(W().localStorage.getItem('dd-ingles-dia-hist')).length === 1);
      var ody = JSON.parse(W().localStorage.getItem('dd-ingles-dia')); ody.date = '2000-01-01'; ody.manual = { shadow: true, read: true }; W().localStorage.setItem('dd-ingles-dia', JSON.stringify(ody));
      await W().__ddDia.render();
      ok('O11 em um novo dia o estado recomeça (marcas manuais zeradas) e o histórico fica', JSON.parse(W().localStorage.getItem('dd-ingles-dia')).date === W().__ddDia.dayKey() && Object.keys(JSON.parse(W().localStorage.getItem('dd-ingles-dia')).manual).length === 0 && JSON.parse(W().localStorage.getItem('dd-ingles-dia-hist')).length === 1 && !idoc().querySelector('.lb-sess-row[data-block="shadow"]').classList.contains('done'));
      ok('O12 a sequência conta dias seguidos e ignora buracos', W().__ddDia.streak([W().__ddDia.dayKey(), W().__ddDia.dayKey(new Date(Date.now() - 86400000)), W().__ddDia.dayKey(new Date(Date.now() - 3 * 86400000))]) === 2 && W().__ddDia.streak([W().__ddDia.dayKey(new Date(Date.now() - 86400000))]) === 1 && W().__ddDia.streak([]) === 0);
      await W().__ddProg.resetAll(); await wait(300);
      ok('O13 Zerar estatísticas apaga as sessões do dia, mas mantém os textos escritos', W().localStorage.getItem('dd-ingles-dia-hist') === null && (W().localStorage.getItem('dd-ingles-dia') === null || (JSON.parse(W().localStorage.getItem('dd-ingles-dia')).written === false && Object.keys(JSON.parse(W().localStorage.getItem('dd-ingles-dia')).manual).length === 0)) && JSON.parse(W().localStorage.getItem('dd-ingles-escrita') || '[]').length === 1);
      ['dd-ingles-dia', 'dd-ingles-dia-hist', 'dd-ingles-escrita', 'dd-ingles-semana'].forEach(function (k) { W().localStorage.removeItem(k); });      // ===================== P. painel do foco ao vivo: atividade, tempos e progresso =====================
      var tx = function (id) { var e = idoc().getElementById(id); return e ? e.textContent : '<<sem ' + id + '>>'; };
      post({ type: 'readlang', value: 'pt' }); await wait(200);
      await W().__ddProg.resetAll();
      var pbk = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (k) { return 'Surveillance capitalism harvests behavioural surplus from ordinary people every single day, and platforms predict what citizens will do tomorrow morning. Nobody explains how these hidden systems really work, so people rarely notice this quiet economic exchange number ' + k + '.'; }).join('\n\n');
      await D().addText('Painel ao vivo teste', pbk);
      await until(function () { return D().doc && D().doc.title === 'Painel ao vivo teste'; }, 20000);
      await wait(700);
      var psel = idoc().getElementById('lb-read-mode'); psel.value = 'focus'; psel.dispatchEvent(new Event('change'));
      await until(function () { return idoc().querySelectorAll('#lb-focus-panel section').length === 4; }, 40000);
      var pfp = idoc().getElementById('lb-focus-panel');
      ok('P1 o painel começa com AGORA (atividade e tempos) e PROGRESSO (palavras, %, sessão e próxima marca) antes de HOJE e das palavras salvas', /^AGORA/.test(pfp.querySelectorAll('section')[0].textContent) && /^PROGRESSO/.test(pfp.querySelectorAll('section')[1].textContent) && /Lendo/.test(pfp.textContent) && /Ouvindo/.test(pfp.textContent) && /Total/.test(pfp.textContent) && /0%/.test(tx('lb-fp-pct')) && /Próxima marca: 10%/.test(tx('lb-fp-next')), tx('lb-fp-next'));
      var pinfo = await W().__ddWeek.bookInfo(D().doc.id), pexp = pinfo.cum[5], ppct = Math.floor(pexp / pinfo.words * 100);
      D().doc.pos = 5; D().emit('progress', { pos: 5 }); await wait(100);
      ok('P2 avançar na leitura soma as palavras e a porcentagem na hora, e mostra as palavras ganhas na sessão', tx('lb-fp-words').indexOf(D().nf().format(pexp)) >= 0 && new RegExp('^' + ppct + '%').test(tx('lb-fp-pct')) && tx('lb-fp-sess').indexOf('+' + D().nf().format(pexp)) === 0 && parseInt(idoc().querySelector('#lb-focus-panel .lb-bar-fill').style.width) === ppct, tx('lb-fp-words') + ' | ' + tx('lb-fp-pct'));
      var pnext = [10, 25, 50, 75, 90, 100].filter(function (m) { return m > ppct; })[0];
      ok('P3 a próxima marca é a primeira acima da porcentagem atual e diz quantas palavras faltam', new RegExp('Próxima marca: ' + pnext + '%').test(tx('lb-fp-next')) && /faltam [\d.]+ palavras/.test(tx('lb-fp-next')), 'pct=' + ppct + ' | ' + tx('lb-fp-next'));
      await until(function () { return /Pausado/.test(tx('lb-fp-act')); }, 120000);   // a atividade de leitura vale por 30 s depois do último movimento na página; espera a condição em vez de um tempo fixo
      ok('P4 sem mexer na página por mais de 30 s nem narração, a atividade é Pausado', /Pausado/.test(tx('lb-fp-act')) && !idoc().getElementById('lb-fp-act').classList.contains('on'), tx('lb-fp-act') + ' | tts.playing=' + D().tts.playing);
      W().dispatchEvent(new (W().Event)('wheel')); await wait(1200);
      ok('P5 mexer na página muda a atividade para Lendo', /^Lendo$/.test(tx('lb-fp-act')) && idoc().getElementById('lb-fp-act').classList.contains('on'), tx('lb-fp-act'));
      D().tts.playing = true; await wait(3500); W().dispatchEvent(new (W().Event)('wheel')); await wait(1100);
      var pl = W().__ddProg.log.d[W().__ddProg.dayKey()] || {};
      ok('P6 lendo e ouvindo ao mesmo tempo mostra os dois, e cada tempo conta separado', /Lendo e ouvindo/.test(tx('lb-fp-act')) && (pl.ls || 0) >= 2 && (pl.rd || 0) >= 3 && /^\d+:\d\d$/.test(pfp.querySelectorAll('.lb-fp-times b')[1].textContent) && pfp.querySelectorAll('.lb-fp-times b')[1].textContent !== '0:00', 'rd=' + pl.rd + ' ls=' + pl.ls + ' | ' + pfp.querySelectorAll('.lb-fp-times b')[1].textContent);
      D().tts.playing = false; await wait(1100);
      D().doc.pos = pinfo.n - 1; D().emit('progress', { pos: pinfo.n - 1 }); await wait(100);
      ok('P7 ao chegar ao fim, 100% e a mensagem de livro concluído', /^100%/.test(tx('lb-fp-pct')) && /Livro concluído/.test(tx('lb-fp-next')));
      D().$('lb-back').click(); await wait(300);
      var pl2 = W().__ddProg.log.d[W().__ddProg.dayKey()] || {};
      ok('P8 os tempos de leitura e escuta ficam no log de estudo e aparecem no painel de progresso da biblioteca', (pl2.rd || 0) >= 3 && (pl2.ls || 0) >= 2 && /lendo \/ ouvindo/.test(idoc().getElementById('lb-prog').textContent), 'rd=' + pl2.rd + ' ls=' + pl2.ls + ' | ' + idoc().getElementById('lb-prog').textContent.replace(/\s+/g, ' ').slice(0, 220));
      psel = idoc().getElementById('lb-read-mode'); psel.value = 'single'; psel.dispatchEvent(new Event('change'));
      await W().__ddProg.resetAll();      // ===================== Q. fechamento da semana =====================
      post({ type: 'readlang', value: 'pt' }); await wait(200);
      await W().__ddProg.resetAll();
      ['dd-ingles-dia', 'dd-ingles-dia-hist', 'dd-ingles-escrita', 'dd-ingles-semana', 'dd-ingles-semana-hist'].forEach(function (k) { W().localStorage.removeItem(k); });
      var qbk = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (k) { return 'Surveillance capitalism harvests behavioural surplus from ordinary people every single day, and platforms predict what citizens will do tomorrow morning. Nobody explains how these hidden systems really work, so people rarely notice this quiet economic exchange number ' + k + '.'; }).join('\n\n');
      await D().addText('Fechamento teste', qbk);
      await until(function () { return D().doc && D().doc.title === 'Fechamento teste'; }, 20000);
      var qid = D().doc.id;
      await D().db.put('vocab', { id: 'en:fechsaved', word: 'fechsaved', lang: 'en', tr: 'teste', sent: '', doc: 'Fechamento teste', added: Date.now(), due: Date.now() + 86400000, ivl: 1, ease: 2.5, reps: 1, lapses: 0 });
      D().$('lb-back').click(); await wait(300);
      var q3 = W().__ddWeek.dayKey(new Date(Date.now() - 2 * 86400000));
      W().__ddWeek.store({ docId: qid, title: 'Fechamento teste', start: q3, startWords: 0 });
      W().__ddProg.add('sec', 3600, W().__ddProg.dayKey()); W().__ddProg.add('rd', 1200, W().__ddProg.dayKey()); W().__ddProg.add('ls', 600, W().__ddProg.dayKey()); W().__ddProg.add('rev', 7, W().__ddProg.dayKey());
      W().localStorage.setItem('dd-ingles-dia-hist', JSON.stringify([W().__ddWeek.dayKey()]));
      var qm = await D().db.get('meta', qid); qm.pos = 9; await D().db.put('meta', qm);
      await W().__ddWeek.render(); await until(function () { return idoc().getElementById('lb-close'); }, 15000);
      var qstats = Array.prototype.map.call(idoc().querySelectorAll('#lb-close .lb-close-stat'), function (c) { return c.textContent; });
      ok('Q1 ao concluir o livro aparece o fechamento da semana com a revisão em 8 números reais', !!idoc().getElementById('lb-week-fin') && qstats.length === 8 && /^3dias de leitura/.test(qstats[0]) && /^60min estudados/.test(qstats[2]) && /^20 \/ 10min lendo/.test(qstats[3]) && /^1palavras salvas/.test(qstats[4]) && /^7revisões/.test(qstats[5]) && /^1sessões do dia/.test(qstats[6]), qstats.join(' | '));
      idoc().getElementById('lb-close-text').value = 'short summary';
      idoc().getElementById('lb-close-text').dispatchEvent(new Event('input'));
      ok('Q2 o contador de palavras acompanha o texto', /2 \/ 150 palavras/.test(idoc().getElementById('lb-close-count').textContent));
      idoc().getElementById('lb-close-save').click();
      ok('Q3 resumo curto recebe dicas (palavras, vocabulário do livro e objeção) e não é salvo', /pelo menos 100 palavras/.test(idoc().getElementById('lb-close-out').textContent) && /palavras do livro/.test(idoc().getElementById('lb-close-out').textContent) && /objeção/.test(idoc().getElementById('lb-close-out').textContent) && !W().__ddWeek.load().closing && JSON.parse(W().localStorage.getItem('dd-ingles-escrita') || '[]').length === 0);
      var qtext = [1, 2, 3, 4, 5].map(function () { return 'Surveillance capitalism harvests behavioural surplus from ordinary people, and platforms predict what citizens will do tomorrow. However, I disagree that nobody notices this quiet economic exchange at all.'; }).join(' ');
      idoc().getElementById('lb-close-text').value = qtext; idoc().getElementById('lb-close-save').click();
      await until(function () { return idoc().getElementById('lb-close-saved'); }, 15000);
      var qh = JSON.parse(W().localStorage.getItem('dd-ingles-semana-hist')), qe = JSON.parse(W().localStorage.getItem('dd-ingles-escrita'));
      ok('Q4 resumo completo é salvo: aparece no fechamento, vai para "Seus textos" e marca o livro como fechado no histórico', /Fechamento salvo \(\d+ palavras\)/.test(idoc().getElementById('lb-close-saved').textContent) && !idoc().getElementById('lb-close-text') && qe.length === 1 && qe[0].kind === 'semana' && qh.length === 1 && qh[0].closed === W().__ddWeek.dayKey() && qh[0].stats.minutes === 60 && qh[0].stats.rev === 7, JSON.stringify(qh[0].stats));
      ok('Q5 sem o livro no roteiro, o próximo sugerido é a semana 1 e há a opção de escolher outro', /semana 1 · Sêneca — Sobre a Brevidade da Vida/.test(idoc().getElementById('lb-close').textContent) && !!idoc().getElementById('lb-close-next') && !!idoc().getElementById('lb-close-other'));
      W().localStorage.setItem('dd-ingles-semana-hist', JSON.stringify(qh.concat([{ slug: 'seneca-brevidade-da-vida', docId: 'x', title: 'x', date: W().__ddWeek.dayKey(), days: 5 }])));
      await W().__ddWeek.render(); await until(function () { return idoc().getElementById('lb-close-next'); }, 15000);
      ok('Q6 o próximo sugerido pula os livros do roteiro já lidos (semana 2 depois da 1)', /semana 2 · Epicteto/.test(idoc().getElementById('lb-close').textContent) && /Começar a semana 2/.test(idoc().getElementById('lb-close-next').textContent));
      idoc().getElementById('lb-close-next').click();
      await until(function () { var p = W().__ddWeek.load(); return p && p.slug === 'epicteto-enchiridion'; }, 40000);
      ok('Q7 começar o próximo livro traz o texto para a biblioteca e abre o plano da semana 2', W().__ddWeek.load().slug === 'epicteto-enchiridion' && W().__ddWeek.load().title === 'Epictetus — The Enchiridion' && !W().__ddWeek.load().closing);
      await W().__ddProg.resetAll(); await wait(300);
      ok('Q8 Zerar estatísticas apaga o histórico das semanas e mantém o texto do fechamento', W().localStorage.getItem('dd-ingles-semana-hist') === null && JSON.parse(W().localStorage.getItem('dd-ingles-escrita') || '[]').filter(function (e) { return e.kind === 'semana'; }).length === 1);
      ['dd-ingles-dia', 'dd-ingles-dia-hist', 'dd-ingles-escrita', 'dd-ingles-semana', 'dd-ingles-semana-hist'].forEach(function (k) { W().localStorage.removeItem(k); });      // ===================== R. a posição de leitura não anda quando o texto reflui (modo foco recolhe o menu; troca de modo) =====================
      post({ type: 'readlang', value: 'pt' }); await wait(200);
      var rbk = Array.apply(null, Array(90)).map(function (_, k) { return 'Paragraph ' + (k + 1) + ': of things some are in our power, and others are not, so we must learn to tell them apart and to act only on what truly depends on us, every single day of our short lives, without complaint.'; }).join('\n\n');
      await D().addText('Posição estável teste', rbk);
      await until(function () { return D().doc && D().doc.title === 'Posição estável teste'; }, 20000);
      var rid = D().doc.id; await wait(700);
      D().$('lb-back').click(); await wait(300);
      W().localStorage.removeItem('dd-ingles-modo');
      var rm = await D().db.get('meta', rid); rm.pos = 60; rm.savedAt = Date.now() + 1000; await D().db.put('meta', rm); W().localStorage.removeItem('dd-ingles-sessao');
      D().setMode('single'); await D().openDoc(rid); await wait(1500);
      var rpos1 = D().doc.pos;
      ok('R1 reabrir em coluna única volta ao parágrafo gravado', Math.abs(rpos1 - 60) <= 1, 'pos=' + rpos1);
      var rsel = idoc().getElementById('lb-read-mode'); rsel.value = 'focus'; rsel.dispatchEvent(new Event('change')); await wait(3000);
      var rpos2 = D().doc.pos;
      ok('R2 trocar para o modo foco (o menu recolhe e o texto reflui) mantém a posição de leitura', Math.abs(rpos2 - 60) <= 2, 'pos=' + rpos2);
      rsel.value = 'side'; rsel.dispatchEvent(new Event('change')); await wait(2500);
      var rpos3 = D().doc.pos;
      ok('R3 trocar para lado a lado também mantém a posição', Math.abs(rpos3 - 60) <= 2, 'pos=' + rpos3);
      rsel.value = 'single'; rsel.dispatchEvent(new Event('change')); await wait(1500);
      D().$('lb-back').click(); await wait(500);
      var rm2 = await D().db.get('meta', rid);
      ok('R4 a posição gravada continua a mesma depois das trocas de modo', Math.abs(rm2.pos - 60) <= 2, 'gravada=' + rm2.pos);
      D().setMode('focus'); await D().openDoc(rid); await until(function () { return idoc().querySelectorAll('#lb-focus-panel section').length === 4; }, 40000); await wait(3000);
      var rpos4 = D().doc.pos;
      ok('R5 reabrir direto no modo foco não salta para a frente', Math.abs(rpos4 - 60) <= 2, 'pos=' + rpos4);
      var rsess = tx('lb-fp-sess');
      ok('R6 o painel não inventa palavras lidas ao reabrir (+0 nesta sessão)', /^\+0 /.test(rsess), rsess);
      D().setMode('single'); D().$('lb-back').click(); await wait(300);      // ===================== S. a evolução é gravada logo, sem esperar o fechamento da aba =====================
      await W().__ddProg.resetAll(); await wait(300);
      var skey = W().__ddProg.dayKey();
      W().__ddProg.add('heard', 77);
      var s1 = JSON.parse(W().localStorage.getItem('dd-ingles-log') || '{"d":{}}');
      ok('S1 palavras ouvidas (e salvas, revisões, ditados) são gravadas na hora, no mesmo instante do evento', ((s1.d[skey] || {}).heard || 0) >= 77, JSON.stringify(s1.d[skey]));
      W().__ddProg.add('sec', 5); W().__ddProg.add('rd', 5); W().__ddProg.add('ls', 3);
      await wait(2600);
      var s2 = JSON.parse(W().localStorage.getItem('dd-ingles-log')), m2 = W().__ddProg.log.d[skey];
      ok('S2 os tempos (total, lendo, ouvindo) são gravados em até 2 s, sem esperar ocultar nem fechar a aba', s2.d[skey].sec === m2.sec && s2.d[skey].rd === m2.rd && s2.d[skey].ls === m2.ls && s2.d[skey].sec >= 5 && s2.d[skey].ls >= 3, JSON.stringify(s2.d[skey]));
      await W().__ddProg.resetAll(); await wait(300);      // ===================== U. teleprompter: legenda corrida (direita para esquerda), ler num idioma e ouvir em outro =====================
      var ubk = [1, 2, 3, 4].map(function (k) { return 'Of things some are in our power, and others are not, so we must learn to tell them apart and to act only on what truly depends on us number ' + k + '. Nobody can compel you unless you let that happen to you.'; }).join('\n\n');
      await D().addText('Teleprompter teste', ubk);
      await until(function () { return D().doc && D().doc.title === 'Teleprompter teste'; }, 20000);
      await wait(700);
      var utimer = null, uw = W();
      uw.speechSynthesis.cancel = function () { clearInterval(utimer); if (uw.__cur) { var u0 = uw.__cur; uw.__cur = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      uw.speechSynthesis.speak = function (u) {
        var ws = u.text.split(/\s+/), ix = 0, ci = 0; uw.__cur = u; u.onstart && u.onstart();
        utimer = setInterval(function () { if (ix >= ws.length) { clearInterval(utimer); uw.__cur = null; u.onend && u.onend(); return; } u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); ci += ws[ix].length + 1; ix++; }, 400);
      };
      post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'en' }); await wait(400);
      var usel = idoc().getElementById('lb-read-mode');
      ok('U1 o seletor de modos tem o Teleprompter como quinta opção', Array.prototype.map.call(usel.options, function (o) { return o.value; }).join(',') === 'single,wide,side,focus,tele' && /Teleprompter/.test(usel.options[4].textContent));
      usel.value = 'tele'; usel.dispatchEvent(new Event('change'));
      await until(function () { return idoc().querySelectorAll('#lb-tele-line .tl-w').length > 5; }, 40000);
      var ust = idoc().createElement('style'); ust.textContent = '.tl-track { transition: none !important; }'; idoc().head.appendChild(ust);   // em tempo virtual a transição não termina antes da medição
      await until(function () { return idoc().getElementById('lb-tele').getBoundingClientRect().width > window.innerWidth - 20; }, 20000);   // o site pai esconde o menu e a janela cresce
      var utele = idoc().getElementById('lb-tele'), ur = utele.getBoundingClientRect();
      var hid = function (sel) { var e = document.querySelector(sel); return !!e && W && getComputedStyle(e).display === 'none'; };
      ok('U2 o resto da tela some: menu, barra de comandos e rodapé do site escondem, e a legenda cobre a janela', !utele.hidden && document.body.classList.contains('imersivo') && hid('.master-header') && hid('footer.bottom-hud') && hid('#sidebar') && Math.abs(ur.width - idoc().documentElement.clientWidth) < 3 && ur.height > window.innerHeight * 0.9 && W().localStorage.getItem('dd-ingles-modo') === 'tele', Math.round(ur.width) + 'x' + Math.round(ur.height) + ' janela ' + window.innerWidth + 'x' + window.innerHeight);
      await until(function () { return D().tts.playing; }, 8000);
      ok('U3 a narração começa sozinha ao escolher o modo', D().tts.playing === true);
      await until(function () { return /^\[pt\]/.test(idoc().getElementById('lb-tele-line').textContent) && !/^<</.test(idoc().getElementById('lb-tele-sub').textContent); }, 20000);
      var utrack = idoc().getElementById('lb-tele-line'), usub = idoc().getElementById('lb-tele-sub'), ufs = parseFloat(W().getComputedStyle(utrack).fontSize);
      ok('U4 ler em português e ouvir em inglês: a linha grande está em português (idioma de leitura), de uma linha só e letras grandes, e embaixo está o inglês que se ouve', /^\[pt\]/.test(utrack.textContent) && /^Of things some/.test(usub.textContent) && D().state.readLang === 'pt' && D().state.audioLang === 'en' && W().getComputedStyle(utrack).whiteSpace === 'nowrap' && ufs >= 40 && utrack.getBoundingClientRect().height < ufs * 1.6, 'fonte=' + Math.round(ufs) + 'px | ' + utrack.textContent.slice(0, 40));
      D().stopTts(); await wait(300);
      var uspoken = usub.textContent, uen = D().doc.paras[0].s[0], uptxt = utrack.dataset.text;
      D().emit('piece', { p: 0, s: 0, text: uen, lang: 'en' }); D().emit('wordpos', { ci: Math.floor(uen.length * 0.6), len: uen.length, text: uen }); await wait(200);
      var unow = idoc().querySelector('#lb-tele-line .tl-w.now'), ufrac = unow ? uptxt.indexOf(unow.textContent, 0) / uptxt.length : -1;
      var upos = 0, uidx = -1; Array.prototype.forEach.call(idoc().querySelectorAll('#lb-tele-line .tl-w'), function (w, i) { if (w === unow) uidx = i; });
      ok('U5 a palavra destacada na linha em português acompanha a voz em inglês (posição proporcional entre os idiomas)', !!unow && uidx > 3 && Math.abs(((uptxt.indexOf(unow.textContent)) / uptxt.length) - 0.6) < 0.2, 'palavra "' + (unow && unow.textContent) + '" na posição ' + (Math.round(ufrac * 100)) + '% (esperado ~60%)');
      var utx1 = parseInt(utrack.style.transform.replace(/[^-\d]/g, ''), 10);
      D().emit('wordpos', { ci: Math.floor(uen.length * 0.9), len: uen.length, text: uen }); await wait(100);
      var utx2 = parseInt(utrack.style.transform.replace(/[^-\d]/g, ''), 10);
      ok('U6 a linha corre da direita para a esquerda: avançar a voz move o texto para a esquerda, mantendo a palavra no ponto de leitura', utx2 < utx1 && idoc().querySelector('.tl-head').style.left === '62%', utx1 + ' -> ' + utx2);
      var upre = idoc().querySelector('#lb-tele-line .tl-nx'), upreOk = !!upre && /^\[pt\]/.test(upre.textContent);
      D().emit('sentence', { p: 0, s: 1 });
      var uenter = parseInt(utrack.style.transform.replace(/[^-\d]/g, ''), 10), uvw = idoc().querySelector('#lb-tele .tl-view').clientWidth;
      ok('U7 a frase seguinte já estava carregada à direita (prévia) e vira a atual vindo da direita, sem salto', upreOk && uenter > uvw * 0.25 && uenter < uvw * 3, 'prévia=' + upreOk + ' começa em ' + uenter + ' px; a janela tem ' + uvw);
      idoc().getElementById('lb-tele-read-en').click();
      await until(function () { return D().state.readLang === 'en'; }, 10000);
      idoc().getElementById('lb-tele-listen-pt').click();
      await until(function () { return D().state.audioLang === 'pt'; }, 10000);
      await until(function () { return /^Nobody can compel/.test(idoc().getElementById('lb-tele-line').textContent) && /^\[pt\]/.test(idoc().getElementById('lb-tele-sub').textContent); }, 20000);
      var u8 = { estado: D().state.readLang === 'en' && D().state.audioLang === 'pt', linha: /^Nobody can compel/.test(idoc().getElementById('lb-tele-line').textContent), sub: /^\[pt\]/.test(idoc().getElementById('lb-tele-sub').textContent), botoes: idoc().getElementById('lb-tele-read-en').classList.contains('on') && idoc().getElementById('lb-tele-listen-pt').classList.contains('on'), site: document.querySelector('.lang-btn[data-opt="readLang"][data-val="en"]').classList.contains('on') || document.querySelector('.lang-btn[data-opt="readLang"][data-val="en"]').getAttribute('aria-pressed') === 'true' };
      ok('U8 trocar para ler em inglês e ouvir em português (e o contrário) pelos botões da própria legenda, que também atualizam o site', u8.estado && u8.linha && u8.sub && u8.botoes && u8.site, JSON.stringify(u8) + ' | linha=' + idoc().getElementById('lb-tele-line').textContent.slice(0, 30) + ' | sub=' + idoc().getElementById('lb-tele-sub').textContent.slice(0, 30));
      var uc1 = idoc().getElementById('lb-tele-count').textContent;
      idoc().querySelectorAll('#lb-tele .tl-bar > .tl-b')[3].click();   // botões diretos da barra: sair, anterior, ler, PRÓXIMA...
      var uc2 = idoc().getElementById('lb-tele-count').textContent; D().stopTts();   // lê na hora: a voz simulada avançaria sozinha
      var usz = parseFloat(W().getComputedStyle(utrack).fontSize);
      Array.prototype.filter.call(idoc().querySelectorAll('#lb-tele .tl-b'), function (b) { return b.textContent === 'A+'; })[0].click(); await wait(200);
      ok('U9 próxima frase avança o contador, e A+ aumenta a letra com o tamanho guardado', /(Frase|Sentence) 2 (de|of)/.test(uc1) && /(Frase|Sentence) 3 (de|of)/.test(uc2) && parseFloat(W().getComputedStyle(utrack).fontSize) > usz && W().localStorage.getItem('dd-ingles-tele-size') !== null, uc1 + ' -> ' + uc2);
      D().stopTts();
      idoc().defaultView.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(500);
      ok('U10 Esc sai do teleprompter: o site volta (menu, comandos e rodapé), o modo volta a coluna única e o seletor acompanha', idoc().getElementById('lb-tele').hidden && !document.body.classList.contains('imersivo') && !hid('.master-header') && !hid('footer.bottom-hud') && idoc().getElementById('lb-read-mode').value === 'single' && D().state.mode === 'single');
      post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'pt' }); await wait(300);
      D().$('lb-back').click(); await wait(300);      // ===================== V. versos: estrofes e linhas no acompanhamento da narração =====================
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      var vpoema = ['Shall I compare thee to a summer\'s day?', 'Thou art more lovely and more temperate:', 'Rough winds do shake the darling buds of May,', 'And summer\'s lease hath all too short a date;', '', 'Sometime too hot the eye of heaven shines,', 'And often is his gold complexion dimm\'d;', 'And every fair from fair sometime declines,', 'By chance or nature\'s changing course untrimm\'d;', '', 'But thy eternal summer shall not fade,', 'Nor lose possession of that fair thou ow\'st;', 'Nor shall death brag thou wander\'st in his shade,', 'When in eternal lines to time thou grow\'st.'].join('\n');
      var vprosa = 'Surveillance capitalism harvests behavioural surplus from ordinary people every single day, and\nplatforms predict what citizens will do tomorrow morning. Nobody explains how these hidden\nsystems really work, so people rarely notice this quiet economic exchange at all.';
      await D().addText('Soneto teste', vpoema + '\n\n' + vprosa + '\n\nHello.\nHi there.');
      await until(function () { return D().doc && D().doc.title === 'Soneto teste'; }, 20000);
      var vp = D().doc.paras;
      ok('V1 poema: cada estrofe vira um bloco de versos com uma linha por unidade', vp.length === 5 && vp[0].t === 'v' && vp[0].s.length === 4 && vp[1].t === 'v' && vp[2].t === 'v' && vp[0].s[1] === 'Thou art more lovely and more temperate:' && vp[2].s[3].indexOf('grow') >= 0, vp.map(function (q) { return q.t + ':' + q.s.length; }).join(' '));
      ok('V2 prosa quebrada em colunas e diálogo curto continuam sendo prosa, não verso', vp[3].t === 'p' && vp[4].t === 'p' && D().looksVerse(['Hello.', 'Hi there.']) === false && D().looksVerse(['A line', 'Another line']) === true && D().looksVerse(['a line that starts low', 'and goes on in the middle', 'of a long sentence wrapped here']) === false);
      await wait(400);
      var vst = idoc().querySelectorAll('.lb-para.lb-verse');
      var vtops = Array.prototype.map.call(vst[0].querySelectorAll('.lb-s'), function (s) { return Math.round(s.getBoundingClientRect().top); });
      ok('V3 na tela, 3 estrofes e cada verso numa linha própria', vst.length === 3 && vtops.length === 4 && vtops[0] < vtops[1] && vtops[1] < vtops[2] && vtops[2] < vtops[3] && W().getComputedStyle(vst[0].querySelector('.lb-s')).display === 'block' && idoc().querySelectorAll('.lb-para:not(.lb-verse):not(.lb-head)').length === 2, vtops.join(','));
      // voz simulada com fronteira de palavra: dá para ver a estrofe, a linha e a palavra em movimento
      var vtimer = null, vw = W();
      vw.speechSynthesis.cancel = function () { clearInterval(vtimer); if (vw.__cur) { var u0 = vw.__cur; vw.__cur = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      vw.speechSynthesis.speak = function (u) {
        var ws = u.text.split(/\s+/), ix = 0, ci = 0; vw.__cur = u; u.onstart && u.onstart();
        vtimer = setInterval(function () { if (ix >= ws.length) { clearInterval(vtimer); vw.__cur = null; u.onend && u.onend(); return; } u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); ci += ws[ix].length + 1; ix++; }, 90);
      };
      D().startTts(0, 1);
      await until(function () { return idoc().querySelector('.lb-para.lb-verse.speaking .lb-s.seg .wd.now'); }, 20000);
      var vsp = idoc().querySelectorAll('.lb-para.speaking'), vseg = idoc().querySelectorAll('.lb-para.lb-verse.speaking .lb-s.seg'), vnow = idoc().querySelector('.lb-s.seg .wd.now');
      ok('V4 durante a narração: só a estrofe falada fica marcada, só a linha falada (o 2º verso) e uma palavra dessa linha', vsp.length === 1 && vsp[0] === vst[0] && vseg.length === 1 && vseg[0].dataset.k === '1' && !!vnow && vseg[0].contains(vnow), 'estrofes marcadas=' + vsp.length + ' linha=' + (vseg[0] && vseg[0].dataset.k) + ' palavra=' + (vnow && vnow.textContent));
      var vk0 = vnow.textContent;
      await until(function () { var n = idoc().querySelector('.lb-s.seg .wd.now'); return n && n.textContent !== vk0; }, 20000);
      var vseg2 = idoc().querySelectorAll('.lb-para.lb-verse.speaking .lb-s.seg');
      ok('V5 a palavra destacada avança dentro da linha, em sincronia com a voz', !!idoc().querySelector('.lb-s.seg .wd.now') && idoc().querySelector('.lb-s.seg .wd.now').textContent !== vk0 && vseg2.length === 1 && vseg2[0].dataset.k === '1', vk0 + ' -> ' + idoc().querySelector('.lb-s.seg .wd.now').textContent);
      await until(function () { var s = idoc().querySelector('.lb-para.lb-verse.speaking .lb-s.seg'); return s && s.dataset.k === '2'; }, 30000);
      ok('V6 terminada uma linha, a marca passa para o verso seguinte (3º) na mesma estrofe', idoc().querySelectorAll('.lb-para.lb-verse.speaking .lb-s.seg').length === 1 && idoc().querySelector('.lb-para.lb-verse.speaking .lb-s.seg').dataset.k === '2' && idoc().querySelectorAll('.lb-para.speaking').length === 1);
      D().stopTts(); await wait(200);
      D().startTts(0, 3);
      await until(function () { var q = idoc().querySelectorAll('.lb-para')[1]; return q && q.classList.contains('speaking'); }, 40000);
      ok('V7 acabando o último verso da estrofe, a marca de estrofe passa para a seguinte', idoc().querySelectorAll('.lb-para')[1].classList.contains('speaking') && !idoc().querySelectorAll('.lb-para')[0].classList.contains('speaking') && idoc().querySelectorAll('.lb-para.speaking').length === 1);
      D().stopTts(); await wait(200);
      ok('V8 a estrofe falada ganha a barra de destaque mais forte que as demais', W().getComputedStyle(idoc().querySelectorAll('.lb-para.lb-verse')[2]).borderLeftWidth === '3px' && W().getComputedStyle(idoc().querySelectorAll('.lb-para.lb-verse')[2]).borderLeftStyle === 'solid');
      D().$('lb-back').click(); await wait(300);      // ===================== W. marcas da narração em cores diferentes (frase, linha, palavra) em todos os temas e modos =====================
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      var wbk = [1, 2, 3, 4, 5, 6].map(function (k) { return 'Of things some are in our power, and others are not, so we must learn to tell them apart number ' + k + '. Nobody can compel you unless you let that happen to you.'; }).join('\n\n');
      await D().addText('Cores teste', wbk);
      await until(function () { return D().doc && D().doc.title === 'Cores teste'; }, 20000);
      await wait(800);
      var wst = idoc().createElement('style'); wst.textContent = '* { transition: none !important; }'; idoc().head.appendChild(wst);
      var wtimer = null, ww = W();
      ww.speechSynthesis.cancel = function () { clearInterval(wtimer); if (ww.__cur) { var u0 = ww.__cur; ww.__cur = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      ww.speechSynthesis.speak = function (u) {
        var ws = u.text.split(/\s+/), ix = 0, ci = 0; ww.__cur = u; u.onstart && u.onstart();
        wtimer = setInterval(function () { if (ix >= ws.length) { clearInterval(wtimer); ww.__cur = null; u.onend && u.onend(); return; } u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); ci += ws[ix].length + 1; ix++; }, 700);
      };
      var rgba = function (s) { var m = (s.match(/[\d.]+/g) || []).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
      var hue = function (c) { var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; var h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
      var hdist = function (a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
      D().startTts(0, 0);
      await until(function () { return idoc().querySelector('.lb-s.seg .wd.now'); }, 30000);
      var wfalhas = [], wlinhas = [];
      for (var wth of ['paper', 'dark', 'light', 'sepia']) {
        for (var wmd of ['single', 'wide', 'side', 'focus']) {
          post({ type: 'theme', value: wth }); D().setMode(wmd); await wait(700);
          await until(function () { return idoc().querySelector('.lb-s.seg .wd.now') && idoc().getElementById('lb-band').style.display === 'block'; }, 30000);
          var wseg = idoc().querySelector('.lb-s.seg'), wword = idoc().querySelector('.wd.now'), wband = idoc().getElementById('lb-band');
          if (!wseg || !wword || !wband) { wfalhas.push(wth + '/' + wmd + ': sem marcas'); continue; }
          var cs = rgba(W().getComputedStyle(wseg).backgroundColor), cl = rgba(W().getComputedStyle(wband).backgroundColor), cw = rgba(W().getComputedStyle(wword).backgroundColor);
          var why = [];
          if (cs.a < 0.15) why.push('frase quase invisível'); if (cl.a < 0.1) why.push('linha quase invisível'); if (cw.a < 0.95) why.push('palavra sem cor forte');
          if (hdist(hue(cs), hue(cl)) < 40) why.push('frase e linha parecidas'); if (hdist(hue(cs), hue(cw)) < 40) why.push('frase e palavra parecidas'); if (hdist(hue(cl), hue(cw)) < 40) why.push('linha e palavra parecidas');
          wlinhas.push(wth + '/' + wmd + ' frase=' + Math.round(hue(cs)) + '° linha=' + Math.round(hue(cl)) + '° palavra=' + Math.round(hue(cw)) + '°');
          if (why.length) wfalhas.push(wth + '/' + wmd + ': ' + why.join(', '));
          if (wmd === 'side') {
            var wts = idoc().querySelector('.lb-t.seg');
            if (!wts) wfalhas.push(wth + '/side: a tradução da frase falada não está marcada'); else if (W().getComputedStyle(wts).backgroundColor !== W().getComputedStyle(wseg).backgroundColor) wfalhas.push(wth + '/side: a coluna da tradução usa outra cor de frase');
          }
        }
      }
      ok('W1 em 4 temas x 4 modos (coluna única, larga, lado a lado, foco): a frase destacada, a linha e a palavra sincronizada têm cores visíveis e de famílias diferentes', wfalhas.length === 0, wfalhas.length ? wfalhas.join(' | ') : wlinhas.slice(0, 4).join(' ; ') + ' ...');
      D().stopTts(); D().setMode('single'); post({ type: 'theme', value: 'paper' }); await wait(300);
      D().$('lb-back').click(); await wait(300);
      // ===================== X. teleprompter: as 4 combinações de ler x ouvir (PT/EN) =====================
      await D().addText('Combos teste', [1, 2, 3].map(function (k) { return 'Of things some are in our power, and others are not, so we must learn to tell them apart number ' + k + '. Nobody can compel you unless you let that happen to you.'; }).join('\n\n'));
      await until(function () { return D().doc && D().doc.title === 'Combos teste'; }, 20000);
      await wait(600);
      var xw = W(), xl = null, xt = null;
      xw.speechSynthesis.cancel = function () { clearInterval(xt); if (xw.__cur) { var u0 = xw.__cur; xw.__cur = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      xw.speechSynthesis.speak = function (u) { xl = (u.lang || '').slice(0, 2); xw.__cur = u; u.onstart && u.onstart(); var ws = u.text.split(/\s+/), ix = 0, ci = 0; xt = setInterval(function () { if (ix >= ws.length) { clearInterval(xt); xw.__cur = null; u.onend && u.onend(); return; } u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); ci += ws[ix].length + 1; ix++; }, 400); };
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      D().setMode('tele');
      await until(function () { return idoc().querySelectorAll('#lb-tele-line .tl-w').length > 5; }, 40000);
      var xfal = [];
      for (var xr of ['pt', 'en']) { for (var xa of ['pt', 'en']) {
        xl = null; D().stopTts();
        idoc().getElementById('lb-tele-read-' + xr).click(); idoc().getElementById('lb-tele-listen-' + xa).click();
        await until(function () { return D().state.readLang === xr && D().state.audioLang === xa; }, 10000);
        D().startTts(0, 0);
        await until(function () { return xl && /^\[pt\]|^Of things/.test(idoc().getElementById('lb-tele-line').textContent) && !/^<</.test(idoc().getElementById('lb-tele-sub').textContent) && idoc().getElementById('lb-tele-sub').textContent.length > 20 && !idoc().getElementById('lb-tele-sub').classList.contains('wait'); }, 30000);
        var xm = idoc().getElementById('lb-tele-line').textContent, xs = idoc().getElementById('lb-tele-sub').textContent;
        var xmLang = /^\[pt\]/.test(xm) ? 'pt' : 'en', xsLang = /^\[pt\]/.test(xs) ? 'pt' : 'en';
        if (xmLang !== xr) xfal.push('ler ' + xr + '/ouvir ' + xa + ': linha grande em ' + xmLang);
        if (xsLang === xmLang) xfal.push('ler ' + xr + '/ouvir ' + xa + ': legenda de baixo no mesmo idioma');
        if (xl !== (xa === 'pt' ? 'pt' : 'en')) xfal.push('ler ' + xr + '/ouvir ' + xa + ': voz em ' + xl);
      } }
      ok('X1 teleprompter: ler PT/ouvir PT, ler PT/ouvir EN, ler EN/ouvir PT, ler EN/ouvir EN (linha grande no idioma de leitura, voz no de áudio, o outro idioma embaixo)', xfal.length === 0, xfal.join(' | '));
      // troca ao vivo: com a narração tocando, mudar Ouvir e Ler muda a voz e a linha na hora
      idoc().getElementById('lb-tele-read-pt').click(); idoc().getElementById('lb-tele-listen-en').click();
      await until(function () { return D().state.readLang === 'pt' && D().state.audioLang === 'en'; }, 10000);
      xl = null; D().startTts(0, 0); await until(function () { return xl === 'en' && D().tts.playing; }, 20000);
      idoc().getElementById('lb-tele-listen-pt').click();
      await until(function () { return xl === 'pt' && D().tts.playing; }, 20000);
      var xv1 = xl;
      idoc().getElementById('lb-tele-read-en').click();
      await until(function () { return !/^\[pt\]/.test(idoc().getElementById('lb-tele-line').textContent) && /^\[pt\]/.test(idoc().getElementById('lb-tele-sub').textContent); }, 20000);
      ok('X2 com a narração tocando, trocar Ouvir muda a voz na hora e trocar Ler muda a linha na hora, sem parar o modo', xv1 === 'pt' && D().tts.playing && !/^\[pt\]/.test(idoc().getElementById('lb-tele-line').textContent));      D().stopTts(); D().setMode('single'); post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'pt' }); await wait(300);
      // ===================== Z. sincronia do teleprompter: centragem, prévia da frase seguinte e fila sem lacuna =====================
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'pt' }); await wait(300);
      D().setMode('tele');
      await until(function () { return idoc().querySelectorAll('#lb-tele-line .tl-w').length > 5 && !D().$('lb-reader').hidden; }, 40000);
      D().stopTts(); await wait(200);
      var zst = idoc().createElement('style'); zst.textContent = '.tl-track { transition: none !important; }'; idoc().head.appendChild(zst);
      var zsp = D().doc.tr[0][0], zerr = [], zmono = true, zlast = -1, zview = idoc().querySelector('#lb-tele .tl-view');
      D().emit('sentence', { p: 0, s: 0 }); D().emit('piece', { p: 0, s: 0, text: zsp, lang: 'pt' });
      var zw = []; zsp.replace(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu, function (m, off) { zw.push(off); return m; });
      for (var zi = 0; zi < zw.length; zi++) {
        D().emit('wordpos', { ci: zw[zi], len: zsp.length, text: zsp });
        var znow = idoc().querySelector('#lb-tele-line .tl-w.now'), zk = -1;
        Array.prototype.forEach.call(idoc().querySelectorAll('#lb-tele-line .tl-w'), function (w, i) { if (w === znow) zk = i; });
        if (zk < zlast) zmono = false; zlast = zk;
        if (!znow) { zerr.push('sem palavra em ' + zi); continue; }
        var zr = znow.getBoundingClientRect(), zv = zview.getBoundingClientRect();
        var znext = idoc().querySelectorAll('#lb-tele-line .tl-w')[zk + 1], zstep = znext ? Math.abs((znext.getBoundingClientRect().left + znext.getBoundingClientRect().width / 2) - (zr.left + zr.width / 2)) / 2 : 0;
        zerr.push(Math.max(0, Math.abs((zr.left + zr.width / 2) - (zv.left + zv.width * 0.62)) - zstep));      // a linha mira o meio caminho até a próxima palavra: o erro é o que passa dessa meia passada
      }
      var zmax = Math.max.apply(null, zerr.filter(function (x) { return typeof x === 'number'; }));
      ok('Z1 a palavra falada fica sempre no ponto de leitura (erro máximo de centragem em px) e o destaque nunca volta atrás, com voz em um idioma e legenda em outro', zerr.length > 8 && zerr.every(function (x) { return typeof x === 'number'; }) && zmax <= 2 && zmono, 'palavras=' + zerr.length + ' erro máx=' + zmax.toFixed(2) + 'px monótono=' + zmono);
      // fila sem lacuna: motor que informa fila (speaking/pending) recebe a frase seguinte enquanto a atual ainda toca
      var zq = [], zpl = null, zlog = [], zsent = [], ztm = null, zws = W(), zsy = zws.speechSynthesis;
      var zrun = function () {
        if (zpl || !zq.length) return;
        zpl = zq.shift(); var u = zpl, ws = u.text.split(/\s+/), ix = 0, ci = 0; zlog.push({ k: 'start', txt: u.text, t: performance.now() }); u.onstart && u.onstart();
        ztm = setInterval(function () { if (ix >= ws.length) { clearInterval(ztm); zlog.push({ k: 'end', txt: u.text, t: performance.now() }); zpl = null; u.onend && u.onend(); zrun(); return; } u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); ci += ws[ix].length + 1; ix++; }, 120);
      };
      Object.defineProperty(zsy, 'speaking', { configurable: true, get: function () { return !!zpl; } });
      Object.defineProperty(zsy, 'pending', { configurable: true, get: function () { return zq.length > 0; } });
      zsy.speak = function (u) { zlog.push({ k: 'queued', txt: u.text, t: performance.now() }); zq.push(u); zrun(); };
      zsy.cancel = function () { clearInterval(ztm); zq = []; if (zpl) { var u0 = zpl; zpl = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      D().on('sentence', function (e) { zsent.push(e.p + ':' + e.s); });
      D().startTts(0, 0);
      await until(function () { return zsent.length >= 4; }, 60000);
      var zahead = 0; for (var zj = 1; zj < zlog.length; zj++) { if (zlog[zj].k === 'queued') { var zprev = null; for (var zk2 = zj - 1; zk2 >= 0; zk2--) if (zlog[zk2].k === 'start') { zprev = zk2; break; } var zended = zlog.slice(zprev + 1, zj).some(function (e) { return e.k === 'end'; }); if (zprev !== null && !zended) zahead++; } }
      var zok = zsent.slice(0, 4).join(',') === '0:0,0:1,1:0,1:1';
      ok('Z2 a frase seguinte entra na fila do motor enquanto a atual ainda toca (sem lacuna), e a marcação segue a ordem sem repetir nem pular frases', zahead >= 2 && zok, 'enfileiradas antes do fim=' + zahead + ' ordem=' + zsent.slice(0, 4).join(','));
      D().stopTts(); delete zsy.speaking; delete zsy.pending; await wait(200);
      // prévia: a frase seguinte já está na tela, esmaecida, e vira a atual sem salto
      post({ type: 'readlang', value: 'pt' }); await wait(300);
      var zerrs = []; W().console.error = function () { zerrs.push(Array.prototype.map.call(arguments, function (a) { return a && a.stack ? a.stack.split('\n').slice(0, 2).join(' / ') : String(a); }).join(' ')); };
      await until(function () { return D().state.readLang === 'pt'; }, 10000);
      D().emit('sentence', { p: 0, s: 0 });
      await until(function () { return /^\[pt\]/.test(idoc().getElementById('lb-tele-line').dataset.text) && idoc().querySelector('#lb-tele-line .tl-nx'); }, 10000);
      var zpre = idoc().querySelector('#lb-tele-line .tl-nx'), zhas = !!zpre && /^\[pt\]/.test(zpre.textContent) && parseFloat(W().getComputedStyle(zpre).opacity) < 0.6;
      ok('Z3 a próxima frase já aparece carregada à direita, esmaecida, enquanto só a atual é destacada', zhas, (zpre ? zpre.textContent.slice(0, 30) : 'sem prévia') + ' | leitura=' + D().state.readLang + ' linha=' + idoc().getElementById('lb-tele-line').dataset.text.slice(0, 25) + ' op=' + (zpre ? W().getComputedStyle(zpre).opacity : '') + ' tr0=' + JSON.stringify((D().doc.tr[0] || []).map(function (x) { return x == null ? null : x.slice(0, 8); })) + ' doclang=' + D().doc.lang + ' modo=' + D().state.mode + ' oculto=' + idoc().getElementById('lb-tele').hidden + ' lbreader=' + D().$('lb-reader').hidden + ' ERROS=' + zerrs.join(' ## ').slice(0, 400));      // ===================== T. botão Teleprompter no lugar do Raio-X (moldura do site) =====================
      // estabilidade: uma atualização sem mudança (tradução chegando, troca de idioma igual) não refaz a linha, não perde o destaque e não faz a linha pular
      var zen = D().doc.paras[0].s[0];
      D().emit('piece', { p: 0, s: 0, text: zen, lang: 'en' }); D().emit('wordpos', { ci: Math.floor(zen.length * 0.5), len: zen.length, text: zen });
      var ztrA = idoc().getElementById('lb-tele-line').style.transition, zw0 = idoc().querySelector('#lb-tele-line .tl-w'), znow0 = idoc().querySelector('#lb-tele-line .tl-w.now'), ztx0 = idoc().getElementById('lb-tele-line').style.transform, zrb = 0;
      for (var zq2 = 0; zq2 < 5; zq2++) { D().emit('lang', D().state.readLang); }
      var znow1 = idoc().querySelector('#lb-tele-line .tl-w.now');
      ok('Z4 atualizações repetidas sem mudança não refazem a linha: mesmos elementos, mesma palavra destacada e a linha não se mexe (sem travada na transição)', !!znow0 && znow1 === znow0 && idoc().querySelector('#lb-tele-line .tl-w') === zw0 && idoc().getElementById('lb-tele-line').style.transform === ztx0, 'palavra mantida=' + (znow1 === znow0) + ' linha igual=' + (idoc().querySelector('#lb-tele-line .tl-w') === zw0));      D().stopTts(); D().setMode('single'); post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'pt' }); await wait(300);
      var zm, ztr = idoc().getElementById('lb-tele-line').style.transition, zm = ztrA.match(/([\d.]+)(ms|s)\b/) || [], zdur = parseFloat(zm[1]) * (zm[2] === 's' ? 1000 : 1);
      ok('Z5 a linha desliza de forma contínua e linear no ritmo da fala (sem parar a cada palavra): duração entre 90 e 1400 ms', /linear/.test(ztrA) && zdur >= 90 && zdur <= 1400, 'logo após a palavra: [' + ztrA + '] depois: [' + ztr + ']');      await until(function () { return !$('btn-tele').hidden; }, 4000);
      ok('T1 na Biblioteca, com documento aberto, o Raio-X some e aparece o botão Teleprompter', $('btn-raiox').hidden && !$('btn-tele').hidden && /Teleprompter/.test($('btn-tele').textContent));
      var tmode0 = D().state.mode;
      $('btn-tele').click();
      await until(function () { return D().state.mode !== tmode0; }, 3000);
      ok('T2 clicar em Teleprompter alterna o modo (tele liga, tele de novo desliga)', tmode0 === 'tele' ? D().state.mode === 'single' : D().state.mode === 'tele', tmode0 + ' -> ' + D().state.mode);
      $('btn-tele').click();
      await until(function () { return D().state.mode === tmode0; }, 3000);
      ok('T3 clicar de novo volta ao modo anterior', D().state.mode === tmode0);
      D().$('lb-back').click(); await wait(300);      // ===================== Y. velocidade: retomar da palavra e estimativa sem eventos de palavra =====================
      await D().addText('Velocidade teste', 'We must learn to tell the things apart, and then act only on what depends on us, because nobody can compel you unless you let it happen. Second sentence here stays short.');
      await until(function () { return D().doc && D().doc.title === 'Velocidade teste'; }, 20000);
      await wait(600);
      var yw = W(), ytxt = [], ytm = null, ycur = null;
      yw.speechSynthesis.cancel = function () { clearInterval(ytm); if (ycur) { var u0 = ycur; ycur = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      yw.speechSynthesis.speak = function (u) { ytxt.push(u.text); ycur = u; u.onstart && u.onstart(); var ws = u.text.split(/\s+/), ix = 0, ci = 0; ytm = setInterval(function () { if (ix >= ws.length) { clearInterval(ytm); ycur = null; u.onend && u.onend(); return; } u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); ci += ws[ix].length + 1; ix++; }, 300); };
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      var yfull = D().doc.paras[0].s[0], ycis = [];
      D().on('wordpos', function (e) { ycis.push(e.ci); });
      D().startTts(0, 0);
      await until(function () { return ycis.length >= 6 && ycis.slice(-1)[0] > 50; }, 30000);
      var yresumeAt = ycis.slice(-1)[0]; post({ type: 'rate', value: 1.5 });
      await until(function () { return ytxt.length >= 2; }, 20000);
      var yresume = ytxt[1];
      ok('Y1 trocar a velocidade no meio da frase continua da palavra falada (antes recomeçava a frase do início)', yresume !== yfull && yfull.endsWith(yresume) && yfull.charAt(yfull.length - yresume.length - 1) === ' ' && yresume.length < yfull.length * 0.8, 'retomou com ' + yresume.length + ' de ' + yfull.length + ' caracteres');
      var ylast = ycis.slice(-3);
      ok('Y2 depois de retomar, o destaque continua a partir da posição já falada, sem voltar ao início da frase', ycis.length >= 7 && Math.min.apply(null, ycis.slice(ycis.indexOf(Math.max.apply(null, ycis.slice(0, 20))))) >= 0 && ycis.slice(-1)[0] >= yresumeAt - 1, 'último ci=' + ycis.slice(-1)[0] + ' (retomou perto de ' + yresumeAt + ')');
      D().stopTts(); post({ type: 'rate', value: 1 });
      // voz sem eventos de palavra: a posição vem da estimativa por tempo (pontuação conta como pausa) e avança sozinha até o fim
      ytxt = []; var ynb = [];
      yw.speechSynthesis.speak = function (u) { ytxt.push(u.text); ycur = u; u.onstart && u.onstart(); ytm = setTimeout(function () { ycur = null; u.onend && u.onend(); }, 2600); };
      yw.speechSynthesis.cancel = function () { clearTimeout(ytm); if (ycur) { var u0 = ycur; ycur = null; u0.onerror && u0.onerror({ error: 'canceled' }); } };
      D().on('wordpos', function (e) { ynb.push(e.ci); });
      D().startTts(0, 0);
      await until(function () { return ynb.length >= 8 && ynb.slice(-1)[0] > yfull.length * 0.6; }, 30000);
      var ymono = true; for (var yi = 1; yi < ynb.length; yi++) if (ynb[yi] < ynb[yi - 1]) ymono = false;
      ok('Y3 sem evento de palavra da voz, o destaque avança por estimativa, sem voltar atrás e chegando perto do fim da frase', ymono && ynb.slice(-1)[0] > yfull.length * 0.6, 'avanços=' + ynb.length + ' último=' + ynb.slice(-1)[0] + '/' + yfull.length);
      D().stopTts(); await wait(300);
      D().$('lb-back').click(); await wait(300);
      // ===================== A. alinhamento de palavras entre idiomas (ordem diferente: laborious diligence = diligência laboriosa) =====================
      var aen = 'The laborious diligence of the old merchant wins every single day.', apt = 'A diligência laboriosa do velho comerciante vence todos os dias.';
      var aat = function (txt, w) { return txt.indexOf(w); };
      var aEnPt = function (w) { return D().mapPos(aen, aen.indexOf(w), apt, 'en'); }, aPtEn = function (w) { return D().mapPos(apt, apt.indexOf(w), aen, 'pt'); };
      ok('AL1 EN falado, PT na tela: "laborious" cai em "laboriosa" e "diligence" em "diligência" (adjetivo e substantivo trocados)', aEnPt('laborious') === aat(apt, 'laboriosa') && aEnPt('diligence') === aat(apt, 'diligência') && aEnPt('merchant') === aat(apt, 'comerciante'), 'laborious->' + aEnPt('laborious') + ' (esperado ' + aat(apt, 'laboriosa') + ') diligence->' + aEnPt('diligence') + ' (esperado ' + aat(apt, 'diligência') + ') merchant->' + aEnPt('merchant') + ' (esperado ' + aat(apt, 'comerciante') + ')');
      ok('AL2 PT falado, EN na tela: "diligência" cai em "diligence" e "laboriosa" em "laborious"', aPtEn('diligência') === aat(aen, 'diligence') && aPtEn('laboriosa') === aat(aen, 'laborious') && aPtEn('comerciante') === aat(aen, 'merchant'), 'diligência->' + aPtEn('diligência') + ' (esperado ' + aat(aen, 'diligence') + ') laboriosa->' + aPtEn('laboriosa') + ' (esperado ' + aat(aen, 'laborious') + ')');
      var aord = true, alast = -1; aen.replace(/[A-Za-z]+/g, function (m0, off) { var q = D().mapPos(aen, off, apt, 'en'); if (q < alast - 20) aord = false; alast = Math.max(alast, q); return m0; });
      ok('AL3 o resto da frase segue em ordem (sem saltos para trás além da troca das vizinhas)', aord);
      // ponta a ponta no teleprompter: a palavra acesa é a certa quando a voz diz "diligence"
      await D().addText('Alinhar teste', aen + '\n\n' + aen);
      await until(function () { return D().doc && D().doc.title === 'Alinhar teste'; }, 20000);
      await wait(600);
      D().doc.tr[0] = [apt]; D().doc.tr[1] = [apt];
      post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'en' }); await wait(300);
      D().setMode('tele');
      await until(function () { return /^A dilig/.test((idoc().getElementById('lb-tele-line').dataset || {}).text || ''); }, 30000);
      D().stopTts();
      D().emit('piece', { p: 0, s: 0, text: aen, lang: 'en' });
      var ahit = {};
      ['laborious', 'diligence', 'merchant'].forEach(function (w) {
        D().emit('wordpos', { ci: aen.indexOf(w), len: aen.length, text: aen, lang: 'en' });
        var nw = idoc().querySelector('#lb-tele-line .tl-w.now'); ahit[w] = nw ? nw.textContent : null;
      });
      ok('AL4 no teleprompter, quando a voz diz "laborious" acende "laboriosa", em "diligence" acende "diligência" e em "merchant" acende "comerciante"', ahit.laborious === 'laboriosa' && ahit.diligence === 'diligência' && ahit.merchant === 'comerciante', JSON.stringify(ahit));
      // palavras sem parentesco de grafia (big = grande): o alinhamento usa a tradução da palavra solta pelo tradutor local
      var tdict = { house: 'casa', stands: 'fica', here: 'aqui', today: 'hoje', big: 'grande' }, tOrig = D().translateText;
      D().translateText = async function (w) { return tdict[w] || null; };
      var ben = 'The big house stands here today.', bpt = 'A casa grande fica aqui hoje.';
      var bBefore = D().mapPos(ben, ben.indexOf('big'), bpt, 'en');
      await D().alignPrepare(ben, 'en');
      var bBig = D().mapPos(ben, ben.indexOf('big'), bpt, 'en'), bHouse = D().mapPos(ben, ben.indexOf('house'), bpt, 'en');
      D().translateText = tOrig;
      ok('AL5 palavras sem parentesco de grafia: com a tradução da palavra solta, big cai em grande e house em casa', bBig === bpt.indexOf('grande') && bHouse === bpt.indexOf('casa'), 'antes=' + bBefore + ' big->' + bBig + ' (esperado ' + bpt.indexOf('grande') + ') house->' + bHouse + ' (esperado ' + bpt.indexOf('casa') + ')');      D().setMode('single'); post({ type: 'readlang', value: 'pt' }); post({ type: 'audiolang', value: 'pt' }); await wait(300);
      D().$('lb-back').click(); await wait(300);      // ==== PROXIMAS ====
      document.querySelectorAll('.chapter-link')[0].click(); await wait(600);
      ok('T4 num capítulo do livro, o Raio-X volta e o Teleprompter some', !$('btn-raiox').hidden && $('btn-tele').hidden);
    } catch (e) { fails++; out.push('FAIL exceção: ' + e + ' ' + (e && e.stack ? e.stack.split('\n')[1] : '')); }
    out.push('RESULTADO: ' + (fails ? fails + ' falha(s)' : 'tudo certo'));
    live();
  });
})();
</script>
'@

$html = [IO.File]::ReadAllText("$tmp\index.html", $enc)
$html = $html -replace '(?i)</body>', ($test + '</body>')
$testFile = "$tmp\__test.html"
[IO.File]::WriteAllText($testFile, $html, $enc)
$prof = Join-Path $tmp 'profile'
$outFile = Join-Path $tmp 'out.txt'
Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', '--autoplay-policy=no-user-gesture-required', "--user-data-dir=`"$prof`"",
    '--window-size=1400,900', '--virtual-time-budget=2400000', '--allow-file-access-from-files', '--dump-dom',
    "`"file:///$($testFile.Replace('\','/'))`"") -Wait -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError "$tmp\err.txt"
$dom = [IO.File]::ReadAllText($outFile)
$m = [regex]::Match($dom, '(?s)<pre id="result"[^>]*>(.*?)</pre>')
if (-not $m.Success) { 'Teste não produziu resultado. Erros do Chrome:'; Get-Content "$tmp\err.txt" -TotalCount 15; exit 2 }
[System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($m.Groups[1].Value -match 'FAIL') { exit 1 }
exit 0
