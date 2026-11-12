<#
  ids.ps1 — dá data-id estável às unidades traduzíveis de PÁGINAS NOVAS.
  Uso:  .\tools\ids.ps1 ia01 ia02        (só as páginas listadas; nunca mexe nas outras)
  Unidade = elemento .speakable ou rótulo (.meta-tag, .comp-title, .system-alert, .chapter-meta, .cat-title).
  Ids já existentes são preservados; os novos continuam a numeração a partir do maior id da página.
#>
param([Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)][string[]]$Pages)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$re = '<(\w+)\b([^>]*\bclass="[^"]*\b(?:speakable|meta-tag|comp-title|system-alert|chapter-meta|cat-title)\b[^"]*"[^>]*)>'
foreach ($name in $Pages) {
    $path = Join-Path $repo "$name.html"
    $h = [IO.File]::ReadAllText($path, $enc)
    $max = 0
    foreach ($m in [regex]::Matches($h, "data-id=`"$name-(\d+)`"")) { $max = [math]::Max($max, [int]$m.Groups[1].Value) }
    $script:n = $max; $script:added = 0
    $out = [regex]::Replace($h, $re, {
        param($m)
        if ($m.Value -match '\bdata-id=') { return $m.Value }
        $script:n++; $script:added++
        return '<' + $m.Groups[1].Value + $m.Groups[2].Value + (' data-id="{0}-{1:000}">' -f $name, $script:n)
    })
    if ($script:added) { [IO.File]::WriteAllText($path, $out, $enc) }
    "{0}: +{1} ids (último: {2}-{3:000})" -f $name, $script:added, $name, $script:n
}
