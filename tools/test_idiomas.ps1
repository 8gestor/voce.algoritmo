<#
  test_idiomas.ps1 — confere, no navegador, a troca PT <-> EN em todas as páginas.

  Para cada página: carrega, pede leitura em EN e confere que (a) toda unidade com data-id foi
  trocada pelo texto traduzido, (b) sobra pouquíssimo português visível, (c) voltar a PT
  restaura exatamente o HTML original. Uso: .\tools\test_idiomas.ps1 [-Chrome <caminho>]
#>
param([string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dd-lang-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
robocopy $repo $tmp /E /XD .git .github /NFL /NDL /NJH /NJS /NP | Out-Null

$pages = (Get-ChildItem "$repo\*.html" | Where-Object { $_.Name -ne 'index.html' } | Sort-Object Name | ForEach-Object { "'" + $_.Name + "'" }) -join ','
$harness = @"
<!doctype html><meta charset="utf-8"><body><pre id="out">...</pre><iframe id="f" style="width:1000px;height:800px"></iframe>
<script>
var pages = [$pages], out = [], i = 0, f = document.getElementById('f'), bad = 0;
var PT_WORDS = /\b(que|não|você|para|uma|dos|das|com|mais|isso|esse|essa|são|está|como|pelo|pela|seu|sua|nos|nas)\b/gi;
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function norm(html) { var d = document.createElement('div'); d.innerHTML = html; return d.innerHTML.replace(/\s+/g, ' ').trim(); }
function post(w, t, v) { w.postMessage({ type: t, value: v }, '*'); }
function visibleText(d) { var c = d.body.cloneNode(true); c.querySelectorAll('script,style,pre').forEach(function (n) { n.remove(); }); return c.textContent; }
async function run(name) {
  f.src = name + '?t=' + Date.now();
  await new Promise(function (r) { f.onload = r; });
  await wait(500);
  var w = f.contentWindow, d = f.contentDocument, key = name.replace(/\.html$/, '');
  var units = d.querySelectorAll('[data-id]'), table = (w.DD_I18N || {})[key] || {};
  var original = {}; units.forEach(function (u) { original[u.dataset.id] = u.innerHTML; });
  var ptWords = (visibleText(d).match(PT_WORDS) || []).length;
  post(w, 'readlang', 'en'); await wait(400);
  var swapped = 0, missing = 0, total = 0;
  units.forEach(function (u) {
    if (u.parentElement && u.parentElement.closest('[data-id]')) return;
    total++;
    if (!table[u.dataset.id]) { missing++; return; }
    if (norm(u.innerHTML) === norm(table[u.dataset.id])) swapped++;
  });
  var enPt = (visibleText(d).match(PT_WORDS) || []).length;
  post(w, 'readlang', 'pt'); await wait(300);
  var restored = 0;
  units.forEach(function (u) { if (u.innerHTML === original[u.dataset.id]) restored++; });
  var ok = (swapped === total) && !missing && (restored === units.length) && (enPt <= 6);
  if (!ok) bad++;
  out.push((ok ? 'PASS ' : 'FAIL ') + name + '  unidades=' + total + ' trocadas=' + swapped + ' sem_traducao=' + missing + ' restauradas=' + restored + '/' + units.length + ' palavras_PT: ' + ptWords + ' -> ' + enPt);
}
(async function () {
  for (var k = 0; k < pages.length; k++) { try { await run(pages[k]); } catch (e) { bad++; out.push('FAIL ' + pages[k] + ' exceção: ' + e); } }
  out.push('RESULTADO: ' + (bad ? bad + ' página(s) com problema' : 'tudo certo em ' + pages.length + ' páginas'));
  document.getElementById('out').textContent = out.join('\n'); document.title = 'done';
})();
</script>
"@
[IO.File]::WriteAllText("$tmp\__idiomas.html", $harness, $enc)

$prof = Join-Path $tmp 'profile'
$outFile = Join-Path $tmp 'out.txt'
Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=`"$prof`"",
    '--window-size=1100,900', '--virtual-time-budget=120000', '--allow-file-access-from-files', '--dump-dom',
    "`"file:///$($tmp.Replace('\','/'))/__idiomas.html`"") -Wait -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError "$tmp\err.txt"
$dom = [IO.File]::ReadAllText($outFile)
$m = [regex]::Match($dom, '(?s)<pre id="out">(.*?)</pre>')
if (-not $m.Success) { 'Sem resultado do navegador.'; Get-Content "$tmp\err.txt" -TotalCount 10; exit 2 }
$text = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
$text
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($text -match 'FAIL') { exit 1 }

exit 0
