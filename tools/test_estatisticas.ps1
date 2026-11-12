<#
  test_estatisticas.ps1 — confere, no Chrome, o menu lateral, as barras superior/inferior e a página final.

  Abre index.html (leitor) e verifica:
    1  menu: maiúsculas, fonte acompanha a do texto (Literata / Atkinson / JetBrains Mono),
       barra de rolagem do menu transparente e sem barra horizontal
    2  barra superior mostra os totais do capítulo (PT e EN) iguais aos de estatisticas-dados.js
    3  rolar o capítulo de verdade avança o "lido" (inferior), grava em dd-stats e chega a 100%
    4  mudar de idioma NÃO credita leitura; a barra muda de idioma
    5  palavras ouvidas (dd-listen) são somadas
    6  página final: uma linha por capítulo, totais iguais, % lido do capítulo rolado
    7  zerar apaga o avanço
  Uso: .\tools\test_estatisticas.ps1 [-Chrome <caminho>]
#>
param([string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dd-stat-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
robocopy $repo $tmp /E /XD .git .github /NFL /NDL /NJH /NJS /NP | Out-Null

$test = @'
<script>
(function () {
  var out = [], fails = 0;
  function ok(name, cond, extra) { if (!cond) fails++; out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var $ = function (id) { return document.getElementById(id); };
  function store() { try { return JSON.parse(localStorage.getItem('dd-stats') || '{}'); } catch (e) { return {}; } }
  function ones(s) { var n = 0; for (var i = 0; i < (s || '').length; i++) if (s[i] === '1') n++; return n; }
  function ifr() { return $('content-frame'); }

  window.addEventListener('load', async function () {
    try {
      localStorage.removeItem('dd-stats');
      await wait(1500);
      var S = STATS.chapters['cap01.html'];
      var nfPt = new Intl.NumberFormat('pt-BR'), nfEn = new Intl.NumberFormat('en-US');

      // 1. menu
      var link = document.querySelector('.chapter-link'), cs = getComputedStyle(link);
      ok('1a menu em maiúsculas', cs.textTransform === 'uppercase', cs.textTransform);
      setOption('theme', 'paper'); setOption('face', 'serif'); await wait(100);
      ok('1b papel+serif: menu usa Literata', /Literata/.test(getComputedStyle(link).fontFamily), getComputedStyle(link).fontFamily);
      setOption('face', 'legible'); await wait(100);
      ok('1c legível: menu usa Atkinson', /Atkinson/.test(getComputedStyle(link).fontFamily), getComputedStyle(link).fontFamily);
      setOption('face', 'mono'); await wait(100);
      ok('1d mono: menu usa JetBrains Mono', /JetBrains/.test(getComputedStyle(link).fontFamily), getComputedStyle(link).fontFamily);
      setOption('face', 'serif'); await wait(100);
      var nav = $('nav-container');
      ok('1e barra de rolagem do menu é transparente em repouso', /rgba\(0, 0, 0, 0\)/.test(getComputedStyle(nav).scrollbarColor), getComputedStyle(nav).scrollbarColor);
      ok('1f menu sem barra horizontal', nav.scrollWidth <= nav.clientWidth + 1, nav.scrollWidth + ' <= ' + nav.clientWidth);

      // 2. barra superior
      loadChapter(1); await wait(2000);                       // cap01
      var top = $('hud-top').textContent;
      ok('2a topo mostra palavras PT do capítulo', top.indexOf(nfPt.format(S.pt)) >= 0, top);
      ok('2b topo mostra palavras EN do capítulo', top.indexOf(nfPt.format(S.en)) >= 0);
      ok('2c topo mostra tempo de leitura em minutos', /\d+ min/.test(top));

      // 3. rolar de verdade
      var w = ifr().contentWindow, doc = ifr().contentDocument, guard = 0;
      var before = ones((store().ch['cap01.html'] || { b: { pt: '' } }).b.pt);
      while (w.scrollY + w.innerHeight < doc.documentElement.scrollHeight - 3 && guard++ < 200) {
        w.scrollTo({ top: w.scrollY + Math.round(w.innerHeight * 0.4), behavior: 'instant' }); await wait(320);
      }
      await wait(600);
      saveStats();
      var st = store().ch['cap01.html'];
      ok('3a rolar grava o avanço em dd-stats', !!st && ones(st.b.pt) > before, 'trechos lidos PT: ' + (st ? ones(st.b.pt) : 0) + '/50');
      ok('3b chegou a (quase) 100% do capítulo', !!st && ones(st.b.pt) >= 48, ones(st.b.pt) + '/50');
      await wait(700);
      var shown = $('hl-read').textContent, total = $('hl-total').textContent;
      ok('3c inferior mostra lidas = total', shown === total && total === nfPt.format(S.pt), shown + ' / ' + total);
      ok('3d inferior mostra 100% concluído', /✓|concluído/.test($('hl-left').textContent), $('hl-left').textContent);
      ok('3e EN ainda não foi creditado', ones(st.b.en) === 0, 'EN: ' + ones(st.b.en));
      ok('3f tempo gasto passou de 0', st.sec > 0, st.sec + ' s');

      // 4. idioma
      setOption('readLang', 'en'); await wait(1200);
      ok('4a barra superior em inglês', /READING/.test($('hud-top').textContent), $('hud-top').textContent.slice(0, 40));
      ok('4b inferior passa a contar EN', $('hl-lang').textContent === 'EN' && $('hl-total').textContent === nfEn.format(S.en), $('hl-lang').textContent + ' ' + $('hl-total').textContent);
      saveStats();
      ok('4c trocar de idioma não credita leitura em EN', ones(store().ch['cap01.html'].b.en) === 0, 'EN: ' + ones(store().ch['cap01.html'].b.en));
      ok('4d inferior volta a 0 lidas em EN', $('hl-read').textContent === '0', $('hl-read').textContent);
      setOption('readLang', 'pt'); await wait(800);

      // 5. palavras ouvidas
      window.postMessage({ type: 'dd-listen', page: 'cap01', lang: 'pt', words: 120 }, '*'); await wait(200);
      window.postMessage({ type: 'dd-listen', page: 'cap01', lang: 'en', words: 30 }, '*'); await wait(200);
      saveStats();
      var ls = store().ch['cap01.html'].ls;
      ok('5a palavras ouvidas somadas por idioma', ls.pt === 120 && ls.en === 30, 'PT ' + ls.pt + ' / EN ' + ls.en);

      // 6. página final
      var idx = structure.findIndex(function (s) { return s.f === 'estatisticas.html'; });
      ok('6a página final é o último item do menu', idx === structure.length - 1, 'índice ' + idx + ' de ' + structure.length);
      loadChapter(idx); await wait(2500);
      var d2 = ifr().contentDocument;
      var rows = d2.querySelectorAll('.st-row');
      ok('6b uma linha por capítulo', rows.length === structure.length - 1, rows.length + ' linhas');
      var tiles = d2.getElementById('st-tiles').textContent;
      var sumPt = 0, sumEn = 0; Object.keys(STATS.chapters).forEach(function (f) { sumPt += STATS.chapters[f].pt; sumEn += STATS.chapters[f].en; });
      ok('6c totais de palavras conferem com os dados', tiles.indexOf(nfPt.format(sumPt)) >= 0 && tiles.indexOf(nfPt.format(sumEn)) >= 0, nfPt.format(sumPt) + ' / ' + nfPt.format(sumEn));
      var row1 = Array.prototype.filter.call(rows, function (r) { return /Cérebro/.test(r.textContent); })[0];
      ok('6d linha do capítulo 1 mostra lido PT 100%', !!row1 && /lido PT 100%/.test(row1.textContent), row1 ? row1.querySelector('.st-row-meta').textContent : 'sem linha');
      ok('6e linha mostra palavras ouvidas', !!row1 && /ouvidas PT 120 · EN 30/.test(row1.textContent));
      ok('6f barra superior no modo livro', /LIVRO/.test($('hud-top').textContent), $('hud-top').textContent.slice(0, 30));

      // 7. zerar
      window.postMessage({ type: 'dd-stats-reset' }, '*'); await wait(500);
      ok('7a zerar apaga o avanço', Object.keys(store().ch || {}).length === 0, JSON.stringify(store()).slice(0, 60));
      ok('7b inferior volta a 0', $('hl-read').textContent === '0', $('hl-read').textContent);
    } catch (e) { fails++; out.push('FAIL exceção: ' + e + ' ' + (e && e.stack ? e.stack.split('\n')[1] : '')); }
    out.push('RESULTADO: ' + (fails ? fails + ' falha(s)' : 'tudo certo'));
    var pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = out.join('\n'); document.body.appendChild(pre);
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
