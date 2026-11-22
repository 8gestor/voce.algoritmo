<#
  test_ingles.ps1 — confere, no Chrome, a aba "Estudo de Inglês" (leitor de PDF bilíngue).

  Gera um PDF de teste (Chrome --print-to-pdf), abre index.html e verifica:
    1  o menu tem a seção ESTUDO DE INGLÊS depois do índice, fora de `structure` e das estatísticas
    2  limpeza do texto (unidade): cabeçalho/rodapé repetido sai, hifenização junta, título vira 'h'
    3  importar PDF: texto extraído, idioma detectado (EN), cabeçalho do PDF removido
    4  LER PT: toda frase traduzida, com PARIDADE de frases (mesmo número em cada parágrafo)
    5  OUVIR PT: a narração fala a frase traduzida, com a voz certa (pt-BR), na ordem
    6  trocar o idioma do áudio no meio da fala volta à frase, agora em EN (en-US)
    7  biblioteca: documento salvo, e a tradução volta ao reabrir
  Uso: .\tools\test_ingles.ps1 [-Chrome <caminho>]
  (Usa um tradutor simulado: o Tradutor real do Chrome não roda em teste automático.)
#>
param([string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dd-ing-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
robocopy $repo $tmp /E /XD .git .github /NFL /NDL /NJH /NJS /NP | Out-Null

# --- PDF de teste: 4 páginas, título e parágrafos em inglês; o Chrome imprime cabeçalho e rodapé repetidos
$para = 'Algorithms decide what we read, what we buy and whom we trust. This is not a neutral process, because every ranking carries a value judgement. Understanding that fact is the first step towards resisting it. The people who build these systems are rarely asked to explain them.'
$body = ''
1..4 | ForEach-Object { $body += "<div style='page-break-after:always'><h1>Chapter $_ of the test</h1><p>$para</p><p>$para $para</p></div>" }
[IO.File]::WriteAllText("$tmp\src.html", "<html lang='en'><head><meta charset='utf-8'><title>Test Journal 2026</title><style>body{font:16px serif;line-height:1.5}h1{font-size:30px}</style></head><body>$body</body></html>", $enc)
$pdf = "$tmp\teste.pdf"
Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=`"$tmp\p1`"", "--print-to-pdf=`"$pdf`"", "`"file:///$("$tmp\src.html".Replace('\','/'))`"") -Wait -NoNewWindow -RedirectStandardError "$tmp\err0.txt"
if (-not (Test-Path $pdf)) { 'Não consegui gerar o PDF de teste.'; exit 2 }
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pdf))

$test = @'
<script>
(function () {
  var out = [], fails = 0;
  function ok(name, cond, extra) { if (!cond) fails++; out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var $ = function (id) { return document.getElementById(id); };
  function ifr() { return $('content-frame'); }
  function lab() { return ifr().contentWindow.__ddLab; }
  function post(m) { ifr().contentWindow.postMessage(m, '*'); }
  async function until(fn, ms) { var t = Date.now(); while (Date.now() - t < (ms || 15000)) { try { if (fn()) return true; } catch (e) {} await wait(100); } return false; }

  window.addEventListener('load', async function () {
    try {
      await wait(1200);
      // 1. menu
      var cats = Array.prototype.map.call(document.querySelectorAll('.nav-cat'), function (e) { return e.textContent; });
      ok('1a seção ESTUDO DE INGLÊS é a última do menu', cats[cats.length - 1] === 'ESTUDO DE INGLÊS', cats.slice(-2).join(' | '));
      var links = document.querySelectorAll('.chapter-link');
      var libLink = links[links.length - 2];   // últimos extras: Biblioteca e Manual da Biblioteca
      ok('1b Biblioteca e Manual vêm depois dos capítulos', links.length === structure.length + 2 && /^Biblioteca/.test(libLink.textContent.trim()) && /Manual/.test(links[links.length - 1].textContent), links.length + ' links');
      ok('1c fora de structure', !structure.some(function (s) { return s.f === 'ingles.html'; }));
      libLink.click();
      await until(function () { return ifr().contentWindow.__ddLab; }, 8000);
      ok('1d abre a página no quadro', !!lab(), ifr().src.slice(-12));
      ok('1e barra inferior de capítulo escondida', $('hud-live').style.display === 'none');

      // ajustes de teste, dentro do quadro
      var w = ifr().contentWindow;
      w.DD_TRANSLATOR_FACTORY = function (a, b) { return { translate: async function (t) { await new Promise(function (r) { setTimeout(r, 2); }); return '[' + b + '] ' + t; } }; };
      w.Worker = undefined;   // virtual-time do headless não anda com Web Worker: pdf.js cai para o modo sem worker
      var spoken = [];
      w.speechSynthesis.cancel = function () { if (w.__cur) { var u = w.__cur; w.__cur = null; u.onerror && u.onerror({ error: 'canceled' }); } };
      w.speechSynthesis.speak = function (u) { spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name }); w.__cur = u; u.onstart && u.onstart(); setTimeout(function () { if (w.__cur === u && u.onboundary) u.onboundary({ name: 'word', charIndex: Math.floor(u.text.length / 2) }); }, 20); setTimeout(function () { if (w.__cur === u) { w.__cur = null; u.onend && u.onend(); } }, 120); };

      // 2. limpeza (unidade)
      var L = lab();
      function ln(t, x, y, h) { return { text: t, x: x, y: y, h: h, endX: x + 300 }; }
      var pages = [];
      for (var i = 0; i < 4; i++) pages.push({ h: 800, lines: [
        ln('Test Journal 2026', 50, 780, 9), ln('The first paragraph has an extra-', 50, 700, 12), ln('ordinary hyphenated word and goes on', 50, 686, 12),
        ln('until it ends here.', 50, 672, 12), ln(i === 0 ? 'A big Title' : 'Second block starts', 50, 640, i === 0 ? 24 : 12),
        ln('and this one continues across', 50, 100, 12), ln('Page ' + (i + 1) + ' of 4', 300, 20, 9) ] });
      var P = L.buildParagraphs(pages);
      var all = P.map(function (p) { return p.text; }).join(' || ');
      ok('2a cabeçalho repetido removido', all.indexOf('Test Journal') < 0, all.slice(0, 60));
      ok('2b número de página removido', !/Page \d of 4/.test(all));
      ok('2c hifenização juntada', all.indexOf('extraordinary') >= 0, '');
      ok('2d título vira h', P.some(function (p) { return p.t === 'h' && p.text === 'A big Title'; }), JSON.stringify(P.map(function (p) { return p.t; })));
      ok('2e frase partida entre páginas é reunida', /continues across The first paragraph/.test(all), all.slice(0, 200));
      ok('2f frases separadas', L.splitSentences('It was good. Then we left. Why not?', 'en').length === 3);
      ok('2g idioma detectado', L.detectLang([{ text: 'The cat is on the mat and the dog is in the house.' }]) === 'en' && L.detectLang([{ text: 'O gato está no tapete e o cachorro está na casa de que gosto.' }]) === 'pt');

      // 3. importar o PDF
      var bin = atob('__B64__'), bytes = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      var file = new File([bytes], 'artigo-teste.pdf', { type: 'application/pdf' });
      post({ type: 'readlang', value: 'en' }); post({ type: 'audiolang', value: 'en' });
      await wait(300);
      L.importFile(file);
      var opened = await until(function () { return lab().doc && lab().doc.paras.length > 0; }, 30000);
      ok('3a PDF importado e aberto', opened, opened ? lab().doc.paras.length + ' parágrafos' : 'erro: ' + ifr().contentDocument.getElementById('lb-error').textContent + ' / prog: ' + ifr().contentDocument.getElementById('lb-progress-text').textContent);
      if (!opened) throw new Error('importação falhou');
      var d = lab().doc;
      ok('3b idioma original = EN', d.lang === 'en');
      var txt = d.paras.map(function (p) { return p.s.join(' '); }).join(' ');
      ok('3c texto extraído', /Algorithms decide what we read/.test(txt));
      ok('3d cabeçalho "Test Journal" do PDF não entrou', !/Test Journal/.test(txt));
      ok('3e títulos detectados', d.paras.some(function (p) { return p.t === 'h' && /Chapter 1/.test(p.s[0]); }), d.paras.filter(function (p) { return p.t === 'h'; }).length + ' títulos');
      ok('3f frases separadas', d.paras.filter(function (p) { return p.t === 'p'; })[0].s.length >= 3);
      var shown = ifr().contentDocument.querySelector('.lb-para:not(.lb-head)').textContent;
      ok('3g tela em EN mostra o original', /^Algorithms decide/.test(shown), shown.slice(0, 40));

      // 4. LER PT + paridade
      post({ type: 'readlang', value: 'pt' });
      var done4 = await until(function () { var D = lab().doc; return D.paras.slice(0, 6).every(function (p, i) { return D.tr[i]; }); }, 15000);
      ok('4a parágrafos próximos traduzidos', done4);
      var D = lab().doc, bad = 0, n = 0;
      Object.keys(D.tr).forEach(function (i) { n++; if (D.tr[i].length !== D.paras[i].s.length) bad++; });
      ok('4b paridade de frases em todos os parágrafos traduzidos', bad === 0 && n > 0, n + ' parágrafos, ' + bad + ' diferentes');
      var spans = ifr().contentDocument.querySelectorAll('.lb-para')[1].querySelectorAll('.lb-s');
      ok('4c tela mostra a tradução, frase a frase', spans.length > 0 && Array.prototype.every.call(spans, function (s) { return /^\[pt\] /.test(s.textContent); }), spans[0] && spans[0].textContent.slice(0, 30));
      ifr().contentDocument.getElementById('lb-translate-all').click();
      var all4 = await until(function () { var D2 = lab().doc; return Object.keys(D2.tr).length === D2.paras.length; }, 30000);
      ok('4d "traduzir tudo" completa o documento', all4, Object.keys(lab().doc.tr).length + '/' + lab().doc.paras.length);

      // 5. OUVIR
      post({ type: 'audiolang', value: 'pt' }); await wait(200);
      post({ type: 'tts-toggle' });
      var started = await until(function () { return spoken.length >= 3; }, 8000);
      ok('5a narração em PT fala a tradução, com voz pt-BR', started && /^\[pt\] /.test(spoken[0].text) && spoken[0].lang === 'pt-BR', JSON.stringify(spoken[0]));
      var first = spoken[0].text.replace('[pt] ', '');
      ok('5b a primeira frase falada é a primeira do documento', first === lab().doc.paras[0].s[0], first.slice(0, 40));
      ok('5c a frase falada fica destacada', !!ifr().contentDocument.querySelector('.lb-s.seg'));
      var wd = ifr().contentDocument.querySelector('.lb-s.seg .wd.now');
      ok('5d a palavra falada fica marcada (camada de palavra)', !!wd, wd ? wd.textContent : 'sem palavra');
      ok('5e a faixa da linha acompanha a palavra', ifr().contentDocument.getElementById('lb-band').style.display === 'block');
      ok('5f o parágrafo falado fica marcado', !!ifr().contentDocument.querySelector('.lb-para.speaking'));
      await wait(400);
      ok('5g barra inferior: total de páginas e avanço', typeof labHud === 'object' && labHud && labHud.pages === 4 && labHud.total > 100 && /\/4/.test($('chapter-indicator').textContent), JSON.stringify(labHud) + ' | ' + $('chapter-indicator').textContent);
      ok('5h barra inferior mostra palavras lidas / total', $('hud-live').style.display !== 'none' && /\d/.test($('hl-total').textContent), $('hl-read').textContent + '/' + $('hl-total').textContent + ' ' + $('hl-left').textContent);
      ok('5i barra superior mostra página e %', /PÁG|PAGE/.test($('hud-top').textContent), $('hud-top').textContent);

      // 6. trocar o áudio no meio da fala
      var cur = lab().tts.cursor, n0 = spoken.length;
      post({ type: 'audiolang', value: 'en' });
      await until(function () { return spoken.length > n0; }, 3000);
      var last = spoken[n0];
      ok('6a trocar para EN fala em en-US, sem prefixo de tradução', !!last && last.lang === 'en-US' && !/^\[pt\]/.test(last.text), JSON.stringify(last || {}).slice(0, 80));
      var par = lab().doc.paras[cur.p];
      ok('6b retoma a mesma frase (paridade), no outro idioma', !!last && last.text === par.s[cur.s], (last && last.text || '').slice(0, 40) + ' | ' + (par.s[cur.s] || '').slice(0, 40));
      post({ type: 'tts-toggle' }); await wait(300);
      ok('6c segundo toque para a narração', lab().tts.playing === false);

      // 7. biblioteca
      var id = lab().doc.id;
      lab().closeDoc();
      await until(function () { return ifr().contentDocument.querySelectorAll('.lb-doc').length > 0; }, 20000);
      var rows = ifr().contentDocument.querySelectorAll('.lb-doc');
      ok('7a documento aparece na biblioteca', rows.length === 1 && /Test Journal|artigo-teste/.test(rows[0].textContent), rows.length + ' linhas; persist=' + lab().persist + ' err=' + lab().dbErr);
      if (rows.length !== 1) throw new Error('biblioteca vazia');
      ok('7b mostra 100% traduzido', /100% traduzido|100% translated/.test(rows[0].textContent), rows[0].querySelector('.lb-doc-info span').textContent.slice(-40));
      var idoc = ifr().contentDocument, sch = idoc.getElementById('lb-search');
      ok('7b1 biblioteca agrupa por situação de leitura', idoc.querySelectorAll('.lb-group').length >= 1 && !!idoc.querySelector('.lb-doc-prog'), idoc.querySelector('.lb-group') && idoc.querySelector('.lb-group').textContent);
      sch.value = 'zzzz-nao-existe'; sch.dispatchEvent(new Event('input')); await until(function () { return idoc.querySelectorAll('.lb-doc').length === 0; }, 20000);
      ok('7b2 busca sem resultado esconde os documentos', idoc.querySelectorAll('.lb-doc').length === 0);
      sch.value = ''; sch.dispatchEvent(new Event('input')); await until(function () { return idoc.querySelectorAll(".lb-doc").length === 1; }, 20000);
      ok('7b3 limpar a busca traz o documento de volta', idoc.querySelectorAll('.lb-doc').length === 1);
      await lab().openDoc(id); await wait(500);
      ok('7c reabrir recupera as traduções salvas', Object.keys(lab().doc.tr).length === lab().doc.paras.length, Object.keys(lab().doc.tr).length + '');
      var spd = Array.prototype.map.call($('speed-select').options, function (o) { return o.value; }).join(',');
      var spdExp = []; for (var si = 1; si <= 30; si++) spdExp.push(String(si / 10));
      ok('V1 o menu de velocidade do site vai de 0,1 a 3 em passos de 0,1 (30 opções)', spd === spdExp.join(','), spd.slice(0, 60) + '...');
      var fsCalls = 0; document.documentElement.requestFullscreen = function () { fsCalls++; return Promise.resolve(); };
      var f11 = new KeyboardEvent('keydown', { key: 'F11', bubbles: true, cancelable: true }); window.dispatchEvent(f11);
      var fsShell = fsCalls;
      ifr().contentWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11', bubbles: true, cancelable: true })); await wait(300);
      ok('V2 F11 liga a tela inteira no site e também quando apertado dentro da página (Biblioteca)', f11.defaultPrevented && fsShell === 1 && fsCalls === 2, 'chamadas=' + fsCalls);
      // manual da biblioteca: abre pelo menu, mostra PT e troca para EN com o idioma de leitura do site
      var mlinks = document.querySelectorAll('.chapter-link'); mlinks[mlinks.length - 1].click();
      await until(function () { try { return ifr().contentDocument.getElementById('mn-pt') && ifr().contentDocument.readyState === 'complete'; } catch (e) { return false; } }, 10000);
      var md = ifr().contentDocument;
      var ptOn = !md.getElementById('mn-pt').hidden && md.getElementById('mn-en').hidden && md.querySelectorAll('#mn-pt h2').length === 9;
      post({ type: 'readlang', value: 'en' }); await wait(300);
      ok('M1 o Manual da Biblioteca abre pelo menu em português (9 seções) e troca para inglês com o idioma de leitura', ptOn && md.getElementById('mn-pt').hidden && !md.getElementById('mn-en').hidden && md.querySelectorAll('#mn-en h2').length === 9, 'PT visível=' + ptOn);
      post({ type: 'readlang', value: 'pt' });
    } catch (e) { fails++; out.push('FAIL exceção: ' + e + ' ' + (e && e.stack ? e.stack.split('\n')[1] : '')); }
    out.push('RESULTADO: ' + (fails ? fails + ' falha(s)' : 'tudo certo'));
    var pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = out.join('\n'); document.body.appendChild(pre);
  });
})();
</script>
'@
$test = $test.Replace('__B64__', $b64)

$html = [IO.File]::ReadAllText("$tmp\index.html", $enc)
$html = $html -replace '(?i)</body>', ($test + '</body>')
$testFile = "$tmp\__test.html"
[IO.File]::WriteAllText($testFile, $html, $enc)

$prof = Join-Path $tmp 'profile'
$outFile = Join-Path $tmp 'out.txt'
Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=`"$prof`"",
    '--window-size=1400,900', '--virtual-time-budget=240000', '--allow-file-access-from-files', '--dump-dom',
    "`"file:///$($testFile.Replace('\','/'))`"") -Wait -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError "$tmp\err.txt"
$dom = [IO.File]::ReadAllText($outFile)
$m = [regex]::Match($dom, '(?s)<pre id="result">(.*?)</pre>')
if (-not $m.Success) { 'Teste não produziu resultado. Erros do Chrome:'; Get-Content "$tmp\err.txt" -TotalCount 15; exit 2 }
[System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($m.Groups[1].Value -match 'FAIL') { exit 1 }
exit 0
