# Registro de alterações — revisão PT e tradução EN

Documento acumulativo. Será entregue completo ao final do projeto. Cada linha: o que mudou,
onde e por quê. Status: `proposto` (ainda não aplicado nos HTMLs) · `aplicado`.

## Capítulo 01 — O Cérebro Não é um Computador

| id | Tipo | Antes | Depois | Motivo | Status |
|---|---|---|---|---|---|
| c01-003 | PT | através de silício | por meio de silício | regência | proposto |
| c01-004 | PT | E ela é uma metáfora — … — e é a fundação | Ela é, de fato, uma metáfora — … — e é a fundação | repetição "E ela é… e é…" | proposto |
| c01-010 | PT | se abriam para o programa | se abriam com o programa | regência idiomática | proposto |
| c01-014 | PT | nossos viéses | nossos vieses | plural correto | proposto |
| c01-014 | PT | de forma instintiva (estatística) | de forma "instintiva", isto é, estatística | clareza | proposto |
| c01-015 | PT | O que deterá o poder não será o código… | O poder não estará no código em si, mas na intenção de quem detém os dados. | ambiguidade de "deter" | proposto |
| c01-021 | PT | bypassam | contornam | anglicismo | proposto |
| c01-039 | PT | Sanitização Mental | Higiene Mental | calque do inglês | proposto |
| c01-008, c01-039 | PT | qualia / A Prova da Qualia | os qualia / A Prova dos Qualia | plural de *quale*; padrão para o livro todo | proposto |
| todos (37 unidades) | EN | — | tradução completa em `traducao/en/cap01.js` | nova | rascunho aprovado |

Decisões de tradução (EN): ver `cap01-revisao-pt.md`, seção C. Termos novos: `glossario-pt-en.md`.

> **Situação encontrada em 2026-11-12:** a outra aba já traduziu as 21 páginas para EN (`assets/i18n/src/*.en.txt`,
> 100% das unidades; os `.js` são gerados por `tools/i18n.ps1` — editar sempre o `.txt`). O trabalho de
> revisão passou a ser **auditar PT e EN já existentes**. O rascunho `traducao/en/cap01.js` fica como referência
> para o Cap. 1. Glossário alinhado ao que já está publicado (ex.: "RECOVERY CHALLENGE" nos 17 capítulos).

### Cap. 01 — sincronizar o EN publicado com as decisões de PT acima
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c01-014 | It does this instinctively (statistically). | It does this "instinctively," which is to say statistically. | acompanha o novo PT |
| c01-015 | What will hold power in check won't be the code itself, but the intentions of whoever holds the data. | The real power won't lie in the code itself, but in the intent of whoever holds the data. | acompanha o novo PT (leitura confirmada) |
| c01-039 | (conferir título) | The Qualia Test (Mental Hygiene) | acompanha "A Prova dos Qualia / Higiene Mental" |

## Capítulo 02 — O Sequestro da Atenção
**EN** (tradução fiel e natural; 1 erro e 2 melhorias)
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c02-022 | the selection was selective | the company replied that the data had been selectively presented and the overall effect was "quite small" | erro: "selection was selective" é tautologia; PT: "o recorte era seletivo" |
| c02-031 | the Digital ECA (Law 15,211/2025) | the ECA Digital (Brazil's Digital Statute for Children and Adolescents, Law 15,211/2025) | nome próprio brasileiro; ouvinte americano não o conhece |
| c02-013 | Wanting circuit ( incentive salience ) | manter, só avisar: o EN acrescenta jargão que o PT não traz | fidelidade (aceito, sem mudança) |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c02-019, c02-033 | através da fixação / através da ação focada | por meio da fixação / por meio da ação focada | regência |
| c02-014 | micro-dose | microdose | Acordo Ortográfico (micro- sem hífen) |
| c02-026 | processamento em background | processamento em segundo plano | anglicismo evitável em texto narrado |
| c02-037 | clips de 15s | clipes de 15 segundos | "clips" é inglês; por extenso, para a narração |
| c02-042 | um drogado em dopamina | um viciado em dopamina | "drogado" é mais pesado e menos exato que "viciado" |

## Capítulo 03 — O Eu Inferido vs. Soberania de Dados
**EN** (muito bom; só polimento)
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c03-024 | weigh on a job selection | weigh in a hiring decision | idiomático |
| c03-024 | Brazilian Open Finance is consent-based, and consent can be revoked, and the LGPD limits… | Brazilian Open Finance is consent-based (and consent can be revoked), and the LGPD limits… | "and… and… and" |
| c03-009 | 5 billion dollars | $5 billion | forma falada corrente |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c03-021 | Micro-expressões | Microexpressões | Acordo Ortográfico |

## Capítulo 04 — Biopolítica vs. Necropolítica Digital
**EN** (muito bom)
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c04-006 | The Digital State of Malaise | The Digital Ill-Fare State | o PT joga com "Estado de Bem-Estar" → "Mal-Estar"; "ill-fare" (oposto de *welfare*) preserva o trocadilho |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c04-014 | "Albergue Digital" (Digital Poorhouse) | "Asilo de Pobres Digital" (decisão do revisor) | *poorhouse* = instituição que confinava pobres; "albergue" sugere hospedagem |
| c04-024 | "…bairros pobres -> polícia acha…" | usar seta "→" | tipografia |

## Capítulo 05 — A Cidade Sensiente
**EN** (muito bom)
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c05-021 | a frightened prey | frightened prey | "prey" não se conta no singular com artigo nesse uso |
| c05-014 | The most powerful cities | The richest cities (se o PT mudar, ver abaixo) | acompanha o PT |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c05-009 | Intercepção de Sinal | Interceptação de Sinal | grafia correta |
| c05-009 | (fogos vs tiros) | (fogos de artifício e tiros) | "vs" sem ponto soa mal na narração; "fogos" sozinho é ambíguo |
| c05-014 | As cidades mais robustas do mundo investem trilhões | As cidades mais ricas do mundo investem trilhões | "robustas" não combina com "trilhões"; o sentido é de riqueza |

## Capítulo 06 — O Tribunal Algorítmico
**EN**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c06-003 | to adversarial hearing | to contest the evidence | "contraditório" em inglês falado: "adversarial hearing" é jargão jurídico opaco |
| c06-017 | The crack remains | The loophole remains | "fresta" aqui é brecha, não rachadura |
| c06-019 | (45% against 23%) | (45% versus 23%) | forma falada |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c06-014 | Mendigos e doentes crônicos | Pessoas em situação de rua e doentes crônicos | "mendigos" é pejorativo e o próprio capítulo usa "situação de rua" em c06-013 |

## Capítulo 06.1 — O Panóptico Financeiro (CBDCs)
Sem correções necessárias. Tradução fiel; contrapontos e ressalvas preservados.

## Capítulo 07 — O Patrão Invisível
**EN** — **problema grave de conotação**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c07-012 | The Great Replacement: Task Displacement | The Replacement of Work: Task Displacement | "The Great Replacement" é, em inglês, o nome de uma teoria da conspiração supremacista branca; não pode servir de título neutro |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c07-012 | A Grande Substituição: Deslocamento de Tarefas | A Substituição do Trabalho: Deslocamento de Tarefas | "Grande Substituição" também é o termo de Renaud Camus usado pela extrema direita em português |
| c07-014 | Diferente da Revolução Industrial | Diferentemente da Revolução Industrial | advérbio |

## Capítulo 08 — A Internet Morta
**EN** (muito bom, sem erros)
**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c08-017 | Se nada é provável, tudo é permitido. | Se nada pode ser provado, tudo é permitido. | **erro de sentido**: "provável" = *likely*; a ideia (e o EN "provable") é *provável no sentido de demonstrável* |
| c08-009 | o Queixo de Habsburgo | o queixo dos Habsburgo | grafia/regência do nome da dinastia |

## Capítulo 09 — A Nuvem de Pedra
**EN**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c09-016b / c09-016c | (sem unidade: as etiquetas "A Terra cria." e "O Mercado consome." ficavam fora de qualquer data-id e continuavam em português no modo EN) | criadas as unidades c09-016b e c09-016c no HTML e no EN: "The Earth creates." / "The Market consumes." | **correção do achado inicial**: não era omissão do tradutor, era texto sem id; o teste de idiomas não acusava por ser pouca palavra |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c09-003 | através de feridas abertas | por meio de feridas abertas | regência |
| c09-005 / c09-015 / c09-016 / c09-009 / c09-028 | "menos de três anos" / "alguns meses" / "2 ANOS" / "3 a 4 anos" / "a cada 2 anos" | harmonizar: nos textos corridos usar "poucos anos" (c09-005, c09-015); manter números só onde há fonte (c09-009) | cinco durações diferentes para a vida útil do mesmo aparelho; o leitor atento nota |

## Capítulo 09.1 — O Oceano Profundo
**EN**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c09-1-012 | after the blockings | after the blocks | "blockings" não é uso corrente |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c09-1-017 | O capítulo 10.1 | O Capítulo 10.1 | maiúscula, como no resto do livro |

## Capítulo 10 — Neuro-direitos
**EN** (muito bom)
**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c10-002, c10-014 | Neuro-direitos / Neuro-Direitos | Neurodireitos / Neurodireitos | Acordo Ortográfico; o glossário (cap. 15) já usa "Neurodireitos" |
| c10-005 | Eles não querem apenas prever… | Elas não querem apenas prever… | concordância: o sujeito é "as grandes corporações" |
| c10-016 | tecno-totalitarismo | tecnototalitarismo | Acordo Ortográfico |

## Capítulo 10.1 — Fortaleza Digital
**EN**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c10-1-006 | the factoring of gigantic prime numbers | the factoring of products of gigantic prime numbers | imprecisão técnica (também no PT) |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c10-1-006 | a fatoração de números primos gigantes | a fatoração do produto de números primos gigantes | **imprecisão técnica**: fatora-se o produto, não os primos |
| c10-1-003 | através do Hardening | por meio do Hardening | regência |
| c10-1-019 | através de cookies cruzados | por meio de cookies entre sites | regência e clareza |

## Capítulo 10.2 — Economia de Guerra
**EN** (muito bom; polimento tipográfico)
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c10-2-014 | 8 billion dollars | $8 billion | forma falada corrente (vale para c03-009 e c10-2-015) |

**PT**: sem correções necessárias.

## Capítulo 11 — A Cidadania Onlife
**EN**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c11-016 | your responsibility is double | your responsibility is twofold | idiomático |
| c11-021 | the Digital ECA | the ECA Digital (Brazil's Digital Statute for Children and Adolescents) | igual a c02-031 |

**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c11-014 | através do scroll | pelo scroll | regência |
| c11-013 | livre de inputs externos | livre de estímulos externos | anglicismo evitável |

## Capítulo 12 — Tecnofeudalismo
**EN** (muito bom)
**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c12-025 | cobrar pelo Twitter | cobrar pelo Twitter (hoje X) | o resto do livro usa "X" (c08-021) |
| c12-010 / c12-020 | As Big Techs / as big techs | uniformizar "Big Techs" | capitalização inconsistente |

## Capítulo 13 — O Futuro Solarpunk
**EN** (muito bom)
**PT**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c13-014 | "a dominação da natureza pela humanidade decorre da dominação real do humano pelo humano" | "a ideia de dominar a natureza decorre da dominação real do humano pelo humano" | **fidelidade da citação**: Bookchin escreveu "the idea of dominating nature"; o EN já está certo |
| c13-009 | Diferente de uma ponte de concreto | Diferentemente de uma ponte de concreto | advérbio |
| c13-020 | trade-offs | contrapartidas | anglicismo evitável |

## Capítulo 14 — Epílogo
**EN**
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| c14-007 | the feeling of inferiority we feel | the sense of inferiority we feel | repetição "feeling… feel" |

**PT**: sem correções necessárias.

## Capítulo 15 — Glossário (Dicionário de Campo)
**EN**: traduzido fielmente. Observação de comportamento (para a outra aba, não é texto): no modo EN a lista deixa de estar em ordem alfabética (ex.: "Behavioral Surplus" ocupa o lugar de "Excedente Comportamental"; "Public-Key Cryptography" fica entre "Chave Privada" e "Dark Patterns"). Sugestão técnica: ordenar as fichas no JS conforme o idioma de leitura.

**PT e EN**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c15-025 | Deepweb… "É 90% da web" | "É a maior parte da web" (EN: "It's most of the web") | o número 90% é de divulgação popular, sem fonte firme; o livro promete distinguir fato de estimativa (Introdução, "Pacto de Rigor") |
| c15-038 | Monero: "ninguém consegue ver quem enviou ou quanto foi enviado. O verdadeiro 'dinheiro digital anônimo'" | "Por padrão, oculta quem enviou, quem recebeu e quanto. É dinheiro digital privado, mas não invisível" (EN: "By default, it hides who sent it, who received it and how much. It's private digital cash, but not invisible") | contradiz o Cap. 10.2, que diz "'privado' não é 'invisível'" |
| c15-046 | tornando impossível falsificar dinheiro sem gastar bilhões | tornando proibitivamente caro falsificar dinheiro (EN: "making it prohibitively expensive to counterfeit money") | "impossível" é absoluto demais; o Cap. 10.2 fala em custo |
| c15-023 | Data Double — categoria "Psicologia" (EN "Psychology") | categoria "Sociologia" (EN "Sociology") | o conceito é da sociologia da vigilância (Haggerty e Ericson, Cap. 03) |
| c15-005 | passo-a-passo | passo a passo | Acordo Ortográfico |
| c15-027 | Criptografia de Ponta-a-Ponta | Criptografia de Ponta a Ponta | Acordo Ortográfico; o Cap. 10.1 já escreve "ponta a ponta" |

## Capítulo 16 — Biblioteca da Resistência
**PT e EN**
| id | Antes | Depois | Motivo |
|---|---|---|---|
| c16-009 | "…que provou matematicamente o racismo em algoritmos médicos" (EN: "mathematically proved racism in medical algorithms") | "…que demonstrou o viés racial em um algoritmo médico de uso amplo" (EN: "…that demonstrated racial bias in a widely used medical algorithm") | superafirmação: o estudo demonstra, empiricamente, viés em **um** algoritmo; o Cap. 04 descreve com cuidado |
| c16-061 | "SHUMAILOV… The Curse of Recursion. Publicado na Nature. Demonstra matematicamente o Model Collapse" | "…The Curse of Recursion. Versão prévia (preprint, 2023) do estudo publicado na Nature em 2024 (ver abaixo). Demonstra o Model Collapse em experimentos" (EN: "Preprint (2023) of the study published in Nature in 2024 (see below). Demonstrates Model Collapse in experiments") | **erro factual**: "The Curse of Recursion" é o preprint; a versão da *Nature* é a de c16-063 (que já diz isso); "matematicamente" também é exagero |
| c16-091 | não-violenta | não violenta | Acordo Ortográfico |

## Introdução
**EN** (fiel; ponto de estilo)
| id | EN atual | EN proposto | Motivo |
|---|---|---|---|
| in-003 a in-025 | formas sem contração ("This text is not fiction", "you are not crazy", "We are not unarmed", "It is a silent rupture") | usar contrações nos trechos narrativos (in-003 a in-021) e manter a forma plena só no "Pacto de Rigor" (in-023 a in-025) | os capítulos usam contrações; a introdução é o texto mais ouvido (narração) e destoa do resto. Fidelidade ao inglês falado |
| in-015 | 25 million dollars | $25 million | forma falada corrente |

**PT**: sem correções necessárias.

---

# RESUMO FINAL (2026-11-12)

**Escopo:** 21 páginas (introdução, Caps. 1 a 16 incluindo 6.1, 9.1, 10.1, 10.2, glossário e bibliografia), PT e EN, lidos lado a lado por `data-id`.

**Estado da tradução publicada (feature/bilingue):** 100% das unidades têm EN. Qualidade geral muito boa: fiel, natural, preserva ressalvas e contrapontos do autor. Os erros encontrados são pontuais.

**Achados que mais importam (por gravidade):**
1. **c07-012** — "The Great Replacement" (EN) e "A Grande Substituição" (PT) remetem a teoria da conspiração supremacista; trocar o título.
2. **c08-017** — "Se nada é provável" (PT): erro de sentido; deve ser "provado".
3. **c16-061** — referência errada: "The Curse of Recursion" é preprint, não a versão da *Nature*.
4. **c09-016** — as etiquetas "A Terra cria. / O Mercado consome." estavam fora de qualquer unidade e apareciam em português no modo EN.
5. **c02-022** — EN "the selection was selective" (tautologia).
6. **c10-1-006** — "fatoração de números primos gigantes" (PT e EN): fatora-se o produto.
7. **c13-014** — citação de Bookchin traduzida de forma infiel no PT ("a ideia de dominar", não "a dominação").
8. **c15-025, c15-038, c15-046, c16-009** — afirmações absolutas que contradizem o próprio rigor do livro.
9. **c15-023** — Data Double classificado como "Psicologia" (é sociologia da vigilância).
10. **c10-005** — concordância ("Eles" para "as corporações").

**Padrões recorrentes a corrigir de uma vez:**
- "através de" usado como instrumento → "por meio de": c01-003, c02-019, c02-033, c09-003, c10-1-003, c10-1-019, c11-014 (c13-009 é sentido espacial, fica).
- Acordo Ortográfico: micro-dose, Micro-expressões, Neuro-direitos, tecno-totalitarismo, passo-a-passo, ponta-a-ponta, não-violenta.
- "Diferente de/da" como advérbio → "Diferentemente": c07-014, c13-009.
- "US$ 5 bilhões / 8 billion dollars / 25 million dollars" no EN → "$5 billion" etc. (c03-009, c10-2-014, in-015).
- "ECA Digital" (nome próprio brasileiro): c02-031, c11-021.

**Decisões de glossário fechadas:** ver `glossario-pt-en.md` (termos alinhados ao publicado; "RECOVERY CHALLENGE" mantido por consistência nos 17 desafios).

**APLICADO em 2026-11-12, na branch `revisao/pt-en` (a partir de `feature/bilingue`; sem commit; `main` intacta):**
- 106 substituições em 34 arquivos, aplicadas por script que exige que cada trecho exista exatamente uma vez (nenhuma falhou ao final).
- PT: `cap01`…`cap16.html` e `assets/js/sumario.js` (menu: "10. Neurodireitos"). EN: `assets/i18n/src/*.en.txt`, recompilados por `tools/i18n.ps1 build` (21 páginas OK, 0 problemas); os `.js` em `assets/i18n/en/` são gerados.
- Extras feitos além da tabela: setas "→" também no EN de c04-024; categoria de "Data Double" no glossário passou a "Sociologia/Sociology" (PT e EN); c15-038 e c15-046 reescritos nos dois idiomas; introdução (in-003 a in-020 e in-026) com contrações no EN; c09-005 e c09-015 (PT e EN) harmonizados para "poucos anos".
- **Não aplicado, por decisão:** c09-009 ("3 a 4 anos", tem fonte) e c09-016 ("2 ANOS", o diagrama) mantêm os números; o "Pacto de Rigor" (in-023 a in-025) mantém a forma plena no EN; c13-009 ("através dos rios") fica por ser sentido espacial; c01-008 e c11-013 no EN seguem como estavam ("qualia", "inputs").
- Verificação feita: `tools/test_idiomas.ps1` em Chrome headless: **PASS nas 21 páginas** (todas as unidades trocam para EN e voltam ao PT idênticas; 0 palavras em português visíveis no modo EN). `tools/test_narracao.ps1`: **PASS** (todos os casos). Terminadores de linha conferidos (dois arquivos tinham perdido o CRLF e foram restaurados).
- **Falta verificar (próximo passo, no sistema de testes):** escuta real da narração em EN, leitura visual das páginas alteradas (cap09 ganhou 2 unidades; cap15 e cap16 mudaram de texto) e revisão humana das decisões de tom.

Para desfazer tudo: `git checkout feature/bilingue` e apagar a branch `revisao/pt-en` (nenhum commit foi feito).
