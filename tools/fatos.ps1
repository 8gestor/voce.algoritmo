<#
  fatos.ps1 — extrai do texto do livro as afirmações verificáveis (números, datas, leis, casos, obras atribuídas)
  e junta com os registros de verificação da Parte II, para gerar o relatório de conferência.

  Saída: parte-ia/verificacao/itens.json  e  itens.csv (UTF-8 com BOM, separador ";", abre no Excel pt-BR).

  Uso:  .\tools\fatos.ps1
  Páginas do livro antigo (introdução, Caps. 1 a 14): sentenças com número/ano/lei/caso/atribuição.
  Glossário (cap15): verbetes com conceito atribuído a autor. Bibliografia (cap16): uma linha por referência.
  Parte II (ia01..ia08): linhas vêm dos registros parte-ia/fontes-NN.md (já com status e fonte).
#>
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $repo 'parte-ia\verificacao'
New-Item -ItemType Directory -Force $outDir | Out-Null

function Get-Units([string]$page) {
    $h = [IO.File]::ReadAllText("$repo\$page.html", $enc)
    $list = New-Object System.Collections.Generic.List[object]
    foreach ($m in [regex]::Matches($h, '<(\w+)\b([^>]*)\bdata-id="([^"]+)"([^>]*)>')) {
        $tag = $m.Groups[1].Value; $pos = $m.Index + $m.Length; $depth = 1; $end = -1
        foreach ($t in [regex]::Matches($h.Substring($pos), "<(/?)$tag\b[^>]*>")) {
            if ($t.Groups[1].Value -eq '/') { $depth-- } else { $depth++ }
            if ($depth -eq 0) { $end = $pos + $t.Index; break }
        }
        if ($end -lt 0) { continue }
        $list.Add([pscustomobject]@{ Id = $m.Groups[3].Value; Tag = $tag; Attrs = $m.Groups[2].Value + $m.Groups[4].Value; Html = $h.Substring($pos, $end - $pos) })
    }
    $list
}
function Plain([string]$html) {
    $t = $html -replace '<br\s*/?>', ' ' -replace '</(p|div|li|h[1-6]|td|th|tr)>', '$& '
    $t = [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($t, '<[^>]+>', ' ')))
    ($t -replace '\s+', ' ').Trim()
}
function Split-Sentences([string]$text) {
    $t = $text -replace '\b(art|arts|n|Dr|Dra|Sr|Sra|Prof|etc|vs|St)\. ', "`$1.$([char]0x00A0)"
    $pat = '(?<=[.!?' + [char]0x2026 + '])["' + [char]0x201D + [char]0x2019 + ')\]]*\s+(?=[A-Z' + [char]0xC1 + [char]0xC9 + [char]0xCD + [char]0xD3 + [char]0xDA + [char]0xC2 + [char]0xCA + [char]0xD4 + [char]0xC3 + [char]0xD5 + [char]0xC7 + '"' + [char]0x201C + '0-9(])'
    $parts = [regex]::Split($t, $pat)
    $parts | ForEach-Object { ($_ -replace [char]0x00A0, ' ').Trim() } | Where-Object { $_.Length -gt 0 }
}

$rows = New-Object System.Collections.Generic.List[object]
$seq = 0
function Add-Row($cap, $page, $unit, $trecho, $tipo, $fonte, $marcado, $prio, $como, $status, $nota, $origem) {
    $script:seq++
    $rows.Add([ordered]@{
        id = ('F{0:0000}' -f $script:seq); capitulo = $cap; pagina = $page; unidade = $unit
        trecho = $trecho; tipo = $tipo; fonte_no_texto = $fonte; marcado_no_texto = $marcado
        prioridade = $prio; como_conferir = $como; status = $status; nota = $nota; origem = $origem
    })
}

# ---------- rótulos de capítulo (a partir do h1 de cada página) e numeração FINAL planejada
$final = @{ 'introducao' = 'Introdução'; 'cap01' = 'Cap. 01'; 'cap02' = 'Cap. 02'; 'cap03' = 'Cap. 03'
    'cap04' = 'Cap. 12 (hoje 04)'; 'cap05' = 'Cap. 13 (hoje 05)'; 'cap06' = 'Cap. 14 (hoje 06)'; 'cap06_1' = 'Cap. 14.1 (hoje 06.1)'
    'cap07' = 'Cap. 15 (hoje 07)'; 'cap08' = 'Cap. 16 (hoje 08)'; 'cap09' = 'Cap. 17 (hoje 09)'; 'cap09_1' = 'Cap. 17.1 (hoje 09.1)'
    'cap10' = 'Cap. 18 (hoje 10)'; 'cap10_1' = 'Cap. 18.1 (hoje 10.1)'; 'cap10_2' = 'Cap. 18.2 (hoje 10.2)'
    'cap11' = 'Cap. 19 (hoje 11)'; 'cap12' = 'Cap. 20 (hoje 12)'; 'cap13' = 'Cap. 21 (hoje 13)'; 'cap14' = 'Epílogo'
    'cap15' = 'Glossário'; 'cap16' = 'Bibliografia' }

$hedgeRe = '(estimativa|hipótese|plausível|a conferir|não (está|foi|há|existe)[^.]{0,30}(comprovad|confirmad|provad|auditoria)|contestad|versões? (variam|divergem)|fontes divergem|segundo reportagens|não é um caso documentado|não está provado|em disputa|não é consenso)'
$legalRe = '(\bLei\b|\blei\b|\bart\.|\bPL\b|\bPEC\b|LGPD|GDPR|AI Act|Constituição|decis|multa|condenad|processo|tribunal|Tribunal|Corte|acórdão|sancion|regulament|diretiva|Diretiva)'
$numRe = '(R\$|US\$|\d+\s?%|\d[\d.,]*\s?(milhões|milhão|bilhões|bilhão|mil\b|TWh|km|ml|litros|anos|minutos|segundos|dias|meses|horas)|\b\d{1,3}(\.\d{3})+\b|\b\d+,\d+\b)'
$yearRe = '\b(19|20)\d{2}\b'
$attrRe = '(segundo|conforme|de acordo com|estudo|pesquisa|relatório|artigo|livro|ensaio|Para [A-Z][a-zé]+|\([A-Z][^()]*,\s?(19|20)\d{2}\)|[A-Z][a-zé]+ e colegas)'

$known = @(
    @{ k = 'Byung-Chul'; n ='Pendência conhecida: conferir atribuição e ano de *Psicopolítica* (Han) e se a leitura do texto condiz com a obra.' }
    @{ k = 'Kitchin';    n = 'Pendência conhecida: conferir *The Real-Time City?* (Kitchin, 2014) e a leitura atribuída.' }
    @{ k = 'Lembke';     n = 'Pendência conhecida: conferir *Dopamine Nation* (Lembke, 2021) e a crítica atribuída a "parte dos pesquisadores".' }
    @{ k = 'Pull-to-Refresh'; n = 'Pendência conhecida: conferir a data (2009) e o app (Tweetie) da invenção do gesto por Loren Brichter.' }
    @{ k = 'Elliot';     n = 'Pendência conhecida: conferir detalhes do paciente Elliot em Damasio (*O Erro de Descartes*, 1994).' }
    @{ k = 'secretária'; n = 'Pendência conhecida: a anedota da secretária de Weizenbaum vem de relatos posteriores e as versões variam; conferir a fonte.' }
)

function Classify([string]$s, [string]$unitAttrs) {
    $hasNum = $s -match $numRe; $hasYear = $s -match $yearRe; $hasLegal = $s -match $legalRe; $hasAttr = $s -cmatch $attrRe
    $hedge = ([regex]::Match($s, $hedgeRe, 'IgnoreCase')).Value
    $tipo = $null
    if ($hasLegal -and ($hasNum -or $hasYear)) { $tipo = 'Lei, decisão ou caso jurídico' }
    elseif ($hasNum) { $tipo = 'Número ou estatística' }
    elseif ($hasYear -and $hasAttr) { $tipo = 'Obra, estudo ou autor datado' }
    elseif ($hasYear) { $tipo = 'Fato datado' }
    elseif ($hasAttr -and $s -cmatch '[A-Z][a-zé]+ [A-Z][a-zé]+') { $tipo = 'Obra, estudo ou autor' }
    if (-not $tipo) { return $null }
    $prio = 'baixa'
    if ($tipo -eq 'Lei, decisão ou caso jurídico' -or $tipo -eq 'Número ou estatística') { $prio = 'alta' }
    elseif ($tipo -like 'Obra*' -or $tipo -eq 'Fato datado') { $prio = 'média' }
    if ($hedge) { if ($prio -eq 'alta') { $prio = 'média' } }
    [pscustomobject]@{ Tipo = $tipo; Prio = $prio; Hedge = $hedge }
}
$comoMap = @{
    'Lei, decisão ou caso jurídico' = 'Conferir na norma oficial (Planalto, DOU, EUR-Lex) ou na decisão/notícia do próprio tribunal; confirmar número, data e órgão.'
    'Número ou estatística'         = 'Localizar o relatório/artigo original e conferir o número, a unidade, o ano e a metodologia.'
    'Obra, estudo ou autor datado'  = 'Conferir autoria, título, ano e se a obra diz o que o texto atribui a ela.'
    'Fato datado'                   = 'Conferir a data e o fato em fonte primária ou jornalística de referência.'
    'Obra, estudo ou autor'         = 'Conferir autoria e se a ideia atribuída aparece na obra.'
}

# ---------- 1) livro antigo: introdução e capítulos 1 a 14
$oldPages = @('introducao', 'cap01', 'cap02', 'cap03', 'cap04', 'cap05', 'cap06', 'cap06_1', 'cap07', 'cap08', 'cap09', 'cap09_1', 'cap10', 'cap10_1', 'cap10_2', 'cap11', 'cap12', 'cap13', 'cap14')
foreach ($p in $oldPages) {
    $cap = $final[$p]
    foreach ($u in (Get-Units $p)) {
        if ($u.Tag -match '^(h1|h2|h3)$' -or $u.Attrs -match 'meta-tag|comp-title|system-alert') { continue }
        $isAction = $u.Html -match 'action-header|DESAFIO DE RETOMADA'
        $text = Plain $u.Html
        foreach ($s in (Split-Sentences $text)) {
            if ($s.Length -lt 45) { continue }
            if ($s -match '^(//|>|⚠|PARTE|SYSTEM)') { continue }
            $c = Classify $s $u.Attrs
            $forced = $false; foreach ($k in $known) { if ($s -like "*$($k.k)*") { $forced = $true } }
            if (-not $c -and $forced) { $c = [pscustomobject]@{ Tipo = 'Obra, estudo ou autor'; Prio = 'alta'; Hedge = '' } }
            if (-not $c) { continue }
            if ($isAction -and -not $forced -and -not (($s -cmatch $attrRe) -or ($s -match $legalRe))) { continue }
            $fonte = ''
            $m = [regex]::Match($s, '\([A-Z][^()]*?(19|20)\d{2}[^()]*\)')
            if ($m.Success) { $fonte = $m.Value }
            else { $m = [regex]::Match($s, '(Segundo|segundo|De acordo com|de acordo com|Conforme|conforme) [^,.;:]{3,70}'); if ($m.Success) { $fonte = $m.Value } }
            $nota = ''; $prio = $c.Prio
            foreach ($k in $known) { if ($s -like "*$($k.k)*") { $nota = $k.n; $prio = 'alta' } }
            if ($s -match '\b(2025|2026)\b') {
                $prio = 'alta'
                $nota = (($nota + ' Sensível ao tempo (cita 2025 ou 2026): reconferir o status atual antes de publicar.').Trim())
            }
            Add-Row $cap $p $u.Id $s $c.Tipo $fonte $c.Hedge $prio $comoMap[$c.Tipo] 'a conferir' $nota 'extraído do texto (1ª passada de checagem feita em sessão anterior; não reverificado agora)'
        }
    }
}

# ---------- 2) glossário: verbetes com conceito atribuído ou número
foreach ($u in (Get-Units 'cap15')) {
    if ($u.Html -notmatch 'term-title') { continue }
    $title = Plain ([regex]::Match($u.Html, '(?s)<span class="term-title">(.*?)</span>').Groups[1].Value)
    $def = Plain ([regex]::Match($u.Html, '(?s)<p class="term-def">(.*?)</p>').Groups[1].Value)
    if ($def -match '(Conceito de|Termo de|Distinção de|Proposta de|\((19|20)\d{2}\)|\d{4}|Weizenbaum|Brunton|Chesney|Mann|Zuboff|Couldry|Illich|Deleuze|Mbembe|Morozov|Varoufakis|Carse|Farahany|O.Neil|FTC|Chile)') {
        $nota = ''; foreach ($k in $known) { if ("$title $def" -like "*$($k.k)*") { $nota = $k.n } }
        Add-Row 'Glossário' 'cap15' $u.Id ("$title — $def") 'Conceito atribuído no glossário' '' '' 'média' 'Conferir se o conceito é do autor citado, o ano e se a definição condiz com a obra original.' 'a conferir' $nota 'extraído do glossário'
    }
}

# ---------- 3) bibliografia: uma linha por referência
foreach ($u in (Get-Units 'cap16')) {
    if ($u.Html -notmatch 'book-author') { continue }
    $au = Plain ([regex]::Match($u.Html, '(?s)<span class="book-author">(.*?)</span>').Groups[1].Value)
    $ti = Plain ([regex]::Match($u.Html, '(?s)<div class="book-title">(.*?)</div>').Groups[1].Value)
    $de = Plain ([regex]::Match($u.Html, '(?s)<div class="book-desc">(.*?)</div>').Groups[1].Value)
    $nota = ''; foreach ($k in $known) { if ("$au $ti $de" -like "*$($k.k)*") { $nota = $k.n } }
    $prio = if ($nota) { 'alta' } else { 'média' }
    Add-Row 'Bibliografia' 'cap16' $u.Id ("$au — $ti. $de") 'Referência bibliográfica' '' '' $prio 'Conferir autor, título, ano, editora/periódico (e edição brasileira, se houver) e se a descrição resume corretamente a obra.' 'a conferir' $nota 'extraído da bibliografia'
}

# ---------- 4) Parte II: registros fontes-NN.md (linhas de tabela com 3 colunas: afirmação | status | fonte)
$capParte = @{ '04' = 'Cap. 04 · A Máquina de Prometer'; '05' = 'Cap. 05 · Como a Máquina Aprende'; '06' = 'Cap. 06 · Espelho e Papagaio'; '07' = 'Cap. 07 · Companheiros Sintéticos'
    '08' = 'Cap. 08 · Quem Treina a Máquina'; '09' = 'Cap. 09 · A Corrida'; '10' = 'Cap. 10 · O Debate do Fim do Mundo'; '11' = 'Cap. 11 · Guerrilha com IA' }
foreach ($nn in ($capParte.Keys | Sort-Object)) {
    $f = "$repo\parte-ia\fontes-$nn.md"
    if (-not (Test-Path $f)) { continue }
    foreach ($line in ([IO.File]::ReadAllLines($f, $enc))) {
        if ($line -notmatch '^\|' -or $line -match '^\|\s*-' -or $line -match '^\|\s*Afirma') { continue }
        $cells = $line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() }
        if ($cells.Count -lt 3) { continue }
        $claim = $cells[0]; $st = $cells[1]; $src = ($cells[2..($cells.Count - 1)] -join ' | ')
        $statusN = 'a conferir'; $prio = 'média'
        if ($st -match '^confirmado' -and $st -notmatch 'secund|via cobertura|diverg|varia') { $statusN = 'confirmado na pesquisa'; $prio = 'baixa' }
        elseif ($st -match 'confirmado') { $statusN = 'confirmado em fonte secundária'; $prio = 'média' }
        elseif ($st -match 'secund') { $statusN = 'só em fonte secundária'; $prio = 'alta' }
        elseif ($st -match 'a conferir|lacuna|não confirm|\*\*a conferir') { $statusN = 'não confirmado'; $prio = 'alta' }
        elseif ($st -match 'hipótese|interpreta|provoca|estimativa') { $statusN = 'julgamento do autor (marcado no texto)'; $prio = 'baixa' }
        elseif ($st -match 'conhecimento geral') { $statusN = 'conhecimento geral, sem fonte consultada'; $prio = 'média' }
        elseif ($st -match 'interno|já no|já na') { $statusN = 'referência interna ao livro'; $prio = 'baixa' }
        if ($src -match 'Conferir|conferir|reconferir') { if ($prio -eq 'baixa') { $prio = 'média' } }
        Add-Row $capParte[$nn] "ia$([int]$nn - 3)" '' ($claim -replace '\*\*', '') 'Afirmação da Parte II' ($src -replace '\*\*', '') '' $prio 'Seguir o link da fonte e a observação "conferir" quando houver.' $statusN ('Status no registro: ' + ($st -replace '\*\*', '')) 'registro de verificação da Parte II (checado na pesquisa de nov/2026)'
    }
}

# ---------- saída
$json = $rows | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText("$outDir\itens.json", $json, $enc)
$bom = New-Object System.Text.UTF8Encoding($true)
$cols = 'id', 'capitulo', 'tipo', 'prioridade', 'status', 'trecho', 'fonte_no_texto', 'marcado_no_texto', 'como_conferir', 'nota', 'origem'
$csv = New-Object System.Text.StringBuilder
[void]$csv.AppendLine(($cols -join ';'))
foreach ($r in $rows) { [void]$csv.AppendLine((($cols | ForEach-Object { '"' + (([string]$r[$_]) -replace '"', '""') + '"' }) -join ';')) }
[IO.File]::WriteAllText("$outDir\itens.csv", $csv.ToString(), $bom)

"itens: $($rows.Count)"
$rows | Group-Object { $_.capitulo } | ForEach-Object { '{0,-38} {1,4}' -f $_.Name, $_.Count }
''
$rows | Group-Object { $_.prioridade } | ForEach-Object { '{0,-8} {1,4}' -f $_.Name, $_.Count }
