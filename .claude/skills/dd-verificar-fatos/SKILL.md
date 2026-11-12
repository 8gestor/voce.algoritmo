---
name: dd-verificar-fatos
description: Verificar fatos, números, casos e referências do livro Data Double contra fontes reais e produzir relatório só de divergências. Use antes de publicar texto novo ou ao revisar afirmações.
---

Base: `CLAUDE.md` §1 (regras 3 e 4) e §7.

## Princípios
- Nada de dado pessoal nas consultas: só título, autor, afirmação, DOI.
- Fonte real: texto original (Europe PMC, arXiv/ar5iv, PDF oficial, órgão público, jornal de referência). Blog não confirma.
- Fonte diverge: **corrigir no PT e no EN** (mesmo `data-id`), com ressalva honesta ("cerca de", ano, quem estimou). Sem fonte: manter com ressalva e registrar.

## Fluxo
1. Extrair afirmações: `pwsh tools/fatos.ps1` (→ `parte-ia/verificacao/itens.json/csv`; a Parte II vem de `parte-ia/fontes-NN.md`).
2. Referências: `pwsh tools/verificar_biblio.ps1` → `biblio_resultado.json` (Crossref/Open Library; ano diferente nem sempre é erro: reedição, original em outra língua).
3. Números com expressão exigida: acrescentar em `tools/verificar_fatos.ps1` e rodar → `fatos_resultado.json`.
4. Fatos sem API: WebSearch (modo standard; extended só se vier fraco) e abrir a fonte.
5. Atualizar `parte-ia/verificacao/RELATORIO-DIVERGENCIAS.md` na forma enxuta: (1) corrigido, com antes/depois/fonte/link; (2) ainda sem fonte; (3) anos; (4) o que saiu da lista. Confirmado não fica na lista.
6. Itens "a conferir" de `parte-ia/fontes-NN.md`: mudar o status ao confirmar.

## Atenção
Fatos de 2025/2026 envelhecem: reler antes de cada atualização do site. Frases atribuídas de segunda mão saem com ressalva no texto.
