<#
  painel.ps1 — gera parte-ia/verificacao/painel.html a partir do modelo e de itens.json.
  Ordem: .\tools\fatos.ps1  (extrai e junta os itens)  ->  .\tools\painel.ps1  (embute os dados no painel).
#>
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $repo 'parte-ia\verificacao'
$rows = [IO.File]::ReadAllText("$dir\itens.json", $enc) | ConvertFrom-Json
$json = $rows | ConvertTo-Json -Depth 4 -Compress
# seguro para ir dentro de <script>: sem "<" literal e sem separadores de linha Unicode
$json = $json.Replace('<', '<').Replace([string][char]0x2028, ' ').Replace([string][char]0x2029, ' ')
$tpl = [IO.File]::ReadAllText("$dir\painel.template.html", $enc)
$out = $tpl.Replace('__DATA__', $json)
[IO.File]::WriteAllText("$dir\painel.html", $out, $enc)
"painel.html: {0} itens, {1} KB" -f @($rows).Count, [math]::Round($out.Length / 1KB)
