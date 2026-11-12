<#
  i18n.ps1 — ferramentas da tradução PT -> EN do livro.

  Fluxo:
    .\tools\i18n.ps1 show  cap01          # lista cada unidade (id + HTML original) para traduzir
    .\tools\i18n.ps1 build cap01          # compila assets/i18n/src/cap01.en.txt -> assets/i18n/en/cap01.js e audita
    .\tools\i18n.ps1 build                # compila e audita todas as páginas
    .\tools\i18n.ps1 status               # cobertura da tradução por página

  Formato da fonte (assets/i18n/src/<página>.en.txt): um bloco por unidade,
      ## c01-003
      <html em inglês, com as MESMAS tags e atributos do original>
  A página original é <página>.html (introducao, cap01, cap06_1, ...).

  A auditoria falha quando: falta tradução de uma unidade, sobra um id que não existe,
  as tags/atributos diferem do original, ou o tamanho do texto foge de 0,6x–1,6x do original.
#>
param(
    [Parameter(Position = 0)][string]$Cmd = 'status',
    [Parameter(Position = 1)][string]$Page = ''
)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $repo 'assets\i18n\src'
$outDir = Join-Path $repo 'assets\i18n\en'

function Get-Pages {
    Get-ChildItem "$repo\*.html" | Where-Object { $_.Name -ne 'index.html' } |
        ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) } | Sort-Object
}

# Extrai {Id, Tag, Html} de cada elemento com data-id (contando aninhamento da mesma tag).
function Get-Units([string]$page) {
    $h = [IO.File]::ReadAllText("$repo\$page.html", $enc)
    $units = New-Object System.Collections.Generic.List[object]
    foreach ($m in [regex]::Matches($h, '<(\w+)\b[^>]*\bdata-id="([^"]+)"[^>]*>')) {
        $tag = $m.Groups[1].Value
        $pos = $m.Index + $m.Length
        $depth = 1
        $tokens = [regex]::Matches($h.Substring($pos), "<(/?)$tag\b[^>]*>")
        $end = -1
        foreach ($t in $tokens) {
            if ($t.Groups[1].Value -eq '/') { $depth-- } else { $depth++ }
            if ($depth -eq 0) { $end = $pos + $t.Index; break }
        }
        if ($end -lt 0) { throw "${page}: tag <$tag> do id $($m.Groups[2].Value) não fecha" }
        $inner = $h.Substring($pos, $end - $pos)
        $units.Add([pscustomobject]@{ Id = $m.Groups[2].Value; Tag = $tag; Html = ($inner -replace '\s+', ' ').Trim() })
    }
    $units
}

function Get-Plain([string]$html) {
    [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($html, '<[^>]+>', ' '))) -replace '\s+', ' ' | ForEach-Object { $_.Trim() }
}
function Count-Words([string]$html) { $p = Get-Plain $html; if (-not $p) { 0 } else { ($p -split ' ').Count } }

# Conta sentenças com a mesma regra da engine de narração (capitulo.js): palavra que termina em . ! ? …
# (aceitando aspas/parênteses depois), exceto abreviações conhecidas; o fim do texto fecha a última sentença.
function Count-Sentences([string]$html) {
    $p = Get-Plain $html
    if (-not $p) { return 0 }
    $tokens = $p -split ' '
    $endRe = '[.!?' + [char]0x2026 + ']["''' + [char]0x201D + [char]0x2019 + ')\]]*$'   # ASCII no codigo: o PowerShell trata aspas tipograficas como aspas
    $n = 0
    for ($i = 0; $i -lt $tokens.Count; $i++) {
        $t = $tokens[$i]
        if ($t -match $endRe -and $t -notmatch '^(Dr|Dra|Sr|Sra|Prof|etc|vs|St|Mr|Mrs|Ms|U\.S|e\.g|i\.e)\.$') { $n++ }
    }
    if ($tokens[$tokens.Count - 1] -notmatch $endRe) { $n++ }
    $n
}

# Assinatura estrutural: tags e atributos, em ordem alfabética (a ordem pode mudar na tradução).
function Get-TagSig([string]$html) {
    ([regex]::Matches($html, '<[^>]+>') | ForEach-Object { ($_.Value -replace '\s+', ' ').ToLower() } | Sort-Object) -join '|'
}

function Read-Src([string]$page) {
    $file = Join-Path $srcDir "$page.en.txt"
    $map = [ordered]@{}
    if (-not (Test-Path $file)) { return $map }
    $cur = $null; $buf = New-Object System.Collections.Generic.List[string]
    foreach ($line in ([IO.File]::ReadAllText($file, $enc) -split "`r?`n")) {
        if ($line -match '^##\s+(\S+)\s*$') {
            if ($cur) { $map[$cur] = (($buf -join ' ') -replace '\s+', ' ').Trim() }
            $cur = $Matches[1]; $buf.Clear(); continue
        }
        if ($cur) { $buf.Add($line) }
    }
    if ($cur) { $map[$cur] = (($buf -join ' ') -replace '\s+', ' ').Trim() }
    $map
}

function Build-Page([string]$page) {
    $units = Get-Units $page
    $src = Read-Src $page
    $problems = New-Object System.Collections.Generic.List[string]
    $warnings = New-Object System.Collections.Generic.List[string]
    $ids = @{}
    foreach ($u in $units) {
        $ids[$u.Id] = $true
        if (-not $src.Contains($u.Id) -or -not $src[$u.Id]) { $problems.Add("falta: $($u.Id)"); continue }
        $en = $src[$u.Id]
        if ((Get-TagSig $u.Html) -ne (Get-TagSig $en)) { $problems.Add("tags diferem: $($u.Id)") }
        $sp = Count-Sentences $u.Html; $se = Count-Sentences $en
        if ($sp -ne $se) { $warnings.Add(("frases {0}: PT {1} / EN {2}" -f $u.Id, $sp, $se)) }
        $wp = Count-Words $u.Html; $we = Count-Words $en
        if ($wp -ge 10) {
            $r = $we / $wp
            if ($r -lt 0.6 -or $r -gt 1.6) { $problems.Add(("tamanho {0} ({1} -> {2} palavras): {3}" -f $u.Id, $wp, $we, [math]::Round($r, 2))) }
        }
    }
    foreach ($k in $src.Keys) { if (-not $ids.ContainsKey($k)) { $problems.Add("id inexistente: $k") } }
    if ($problems.Count) {
        Write-Host ("{0,-16} {1} problema(s):" -f $page, $problems.Count)
        $problems | Select-Object -First 25 | ForEach-Object { Write-Host "    - $_" }
        return $false
    }
    if ($warnings.Count) {
        Write-Host ("{0,-16} AVISO: {1} unidade(s) com número de frases diferente (a narração sincroniza por frase):" -f $page, $warnings.Count)
        $warnings | Select-Object -First 25 | ForEach-Object { Write-Host "    ~ $_" }
    }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append("/* GERADO por tools/i18n.ps1 a partir de assets/i18n/src/$page.en.txt — não edite à mão. */`n")
    [void]$sb.Append("(window.DD_I18N = window.DD_I18N || {})['$page'] = {`n")
    $i = 0
    foreach ($u in $units) {
        $i++
        $json = (ConvertTo-Json -InputObject $src[$u.Id] -Compress)
        [void]$sb.Append("  `"$($u.Id)`": $json" + $(if ($i -lt $units.Count) { ",`n" } else { "`n" }))
    }
    [void]$sb.Append("};`n")
    New-Item -ItemType Directory -Force $outDir | Out-Null
    [IO.File]::WriteAllText((Join-Path $outDir "$page.js"), ($sb.ToString() -replace "`n", "`r`n"), $enc)
    Write-Host ("{0,-16} OK  {1} unidades" -f $page, $units.Count)
    return $true
}

switch ($Cmd) {
    'show' {
        if (-not $Page) { throw 'informe a página, ex.: show cap01' }
        $total = 0
        Get-Units $Page | ForEach-Object { $total += (Count-Words $_.Html); "## $($_.Id)  [$($_.Tag)]"; $_.Html; '' }
        "(total: $total palavras)"
    }
    'build' {
        $pages = if ($Page) { @($Page) } else { Get-Pages }
        $ok = 0; $bad = 0
        foreach ($p in $pages) {
            if (-not (Test-Path (Join-Path $srcDir "$p.en.txt"))) { if ($Page) { throw "sem fonte: $p" } else { continue } }
            if ((Build-Page $p) -eq $true) { $ok++ } else { $bad++ }
        }
        "compiladas: $ok | com problemas: $bad"
        if ($bad) { exit 1 }
    }
    'status' {
        $tw = 0; $dw = 0
        foreach ($p in Get-Pages) {
            $units = Get-Units $p; $src = Read-Src $p
            $w = 0; $d = 0
            foreach ($u in $units) { $n = Count-Words $u.Html; $w += $n; if ($src.Contains($u.Id) -and $src[$u.Id]) { $d += $n } }
            $tw += $w; $dw += $d
            "{0,-16} {1,3}/{2,3} unidades  {3,6} de {4,6} palavras  {5,3}%" -f $p, @($units | Where-Object { $src.Contains($_.Id) -and $src[$_.Id] }).Count, $units.Count, $d, $w, $(if ($w) { [math]::Round(100 * $d / $w) } else { 0 })
        }
        "TOTAL: $dw de $tw palavras traduzidas ($([math]::Round(100 * $dw / [math]::Max($tw,1)))%)"
    }
    default { throw "comando desconhecido: $Cmd (show | build | status)" }
}
