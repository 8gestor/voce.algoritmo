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
      var links = document.querySelectorAll('.chapter-link'); links[links.length - 2].click();
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
      ok('E3 painel mostra a sequência e os blocos do dia', idoc().querySelectorAll('.lb-prog .lb-tile').length === 5 && /^3/.test(idoc().querySelector('.lb-prog .lb-tile-big').textContent), idoc().querySelector('.lb-prog .lb-tile-big').textContent);
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
      // ===================== K. trilha gamificada (trilha.html) =====================
      var tlk = document.querySelectorAll('.chapter-link');
      ok('K1 aba Trilha fica abaixo do Leitor de PDF', /Trilha/.test(tlk[tlk.length - 1].textContent) && /PDF/.test(tlk[tlk.length - 2].textContent));
      tlk[tlk.length - 1].click();
      await until(function () { return W().__ddJogo && W().DDLab; }, 8000);
      var w2 = W(), J = w2.__ddJogo, DD = w2.DDLab;
      w2.DD_TRANSLATOR_FACTORY = function (a, b) { return { translate: async function (t) { await wait(2); return '[' + b + '] ' + t; } }; };
      w2.speechSynthesis.cancel = function () {};
      w2.speechSynthesis.speak = function (u) { w2.__said = u.text; u.onstart && u.onstart(); setTimeout(function () { u.onend && u.onend(); }, 5); };
      w2.webkitSpeechRecognition = w2.SpeechRecognition = function () { this.start = function () { var me = this; setTimeout(function () { me.onresult({ results: [[{ transcript: J.run.ex.answer }]] }); }, 10); }; };
      J.reset(); await wait(100);
      var jq = function (s) { return w2.document.querySelector(s); };
      var jqa = function (s) { return Array.prototype.slice.call(w2.document.querySelectorAll(s)); };
      var clickOpt = function (text) { var b = jqa('.tj-opt').filter(function (x) { return x.textContent.toLowerCase() === String(text).toLowerCase(); })[0]; if (b) b.click(); return !!b; };
      var clickWrong = function (answer) { var b = jqa('.tj-opt').filter(function (x) { return x.textContent !== answer; })[0]; b.click(); };
      var nextBtn = async function () { await until(function () { return jq('#tj-next'); }, 3000); jq('#tj-next').click(); await wait(25); };
      var plain = function (s) { return s.normalize('NFD').replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), ''); };
      ok('K2 contrações e acentos não atrapalham a correção', J.accept("I'm Ana.", ['I am Ana.']) === 'ok' && J.accept('my name is ana', ['My name is Ana.']) === 'ok' && J.accept('Sao Paulo', ['S' + String.fromCharCode(227) + 'o Paulo']) === 'ok' && J.accept('I do not work', ["I don't work"]) === 'ok', [J.accept("I'm Ana.", ['I am Ana.']), J.accept('my name is ana', ['My name is Ana.']), J.accept('Sao Paulo', ['Sa' + String.fromCharCode(227) + 'o Paulo']), J.accept('I do not work', ["I don't work"]), J.tokens('Sao Paulo').join('|'), J.tokens('Sa' + String.fromCharCode(227) + 'o Paulo').join('|')].join(','));
      ok('K2b erro de uma letra é "quase" e frase errada é recusada', J.accept('My name is Annn.', ['My name is Anna.']) === 'near' && J.accept('I Ana', ['I am Ana.']) === 'bad');
      ok('K2c explicação: português nos mundos iniciais, inglês depois', J.explain({ pt: 'a', en: 'b' }, 1).main === 'a' && J.explain({ pt: 'a', en: 'b' }, 3).main === 'b' && J.explain({ pt: 'a', en: 'b' }, 2).open === true);
      await wait(700);
      ok('K3 a barra principal não mostra o botão Legenda na Trilha', topd.getElementById('btn-legenda').hidden === true && topd.defaultView.getComputedStyle(topd.getElementById('btn-legenda')).display === 'none', 'hidden=' + topd.getElementById('btn-legenda').hidden + ' display=' + topd.defaultView.getComputedStyle(topd.getElementById('btn-legenda')).display + ' src=' + ifr().src.slice(-12));
      ok('K4 mapa: Mundo 1 tem 6 missões e o chefão, só a primeira aberta', jqa('.tj-node').length === 7 && jqa('.tj-node.tj-locked').length === 6 && !!jq('.tj-node[data-id="w1m1"] .tj-go'), jqa('.tj-node').length + ' nós');
      jq('.tj-node[data-id="w1m1"] .tj-go').click(); await wait(80);
      ok('K5 abrir a missão mostra objetivo, fala do professor e as etapas', !!jq('#tj-start') && !!jq('.tj-teach') && jqa('.tj-steps li').length === 5);
      jq('#tj-start').click(); await wait(80);
      ok('K6 etapa Descobrir: barra de etapas e cena em balões', jqa('.tj-phase').length === 5 && jqa('.tj-phase.on')[0].textContent === 'Descobrir' && jqa('.tj-bubble').length === 1);
      var nl = J.run.m.scene.length;
      for (var li = 0; li < nl; li++) {
        await until(function () { return jqa('.tj-opt').length > 0 && !jqa('.tj-opt')[0].disabled; }, 3000);
        if (li === 0) clickWrong(J.run.ex.answer); else clickOpt(J.run.ex.answer);
        await nextBtn();
      }
      ok('K6b errar não pune: mostra o certo e segue; precisão cai', J.run.stat.ok === nl - 1 && J.run.stat.n === nl, J.run.stat.ok + '/' + J.run.stat.n);
      ok('K7 etapa Notar: o aluno responde antes de ver a regra', J.run.phases[J.run.pi] === 'notice' && jqa('.tj-opt').length === 3 && !jq('.tj-rule'));
      clickOpt(J.run.ex.answer); await wait(60);
      ok('K7b depois de responder aparecem regra, tabela e contraste', !!jq('.tj-rule') && !!jq('.tj-table') && !!jq('.tj-contrast'));
      await nextBtn();
      var drive = async function (wrongFirst) {
        var guard = 0, wrongDone = !wrongFirst, requeued = null;
        while (J.run && J.run.phases[J.run.pi] === 'practice' && guard++ < 150) {
          if (J.run.qi >= J.run.queue.length) { await nextBtn(); continue; }
          var ex = J.run.queue[J.run.qi];
          await until(function () { return jq('.tj-ex') && (jqa('.tj-opt').length || jq('#tj-ta') || jq('#tj-pool')); }, 3000);
          if (ex.kind === 'listen_pt') { if (!wrongDone) { var q0 = J.run.queue.length; clickWrong(ex.f.pt); wrongDone = true; await wait(40); requeued = J.run.queue.length === q0 + 1; } else clickOpt(ex.f.pt); }
          else if (ex.kind === 'see_en') clickOpt(ex.f.en);
          else if (ex.kind === 'cloze') clickOpt(ex.c.answer[0]);
          else if (ex.kind === 'type_en' || ex.kind === 'dictate') { jq('#tj-ta').value = plain(ex.kind === 'type_en' ? ex.f.en : ex.b.en[0]); jq('#tj-check').click(); }
          else if (ex.kind === 'build') { var ws = ex.b.en[0].split(/\s+/); for (var wi = 0; wi < ws.length; wi++) { var tile = jqa('#tj-pool .tj-tile').filter(function (t) { return t.dataset.w === ws[wi]; })[0]; tile.click(); } jq('#tj-check').click(); }
          await nextBtn();
        }
        return requeued;
      };
      var rq = await drive(true);
      ok('K8 praticar: erro volta para a fila e a prática termina', rq === true && J.run.phases[J.run.pi] === 'speak', 'fila=' + J.run.queue.length);
      ok('K8b domínio por palavra sobe com acertos e agenda revisão', J.S.items['w1m1:hello'].lvl >= 1 && J.S.items['w1m1:hello'].due > Date.now());
      for (var si = 0; si < J.run.m.speak.length; si++) { await until(function () { return jq('#tj-mic') && !jq('#tj-mic').disabled; }, 3000); jq('#tj-mic').click(); await nextBtn(); }
      ok('K9 falar: reconhecimento de voz acerta e conta conquista', J.S.stats.spoken >= 1 && !!J.S.ach.speaker && J.run.phases[J.run.pi] === 'write');
      jq('#tj-ta').value = 'hello'; jq('#tj-check').click(); await wait(60);
      ok('K10 escrever: resposta incompleta recebe dicas sem passar', jqa('.tj-checks li').length === 2 && jqa('.tj-checks .lb-miss').length >= 1 && !J.run.wrote);
      jq('#tj-ta').value = J.run.m.write.model; jq('#tj-check').click(); await wait(60);
      ok('K10b escrever: frase certa passa e mostra o modelo', J.run.wrote === true && J.S.stats.written >= 1);
      await nextBtn();
      var sm = J.S.missions.w1m1;
      ok('K11 missão concluída: estrelas, XP e botão da próxima missão', sm && sm.done && sm.stars >= 1 && J.S.xp > 100 && !!jq('.tj-stars-big') && !!jq('#tj-next-mission'), JSON.stringify(sm) + ' xp=' + J.S.xp);
      ok('K11b conquistas: primeiro passo e primeira frase', !!J.S.ach.first && !!J.S.ach.writer);
      jq('#tj-map').click(); await wait(80);
      ok('K12 a missão 2 abre por evidência', !jq('.tj-node[data-id="w1m2"]').classList.contains('tj-locked') && jq('.tj-node[data-id="w1m3"]').classList.contains('tj-locked'));
      jqa('.tj-node[data-id="w1m3"] button').filter(function (b) { return /Liberar/.test(b.textContent); })[0].click(); await wait(60);
      ok('K12b "liberar mesmo assim" destrava sem bloquear o aluno', J.S.missions.w1m2.free === true && !jq('.tj-node[data-id="w1m3"]').classList.contains('tj-locked'));
      Object.keys(J.S.items).slice(0, 5).forEach(function (k) { J.S.items[k].due = Date.now() - 1000; }); J.save(); J.showMap(); await wait(60);
      ok('K13 revisão do dia aparece quando há palavras vencidas', !!jq('#tj-review-btn'));
      jq('#tj-review-btn').click(); await wait(80);
      await drive(false);
      ok('K13b terminar a revisão dá XP, conquista e volta ao mapa', J.S.stats.reviews === 1 && !!J.S.ach.review, 'rev=' + J.S.stats.reviews);
      var yday = J.dayKey(Date.now() - 86400000), d2 = J.dayKey(Date.now() - 2 * 86400000), d5 = J.dayKey(Date.now() - 5 * 86400000);
      J.S.streak = { n: 4, last: yday, shield: 1 }; J.touchDay(); var st1 = J.S.streak.n;
      J.S.streak = { n: 4, last: d2, shield: 1 }; J.touchDay(); var st2 = J.S.streak.n + '/' + J.S.streak.shield;
      J.S.streak = { n: 4, last: d5, shield: 1 }; J.touchDay(); var st3 = J.S.streak.n;
      ok('K14 sequência gentil: dia seguinte soma, um dia faltado usa o escudo, muito tempo recomeça', st1 === 5 && st2 === '5/0' && st3 === 1, st1 + ' ' + st2 + ' ' + st3);
      var bossW = J.WORLDS[0];
      J.startMission(bossW.boss, bossW, 'boss'); await wait(60); jq('#tj-start').click(); await wait(80);
      for (var bi = 0; bi < bossW.boss.turns.length; bi++) { await until(function () { return jqa('.tj-opt').length > 0 && !jqa('.tj-opt')[0].disabled; }, 3000); clickOpt(J.run.ex.answer); await nextBtn(); }
      await nextBtn();
      jq('#tj-ta').value = bossW.boss.write.model; jq('#tj-check').click(); await wait(60);
      await nextBtn();
      ok('K15 chefão: conversa certa e apresentação escrita vencem o mundo', J.S.missions.w1boss && J.S.missions.w1boss.stars >= 1 && J.S.stats.bosses === 1 && !!J.S.ach.boss1, JSON.stringify(J.S.missions.w1boss));
      jq('#tj-map').click(); await wait(60);
      w2.LanguageModel = { availability: async function () { return 'available'; }, create: async function () { return { prompt: async function (p) { return 'Corrected: I am Sam. Dica: use am.'; } }; } };
      J.startMission(J.WORLDS[0].missions[1], J.WORLDS[0], 'curriculum'); await wait(60);
      J.run.pi = J.run.phases.indexOf('write'); J.renderPhase();
      await until(function () { return jq('#tj-ai-btn'); }, 3000);
      jq('#tj-ta').value = 'I Sam'; jq('#tj-ai-btn').click();
      await until(function () { return jq('.tj-ai') && /Corrected/.test(jq('.tj-ai').textContent); }, 3000);
      ok('K16 professor virtual (IA local simulada) corrige a frase do aluno', !!jq('.tj-ai') && /Corrected/.test(jq('.tj-ai').textContent));
      var kpar = function (k) { return ['Surveillance capitalism harvests behavioural surplus number ' + k + ' every single day.', 'Platforms predict what people will do tomorrow morning.', 'Nobody explains how these hidden systems really work.', 'Algorithms rank every message before anyone reads it.', 'Companies sell predictions about our future behaviour.', 'Citizens rarely notice this quiet economic exchange.'].join(' '); };
      await DD.addText('Texto da trilha', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(kpar).join('\n\n'));
      await until(function () { return DD.doc && DD.doc.title === 'Texto da trilha'; }, 20000);
      var tid = DD.doc.id; DD.$('lb-back').click(); await wait(300); J.showMap(); await wait(120);
      ok('K18 a Trilha não tem painel de textos próprios nem escolha de PDF', !jq('#tj-texts') && !jq('#tj-text-src') && !jq('#tj-text-make'));
      var tdoc = await DD.db.get('docs', tid), tchs = J.chaptersOf(tdoc.paras, 450).map(function (c, i) { return { from: c.from, to: c.to, n: i + 1 }; });
      J.S.texts.push({ id: tid, docId: tid, title: 'Texto da trilha', chapters: tchs }); J.save();
      ok('K18b o motor divide o texto em partes de leitura', tchs.length >= 2, tchs.length + ' partes');
      J.startTextMission({ m: { id: 't:' + tid + ':0', n: 1 }, text: J.S.texts[0], ch: tchs[0] });
      await until(function () { return jq('#tj-start'); }, 8000);
      var tl = J.run.m;
      ok('K18c missão de leitura gera cena traduzida, palavras, frases, shadowing, discussão e escrita', tl.scene.length >= 3 && tl.focus.length >= 2 && tl.build.length >= 1 && tl.cloze.length >= 1 && tl.speak.length >= 1 && tl.discuss.length === 3 && !!tl.write && !tl.pattern, tl.scene.length + ' falas, ' + tl.focus.length + ' palavras');
      ok('K18d as etapas seguem o método: ler, palavras, shadowing, conversar, escrever', J.run.phases.join(',') === 'scene,practice,speak,discuss,write' && tl.speak[0].tip.indexOf('Shadowing') === 0 && tl.focus.every(function (f) { return f.pt && f.tip; }));
      J.run.pi = J.run.phases.indexOf('discuss'); J.renderPhase(); await wait(80);
      var dsteps = jqa('#tj-phases .tj-phase').map(function (e) { return e.textContent; });
      ok('K18e etapa Conversar mostra a pergunta em inglês, a dica e a resposta por texto', dsteps.indexOf('Conversar') >= 0 && /What is this part about/.test(document.body.textContent) && !!jq('#tj-dta') && !!jq('#tj-dcheck'));
      jq('#tj-dta').value = 'ok'; jq('#tj-dcheck').click(); await wait(80);
      ok('K18f resposta curta recebe dica e não passa', /pelo menos 5 palavras/.test(jq('#tj-dres').textContent) && !jq('#tj-next'));
      var answers = ['This part is about surveillance capitalism and behavioural surplus', 'I find the predictions idea interesting because platforms know my habits', 'Yes I agree with the text because companies sell our behaviour'];
      for (var di = 0; di < 3; di++) {
        jq('#tj-dta').value = answers[di]; jq('#tj-dcheck').click();
        await until(function () { return jq('#tj-dres #tj-next'); }, 4000);
        if (di === 0) ok('K18g resposta boa passa, mostra uma resposta possível e libera a próxima pergunta', /Muito bem/.test(jq('#tj-dres').textContent) && /Uma resposta poss/.test(jq('#tj-dres').textContent));
        jq('#tj-dres #tj-next').click(); await wait(60);
      }
      ok('K18h a conversa termina, conta as respostas e segue para a escrita', J.S.stats.discussed >= 3 && !!jq('#tj-next'), 'discussed=' + J.S.stats.discussed);
      jq('#tj-home').click(); await wait(60);
      J.showMap(); await wait(120);
      ok('K19 o mapa mostra Nossa evolução e não mostra Lendo agora', !jq('#tj-texts') && !!jq('#tj-evo'));
      var evn = jqa('#tj-nums .tj-num-card').map(function (c) { return c.textContent; });
      ok('K19b números da evolução: nível, XP, sequência, missões, estrelas, palavras, falas, escritas, conversas, precisão', evn.length === 11 && evn.some(function (t) { return /^\d+N.vel$/.test(t); }) && evn.some(function (t) { return /^\d+\/7Miss/.test(t); }) && evn.some(function (t) { return /^\d+%Precis/.test(t); }) && evn.some(function (t) { return /^\d+ de \d+Palavras/.test(t); }) && evn.some(function (t) { return /^\d+Respostas na conversa$/.test(t); }), evn.join(' | '));
      var E = J.evolution();
      ok('K19c a linha do tempo tem 14 dias e destaca o dia de hoje com XP', jqa('#tj-timeline .tj-tl-col').length === 14 && jqa('#tj-timeline .tj-tl-bar.on').length >= 1 && E.days[13].xp > 0, 'xp hoje=' + E.days[13].xp);
      var lm = jq('.tj-learn[data-id="w1m1"]');
      ok('K19d o que já aprendemos: palavras da missão 1 com tradução e domínio', !!lm && lm.querySelectorAll('.tj-words li').length === 8 && /Hello/.test(lm.textContent) && lm.querySelectorAll('.tj-dots').length === 8, lm && lm.querySelectorAll('.tj-words li').length + ' itens');
      ok('K19e estruturas descobertas aparecem com a regra e a tabela', !!jq('.tj-pat[data-id="w1m1"]') && jqa('.tj-pat').length >= 1 && !!jq('.tj-pat table'));
      var tx = jq('.tj-textlearn');
      ok('K19f a evolução mostra o texto estudado: partes, palavras do texto e domínio', !!tx && /Texto da trilha/.test(tx.textContent) && E.texts.length === 1 && E.texts[0].items.length >= 2 && tx.querySelectorAll('.tj-dots').length === E.texts[0].items.length, tx && tx.querySelector('summary').textContent);
      var before = E.mastered; J.reset(); await wait(100);
      ok('K19g sem histórico, o painel só convida a fazer a primeira missão', !!jq('#tj-evo') && !jq('#tj-nums') && /primeira miss/.test(jq('#tj-evo').textContent) && before > 0);      // ==== PROXIMAS ====
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
    '--window-size=1400,900', '--virtual-time-budget=900000', '--allow-file-access-from-files', '--dump-dom',
    "`"file:///$($testFile.Replace('\','/'))`"") -Wait -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError "$tmp\err.txt"
$dom = [IO.File]::ReadAllText($outFile)
$m = [regex]::Match($dom, '(?s)<pre id="result"[^>]*>(.*?)</pre>')
if (-not $m.Success) { 'Teste não produziu resultado. Erros do Chrome:'; Get-Content "$tmp\err.txt" -TotalCount 15; exit 2 }
[System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($m.Groups[1].Value -match 'FAIL') { exit 1 }
exit 0
