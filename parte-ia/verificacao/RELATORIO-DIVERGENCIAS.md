# Relatório de divergências — Data Double

Data: 2026-11-12 · Duas rodadas de verificação. Aqui ficam **só** as divergências e o que continua sem fonte; o que uma fonte real confirmou saiu da lista (resumo no fim).

## 1. Divergências confirmadas e já corrigidas no texto (PT e EN)

| # | Onde (numeração atual) | O livro dizia | A fonte diz | Fonte | Ação |
|---|---|---|---|---|---|
| 1 | Cap. 17 (água) | uma conversa de **20 a 50** interações "bebe" ~500 ml | 500 ml para **10 a 50** respostas de tamanho médio | Li et al., arXiv 2304.03271 (texto completo): https://arxiv.org/abs/2304.03271 | Corrigido |
| 2 | Cap. 12 (Robodebt) | "mais de **meio milhão** de dívidas imprecisas" | ~381–400 mil pessoas atingidas; o relatório diz que não se sabe quantas dívidas eram válidas | Comissão Real, 7/7/2023: https://www.monash.edu/__data/assets/pdf_file/0007/3365503/report_of-the-royal-commission-into-the-robodebt-scheme.pdf | "centenas de milhares de dívidas indevidas (cerca de 400 mil pessoas atingidas)" |
| 3 | Cap. 18.2 (FTX) | SBF "condenado em 2023 a 25 anos" | condenado em nov/2023; **sentença de 25 anos em 28/3/2024** | NPR: https://www.npr.org/2024/03/28/1241210300/sam-bankman-fried-ftx-sentencing-crimes-crypto-mogul-greed | Corrigido (PT e EN) |
| 4 | Cap. 17 (cobalto) | "cerca de **70%**" vem do Congo (USGS) | USGS: **74%** da produção mundial em 2023 (75% em 2024) | USGS Mineral Commodity Summaries 2024: https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-cobalt.pdf | "cerca de três quartos (74% em 2023)" |
| 5 | Cap. 18.1 (Hayden) | citava só "Nós matamos pessoas com base em metadados" | Hayden **ressalvou logo em seguida**: "mas não é isso que fazemos com esses metadados" (debate com David Cole, Johns Hopkins, abr/2014) | Just Security: https://www.justsecurity.org/10311/michael-hayden-kill-people-based-metadata/ · ABC News: https://abcnews.com/blogs/headlines/2014/05/ex-nsa-chief-we-kill-people-based-on-metadata | Acrescentada a ressalva |

## 2. Ainda sem fonte primária (decisão sua)

| Item | Situação | Onde procurei |
|---|---|---|
| Obermeyer: "~200 milhões de pessoas/ano" (Cap. 12) | O resumo da *Science* diz só "milhões de pacientes"; a *Nature* (Ledford, 24/10/2019) cita ~200 milhões, mas não vi a frase completa; versão de conferência cita 70 milhões. Mantido, mas é o item mais frágil | https://pubmed.ncbi.nlm.nih.gov/31664201/ |
| Right to Food: "15 mortes, Aadhaar em 10" (Cap. 12) | Confere com carta na *EPW* (out/2018); a lista original da campanha não foi achada (compilações posteriores: 56–57 mortes, 19–25 ligadas ao Aadhaar) | https://www.epw.in/journal/2018/42/letters/starvation-jharkhand.html |
| Pull-to-Refresh (Cap. 02) | Brichter criou o gesto no Tweetie, "sem intenção maligna" (*Guardian*, 2017); fontes divergem entre 2008 e 2009 (Tweetie 2 saiu em 2009). Mantido 2009 | Wikipedia, artigos de apoio |
| Han, *Psicopolítica* (cap. 03 e bibliografia) | Título e tese conferem em resenhas; o "2014" é o ano do original alemão (edição inglesa 2017). Sem acesso ao livro | Verso Books, Google Livros |
| Elliot / Damasio (Cap. 01) | O caso é bem documentado; a parte "manteve a inteligência" só é sustentada de forma indireta; o texto já ressalva que a hipótese dos marcadores somáticos segue em debate | Dunn, Dalgleish & Lawrence (2006) |
| TJSC (Cap. 05 da Parte II) | Confirmado por imprensa (6.ª Câmara de Direito Civil, fev/2025, multa de 10%, ofício à OAB/SC, relator Marcos Fey Probst). **O acórdão e o número do processo não foram achados** (segredo de justiça) | Conjur, site do TJSC |
| Kitchin, Lembke, anedota da secretária/ELIZA | Obras existem (Crossref, Open Library); as frases atribuídas são de segunda mão e já saem com ressalva no texto | — |
| Talk Inc, nota do CFP, texto da OSAID, falas de Nicolelis, infraestrutura do Sabiá (Parte II) | Marcados "a conferir" nos registros `parte-ia/fontes-NN.md`; sem busca | — |
| 18 itens que citam 2025/2026 | Podem ter mudado; reler antes de cada atualização do site | — |

## 3. Anos de publicação (não são erros)
24 referências tinham ano diferente nas bases (reedição, versão online antecipada, original em outra língua, erro da Open Library, que registra 1899 para Greenfield e Maturana). **Nenhuma exige mudança.**

## 4. O que saiu da lista por ter fonte real

- **Bibliografia:** 97 entradas + 15 obras citadas no texto, localizadas em Crossref, Open Library ou na página oficial (`biblio_resultado.json`). As 23 sem registro nas bases foram abertas na fonte original ou confirmadas por busca (Gender Shades, Kleinberg, Chesney & Citron, E-waste Monitor, BIS 147, EFF, Aeon, Foreign Policy, Strickler, Alston A/74/493, FTC 2014, IEA, Solove, Farahany).
- **37 números conferidos no texto original** (`fatos_resultado.json`): Kramer 689.003, Obermeyer 17,7→46,5%, Colombatto (dois terços), Jones & Bergen 73%, Mathur, Kosmyna 54, Petrov 15×, Brown 175 bi, Li 700 mil litros e outros.
- **Fatos conferidos por busca (2.ª rodada):** FTC × Amazon US$ 25 mi (31/5/2023); Canadá 2022 e decisão de jan/2024 (2024 FC 42, violação do art. 8.º da Carta, mantida na apelação); Clearview 30 bi (CEO, 2023); Wells Fargo (mais de uma dúzia, maio/2024); Imperva 49,6% e 32% (dados de 2023); e-waste 62 Mt e 22,3%; Uruguai 7,6 mi L/dia e aprovação em 2024 com resfriamento a ar; Chile Lei 21.383 (14/10/2021) e *Girardi v. Emotiv* (9/8/2023); Reddit/Apollo (US$ 20 mi/ano é estimativa do próprio desenvolvedor; mais de 8 mil subreddits); Binance e Monero (anúncio 6/2, saída 20/2/2024); WhatsApp e DMA (nov/2025, BirdyChat e Haiket); BIS 94% de 86 bancos centrais; Amazon Baltimore (~300 demitidos em um ano, número confirmado pela empresa); Meta/CTRL-labs 2019 e Neural Band (set/2025); Time/Sama (<US$ 2/h, US$ 1,32–2); PL 2338 (ainda aguarda relator na comissão especial da Câmara, votação após as eleições); emissões do Google (+48%) e da Microsoft (+29,1%); Hayden 2014.

## 5. Limite honesto
Os fatos abaixo **não passaram por busca**; reli contra o que sei, sem ver divergência, mas isso não é fonte: Target (25 produtos), Dutch childcare (não está no texto com número), Aadhaar 1,3 bi, Clearview/ShotSpotter 9% (o número está no texto só como citação indireta), Quayside 2020, SCHUFA dez/2023, Wörgl 1932, eNaira/Pix/Drex, Ulbricht (indulto jan/2025), Spotify (US$ 0,003–0,005), Lei 14.300/2022, ECA Digital e proibição australiana (dez/2025), Hayden aparte. Se quiser, faço uma terceira rodada só nesses.
