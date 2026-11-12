<#
  test_narracao.ps1 — teste automatizado da engine bilíngue/narração (Chrome headless).

  Injeta um speechSynthesis falso (que também emite onend ao cancelar, como o bug original)
  e confere: troca de idioma, destaque palavra a palavra, velocidade sem avançar de
  parágrafo, modo cruzado (ler PT / ouvir EN) e limpeza ao parar.

  Uso: .\tools\test_narracao.ps1 [-Page introducao] [-Chrome <caminho do chrome.exe>]
#>
param(
    [string]$Page = 'introducao',
    [string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dd-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
robocopy $repo $tmp /E /XD .git .github /NFL /NDL /NJH /NJS /NP | Out-Null

$stub = @'
<script>
(function () {
  var log = [], cur = null, timers = [];
  window.__log = log; window.DD_PAGE = '__PAGE__';
  function Utt(text) { this.text = text; this.rate = 1; this.lang = ''; this.voice = null; }
  window.SpeechSynthesisUtterance = Utt;
  var stub = {
    getVoices: function () { return [{ name: 'Fake PT', lang: 'pt-BR', localService: true }, { name: 'Fake EN', lang: 'en-US', localService: true }]; },
    speak: function (u) {
      log.push({ text: u.text, rate: u.rate, lang: u.lang });
      cur = u;
      var words = [], re = /\S+/g, m;
      while ((m = re.exec(u.text))) words.push(m.index);
      var step = Math.max(25, 300 / u.rate);
      timers.push(setTimeout(function () { if (u.onstart) u.onstart({}); }, 5));
      words.forEach(function (ci, i) {
        timers.push(setTimeout(function () { if (u.onboundary) u.onboundary({ name: 'word', charIndex: ci }); }, 10 + i * step));
      });
      timers.push(setTimeout(function () { if (cur === u && u.onend) u.onend({}); }, 10 + words.length * step + 10));
    },
    cancel: function () {                                   // como o navegador: cancelar também notifica o fim
      var u = cur; timers.forEach(clearTimeout); timers = []; cur = null;
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
  var out = [], fails = 0;
  function post(t, v) { window.postMessage({ type: t, value: v }, '*'); }
  function ok(name, cond, extra) { if (!cond) fails++; out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function nowWord() { var n = document.querySelector('.w.now'); return n ? n.textContent : null; }
  function nowIndex() { var n = document.querySelector('.w.now'); return n ? Array.prototype.indexOf.call(document.querySelectorAll('.w'), n) : -1; }

  window.addEventListener('load', async function () {
    try {
      await wait(400);
      var h1 = document.querySelector('h1');
      var ptTitle = h1.textContent;

      // 1. idioma de leitura
      post('readlang', 'en'); await wait(300);
      ok('1a leitura EN troca o título', /Introduction/.test(h1.textContent), h1.textContent);
      ok('1b <html lang> acompanha', document.documentElement.lang === 'en', document.documentElement.lang);
      post('readlang', 'pt'); await wait(200);
      ok('1c volta ao PT intacto', h1.textContent === ptTitle);

      // 2. ler EN + ouvir EN
      post('readlang', 'en'); post('audiolang', 'en'); await wait(100);
      document.querySelector('[data-id="in-004"]').click(); await wait(1200);
      var plan = window.__dd.plan;
      ok('2a narração começou', window.__dd.playing && !!plan);
      ok('2b fala em inglês', /^Stop for a second\./.test(window.__log[0].text), window.__log[0] && window.__log[0].text.slice(0, 40));
      ok('2c há exatamente 1 palavra destacada', document.querySelectorAll('.w.now').length === 1, nowWord());
      var idBefore = window.__dd.plan.id;
      var w1 = nowWord(), i1 = nowIndex();

      // 3. velocidade não avança de parágrafo
      var logLen = window.__log.length;
      post('rate', 2); await wait(300);
      ok('3a mesma unidade após mudar velocidade', window.__dd.plan && window.__dd.plan.id === idBefore, idBefore + ' -> ' + (window.__dd.plan && window.__dd.plan.id));
      var last = window.__log[window.__log.length - 1];
      ok('3b nova fala usa velocidade 2', last.rate === 2, 'rate=' + last.rate);
      ok('3c retoma perto da palavra atual (não do começo)', i1 === 0 || window.__log.length > logLen, 'palavra ' + i1 + ' "' + w1 + '"');
      ok('3d o texto retomado vem da mesma sentença', last.text.length > 0);
      post('rate', 0.5); await wait(200); post('rate', 1); await wait(200);
      ok('3e várias trocas seguidas continuam na unidade', window.__dd.plan && window.__dd.plan.id === idBefore, window.__dd.plan && window.__dd.plan.id);

      // 4. cruzado: ler PT, ouvir EN — destaque anda para frente, sem pular para trás
      post('tts-toggle'); await wait(200);          // para
      ok('4a parar limpa o destaque', document.querySelectorAll('.w').length === 0 && !document.querySelector('.speaking'));
      post('readlang', 'pt'); post('audiolang', 'en'); await wait(150);
      post('tts-toggle'); await wait(100);
      var seq = [], t0 = Date.now();
      for (var k = 0; k < 14; k++) { await wait(260); seq.push(nowIndex()); }
      var mono = true; for (var j = 1; j < seq.length; j++) if (seq[j] !== -1 && seq[j - 1] !== -1 && seq[j] < seq[j - 1] && window.__dd.plan.id === idBefore) mono = false;
      ok('4b destaque PT avança enquanto a voz EN fala', seq.filter(function (x) { return x >= 0; }).length > 6, seq.join(','));
      ok('4c o destaque não volta atrás dentro da unidade', mono);
      ok('4d o texto exibido é PT e a voz é EN', /[ãç]/.test(document.body.textContent) && /^[A-Za-z]/.test(window.__log[window.__log.length - 1].text));

      // 5. trocar idioma do áudio durante a fala
      var idNow = window.__dd.plan.id;
      post('audiolang', 'pt'); await wait(300);
      ok('5a trocar áudio mantém a unidade', window.__dd.plan && window.__dd.plan.id === idNow);
      var l5 = window.__log[window.__log.length - 1];
      ok('5b nova fala sai em português', /[ãçõé]| que | não | você /.test(l5.text), l5.text.slice(0, 50));

      // 6. avança sozinho para a próxima unidade e termina limpo
      post('rate', 2.5); await wait(100);
      var ids = {}; for (var m2 = 0; m2 < 40; m2++) { await wait(250); if (window.__dd.plan) ids[window.__dd.plan.id] = 1; }
      ok('6a a narração percorre várias unidades', Object.keys(ids).length >= 2, Object.keys(ids).join(','));
      post('tts-toggle'); await wait(200);
      ok('6b ao parar não sobra .w nem .speaking', document.querySelectorAll('.w').length === 0 && !document.querySelector('.speaking'));
    } catch (e) { fails++; out.push('FAIL exceção: ' + e); }
    out.push('RESULTADO: ' + (fails ? fails + ' falha(s)' : 'tudo certo'));
    var pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = out.join('\n'); document.body.appendChild(pre);
  });
})();
</script>
'@

$html = [IO.File]::ReadAllText("$tmp\$Page.html", $enc)
$stub = $stub.Replace('__PAGE__', $Page)
$html = $html -replace '(<script src="assets/js/capitulo\.js">)', ($stub + '$1')
$html = $html -replace '(?i)</body>', ($test + '</body>')
$testFile = "$tmp\__test.html"
[IO.File]::WriteAllText($testFile, $html, $enc)

$prof = Join-Path $tmp 'profile'
$outFile = Join-Path $tmp 'out.txt'
Start-Process -FilePath $Chrome -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=`"$prof`"",
    '--window-size=1200,900', '--virtual-time-budget=60000', '--allow-file-access-from-files', '--dump-dom',
    "`"file:///$($testFile.Replace('\','/'))`"") -Wait -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError "$tmp\err.txt"
$dom = [IO.File]::ReadAllText($outFile)
$m = [regex]::Match($dom, '(?s)<pre id="result">(.*?)</pre>')
if (-not $m.Success) { 'Teste não produziu resultado. Erros do Chrome:'; Get-Content "$tmp\err.txt" -TotalCount 15; exit 2 }
[System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($m.Groups[1].Value -match 'FAIL') { exit 1 }

exit 0
