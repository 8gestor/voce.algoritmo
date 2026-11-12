<#
  raiox.ps1 — gera assets/js/raiox.js (dados do Raio-X: conceitos do glossário por capítulo).

  Fonte: os verbetes de cap15.html (PT) e assets/i18n/src/cap15.en.txt (EN), na mesma ordem.
  O mapeamento verbete -> capítulo vem das referências "REF:" do próprio glossário em PT.
  Rode depois de mudar o glossário ou a sua tradução:   .\tools\raiox.ps1
#>
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot

function Plain([string]$s) { [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($s, '<[^>]+>', ''))).Trim() }
$cardRe = '(?s)<span class="term-title">(.*?)</span>.*?<p class="term-def">(.*?)</p>\s*<span class="term-ref">REF:\s*(.*?)</span>'

$pt = [regex]::Matches([IO.File]::ReadAllText("$repo\cap15.html", $enc), $cardRe)
$enSrc = [IO.File]::ReadAllText("$repo\assets\i18n\src\cap15.en.txt", $enc)
$en = [regex]::Matches($enSrc, $cardRe)
if ($pt.Count -ne $en.Count) { throw "glossário PT ($($pt.Count)) e EN ($($en.Count)) com números diferentes de verbetes" }

$map = @{}
for ($i = 0; $i -lt $pt.Count; $i++) {
    $p = $pt[$i]; $e = $en[$i]
    $ref = Plain $p.Groups[3].Value
    foreach ($tok in ($ref -split ',')) {
        $tok = $tok.Trim()
        $file = $null
        if ($tok -eq 'Introdução') { $file = 'introducao.html' }
        elseif ($tok -eq 'Epílogo') { $file = 'cap14.html' }
        elseif ($tok -match '^(?:Cap\s+)?(\d{1,2})(?:\.(\d))?$') {
            # numeração exibida -> arquivo: 01-03 = cap01-03 | 04-11 = ia01-ia08 (Parte II) | 12-21 = cap04-cap13 (nomes de arquivo antigos)
            $n = [int]$Matches[1]; $sub = if ($Matches[2]) { '_' + $Matches[2] } else { '' }
            if ($n -le 3) { $file = 'cap' + $n.ToString('00') + $sub + '.html' }
            elseif ($n -le 11) { $file = 'ia' + ($n - 3).ToString('00') + '.html' }
            else { $file = 'cap' + ($n - 8).ToString('00') + $sub + '.html' }
        }
        if (-not $file) { continue }
        if (-not $map.ContainsKey($file)) { $map[$file] = New-Object System.Collections.Generic.List[object] }
        $map[$file].Add([ordered]@{
            t = (Plain $p.Groups[1].Value); d = (Plain $p.Groups[2].Value); r = $ref
            te = (Plain $e.Groups[1].Value); de = (Plain $e.Groups[2].Value); re = (Plain $e.Groups[3].Value)
        })
    }
}
$sorted = [ordered]@{}
foreach ($k in ($map.Keys | Sort-Object)) { $sorted[$k] = @($map[$k] | Sort-Object { $_.t }) }
$json = $sorted | ConvertTo-Json -Depth 6
$js = "/*`n * raiox.js — dados do Raio-X: conceitos do glossário por capítulo (PT: t,d,r | EN: te,de,re).`n * GERADO por tools/raiox.ps1 a partir de cap15.html e da tradução; não edite à mão.`n */`nconst RAIOX = $json;`n"
[IO.File]::WriteAllText("$repo\assets\js\raiox.js", ($js -replace "`r`n", "`n" -replace "`n", "`r`n"), $enc)
"raiox.js: $($pt.Count) verbetes, $($sorted.Keys.Count) capítulos"
