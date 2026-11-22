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
      var links = document.querySelectorAll('.chapter-link'); links[links.length - 1].click();
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
      ok('L13 depois de ler, a semana 2 aparece como lida e as outras 7 continuam disponíveis', /lido/.test(idoc().querySelector('.lb-rot-item[data-slug="epicteto-enchiridion"] .lb-rot-done').textContent) && !idoc().getElementById('lb-rot-2') && idoc().querySelectorAll('#lb-rot button').length === 7);
      W().localStorage.removeItem('dd-ingles-semana'); W().localStorage.removeItem('dd-ingles-semana-hist');      // ===================== M. modos de leitura (seletor único) e cabeçalho do leitor =====================
      post({ type: 'readlang', value: 'pt' }); await wait(200);
      W().localStorage.removeItem('dd-ingles-modo');
      var sbook = [1, 2, 3, 4, 5, 6].map(function (k) { return 'Of things some are in our power, and others are not, so we must learn to tell them apart number ' + k + '. Nobody can compel you unless you let that happen to you.'; }).join('\n\n');
      await D().addText('Modos de leitura teste', sbook);
      await until(function () { return D().doc && D().doc.title === 'Modos de leitura teste'; }, 20000);
      var msel = idoc().getElementById('lb-read-mode');
      ok('M1 um seletor reúne os 4 modos de leitura, começa em coluna única e o corpo não tem classe de modo', !!msel && idoc().querySelector('.lb-toolbar').contains(msel) && Array.prototype.map.call(msel.options, function (o) { return o.value; }).join(',') === 'single,wide,side,focus' && msel.value === 'single' && !/lb-(wide|side|focus)-open/.test(idoc().body.className) && /Coluna única/.test(msel.options[0].textContent));
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
      var nbook = [1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { return 'Of things some are in our power, and others are not, so we must learn to tell them apart number ' + k + '. Nobody can compel you unless you let that happen to you.'; }).join('\n\n');
      await D().addText('Salvar leitura teste', nbook);
      await until(function () { return D().doc && D().doc.title === 'Salvar leitura teste'; }, 20000);
      var nid2 = D().doc.id; await wait(700);   // deixa o evento de rolagem da abertura terminar
      D().doc.pos = 4; D().doc.heard = 120;
      Object.defineProperty(W().document, 'visibilityState', { get: function () { return 'hidden'; }, configurable: true });
      W().document.dispatchEvent(new (W().Event)('visibilitychange'));
      Object.defineProperty(W().document, 'visibilityState', { get: function () { return 'visible'; }, configurable: true });
      await wait(400);
      var mir = JSON.parse(W().localStorage.getItem('dd-ingles-sessao') || 'null'), mdb = await D().db.get('meta', nid2);
      ok('N1 ao ocultar ou fechar a aba, a posição e as palavras ouvidas são gravadas na hora (espelho síncrono e banco)', !!mir && mir.id === nid2 && mir.pos === 4 && mir.heard === 120 && mdb.pos === 4 && mdb.heard === 120 && mdb.savedAt > 0, JSON.stringify(mir));
      D().$('lb-back').click(); await wait(250);
      var mold = await D().db.get('meta', nid2); mold.pos = 1; mold.heard = 10; mold.savedAt = 1000; await D().db.put('meta', mold);
      await D().openDoc(nid2); await until(function () { return D().doc && D().doc.id === nid2; }, 5000);
      ok('N2 se o banco ficou para trás (aba fechada antes de gravar), ao reabrir vale o espelho mais novo', D().doc.pos === 4 && D().doc.heard === 120, 'pos=' + D().doc.pos + ' ouvidas=' + D().doc.heard);
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
      ok('O3 ler a cota do dia fecha o bloco de leitura sozinho', idoc().querySelector('.lb-sess-row[data-block="read"]').classList.contains('done'));
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
      await W().__ddProg.resetAll(); await wait(300);      // ==== PROXIMAS ====
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
