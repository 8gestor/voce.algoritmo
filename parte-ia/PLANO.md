# Parte II — A MÁQUINA (plano editorial)

Branch: `feature/parte-ia` · Decisões do autor em 2026-11-12: Parte II logo após *A Mente*; 8 capítulos (~13 mil
palavras); lente brasileira em todos; nota de método na abertura declarando o uso de IA na escrita.

## Posição e renumeração

| Parte | Capítulos (novo número ← antigo) |
|---|---|
| I. A MENTE | 01, 02, 03 (inalterados) |
| **II. A MÁQUINA (nova)** | 04 a 11 |
| III. O CERCO | 12←04, 13←05, 14←06, 14.1←06.1 |
| IV. INFRAESTRUTURA | 15←07, 16←08, 17←09, 17.1←09.1 |
| V. RESISTÊNCIA | 18←10, 18.1←10.1, 18.2←10.2, 19←11, 20←12, 21←13 |

Arquivos novos: `ia00.html` (abertura e nota de método) e `ia01.html` … `ia08.html`. Os arquivos dos capítulos
antigos **não mudam de nome**; só mudam rótulos, referências cruzadas, glossário, Raio-X e `sumario.js`.
A renumeração é um passo único, automatizado e testado, feito no fim (precisa das outras abas sem mudanças pendentes).

## Capítulos

| # | Título | Eixo | Casos e fontes-âncora (todos a conferir ao escrever) |
|---|---|---|---|
| 04 | A Máquina de Prometer | História | Turing 1950; Dartmouth 1956 (McCarthy); perceptron e Minsky & Papert; ELIZA; relatório Lighthill 1973; sistemas especialistas; Deep Blue 1997; AlexNet 2012; AlphaGo 2016; Transformer 2017; ChatGPT (nov. 2022; ~100 mi de usuários em jan. 2023, estimativa UBS/Similarweb). Brasil: SBC (1978), 1.º simpósio de IA na UFRGS (1984), Nelson Mascarenhas (UFSCar), Maria das Graças Volpe Nunes (NILC, corretor gramatical) |
| 05 | Como a Máquina Aprende | Engenharia | redes neurais, tokens, embeddings, atenção, pré-treino, RLHF, alucinação; "The Bitter Lesson" (Sutton, 2019); leis de escala. Brasil: modelos em português (Sabiá/Maritaca, BERTimbau), escassez de dados em português |
| 06 | Espelho e Papagaio | Filosofia | teste de Turing; Quarto Chinês (Searle); "papagaios estocásticos" (Bender et al., 2021); consciência (Chalmers; relatório Butlin et al., 2023); Nicolelis contra a IA consciente; Dora Kaufman |
| 07 | Companheiros Sintéticos | Psicologia | apego a chatbots, bajulação (*sycophancy*), "psicose de IA", terceirização cognitiva, crianças; efeito ELIZA em escala. Brasil: uso de IA por estudantes e em saúde mental |
| 08 | Quem Treina a Máquina | Social | trabalho invisível de rotulagem (Quênia), direitos autorais e processos, racismo algorítmico (Tarcízio Silva), colonialismo de dados, Coding Rights |
| 09 | A Corrida | Poder | big techs, China (DeepSeek), chips e energia, regulação (UE e Omnibus, EUA, China). Brasil: PL 2338/2023 (parado na Câmara), PBIA e supercomputador (valores divergem entre fontes) |
| 10 | O Debate do Fim do Mundo | Filosofia política | risco existencial (Bostrom, Hinton, Bengio) × danos presentes (Gebru, Bender, Crawford); quem decide qual medo importa |
| 11 | Guerrilha com IA | Prática | usar com rigor, privacidade (o que não colar), modelos locais/abertos, verificação, teste de convivialidade de Illich aplicado à IA, ponte para a Resistência |

## Molde de cada capítulo (igual ao resto do livro)
Rótulo `PARTE II: A MÁQUINA | CAPÍTULO NN` · gancho · conceito · caso datado · tensão honesta (contraponto) ·
virada · ponte para o próximo · caixa `thesis-header` · pelo menos um componente visual · Desafio de Retomada ·
afirmações separadas em fato / estimativa / hipótese / provocação · fontes em Glossário e Bibliografia ·
tradução EN pelo fluxo `tools/i18n.ps1` · testes `test_idiomas` e `test_narracao`.

## Regras
- Nada de fato sem fonte; o que não for confirmado vai marcado "a conferir" para o autor.
- Números do momento (PL 2338, PBIA, UE) dependem de data: citar sempre "em [mês/ano]".
- Não comprimir o que o autor já validou; este material é novo, então vale o ritmo dos outros capítulos (700–2.100 palavras).
- Não publicar em `main` sem autorização explícita do autor.
