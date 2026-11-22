# test_autosave.ps1 - o autosalvamento da evolução sobrevive a fechar o navegador e a uma aba derrubada?
# Teste de ponta a ponta com o Chrome de verdade (tempo real, mesmo perfil nas duas fases):
#   fase 1  importa o Enchiridion, entra no modo foco, lê de verdade (rolagem real, atividade, escuta e palavras ouvidas), tira um "retrato"
#           dos números e encerra o navegador: (normal) fechamento do navegador pelo comando oficial, ou (queda) o processo da aba é morto à força
#   fase 2  reabre com o mesmo perfil e compara o painel de evolução da Biblioteca e o painel de dentro da leitura com o retrato
# Uso: pwsh tools/test_autosave.ps1      (leva uns 2 minutos; usa as portas 9350 e 9351)
$repo = Split-Path -Parent $PSScriptRoot
$work = Join-Path ([IO.Path]::GetTempPath()) ('dd-autosave-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $work | Out-Null
$Chrome = @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Chrome) { Write-Output 'FAIL Chrome não encontrado'; exit 1 }
$index = 'file:///' + ($repo.Replace('\', '/')) + '/index.html#ingles'

$harness = @'
<!doctype html><html><head><meta charset="utf-8"><title>autosave</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:78%}pre{font:12px monospace;margin:4px;white-space:pre-wrap}</style></head><body>
<iframe id="app" src="__INDEX__"></iframe><pre id="o"></pre>
<script>
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var P = function (m) { document.getElementById('o').textContent += m + '\n'; };
(async function () {
  var fase = location.hash.slice(1), shell = document.getElementById('app'), t0 = 0;
  while (t0++ < 200) { try { if (shell.contentWindow.document.getElementById('content-frame').contentWindow.DDLab) break; } catch (e) {} await wait(100); }
  var W = shell.contentWindow.document.getElementById('content-frame').contentWindow, D = W.DDLab, dk = function () { return W.__ddProg.dayKey(); };
  if (/^fase1/.test(fase)) {
    W.postMessage({ type: 'readlang', value: 'pt' }, '*'); await wait(300);
    var txt = await new Promise(function (ok) { var x = new W.XMLHttpRequest(); x.open('GET', 'assets/livros/epicteto-enchiridion.txt'); x.onload = function () { ok(x.responseText); }; x.send(); });
    await D.addText('Autosave teste - Enchiridion', txt);
    var id = D.doc.id; await wait(1200);
    W.__ddWeek.store({ docId: id, title: 'Autosave teste - Enchiridion', start: dk(), startWords: 0 });
    var s = W.document.getElementById('lb-read-mode'); s.value = 'focus'; s.dispatchEvent(new W.Event('change')); await wait(2000);
    for (var i = 0; i < 14; i++) {
      if (i === 3) D.tts.playing = true;
      if (i === 10) D.tts.playing = false;
      W.scrollBy(0, 650); W.dispatchEvent(new W.Event('wheel'));
      if (i % 4 === 1) D.emit('heard', { words: 50 });
      await wait(1000);
    }
    D.tts.playing = false; await wait(500);
    var info = await W.__ddWeek.bookInfo(id), lg = W.__ddProg.log.d[dk()] || {};
    W.localStorage.setItem('dd-teste-esperado', JSON.stringify({ id: id, pos: D.doc.pos, read: W.__ddWeek.readWords(info, D.doc.pos), words: info.words, rd: lg.rd || 0, ls: lg.ls || 0, sec: lg.sec || 0, heard: lg.heard || 0, fp: W.document.getElementById('lb-fp-words').textContent, pct: W.document.getElementById('lb-fp-pct').textContent }));
    document.title = 'RETRATO';
    await wait(8000);
    if (fase === 'fase1-normal') location.href = 'about:blank';
    return;
  }
  var exp = JSON.parse(W.localStorage.getItem('dd-teste-esperado') || 'null');
  if (!exp) { P('SEM RETRATO'); document.title = 'FIM'; return; }
  var res = { exp: exp }; await wait(1500);
  var lg2 = W.__ddProg.log.d[dk()] || {};
  res.log = { rd: lg2.rd || 0, ls: lg2.ls || 0, sec: lg2.sec || 0, heard: lg2.heard || 0 };
  await W.__ddProg.render(); await wait(1000);
  res.progresso = W.document.getElementById('lb-prog').textContent.replace(/\s+/g, ' ');
  await D.openDoc(exp.id); await wait(2500);
  res.docPos = D.doc.pos;
  var t1 = 0; while (t1++ < 60 && !W.document.getElementById('lb-fp-words')) await wait(200);
  await wait(1500);
  res.fp = W.document.getElementById('lb-fp-words') && W.document.getElementById('lb-fp-words').textContent;
  res.sess = W.document.getElementById('lb-fp-sess') && W.document.getElementById('lb-fp-sess').textContent;
  P('RESULTADO ' + JSON.stringify(res)); document.title = 'FIM';
})();
</script></body></html>
'@
$page = Join-Path $work 'autosave.html'
[IO.File]::WriteAllText($page, $harness.Replace('__INDEX__', $index), (New-Object Text.UTF8Encoding($false)))
$url = 'file:///' + $page.Replace('\', '/')

function Fechar-Navegador($proc, $porta) {   # encerramento normal (Browser.close): o Chrome termina e grava tudo em disco
  try {
    $v = Invoke-RestMethod -Uri "http://127.0.0.1:$porta/json/version" -TimeoutSec 5
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ws.ConnectAsync([Uri]$v.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
    $ws.SendAsync([ArraySegment[byte]][Text.Encoding]::UTF8.GetBytes('{"id":1,"method":"Browser.close"}'), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  } catch { }
  if (-not $proc.WaitForExit(30000)) { & taskkill.exe /PID $proc.Id /T /F | Out-Null }
}
function Rodar($cenario, $porta) {
  $perfil = Join-Path $work ('perfil-' + $cenario)
  $comum = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$perfil", '--allow-file-access-from-files', '--window-size=1440,900')
  $p1 = Start-Process -FilePath $Chrome -ArgumentList ($comum + @("--remote-debugging-port=$porta", "$url#fase1-$cenario")) -PassThru -RedirectStandardError (Join-Path $work "err1-$cenario.txt")
  $visto = $false; $t0 = Get-Date
  while (((Get-Date) - $t0).TotalSeconds -lt 150) {
    Start-Sleep -Milliseconds 100
    try { if (Invoke-RestMethod -Uri "http://127.0.0.1:$porta/json" -TimeoutSec 2 | Where-Object { $_.title -eq 'RETRATO' }) { $visto = $true; break } } catch { }
  }
  if ($cenario -eq 'queda') {   # queda real: mata o processo da aba (renderer) à força, sem pagehide, com o navegador vivo
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--type=renderer' -and $_.CommandLine -match [regex]::Escape($perfil) } | ForEach-Object { & taskkill.exe /PID $_.ProcessId /F 2>$null | Out-Null }
    Start-Sleep -Seconds 3
  } else { Start-Sleep -Seconds 10 }   # a página navega para fora e o navegador grava em disco
  Fechar-Navegador $p1 $porta; Start-Sleep -Seconds 2
  $saida = Join-Path $work "saida-$cenario.html"
  Start-Process -FilePath $Chrome -ArgumentList ($comum + @('--virtual-time-budget=150000', '--dump-dom', "$url#verificar")) -Wait -RedirectStandardOutput $saida -RedirectStandardError (Join-Path $work "err2-$cenario.txt")
  $m = [regex]::Match([IO.File]::ReadAllText($saida), 'RESULTADO (\{.*\})')
  if (-not $visto -or -not $m.Success) { return $null }
  return ([System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) | ConvertFrom-Json)
}

$falhas = 0
function Ok($nome, $cond, $detalhe) { if ($cond) { Write-Output "PASS $nome  [$detalhe]" } else { $script:falhas++; Write-Output "FAIL $nome  [$detalhe]" } }
foreach ($c in @(@{ n = 'normal'; p = 9350; tol = 12 }, @{ n = 'queda'; p = 9351; tol = 2 })) {
  $r = Rodar $c.n $c.p
  if (-not $r) { $falhas++; Write-Output "FAIL [$($c.n)] sem resultado (a fase 1 ou a fase 2 não terminou)"; continue }
  $e = $r.exp; $tag = "[$($c.n)]"
  Ok "$tag a posição de leitura volta ao parágrafo em que parou (sem saltar)" ($r.docPos -eq $e.pos) "esperado=$($e.pos) obtido=$($r.docPos)"
  Ok "$tag o painel de dentro da leitura mostra as mesmas palavras e % de antes, sem inventar palavras na sessão" (($r.fp -eq $e.fp) -and ($r.sess -match '^\+0 ')) "antes='$($e.fp) $($e.pct)' depois='$($r.fp)' sessão='$($r.sess)'"
  Ok "$tag as palavras ouvidas voltam exatas (evento gravado na hora)" ($r.log.heard -eq $e.heard) "esperado=$($e.heard) obtido=$($r.log.heard)"
  Ok "$tag os tempos lendo, ouvindo e total voltam (perda máxima $($c.tol) s)" (($r.log.rd -ge $e.rd - $c.tol) -and ($r.log.ls -ge $e.ls - $c.tol) -and ($r.log.sec -ge $e.sec - $c.tol)) "antes rd=$($e.rd) ls=$($e.ls) sec=$($e.sec) | depois rd=$($r.log.rd) ls=$($r.log.ls) sec=$($r.log.sec)"
  Ok "$tag o painel Seu progresso da Biblioteca mostra os tempos e as palavras ouvidas gravados" (($r.progresso -match 'lendo / ouvindo') -and ($r.progresso -match "$($e.heard)\s*palavras ouvidas")) ($r.progresso.Substring(0, [Math]::Min(120, $r.progresso.Length)))
}
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
if ($falhas) { Write-Output "RESULTADO: $falhas falha(s)"; exit 1 } else { Write-Output 'RESULTADO: tudo certo' }
