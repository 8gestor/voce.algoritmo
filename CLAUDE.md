# Data Double — base de desenvolvimento

Livro-manifesto em português (com versão em inglês e narração) sobre capitalismo de vigilância, privacidade, IA e resistência.
Site estático no GitHub Pages: https://vocealgoritmo.com.br/ · repositório `8gestor/voce.algoritmo` · publica a cada push em `main`
(`.github/workflows/static.yml` envia o repositório inteiro, sem build).

Este arquivo é lido no início de toda sessão. **Leia-o antes de mexer em qualquer coisa.** As rotinas detalhadas estão nas skills
de `.claude/skills/` (lista no fim).

## 1. Regras do autor (valem sempre)

1. **Nunca comprimir texto validado; sempre melhorar.** Reescrita pode crescer até ~15%. Cortar só com pedido explícito.
2. **Publicar só com autorização.** Merge em `main` = publicação. Pergunte antes, salvo pedido explícito do autor naquela fase.
3. **Nenhum dado pessoal (nome, e-mail) sai para serviços externos.** Consultas externas levam só título, autor e afirmação.
4. **Fonte real ou ressalva.** Fato datado ou numérico sem fonte conferida não entra como certeza; entra com ressalva ou em `RELATORIO-DIVERGENCIAS.md`.
5. **Declarar a participação da máquina.** A Parte II foi escrita com IA e a Nota de Método (`ia00`) diz isso; o Epílogo promete essa transparência.
6. Gastar poucos tokens sem perder profundidade: ler só o necessário, editar por script com guardas, testar uma vez no fim.

## 2. Estrutura do livro (numeração exibida ≠ nome do arquivo)

| Parte | Exibido | Arquivo |
|---|---|---|
| Abertura | Introdução | `introducao.html` |
| I. A Mente | 01–03 | `cap01`–`cap03` |
| II. A Máquina | Nota de Método; 04–11 | `ia00`; `ia01`–`ia08` |
| III. O Cerco | 12, 13, 14, 14.1 | `cap04`, `cap05`, `cap06`, `cap06_1` |
| IV. Infraestrutura | 15, 16, 17, 17.1 | `cap07`, `cap08`, `cap09`, `cap09_1` |
| V. Resistência | 18, 18.1, 18.2, 19, 20, 21 | `cap10`, `cap10_1`, `cap10_2`, `cap11`, `cap12`, `cap13` |
| Fecho | Epílogo; Glossário; Bibliografia | `cap14`; `cap15`; `cap16` |

Regra: de 12 em diante, **arquivo = número exibido − 8**. Nomes de arquivo nunca mudam; muda só o rótulo exibido.
Desafios de Retomada: #01–#25, contíguos (conferir antes de inserir um novo). Outras páginas: `index.html` (leitor/shell com iframe),
`estatisticas.html`.

## 3. Arquitetura técnica

- **Shell:** `index.html` + `assets/js/leitor.js` carregam cada capítulo num iframe; menu em `assets/js/sumario.js`
  (`structure`, `TITLES_EN`, `CATEGORIES_EN`). Novo capítulo ou renumeração = editar este arquivo.
- **Motor bilíngue e narração:** `assets/js/capitulo.js`. Cada unidade traduzível tem `data-id` estável
  (`c14-014`, `in-027`…). Unidades narradas têm classe `speakable`. A narração é por frase: **o número de frases PT e EN
  de cada unidade deve ser igual** (paridade), senão destaque e áudio se desencontram.
- **Tradução:** fonte em `assets/i18n/src/<página>.en.txt`; **gerado** em `assets/i18n/en/<página>.js` por `tools/i18n.ps1 build`.
  Nunca editar o `.js` gerado à mão.
- **Glossário** `cap15` (PT) + `assets/i18n/src/cap15.en.txt` (EN): mesma ordem de verbetes; campo `REF:` diz onde o termo aparece.
  **Bibliografia** `cap16` idem. **Raio-X** (`assets/js/raiox.js`) é gerado por `tools/raiox.ps1` a partir das `REF:` do glossário.
- **Estatísticas:** `assets/js/estatisticas-dados.js` gerado por `tools/stats.ps1 build` (lê todos os `*.html` da raiz).
- Fontes e CSS em `assets/fonts`, `assets/css`. Sem framework, sem build, sem dependências: HTML + JS puro.

## 4. Ferramentas (`tools/`, todas PowerShell 7 — rodar com `pwsh`)

| Script | Uso |
|---|---|
| `i18n.ps1 show\|build\|status [pág]` | listar unidades, compilar+auditar tradução, cobertura |
| `ids.ps1 <págs>` | dá `data-id` às unidades de **páginas novas** (preserva os existentes) |
| `raiox.ps1` | regera `raiox.js` (rodar após mudar glossário PT/EN) |
| `stats.ps1 build\|show` | regera contagem de palavras |
| `test_idiomas.ps1` | troca PT↔EN em todas as páginas (Chrome headless) |
| `test_narracao.ps1`, `test_sync.ps1`, `test_estatisticas.ps1` | narração, sincronia do destaque, menu e barras |
| `fatos.ps1`, `painel.ps1` | extrai afirmações verificáveis e gera o painel (saída não versionada: `painel.html`) |
| `verificar_biblio.ps1`, `verificar_fatos.ps1` | conferem referências (Crossref, Open Library) e números (Europe PMC, arXiv) |

Bateria padrão antes de publicar: `i18n.ps1 build` → `raiox.ps1` → `stats.ps1 build` → os quatro testes. Meta: todos passando
(31/31 em `test_idiomas`). Avisos conhecidos de paridade de frases (cap03 c03-030/037, cap04 c04-025, cap06 c06-032, cap07 c07-009,
cap15 11 unidades, cap16 c16-007) pertencem à frente de tradução.

## 5. Git e GitHub

- Branch de trabalho: `main` é produção. Trabalho novo em `feature/<tema>` ou `revisao/<tema>`, merge em `main` só publicado com autorização,
  depois apagar o branch (já está no histórico).
- **`git add` sempre com caminhos explícitos** (nunca `-A` nem `.`). `traducao/` pertence à aba de tradução/revisão PT-EN:
  não commitar nem editar. Não editar `cap*.html` se essa aba tiver mudanças pendentes (`git status` limpo = liberado).
- Mensagens de commit em português, sem acento nos assuntos longos já é o padrão do histórico; assunto curto + corpo se preciso.
- Pós-push: conferir HTTP 200 e um trecho novo no site publicado (Pages leva alguns minutos).
- Gerados e não versionados: `parte-ia/verificacao/painel.html` (ver `.gitignore`).

## 6. Armadilhas (já custaram retrabalho)

- PowerShell: **aliases colidem com funções** (`rd`=Remove-Item, `r`=Invoke-History). Use nomes como `ReadFx/WriteFx/Subst`.
  Variáveis são case-insensitive (`$M` = `$m`). Para `-replace` com função use `[System.Text.RegularExpressions.MatchEvaluator]`.
- Sempre **guarda de não vazio** antes de gravar arquivo e **UTF-8 sem BOM**; renumerações em lote só com mapa explícito.
- Python e Node **não existem** nesta máquina; só PowerShell/Git Bash e Chrome.
- `git checkout -- .` é bloqueado; para desfazer: `git restore --source=HEAD --worktree -- <caminhos>`.
- Ao renumerar, atualizar juntos: texto PT, `*.en.txt`, `REF:` do glossário e da bibliografia, `sumario.js`, `raiox.ps1` (mapa) e rodar a bateria.

## 7. Documentos de apoio

- `parte-ia/PLANO.md` — plano editorial da Parte II; `parte-ia/fontes-NN.md` — registros de fontes por capítulo (itens "a conferir").
- `parte-ia/verificacao/RELATORIO-DIVERGENCIAS.md` — divergências confirmadas/corrigidas e itens sem fonte.
- `parte-ia/RELATORIO-EDITORIAL.html` — diagnóstico editorial (temas por capítulo, ligações, evolução).
- `traducao/ALTERACOES.md` — diário da frente de tradução.

## 8. Backlog (estado em 2026-11-12, v. publicada = `main`)

1. Parágrafos de **lente brasileira** nos caps 17.1, 18.1, 18.2 e 20 (só com fatos verificados).
2. Itens sem fonte primária: Obermeyer ~200 mi/ano; Right to Food 15 mortes; Pull-to-Refresh 2008/2009; Han *Psicopolítica*;
   TJSC (acórdão); Talk Inc, nota do CFP, texto OSAID, falas de Nicolelis, Sabiá (Parte II, `fontes-NN.md`).
3. 18 itens que citam 2025/2026: reler antes de cada atualização.
4. Confirmar com o autor a redação final da **Nota de Método**.
5. Paridade de frases PT/EN nos pontos listados em §4.
6. Lançamento: revisar `RELATORIO-EDITORIAL.html` (ponte, mapa da Introdução, Epílogo) e revalidar bateria.

## 9. Skills do projeto (`.claude/skills/`)

| Skill | Quando usar |
|---|---|
| `dd-capitulo` | criar/editar capítulo, unidades, ids, menu, glossário, bibliografia, Raio-X |
| `dd-traducao` | traduzir/revisar PT↔EN, paridade de frases, compilar e auditar |
| `dd-verificar-fatos` | checar fatos, números e referências; relatório de divergências |
| `dd-publicar` | bateria de testes, commit com caminhos explícitos, merge, conferência no ar |
| `dd-editorial` | diagnóstico de editor-chefe: estrutura, temas, ligações, gráficos |
