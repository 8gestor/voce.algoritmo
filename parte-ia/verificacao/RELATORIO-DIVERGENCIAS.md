# Relatório de divergências — Data Double

Data: 2026-11-12 · Substitui a lista de 429 itens: aqui ficam **só** as divergências encontradas e o que continua sem fonte. O que uma fonte real confirmou saiu da lista (resumo no fim).

## 1. Divergências confirmadas (já corrigidas no texto PT e EN, commit 29e9313)

| # | Onde | O livro dizia | A fonte diz | Fonte | Ação |
|---|---|---|---|---|---|
| 1 | Cap. 09 (água) | uma conversa de **20 a 50** interações "bebe" ~500 ml | GPT-3 consome 500 ml para **10 a 50** respostas de tamanho médio | Li et al., arXiv 2304.03271 (texto completo, v1 e atual): https://arxiv.org/abs/2304.03271 | Trocado para "cada 10 a 50 respostas de tamanho médio" |
| 2 | Cap. 04 (Robodebt) | "mais de **meio milhão** de dívidas imprecisas" | Comissão Real: cerca de 381 mil a 400 mil pessoas atingidas; o número de dívidas varia por fonte e o relatório diz que não se sabe quantas eram válidas | Relatório da Comissão Real (7/7/2023): https://www.monash.edu/__data/assets/pdf_file/0007/3365503/report_of-the-royal-commission-into-the-robodebt-scheme.pdf | Trocado para "centenas de milhares de dívidas indevidas (cerca de 400 mil pessoas atingidas)" |
| 3 | Cap. 10.2 (FTX) | SBF "condenado em 2023 a 25 anos" | Condenado em nov/2023; **sentença de 25 anos em 28/3/2024** (juiz Kaplan; perdas de US$ 8 bi confirmadas) | NPR: https://www.npr.org/2024/03/28/1241210300/sam-bankman-fried-ftx-sentencing-crimes-crypto-mogul-greed | Corrigido: "condenado em 2023 e, em março de 2024, sentenciado a 25 anos" (PT e EN; o EN também dizia 2023) |

## 2. Itens que continuam SEM fonte confirmada (precisam de você ou de acesso que eu não tive)

| Item | O que falta | Onde procurei |
|---|---|---|
| Han (c03-016, c16-034) | a atribuição exata (obra/ideia) não foi conferida | não pesquisado nesta rodada |
| Kitchin (c16-033) | citação da "cidade em tempo real" — o título existe (Crossref, 2013 online / 2014 impresso), mas a frase atribuída não foi cotejada | Crossref |
| Lembke (c02-016), Pull-to-Refresh (c02-004), Elliot (c01-011/012), anedota da secretária/ELIZA (c01-010) | citações/anedotas de segunda mão | não pesquisado nesta rodada |
| Obermeyer: "~200 milhões de pessoas/ano" (cap 04) | o resumo da Science diz só "milhões de pacientes"; a cifra de 200 milhões aparece na cobertura da *Nature* (Ledford, 24/10/2019), mas não vi a frase completa. Uma versão em conferência cita 70 milhões | https://pubmed.ncbi.nlm.nih.gov/31664201/ |
| Right to Food: "ao menos 15 mortes, Aadhaar em 10" (cap 04) | confere com carta na *EPW* (out/2018), mas a lista original da campanha não foi achada; compilações posteriores trazem 56–57 mortes e 19–25 ligadas ao Aadhaar | https://www.epw.in/journal/2018/42/letters/starvation-jharkhand.html |
| Parte II: acórdão TJSC, Talk Inc, nota do CFP, texto da OSAID, falas de Nicolelis, original da *Time*, texto do PL 2338, infraestrutura do Sabiá | os registros `parte-ia/fontes-NN.md` marcam cada um como "a conferir"; não rodei busca para eles | — |
| 18 itens com 2025/2026 ("sensível ao tempo") | podem ter mudado; vale reler antes de publicar | — |

## 3. Nota sobre anos de publicação (não são erros)

24 referências tinham ano diferente nas bases (Crossref/Open Library), mas todas são reedição, versão online antecipada ou erro da base: Kleinberg 2018 (impresso 2018, online 2017), Kalla 2018 (idem), Kitchin 2014 (online 2013), Couldry & Mejias 2019 (reimpressão 2020), Schultz 1997 (reimpressão 2002), Deleuze 1990 e Glissant 1990 (originais em francês), Maturana & Varela 1980 e Greenfield 2017 (a Open Library registra 1899, erro da base). **Nenhuma exige mudança.**

## 4. O que saiu da lista por ter fonte real

- **Bibliografia (97 + 15 obras citadas no texto):** todas localizadas em Crossref, Open Library ou na página oficial (resultados em `biblio_resultado.json`). As 23 que as bases não indexam foram abertas na fonte original: Gender Shades (PMLR), Kleinberg et al. (arXiv), Chesney & Citron (California Law Review), Global E-waste Monitor 2024, BIS 2023 (papel 147), EFF SSD, Epstein (Aeon), Horsley (Foreign Policy); e confirmadas por busca: Strickler (OneZero, 23/5/2019), Alston (A/74/493, 11/10/2019), FTC 2014, IEA *Energy and AI* (415 TWh, 1,5%), Solove (Harvard Law Review 126:1880), Farahany (2023).
- **Números conferidos no texto original (`fatos_resultado.json`, 37 verificações):** Kramer (689.003, PNAS 2014), Kosinski (2013), Wu (2015), Obermeyer (17,7% → 46,5%), Willett e Metzger (2023), Shumailov (2024), Gerstgrasser (2024), Liang (2023), Pais-Vieira (2015), Mathur (11 mil sites, 1.818 casos), Colombatto & Fleming (dois terços), Jones & Bergen (73%), Butlin et al., Kosmyna (54), Petrov (15×), Brown (175 bi), Ouyang, Li (700 mil litros), Kalai, Vaswani, Acemoglu & Restrepo, Lum & Isaac, Moore & Rid, Berridge & Robinson, McCulloch & Pitts, Searle, Weizenbaum, Sutton e NBER (14%/34%).
- **Fatos pontuais confirmados por busca:** emissões do Google (+48% sobre 2019) e da Microsoft (+29,1% sobre 2020); Kramer N=689.003; Robodebt "grosseiro e cruel, nem justo nem legal" (7/7/2023).

## 5. Limite honesto desta verificação

Conferi com fonte real todas as referências bibliográficas e cerca de 40 fatos numéricos. **Não conferi um a um** os demais fatos datados/legais do texto antigo (ex.: multas da FTC, Canadá 2022, Aadhaar, Clearview, Chile/Girardi, Lei 21.383, DMA/WhatsApp, Pix/Drex, Reddit/Apollo etc.): reli cada um contra o que sei e não vi divergência, mas **isso não é fonte** e por isso não os tirei da lista de risco; se quiser, faço uma segunda rodada de busca neles.
