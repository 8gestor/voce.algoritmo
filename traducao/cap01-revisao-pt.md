# Cap. 01 — Revisão do português (proposta, nada aplicado nos HTMLs)

Regra do autor: nunca comprimir; +15% permitido. Todas as mudanças abaixo são trocas de
palavra ou reformulações do mesmo tamanho (variação total estimada: +0,1%).
Referência: `cap01.html` da working copy da branch `feature/bilingue` (com `data-id`).

## A. Correções (recomendo aplicar)

| id | Original | Proposta | Motivo |
|---|---|---|---|
| c01-003 | "através de silício" | "por meio de silício" | "Através de" como instrumento é desaconselhado pelos manuais; "por meio de" é o uso correto. |
| c01-014 | "nossos viéses" | "nossos vieses" | Plural de *viés* é *vieses*. |
| c01-014 | "Ele faz isso de forma instintiva (estatística)." | "Ele faz isso de forma \"instintiva\", isto é, estatística." | O parêntese soava como correção solta; a nova forma deixa claro que "instintiva" é metáfora. Mesmo número de sentenças. |
| c01-021 | "que bypassam qualquer filtro racional" | "que contornam qualquer filtro racional" | Anglicismo desnecessário em texto narrado; "contornam" tem o mesmo sentido. |
| c01-010 | "se abriam para o programa" | "se abriam com o programa" | "Abrir-se com alguém" é a regência idiomática. |
| c01-004 | "E ela é uma metáfora — útil… — e é a fundação ideológica…" | "Ela é, de fato, uma metáfora — útil como ferramenta de laboratório, perigosa quando vira dogma — e é a fundação ideológica que permite que algoritmos tentem controlar quem você é." | Havia "E ela é… e é…" em sequência, com dois travessões; a reformulação mantém todas as ideias. |

## B. Perguntas ao autor (não alterei nada)

1. **c01-015** — "O que deterá o poder não será o código em si, mas a intenção de quem detém os dados."
   *Deter* tem dois sentidos aqui (reter / conter), e a frase fica ambígua. Li como "o poder
   não estará no código, e sim na intenção de quem detém os dados". Confirma?
   Se sim, sugiro: "O poder não estará no código em si, mas na intenção de quem detém os dados."
   (O EN já está escrito com essa leitura.)
2. **c01-039** — "Sanitização Mental" é calque do inglês *sanitization*. Alternativa em português
   corrente: "Higiene Mental". Mantenho o seu termo ou troco? (O EN está como *Mental Hygiene*;
   se você mantiver "Sanitização", o EN passa a *Mental Sanitizing*.)
3. **c01-039** — "A Prova da Qualia": *qualia* é plural de *quale*. Em português se usa tanto
   "a qualia" quanto "os qualia". Hoje o livro usa "qualia" sem artigo (c01-008) e "a Qualia" aqui.
   Sugiro padronizar "os qualia"; no título, "A Prova dos Qualia". Decida e eu uniformizo no livro todo.
4. **c01-021** — "injeções diretas de dopamina": é imagem forte e muito repetida, mas a ciência
   não sustenta que *likes* sejam "injeções" de dopamina no sentido literal. Mantive (é voz do
   autor), só aviso. Se quiser blindar: "estímulos que ativam o sistema de recompensa".
5. **c01-023** — "Cancelamento": no EN virou *Cancel Culture*. Confirma que é essa a referência?
6. **Marcador técnico (para a outra aba):** os `data-id` pulam de c01-027 para c01-029 e de
   c01-029 para c01-031. Se for intencional (reserva para os rótulos), tudo bem; se não, é só
   numeração.

## C. Decisões de tradução tomadas no EN (contexto)

| PT | EN | Por quê |
|---|---|---|
| "A Falha" (Síntese: A Supremacia da Falha) | "The Supremacy of the Flaw" | *Falha* aqui é imperfeição/contradição humana; *failure* soaria como fracasso. |
| "O Espelho Negro" | "The Black Mirror" | Referência à série; o título brasileiro é o mesmo do original. |
| "Desafio de Retomada" | "Reclaim Challenge" | Ideia de retomar o que foi capturado. Termo novo, vai para o glossário como `proposto`. |
| "Big Techs" | "Big Tech" | Em inglês é coletivo singular ("Big Tech has…"). |
| "Disseram-nos" | "We've been told" | Voz passiva natural em inglês falado. |
| "Cancelamento" | "Cancel Culture" | Termo corrente em inglês. |
| Sentenças | mesmo número do PT em cada unidade | Necessário para a narração acompanhar palavra a palavra quando leitura e áudio estão em idiomas diferentes. |

## D. Verificação factual (checadas contra o que sei; confirme as que importam)

McCulloch & Pitts 1943 ✔ · Searle (Quarto Chinês) 1980 ✔ · Chalmers 1995 ✔ · Damasio 1994 ✔ ·
Varela/Thompson/Rosch 1991 ✔ · ELIZA 1966 ✔ · Cobb 2020 ✔ · Epstein/Aeon 2016 ✔ · Bender et al. 2021 ✔.
Elliot (Damasio) perdeu tecido do lobo frontal na remoção de um tumor; "cirurgia no lobo frontal" está correto.

## E. Decisões do autor (2026-11-12)

Regra geral: "faça conforme sua sugestão". Vale também para os capítulos futuros: dúvidas de
revisão são resolvidas pela sugestão do revisor, e tudo é registrado em `ALTERACOES.md`.

| Item | Decisão |
|---|---|
| B.1 c01-015 | Adotar: "O poder não estará no código em si, mas na intenção de quem detém os dados." |
| B.2 c01-039 | Trocar para "Higiene Mental" (EN: Mental Hygiene). |
| B.3 qualia | Padronizar "os qualia"; título "A Prova dos Qualia". Vale para o livro todo. |
| B.4 c01-021 | Manter "injeções diretas de dopamina" (voz do autor). |
| B.5 c01-023 | Manter "Cancelamento" = Cancel Culture. |
| B.6 ids | Assunto da outra aba; nenhuma ação de texto. |
