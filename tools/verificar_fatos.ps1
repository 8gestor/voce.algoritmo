<#
  verificar_fatos.ps1 — confere números e afirmações do livro contra o texto original de artigos e páginas abertas.

  Fontes lidas: resumos do Europe PMC (por DOI), resumos do arXiv (por id), metadados do Crossref (por DOI) e páginas web simples.
  Cada verificação tem uma expressão que o texto original precisa conter. Saída: parte-ia/verificacao/fatos_resultado.json
  Nenhuma consulta envia dados pessoais.
#>
$ErrorActionPreference = 'Continue'
$enc = New-Object System.Text.UTF8Encoding($false)
$repo = Split-Path -Parent $PSScriptRoot
$out = Join-Path $repo 'parte-ia\verificacao\fatos_resultado.json'

function Get-Text([string]$url) { try { Start-Sleep -Milliseconds 250; (Invoke-WebRequest -Uri $url -TimeoutSec 30 -UserAgent 'verificador-de-fatos/1.0' -MaximumRedirection 5).Content } catch { $null } }
function Epmc([string]$doi) {
    $r = Get-Text "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:$doi&resultType=core&format=json"
    if (-not $r) { return $null }
    $j = $r | ConvertFrom-Json
    if ($j.resultList.result.Count -lt 1) { return $null }
    $x = $j.resultList.result[0]
    [pscustomobject]@{ texto = ([string]$x.title + ' ' + [string]$x.abstractText); url = "https://doi.org/$doi"; ano = $x.pubYear; rotulo = 'Europe PMC' }
}
function Arx([string]$id) {
    $r = Get-Text "https://export.arxiv.org/api/query?id_list=$id"
    if (-not $r) { return $null }
    $t = [regex]::Match($r, '(?s)<entry>.*?<title>(.*?)</title>.*?<summary>(.*?)</summary>.*?<published>(.*?)</published>')
    if (-not $t.Success) { return $null }
    [pscustomobject]@{ texto = ($t.Groups[1].Value + ' ' + $t.Groups[2].Value) -replace '\s+', ' '; url = "https://arxiv.org/abs/$id"; ano = $t.Groups[3].Value.Substring(0, 4); rotulo = 'arXiv' }
}
function Cref([string]$doi) {
    $r = Get-Text "https://api.crossref.org/works/$doi"
    if (-not $r) { return $null }
    $m = ($r | ConvertFrom-Json).message
    $y = $m.issued.'date-parts'[0][0]; $yo = $m.'published-online'.'date-parts'[0][0]; $yp = $m.'published-print'.'date-parts'[0][0]
    [pscustomobject]@{ texto = ([string]$m.title[0] + ' | revista: ' + [string]$m.'container-title'[0] + ' | ano(issued): ' + $y + ' | online: ' + $yo + ' | impresso: ' + $yp + ' | vol: ' + $m.volume); url = "https://doi.org/$doi"; ano = $y; rotulo = 'Crossref' }
}
function Web([string]$url) {
    $r = Get-Text $url
    if (-not $r) { return $null }
    [pscustomobject]@{ texto = ([regex]::Replace($r, '<[^>]+>', ' ') -replace '\s+', ' '); url = $url; ano = ''; rotulo = 'página' }
}

# (id, o que o livro diz, tipo, referência, expressão exigida no original)
$checks = @(
    @('P01', 'Kramer et al.: experimento do Facebook com 689.003 pessoas (PNAS, 2014)', 'epmc', '10.1073/pnas.1320040111', '689,003'),
    @('P02', 'Kosinski et al. (2013): curtidas preveem atributos com dezenas de milhares de voluntários', 'epmc', '10.1073/pnas.1218772110', '58,000'),
    @('P03', 'Wu, Kosinski e Stillwell (2015): modelo baseado em curtidas julga personalidade melhor que amigos', 'epmc', '10.1073/pnas.1418680112', 'more accurate|accurate'),
    @('P04', 'Obermeyer et al. (2019): algoritmo aplicado a ~200 milhões de pessoas/ano; pacientes negros de 18% a 47%', 'epmc', '10.1126/science.aax2342', '200 million'),
    @('P05', 'Obermeyer et al.: parcela de pacientes negros de ~18% para 47%', 'epmc', '10.1126/science.aax2342', '17\.7|46\.5'),
    @('P06', 'Willett et al. (2023, Nature): neuroprótese de fala', 'epmc', '10.1038/s41586-023-06377-x', 'speech'),
    @('P07', 'Metzger et al. (2023, Nature): neuroprótese de fala e avatar', 'epmc', '10.1038/s41586-023-06443-4', 'speech'),
    @('P08', 'Shumailov et al. (2024, Nature): colapso do modelo com dados gerados recursivamente', 'epmc', '10.1038/s41586-024-07566-y', 'collapse'),
    @('P09', 'Liang et al. (2023): detectores de texto de IA erram com quem escreve inglês como segunda língua', 'epmc', '10.1016/j.patter.2023.100779', 'non-native'),
    @('P10', 'Pais-Vieira et al. (2015): Brainets, cérebros de ratos/macacos conectados', 'epmc', '10.1038/srep11869', 'brain'),
    @('P11', 'Mathur et al. (2019): ~11 mil sites de compras, padrões enganosos em mais de 1.200', 'arxiv', '1907.07032', '11K|11,000'),
    @('P12', 'Mathur et al.: 1.818 instâncias em 1.254 sites', 'arxiv', '1907.07032', '1,818|1,254'),
    @('P13', 'Gerstgrasser et al. (2024): acumular dados sintéticos e reais evita o colapso', 'arxiv', '2404.01413', 'accumulat'),
    @('P14', 'Kleinberg, Mullainathan e Raghavan: critérios de justiça incompatíveis', 'arxiv', '1609.05807', 'simultaneous|impossib|incompatib'),
    @('P15', 'Colombatto e Fleming (2024): dois terços atribuíram algum grau de consciência', 'epmc', '10.1093/nc/niae013', 'two-thirds|67|two thirds'),
    @('P16', 'Jones e Bergen (2025): GPT-4.5 apontado como humano em 73%', 'arxiv', '2503.23674', '73%'),
    @('P17', 'Butlin et al. (2023): nenhum sistema atual é candidato forte; sem barreiras técnicas óbvias', 'arxiv', '2308.08708', 'no current AI systems|no obvious technical barriers'),
    @('P18', 'Kosmyna et al. (2025): 54 participantes, EEG, dívida cognitiva', 'arxiv', '2506.08872', '54'),
    @('P19', 'Petrov et al. (2023): diferença de até 15 vezes entre idiomas na tokenização', 'arxiv', '2305.15425', '15 times'),
    @('P20', 'Brown et al. (2020): GPT-3 com 175 bilhões de parâmetros', 'arxiv', '2005.14165', '175 billion'),
    @('P21', 'Ouyang et al. (2022): InstructGPT 1,3 bi preferido ao GPT-3 de 175 bi', 'arxiv', '2203.02155', '1\.3B'),
    @('P22', 'Li et al. (2023): 700.000 litros para treinar o GPT-3', 'arxiv', '2304.03271', '700,000'),
    @('P23', 'Li et al. (v1): 500 ml de água para N respostas (livro: 20 a 50 interações)', 'arxiv', '2304.03271v1', '500'),
    @('P24', 'Kalai et al. (2025): treino e avaliação premiam o chute', 'arxiv', '2509.04664', 'guess'),
    @('P25', 'Vaswani et al. (2017): Transformer, atenção sem recorrência', 'arxiv', '1706.03762', 'attention'),
    @('P26', 'Acemoglu e Restrepo: Automation and New Tasks (JEP, 2019)', 'crossref', '10.1257/jep.33.2.3', 'Automation and New Tasks'),
    @('P27', 'Lum e Isaac (2016): To Predict and Serve? (Significance)', 'crossref', '10.1111/j.1740-9713.2016.00960.x', 'Predict and Serve'),
    @('P28', 'Kleinberg et al. (QJE): Human Decisions and Machine Predictions — ano de publicação', 'crossref', '10.1093/qje/qjx032', 'Human Decisions'),
    @('P29', 'Moore e Rid (2016): Cryptopolitik and the Darknet (Survival)', 'crossref', '10.1080/00396338.2016.1142085', 'Cryptopolitik'),
    @('P30', 'Berridge e Robinson (2016): Liking, wanting, and incentive-sensitization (Am. Psychologist)', 'crossref', '10.1037/amp0000059', 'Liking'),
    @('P31', 'Kalla e Broockman: efeitos persuasivos mínimos (APSR)', 'crossref', '10.1017/S0003055417000363', 'Minimal Persuasive'),
    @('P32', 'Sutton, The Bitter Lesson: "70 anos de pesquisa em IA"', 'web', 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html', '70 years'),
    @('P33', 'Brynjolfsson, Li e Raymond: +14% em média, +34% entre iniciantes', 'web', 'https://www.nber.org/papers/w31161', '14 percent|34 percent|14%|34%'),
    @('P34', 'Wu et al. (2015) PNAS: DOI e ano', 'crossref', '10.1073/pnas.1418680112', 'Computer-based personality'),
    @('P35', 'McCulloch e Pitts (1943): A logical calculus of the ideas immanent in nervous activity', 'crossref', '10.1007/BF02478259', 'logical calculus'),
    @('P36', 'Searle (1980): Minds, brains, and programs (Behavioral and Brain Sciences)', 'crossref', '10.1017/S0140525X00005756', 'Minds, brains'),
    @('P37', 'Weizenbaum (1966): ELIZA (Communications of the ACM)', 'crossref', '10.1145/365153.365168', 'ELIZA')
)
$res = New-Object System.Collections.Generic.List[object]
foreach ($c in $checks) {
    $src = switch ($c[2]) { 'epmc' { Epmc $c[3] } 'arxiv' { Arx $c[3] } 'crossref' { Cref $c[3] } 'web' { Web $c[3] } }
    $found = $false; $snip = ''; $url = ''; $lab = ''; $ano = ''
    if ($src) {
        $url = $src.url; $lab = $src.rotulo; $ano = $src.ano
        $m = [regex]::Match($src.texto, $c[4], 'IgnoreCase')
        if ($m.Success) {
            $found = $true
            $a = [Math]::Max(0, $m.Index - 140); $l = [Math]::Min(320, $src.texto.Length - $a)
            $snip = $src.texto.Substring($a, $l)
        } else { $snip = $src.texto.Substring(0, [Math]::Min(260, $src.texto.Length)) }
    }
    $res.Add([ordered]@{ id = $c[0]; livro_diz = $c[1]; base = $lab; url = $url; ano_fonte = $ano; achou_o_esperado = $found; esperado = $c[4]; trecho_da_fonte = $snip })
}
[IO.File]::WriteAllText($out, ($res | ConvertTo-Json -Depth 4), $enc)
$res | ForEach-Object { '{0} {1} | {2}' -f $_.id, $(if ($_.achou_o_esperado) { 'OK  ' } elseif ($_.url) { 'DIFE' } else { 'SEM ' }), $_.livro_diz.Substring(0, [Math]::Min(80, $_.livro_diz.Length)) }
