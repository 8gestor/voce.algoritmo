# Cap. 05 — Como a Máquina Aprende: registro de verificação

Status: **confirmado** · **secundária** (conferir no original) · **a conferir** · **conhecimento geral** (conferir ao incluir na Bibliografia).

| Afirmação no texto | Status | Fonte consultada |
|---|---|---|
| *Mata v. Avianca* (2023): advogados citaram casos inexistentes gerados pelo ChatGPT; juiz Kevin Castel, multa de US$ 5.000, "abandonaram suas responsabilidades"; advogado disse que nunca imaginou que o ChatGPT inventasse casos | confirmado | [LawNext](https://www.lawnext.com/2023/06/court-imposes-sanctions-on-lawyers-who-filed-bogus-cases-after-relying-on-chatgpt-for-legal-research.html), [CNBC](https://www.cnbc.com/2023/05/30/chatgpt-cited-bogus-cases-for-a-new-york-federal-court-filing.html). Decisão: 678 F. Supp. 3d 443 (S.D.N.Y. 22/06/2023) |
| TJSC, 6.ª Câmara de Direito Civil, fev./2025: multa por litigância de má-fé (10% do valor atualizado da causa), advogado admitiu uso do ChatGPT ("uso inadvertido"), cópia à OAB/SC | secundária | [Conjur 20/02/2025](https://conjur.com.br/2025-fev-20/tj-sc-aplica-multa-por-recurso-que-citou-precedentes-inventados-por-ia/), [JusCatarina](https://www.juscatarina.com.br/tjsc-detecta-jurisprudencia-falseada-por-chatgpt-aplica-multa-por-litigancia-de-ma-fe-e-notifica-oab-sc/). **Conferir o acórdão e a data exata (18/02/2025?) no site do TJSC**, que não abriu (erro de rede) |
| O texto diz "a multa recaiu sobre pessoas" | ajuste | no TJSC a multa foi aplicada ao recorrente (parte), com ofício à OAB sobre o advogado; o texto evita dizer "advogado multado" |
| Núcleo do modelo = prever o próximo token; ferramentas de busca vêm "por cima" | conhecimento geral | Vaswani et al. (2017); descrição padrão da literatura |
| Português usa ~1,5–1,6× os tokens do inglês no tokenizador do GPT-4; menos nos novos (~1,35× no o200k) | secundária | benchmarks independentes (dev.to, horadecodar), citados pela busca; um artigo TACL cita ~1,5×. **Medir com tiktoken antes de publicar, se possível** |
| Petrov et al. (2023): desigualdade nasce na tokenização; diferença de até 15× entre idiomas | confirmado | [NeurIPS 2023](https://proceedings.neurips.cc/paper_files/paper/2023/hash/74bb24dca8334adce292883b4b651eda-Abstract.html) |
| Embeddings: significado = vizinhança; vizinhança herda vieses do texto | conhecimento geral | conferir (Bolukbasi et al. 2016; Caliskan et al. 2017) ao incluir na Bibliografia |
| Atenção / Transformer | já no Cap. 04 | Vaswani et al. (2017) |
| GPT-3: 175 bilhões de parâmetros, ~300 bilhões de tokens de treino | confirmado | [Brown et al. (2020)](https://papers.neurips.cc/paper/2020/hash/1457c0d6bfcb4967418bfb8ac142f64a-Abstract.html); um resumo de revisão cita 400 bi (erro), vale o artigo |
| "Mais de 1.700 anos de leitura sem pausa" | **estimativa minha** | 300 bi tokens × 0,75 palavra/token = 225 bi palavras; ÷ 250 palavras/min = 900 mi min ≈ 1.712 anos. Selo "estimativa" no texto |
| InstructGPT (2022): avaliadores preferiram o modelo de 1,3 bi ao GPT-3 de 175 bi (100× menor); método SFT + modelo de recompensa + RL | confirmado | [Ouyang et al. (2022), arXiv 2203.02155](https://ar5iv.labs.arxiv.org/html/2203.02155). A preferência vale para os prompts e avaliadores da OpenAI. Não usei o "71,4%" (só em resumo secundário) |
| "A máquina pode aprender a agradar mais do que a acertar" | a conferir | redigido com ressalva ("pode"); desenvolver no Cap. 07 (bajulação; Sharma et al. 2023, a conferir) |
| Kalai et al. (2025): treino e avaliação premiam o chute; analogia da prova de múltipla escolha | confirmado | [arXiv 2509.04664](https://arxiv.org/pdf/2509.04664) (OpenAI e Georgia Tech). Um PDF com formato *Nature* (2026) apareceu, mas não confirmei publicação; citar só o arXiv |
| Leis de escala (2020 e 2022): desempenho melhora de forma previsível com parâmetros, dados e computação | conhecimento geral | Kaplan et al. (2020); Hoffmann et al. (2022, "Chinchilla"). Conferir ao incluir na Bibliografia. Texto marca como hipótese se a curva continua |
| "Ainda não se sabe explicar por inteiro o que acontece dentro do modelo"; interpretabilidade | a conferir | consenso do campo; achar fonte citável (pesquisa de interpretabilidade) |
| Carolina (USP): corpus aberto de português brasileiro, ~823 milhões de palavras na v1.2, com procedência | confirmado | [arXiv 2402.19204](https://arxiv.org/html/2402.19204v1) (PeLLE, que cita o Carolina) e [site do corpus](https://sites.usp.br/corpuscarolina/) |
| "Menos de 1% do volume de tokens do GPT-3" | estimativa minha | comparação de ordem de grandeza; selo no texto, com ressalva de que é um único corpus curado |
| BrWaC restrito a pesquisa; BERTimbau pré-treinado nele | confirmado | arXiv 2402.19204 |
| GigaVerbo ~200 bi de tokens; modelo Tucano treinado com ele | secundária | busca confirmou GigaVerbo (200 bi) e Tucano como série em português; a ligação "treinado com o GigaVerbo" vem do conhecimento do artigo do Tucano. **Conferir** |
| Maritaca AI (Campinas), família Sabiá; versões novas proprietárias | confirmado | [Sabiá-4 Technical Report](https://arxiv.org/pdf/2603.10213) e cobertura; comparativos de desempenho são da própria empresa (não usados) |
| "Modelo com menos português inventa mais onde o idioma é raro" | **hipótese** | marcada com selo; sem estudo citado |

## Candidatos para Glossário e Bibliografia (integrar no fim da Parte)
Glossário: **Token**, **Embedding (representação vetorial)**, **Atenção**, **Pré-treino**, **Parâmetro**, **RLHF**, **Alucinação**, **Leis de escala**.
Bibliografia: Brown et al. (2020); Ouyang et al. (2022); Kalai et al. (2025); Petrov et al. (2023); Kaplan et al. (2020); Hoffmann et al. (2022); decisão *Mata v. Avianca*; Carolina (USP); Bolukbasi et al. (2016).
