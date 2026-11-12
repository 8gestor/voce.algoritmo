<#
  stats.ps1 — conta as palavras de cada capítulo (PT e EN) e gera assets/js/estatisticas-dados.js.

  Uso:  pwsh tools\stats.ps1 build     # regera o arquivo de dados
        pwsh tools\stats.ps1 show      # mostra a tabela no terminal

  Conta apenas texto das unidades com data-id (o mesmo conjunto que é traduzido):
    pt / en            palavras de todas as unidades, no idioma
    ptListen / enListen palavras das unidades narradas (classe .speakable), no idioma
  "Palavra" = trecho separado por espaço que contém ao menos uma letra ou número (símbolos soltos
  como "→" ou "//" não contam). Os tempos de leitura são calculados no navegador, a partir de
  STATS.wpm, para poderem ser ajustados sem regerar nada.
#>
param([Parameter(Position = 0)][string]$Cmd = 'show')
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $repo 'assets\i18n\src'
$outFile = Join-Path $repo 'assets\js\estatisticas-dados.js'

function Get-Pages {
    Get-ChildItem "$repo\*.html" | Where-Object { $_.Name -notin @('index.html', 'estatisticas.html') } |
        ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) } | Sort-Object
}

function Get-Words([string]$html) {
    $t = [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($html, '<[^>]+>', ' '))) -replace '\s+', ' '
    $n = 0
    foreach ($w in ($t.Trim() -split ' ')) { if ($w -match '[\p{L}\p{N}]') { $n++ } }
    $n
}

# {Id, Speakable, Html} de cada elemento com data-id (ignora ids aninhados dentro de outra unidade).
function Get-Units([string]$page) {
    $h = [IO.File]::ReadAllText("$repo\$page.html", $enc)
    $units = New-Object System.Collections.Generic.List[object]
    $skipUntil = -1
    foreach ($m in [regex]::Matches($h, '<(\w+)\b([^>]*\bdata-id="([^"]+)"[^>]*)>')) {
        if ($m.Index -lt $skipUntil) { continue }
        $tag = $m.Groups[1].Value
        $pos = $m.Index + $m.Length
        $depth = 1; $end = -1
        foreach ($t in [regex]::Matches($h.Substring($pos), "<(/?)$tag\b[^>]*>")) {
            if ($t.Groups[1].Value -eq '/') { $depth-- } else { $depth++ }
            if ($depth -eq 0) { $end = $pos + $t.Index; break }
        }
        if ($end -lt 0) { throw "${page}: tag <$tag> do id $($m.Groups[3].Value) não fecha" }
        $skipUntil = $end
        $units.Add([pscustomobject]@{
            Id = $m.Groups[3].Value
            Speakable = ($m.Groups[2].Value -match 'class="[^"]*\bspeakable\b')
            Html = $h.Substring($pos, $end - $pos)
        })
    }
    $units
}

function Read-Src([string]$page) {
    $path = Join-Path $srcDir "$page.en.txt"
    $map = @{}
    if (-not (Test-Path $path)) { return $map }
    $cur = $null
    foreach ($l in [IO.File]::ReadAllLines($path, $enc)) {
        if ($l -match '^## (\S+)') { $cur = $Matches[1]; $map[$cur] = '' }
        elseif ($cur) { $map[$cur] += $l + ' ' }
    }
    $map
}

$rows = @()
foreach ($page in Get-Pages) {
    $en = Read-Src $page
    $r = [ordered]@{ file = "$page.html"; units = 0; pt = 0; en = 0; ptListen = 0; enListen = 0 }
    foreach ($u in Get-Units $page) {
        $r.units++
        $wp = Get-Words $u.Html
        $we = if ($en.ContainsKey($u.Id) -and $en[$u.Id].Trim()) { Get-Words $en[$u.Id] } else { $wp }   # sem tradução: conta o PT
        $r.pt += $wp; $r.en += $we
        if ($u.Speakable) { $r.ptListen += $wp; $r.enListen += $we }
    }
    $rows += [pscustomobject]$r
}

switch ($Cmd) {
    'show' {
        $rows | Format-Table file, units, pt, en, ptListen, enListen -AutoSize
        'TOTAL  pt={0}  en={1}  ptListen={2}  enListen={3}' -f ($rows | Measure-Object pt -Sum).Sum, ($rows | Measure-Object en -Sum).Sum, ($rows | Measure-Object ptListen -Sum).Sum, ($rows | Measure-Object enListen -Sum).Sum
    }
    'build' {
        $sb = New-Object System.Text.StringBuilder
        [void]$sb.AppendLine('/* GERADO por tools/stats.ps1 — não edite à mão. Regerar: pwsh tools\stats.ps1 build */')
        [void]$sb.AppendLine('/* wpm = palavras por minuto (estimativas médias; ajuste aqui se quiser): leitura silenciosa e narração a 1x. */')
        [void]$sb.AppendLine('const STATS = {')
        [void]$sb.AppendLine("  generated: '" + (Get-Date -Format 'yyyy-MM-dd') + "',")
        [void]$sb.AppendLine('  wpm: { read: { pt: 200, en: 238 }, listen: { pt: 150, en: 155 } },')
        [void]$sb.AppendLine('  chapters: {')
        for ($i = 0; $i -lt $rows.Count; $i++) {
            $r = $rows[$i]; $comma = if ($i -lt $rows.Count - 1) { ',' } else { '' }
            [void]$sb.AppendLine(("    '{0}': {{ units: {1}, pt: {2}, en: {3}, ptListen: {4}, enListen: {5} }}{6}" -f $r.file, $r.units, $r.pt, $r.en, $r.ptListen, $r.enListen, $comma))
        }
        [void]$sb.AppendLine('  }')
        [void]$sb.AppendLine('};')
        [IO.File]::WriteAllText($outFile, $sb.ToString(), $enc)
        "gerado: $outFile ($($rows.Count) páginas)"
    }
    default { throw "comando desconhecido: $Cmd (use build ou show)" }
}
