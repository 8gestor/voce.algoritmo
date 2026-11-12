---
name: dd-capitulo
description: Criar ou editar capítulo do livro Data Double (HTML, unidades data-id, menu sumario.js, glossário, bibliografia, Raio-X, renumeração). Use ao inserir texto novo, novo capítulo ou mudar a ordem.
---

Base: `CLAUDE.md` (regras do autor e tabela arquivo↔número). Leia as seções 2 e 6 antes de agir.

## Editar texto existente
1. Ler só o trecho: localizar a unidade por `data-id` (Grep), nunca o capítulo inteiro.
2. Regra do autor: **não comprimir**; pode crescer até ~15%. Manter voz, ritmo e as marcas do livro (selos, system-alert, Desafio de Retomada).
3. Alterou PT → alterar o EN em `assets/i18n/src/<pág>.en.txt` no mesmo `data-id`, com o **mesmo número de frases** (skill `dd-traducao`).
4. Frase nova dentro de unidade existente: anexar ao fim da unidade (não cria id). Parágrafo novo: unidade nova com id seguinte ao maior da página.

## Capítulo ou página nova
1. Copiar a estrutura de uma página vizinha (cabeçalho, `chapter-meta`, `h1.speakable`, parágrafos `p.speakable`).
2. `pwsh tools/ids.ps1 <página>` dá `data-id` (só em páginas novas).
3. Registrar em `assets/js/sumario.js` (`structure`, `TITLES_EN`, categoria) e, se preciso, no mapa de `tools/raiox.ps1`.
4. Criar `assets/i18n/src/<pág>.en.txt` e rodar `pwsh tools/i18n.ps1 build <pág>`.
5. Fechar a costura: frase-ponte no fim do capítulo anterior, abertura que retoma, menção no mapa da Introdução e no Epílogo se a arquitetura mudar.

## Glossário, bibliografia, Raio-X
- Verbete novo: card em `cap15.html` em ordem alfabética **e** o par em `cap15.en.txt` na mesma posição; `REF:` = "Cap N, Cap M" (numeração exibida).
- Referência nova: `cap16.html` + `cap16.en.txt`, na categoria certa; depois confira com `dd-verificar-fatos`.
- Rodar `pwsh tools/raiox.ps1` e `pwsh tools/stats.ps1 build`.

## Renumerar
Só com mapa explícito antigo→novo. Atualizar juntos: "Capítulo N"/"Chapter N"/"CAPÍTULO N", `REF: Cap`, rótulos de parte, Desafios (#), `sumario.js`, `raiox.ps1`. Evitar aliases do PowerShell e `$M/$m`. Conferir com Grep que não sobrou número antigo e rodar a bateria (`dd-publicar`).
