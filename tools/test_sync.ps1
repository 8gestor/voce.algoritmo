<#
  test_sync.ps1 — mede o quanto o destaque da narração se afasta da palavra realmente falada.

  Simula vozes com tempos conhecidos (a "verdade"): amostra, a cada 40 ms, a palavra destacada
  (.w.now) e compara com a palavra que a voz simulada estaria falando naquele instante.
  Cenários (cada um num Chrome novo, sem calibração prévia):
    lenta    voz remota lenta, com pausas longas, SEM eventos de palavra (como vozes de rede)
    rapida   voz remota rápida, pausas curtas, SEM eventos de palavra
    esparsa  eventos de palavra só a cada 3 palavras
    palavra  evento em toda palavra (voz local; controle)
  Saída: erro médio absoluto (em palavras), p95, máximo, % de amostras com erro <= 1 palavra e
  viés (positivo = destaque adiantado, negativo = atrasado).

  Uso:  pwsh tools\test_sync.ps1 [-Js <capitulo.js a testar>] [-Page cap01] [-Unit c01-004]
                                  [-Scenarios lenta,rapida,esparsa,palavra] [-Max <erro médio máx. aceito>]
  Sai com 1 se algum cenário passar de -Max (padrão 1.5 palavras de erro médio).
#>
param(
    [string]$Js = '',
    [string]$Page = 'cap01',
    [string]$Unit = 'c01-004',
    [string[]]$Scenarios = @('lenta', 'rapida', 'esparsa', 'palavra'),
    [double]$Max = 1.5,
    [string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dd-sync-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
robocopy $repo $tmp /E /XD .git .github /NFL /NDL /NJH /NJS /NP | Out-Null
if ($Js) { Copy-Item $Js "$tmp\assets\js\capitulo.js" -Force }

$stub = @'
<script>
(function () {
  var SC = ({
    lenta:   { cps: 11.5, p: [0.30, 0.45, 0.70], bound: 0 },
    rapida:  { cps: 19,   p: [0.08, 0.12, 0.20], bound: 0 },
    esparsa: { cps: 14,   p: [0.18, 0.26, 0.40], bound: 3 },
    palavra: { cps: 13,   p: [0.16, 0.26, 0.40], bound: 1 }
  })['__SCEN__'];
  var cur = null, timers = [];
  window.__T = { active: false, start: 0, ws: [], off: 0 };
  window.DD_PAGE = '__PAGE__';
  function Utt(text) { this.text = text; this.rate = 1; this.lang = ''; this.voice = null; }
  window.SpeechSynthesisUtterance = Utt;
  function pause(w) {
    if (/[.!?…]["'”’)\]]*$/.test(w)) return SC.p[2];
    if (/[;:]["'”’)\]]*$/.test(w) || /^[—–]$/.test(w)) return SC.p[1];
    if (/,["'”’)\]]*$/.test(w)) return SC.p[0];
    return 0;
  }
  var stub = {
    getVoices: function () { return [{ name: 'Fake PT', lang: 'pt-BR', localService: true }, { name: 'Fake EN', lang: 'en-US', localService: true }]; },
    speak: function (u) {
      cur = u;
      var ws = [], re = /\S+/g, m;
      while ((m = re.exec(u.text))) ws.push({ ci: m.index, w: m[0] });
      var cps = SC.cps * u.rate, t = 0;
      ws.forEach(function (x) { x.t = t; t += (x.w.length + 1) / cps + pause(x.w) / u.rate; });
      var total = t, LAT = 150;
      var off = window.__dd && window.__dd.plan ? window.__dd.plan.text.indexOf(u.text) : 0;
      timers.push(setTimeout(function () {
        window.__T = { active: true, start: performance.now(), ws: ws, off: off };
        if (u.onstart) u.onstart({});
      }, LAT));
      if (SC.bound) ws.forEach(function (x, i) {
        if (i % SC.bound !== 0) return;
        timers.push(setTimeout(function () { if (u.onboundary) u.onboundary({ name: 'word', charIndex: x.ci }); }, LAT + x.t * 1000));
      });
      timers.push(setTimeout(function () { window.__T.active = false; if (cur === u && u.onend) u.onend({}); }, LAT + total * 1000));
    },
    cancel: function () {
      var u = cur; timers.forEach(clearTimeout); timers = []; cur = null; window.__T.active = false;
      if (u && u.onend) setTimeout(function () { u.onend({}); }, 0);
    },
    pause: function () {}, resume: function () {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true });
})();
</script>
'@

$test = @'
<script>
(function () {
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  window.addEventListener('load', async function () {
    var errs = [], res = {};
    try {
      await wait(300);
      var unitId = '__UNIT__';
      document.querySelector('[data-id="' + unitId + '"]').click();
      var spans = null, begin = performance.now();
      while (performance.now() - begin < 110000) {
        await wait(40);
        var d = window.__dd, plan = d && d.plan;
        if (!plan) { if (errs.length > 20) break; continue; }
        if (plan.id !== unitId) break;                       // passou para a unidade seguinte
        var T = window.__T;
        if (!T.active) continue;
        var el = (performance.now() - T.start) / 1000, i = 0;
        for (var k = 0; k < T.ws.length; k++) if (T.ws[k].t <= el) i = k;
        var abs = T.off + T.ws[i].ci, lo = 0, hi = plan.tokens.length - 1;
        while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (plan.tokens[mid].s <= abs) lo = mid; else hi = mid - 1; }
        var words = plan.words, now = -1;
        for (var w = 0; w < words.length; w++) if (words[w].classList.contains('now')) { now = w; break; }
        if (now >= 0) errs.push(now - lo);
      }
      document.querySelector('[data-id="' + unitId + '"]');
      window.postMessage({ type: 'tts-toggle' }, '*');
    } catch (e) { res.error = String(e); }
    var abs = errs.map(Math.abs).sort(function (a, b) { return a - b; });
    var n = abs.length;
    res.n = n;
    res.mean = n ? abs.reduce(function (a, b) { return a + b; }, 0) / n : -1;
    res.p95 = n ? abs[Math.min(n - 1, Math.floor(n * 0.95))] : -1;
    res.max = n ? abs[n - 1] : -1;
    res.within1 = n ? abs.filter(function (x) { return x <= 1; }).length / n : 0;
    res.bias = n ? errs.reduce(function (a, b) { return a + b; }, 0) / n : 0;
    var pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
  });
})();
</script>
'@

$rows = @()
foreach ($sc in $Scenarios) {
    $scDir = Join-Path $tmp ('s_' + $sc)
    $html = [IO.File]::ReadAllText("$tmp\$Page.html", $enc)
    $s = $stub.Replace('__SCEN__', $sc).Replace('__PAGE__', $Page)
    $t = $test.Replace('__UNIT__', $Unit)
    $html = $html -replace '(<script src="assets/js/capitulo\.js">)', ($s + '$1')
    $html = $html -replace '(?i)</body>', ($t + '</body>')
    $file = "$tmp\__sync_$sc.html"
    [IO.File]::WriteAllText($file, $html, $enc)
    $prof = Join-Path $tmp ('profile_' + $sc)
    $outFile = Join-Path $tmp ("out_$sc.txt")
    Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=`"$prof`"",
        '--window-size=1200,900', '--virtual-time-budget=150000', '--allow-file-access-from-files', '--dump-dom',
        "`"file:///$($file.Replace('\','/'))`"") -Wait -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError "$tmp\err_$sc.txt"
    $dom = [IO.File]::ReadAllText($outFile)
    $m = [regex]::Match($dom, '(?s)<pre id="result">(.*?)</pre>')
    if (-not $m.Success) { $rows += [pscustomobject]@{ cenario = $sc; amostras = 0; erro_medio = 'sem resultado'; p95 = ''; max = ''; ate1 = ''; vies = '' }; continue }
    $r = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) | ConvertFrom-Json
    $rows += [pscustomobject]@{
        cenario = $sc; amostras = $r.n
        erro_medio = [math]::Round($r.mean, 2); p95 = $r.p95; max = $r.max
        ate1 = ('{0:P0}' -f $r.within1); vies = [math]::Round($r.bias, 2)
    }
}
$rows | Format-Table -AutoSize | Out-String -Width 200
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
$bad = $rows | Where-Object { $_.erro_medio -isnot [double] -or $_.erro_medio -gt $Max }
if ($bad) { "REPROVADO: erro médio acima de $Max palavra(s) em: " + (($bad | ForEach-Object { $_.cenario }) -join ', '); exit 1 }
"APROVADO: erro médio <= $Max palavra(s) em todos os cenários"
exit 0
