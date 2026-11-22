# test_aparencia.ps1 - margens e ajuste de texto (esquerda/justificado) funcionam em todos os temas?
# Carrega um capítulo (cap01) e a Biblioteca (ingles) lado a lado, troca tema, margem e alinhamento pelas mesmas mensagens do leitor e mede:
#   - largura do parágrafo: margem estreita > média > larga, nos temas Terminal (dark), Claro (light) e Sépia, no capítulo e na Biblioteca
#   - text-align calculado: left e justify obedecidos nos quatro temas (paper, dark, light, sepia), nas duas páginas
# Uso: pwsh tools/test_aparencia.ps1      (Chrome headless, ~1 min)
$repo = Split-Path -Parent $PSScriptRoot
$work = Join-Path ([IO.Path]::GetTempPath()) ('dd-aparencia-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $work | Out-Null
$Chrome = @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Chrome) { Write-Output 'FAIL Chrome não encontrado'; exit 1 }
$base = 'file:///' + $repo.Replace('\', '/')
$page = @'
<!doctype html><html><head><meta charset="utf-8"><title>aparencia</title>
<style>html,body{margin:0}iframe{border:0;width:1000px;height:300px}pre{font:12px monospace;white-space:pre-wrap}</style></head><body>
<iframe id="a" src="__BASE__/cap01.html"></iframe><iframe id="b" src="__BASE__/ingles.html"></iframe><pre id="o"></pre>
<script>
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
(async function () {
  var out = { w: {}, al: {} };
  try {
    var A = document.getElementById('a').contentWindow, B = document.getElementById('b').contentWindow, t0 = 0;
    while (t0++ < 200) { try { if (A.document.querySelector('p.speakable') && B.DDLab) break; } catch (e) {} await wait(100); }
    var txt = Array.apply(null, Array(6)).map(function (_, k) { return 'Paragraph ' + (k + 1) + ': of things some are in our power, and others are not, so we must learn to tell them apart and to act only on what truly depends on us, every single day of our short lives, without complaint, in good order.'; }).join('\n\n');
    await B.DDLab.addText('Aparencia teste', txt); await wait(800);
    [A, B].forEach(function (w) { var st = w.document.createElement('style'); st.textContent = '* { transition: none !important; animation: none !important; }'; w.document.head.appendChild(st); });
    var msg = function (w, type, value) { w.postMessage({ type: type, value: value }, '*'); };
    var pa = function () { return A.document.querySelector('p.speakable'); }, pb = function () { return B.document.querySelector('.lb-para:not(.lb-head)'); };
    for (var th of ['paper', 'dark', 'light', 'sepia']) {
      out.w[th] = {}; out.al[th] = {};
      for (var mg of ['narrow', 'medium', 'wide']) {
        msg(A, 'theme', th); msg(B, 'theme', th); msg(A, 'margins', mg); msg(B, 'margins', mg); await wait(500);
        out.w[th][mg] = { cap: Math.round(pa().getBoundingClientRect().width), bib: Math.round(pb().getBoundingClientRect().width) };
      }
      for (var al of ['left', 'justify']) {
        msg(A, 'align', al); msg(B, 'align', al); await wait(300);
        out.al[th][al] = { cap: A.getComputedStyle(pa()).textAlign, bib: B.getComputedStyle(pb()).textAlign };
      }
    }
  } catch (e) { out.erro = String(e); }
  document.getElementById('o').textContent = 'RESULTADO ' + JSON.stringify(out); document.title = 'FIM';
})();
</script></body></html>
'@
$arq = Join-Path $work 'aparencia.html'
[IO.File]::WriteAllText($arq, $page.Replace('__BASE__', $base), (New-Object Text.UTF8Encoding($false)))
$saida = Join-Path $work 'saida.html'
Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$(Join-Path $work 'perfil')", '--allow-file-access-from-files', '--window-size=1100,800', '--virtual-time-budget=120000', '--dump-dom', ('file:///' + $arq.Replace('\', '/'))) -Wait -RedirectStandardOutput $saida -RedirectStandardError (Join-Path $work 'err.txt')
$m = [regex]::Match([IO.File]::ReadAllText($saida), 'RESULTADO (\{.*\})')
if (-not $m.Success) { Write-Output 'FAIL sem resultado da página de teste'; Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue; exit 1 }
$r = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) | ConvertFrom-Json
$falhas = 0
function Ok($nome, $cond, $detalhe) { if ($cond) { Write-Output "PASS $nome  [$detalhe]" } else { $script:falhas++; Write-Output "FAIL $nome  [$detalhe]" } }
if ($r.erro) { Ok 'a página de teste rodou sem erro' $false $r.erro }
$nomes = @{ dark = 'Terminal'; light = 'Claro'; sepia = 'Sépia' }
foreach ($th in 'dark', 'light', 'sepia') {
  $w = $r.w.$th
  foreach ($pg in 'cap', 'bib') {
    $onde = if ($pg -eq 'cap') { 'capítulo' } else { 'Biblioteca' }
    Ok "$($nomes[$th]) / $onde`: margem estreita > média > larga" (($w.narrow.$pg -gt $w.medium.$pg) -and ($w.medium.$pg -gt $w.wide.$pg)) "estreita=$($w.narrow.$pg) média=$($w.medium.$pg) larga=$($w.wide.$pg) px"
  }
}
foreach ($th in 'paper', 'dark', 'light', 'sepia') {
  foreach ($pg in 'cap', 'bib') {
    $onde = if ($pg -eq 'cap') { 'capítulo' } else { 'Biblioteca' }
    $nome = if ($nomes[$th]) { $nomes[$th] } else { 'Papel' }
    Ok "$nome / $onde`: ajuste de texto obedece (Esquerda e Justificado)" (($r.al.$th.left.$pg -eq 'left') -and ($r.al.$th.justify.$pg -eq 'justify')) "esquerda=$($r.al.$th.left.$pg) justificado=$($r.al.$th.justify.$pg)"
  }
}
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
if ($falhas) { Write-Output "RESULTADO: $falhas falha(s)"; exit 1 } else { Write-Output 'RESULTADO: tudo certo' }
