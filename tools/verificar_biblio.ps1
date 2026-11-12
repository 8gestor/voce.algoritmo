<#
  verificar_biblio.ps1 — confere as referências do livro em bases bibliográficas abertas.

  Para cada referência (bibliografia do cap16 + obras citadas no texto), consulta o Crossref (artigos, capítulos, livros com DOI)
  e o Open Library (livros) e registra: se achou, o título encontrado, os autores, o ano da fonte e o link.
  Compara o ano do livro com o da fonte e marca divergências.

  Saída: parte-ia/verificacao/biblio_resultado.json
  Obs.: nenhuma consulta envia dados pessoais; só autor, título e ano da obra.
#>
$ErrorActionPreference = 'Continue'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$out = Join-Path $repo 'parte-ia\verificacao\biblio_resultado.json'

function Norm([string]$s) {
    $d = $s.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object Text.StringBuilder
    foreach ($c in $d.ToCharArray()) { if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne 'NonSpacingMark') { [void]$sb.Append($c) } }
    ($sb.ToString().ToLower() -replace '[^a-z0-9 ]', ' ' -replace '\s+', ' ').Trim()
}
$stop = @('the', 'a', 'an', 'of', 'and', 'in', 'on', 'for', 'to', 'de', 'da', 'do', 'e', 'o', 'as', 'os', 'um', 'uma', 'with', 'from', 'by', 'is', 'are')
function Tokens([string]$s) { (Norm $s).Split(' ') | Where-Object { $_.Length -gt 1 -and $stop -notcontains $_ } | Select-Object -Unique }
function Contain($a, $b) {
    $ta = @(Tokens $a); $tb = @(Tokens $b)
    if ($ta.Count -eq 0 -or $tb.Count -eq 0) { return 0 }
    $inter = @($ta | Where-Object { $tb -contains $_ }).Count
    [math]::Round($inter / [math]::Min($ta.Count, $tb.Count), 2)
}
function Get-Json([string]$url) {
    for ($i = 0; $i -lt 2; $i++) {
        try { Start-Sleep -Milliseconds 250; return Invoke-RestMethod -Uri $url -TimeoutSec 25 -Headers @{ 'User-Agent' = 'verificador-bibliografico/1.0' } } catch { Start-Sleep -Seconds 1 }
    }
    $null
}
function Find-Work([string]$title, [string]$surname, $year) {
    # junta TODOS os registros que batem em título e autor (Crossref e Open Library) e fica com o mais antigo:
    # reedições e reimpressões trazem anos posteriores ao da obra original.
    $cands = New-Object System.Collections.Generic.List[object]
    $q = [uri]::EscapeDataString("$title $surname")
    $cr = Get-Json "https://api.crossref.org/works?query.bibliographic=$q&rows=10&select=DOI,title,issued,author,container-title,type"
    if ($cr -and $cr.message.items) {
        foreach ($it in $cr.message.items) {
            if (-not $it.title) { continue }
            $sc = Contain $title ([string]$it.title[0])
            $au = @($it.author | ForEach-Object { Norm ([string]$_.family) })
            $auOk = $au -contains (Norm $surname)
            $y = if ($it.issued.'date-parts'[0][0]) { [int]$it.issued.'date-parts'[0][0] } else { $null }
            $cands.Add([pscustomobject]@{ base = 'Crossref'; titulo = [string]$it.title[0]; autores = (($it.author | Select-Object -First 3 | ForEach-Object { "$($_.given) $($_.family)" }) -join '; '); ano = $y; url = "https://doi.org/$($it.DOI)"; score = $sc; autorOk = $auOk; tipo = $it.type })
        }
    }
    $t = [uri]::EscapeDataString($title); $a = [uri]::EscapeDataString($surname)
    $ol = Get-Json "https://openlibrary.org/search.json?title=$t&author=$a&limit=8&fields=title,author_name,first_publish_year,key"
    if ($ol -and $ol.docs) {
        foreach ($d in $ol.docs) {
            $sc = Contain $title ([string]$d.title)
            $au = @($d.author_name | ForEach-Object { Norm ([string]$_) })
            $auOk = [bool](@($au | Where-Object { $_ -like "*$(Norm $surname)*" }).Count)
            $cands.Add([pscustomobject]@{ base = 'Open Library'; titulo = [string]$d.title; autores = (($d.author_name | Select-Object -First 3) -join '; '); ano = $d.first_publish_year; url = "https://openlibrary.org$($d.key)"; score = $sc; autorOk = $auOk; tipo = 'book' })
        }
    }
    $good = @($cands | Where-Object { $_.score -ge 0.8 -and ($_.autorOk -or -not $surname) -and $_.ano })
    if (-not $good.Count) { $good = @($cands | Where-Object { $_.score -ge 0.7 -and ($_.autorOk -or -not $surname) -and $_.ano }) }
    if (-not $good.Count) { return $null }
    $good | Sort-Object ano | Select-Object -First 1
}

# ---------- lista de obras: (chave, sobrenome do 1.º autor, título original em inglês, ano no livro, onde aparece)
$items = New-Object System.Collections.Generic.List[object]
function Add-Item($key, $sur, $title, $year, $where) { $items.Add([pscustomobject]@{ chave = $key; sobrenome = $sur; titulo = $title; ano_livro = $year; onde = $where }) }

# bibliografia (cap16): título em inglês vem da tradução, que usa os títulos originais
$ptSrc = [IO.File]::ReadAllText("$repo\cap16.html", $enc)
$enSrc = [IO.File]::ReadAllText("$repo\assets\i18n\src\cap16.en.txt", $enc)
$enBlocks = @{}
$cur = $null
foreach ($line in ($enSrc -split "`r?`n")) { if ($line -match '^##\s+(\S+)') { $cur = $Matches[1]; $enBlocks[$cur] = '' } elseif ($cur) { $enBlocks[$cur] += ' ' + $line } }
$cards = [regex]::Matches($ptSrc, '(?s)<div class="book-card speakable" data-id="(c16-\d+)">(.*?)</div>\s*</div>|<div class="book-card speakable" data-id="(c16-\d+)">.*?<span class="book-author">(.*?)</span>\s*<div class="book-title">(.*?)</div>')
$seen = @{}
foreach ($m in [regex]::Matches($ptSrc, '(?s)data-id="(c16-\d+)"[^>]*>\s*(?:<div class="book-meta">.*?</div>\s*)?<span class="book-author">(.*?)</span>\s*<div class="book-title">(.*?)</div>')) {
    $id = $m.Groups[1].Value; if ($seen[$id]) { continue }; $seen[$id] = $true
    $au = [System.Net.WebUtility]::HtmlDecode(($m.Groups[2].Value -replace '<[^>]+>', ''))
    $tiPt = [System.Net.WebUtility]::HtmlDecode(($m.Groups[3].Value -replace '<[^>]+>', '')).Trim()
    $tiEn = $tiPt
    if ($enBlocks[$id]) { $mm = [regex]::Match($enBlocks[$id], '<div class="book-title">(.*?)</div>'); if ($mm.Success) { $tiEn = [System.Net.WebUtility]::HtmlDecode(($mm.Groups[1].Value -replace '<[^>]+>', '')).Trim() } }
    $yr = $null; $ym = [regex]::Match($tiPt, '\((19|20)\d{2}\)'); if ($ym.Success) { $yr = [int]($ym.Value.Trim('(', ')')) }
    $titleClean = ($tiEn -replace '\s*\((19|20)\d{2}[^)]*\)', '' -replace '\s*\(.*?Nature.*?\)', '').Trim()
    $sur = ($au -split '[,;&]')[0].Trim()
    Add-Item $id $sur $titleClean $yr 'Bibliografia'
}
# obras citadas no texto que não estão na bibliografia (ou cujo ano interessa conferir)
Add-Item 'x-mcculloch' 'McCulloch' 'A logical calculus of the ideas immanent in nervous activity' 1943 'Cap. 01'
Add-Item 'x-searle' 'Searle' 'Minds, brains, and programs' 1980 'Cap. 01'
Add-Item 'x-chalmers' 'Chalmers' 'Facing up to the problem of consciousness' 1995 'Cap. 01'
Add-Item 'x-weizenbaum' 'Weizenbaum' 'ELIZA a computer program for the study of natural language communication between man and machine' 1966 'Cap. 01'
Add-Item 'x-wu2015' 'Wu' 'Computer-based personality judgments are more accurate than those made by humans' 2015 'Cap. 03'
Add-Item 'x-mbembe' 'Mbembe' 'Necropolitics' 2003 'Cap. 12'
Add-Item 'x-hirsch' 'Hirsch' 'Frontal temporal and parietal systems synchronize within and across brains during live eye-to-eye contact' 2017 'Cap. 02'
Add-Item 'x-paisvieira' 'Pais-Vieira' 'Building an organic computing device with multiple interconnected brains' 2015 'Cap. 02'
Add-Item 'x-hasson' 'Hasson' 'Brain-to-brain coupling: a mechanism for creating and sharing a social world' 2012 'Cap. 02'
Add-Item 'x-csik' 'Csikszentmihalyi' 'Flow: The Psychology of Optimal Experience' 1990 'Cap. 02'
Add-Item 'x-kalla' 'Kalla' 'The Minimal Persuasive Effects of Campaign Contact in General Elections' 2018 'Cap. 03'
Add-Item 'x-howe' 'Howe' 'TrackMeNot: Resisting surveillance in web search' 2009 'Cap. 19'
Add-Item 'x-gebru' 'Bender' 'On the Dangers of Stochastic Parrots' 2021 'Cap. 01'
Add-Item 'x-friston' 'Friston' 'The free-energy principle: a unified brain theory' 2010 'Cap. 01'
Add-Item 'x-kleinberg2' 'Kleinberg' 'Human decisions and machine predictions' 2018 'Cap. 14'

$res = New-Object System.Collections.Generic.List[object]
$n = 0
foreach ($it in $items) {
    $n++
    Write-Progress -Activity 'Verificando referências' -Status "$n de $($items.Count): $($it.titulo)" -PercentComplete (100 * $n / $items.Count)
    $f = Find-Work $it.titulo $it.sobrenome $it.ano_livro
    $status = 'não encontrado'; $div = ''
    if ($f) {
        $status = 'encontrado'
        if ($it.ano_livro -and $f.ano -and [int]$f.ano -ne [int]$it.ano_livro) {
            $d = [int]$f.ano - [int]$it.ano_livro
            $status = 'encontrado, ano diverge'
            $div = "o livro diz $($it.ano_livro); a base registra $($f.ano) ($($f.base))"
        }
    }
    $res.Add([ordered]@{
        chave = $it.chave; onde = $it.onde; autor = $it.sobrenome; titulo_livro = $it.titulo; ano_livro = $it.ano_livro
        status = $status; divergencia = $div
        achou_titulo = if ($f) { $f.titulo } else { '' }; achou_autores = if ($f) { $f.autores } else { '' }
        ano_fonte = if ($f) { $f.ano } else { $null }; base = if ($f) { $f.base } else { '' }; url = if ($f) { $f.url } else { '' }
        score_titulo = if ($f) { $f.score } else { 0 }
    })
}
[IO.File]::WriteAllText($out, ($res | ConvertTo-Json -Depth 4), $enc)
''
$res | Group-Object { $_.status } | ForEach-Object { '{0,-26} {1,4}' -f $_.Name, $_.Count }
