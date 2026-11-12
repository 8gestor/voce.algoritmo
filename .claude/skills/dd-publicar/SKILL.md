---
name: dd-publicar
description: Rodar a bateria de testes do livro Data Double, commitar com caminhos explícitos, mergear em main e conferir a publicação no site. Use só quando o autor autorizou publicar.
---

Base: `CLAUDE.md` §4 e §5. **Sem autorização do autor para esta fase, pare antes do merge e peça.**

## Passos
1. `git status --short` — só devem aparecer arquivos que você mudou. `traducao/` ou `cap*.html` alterados por outra aba = parar.
2. Bateria, nesta ordem: `pwsh tools/i18n.ps1 build` → `pwsh tools/raiox.ps1` → `pwsh tools/stats.ps1 build` → `test_idiomas.ps1` (31/31) → `test_narracao.ps1` → `test_sync.ps1` → `test_estatisticas.ps1`. Falha nova = corrigir, não publicar.
3. `git add <caminho1> <caminho2> …` (explícito; incluir os gerados `assets/i18n/en/*.js`, `raiox.js`, `estatisticas-dados.js` se mudaram).
4. Commit em português, assunto curto, terminando com a linha de coautoria definida na sessão.
5. Se houver branch de trabalho: `git switch main; git merge --no-ff <branch>`; `git push origin main`; depois apagar o branch local e o remoto já mesclados.
6. Conferir no ar (Pages leva minutos): `Invoke-WebRequest https://vocealgoritmo.com.br/<arquivo>` = 200 e um trecho novo presente (frase inserida, entrada em `sumario.js`). Se o cache segurar, avisar para Ctrl+F5.
7. Responder só com: o que subiu (hash), o que não subiu e por quê, pendências.

## Nunca
`git add -A` ou `.`, `push --force`, editar `traducao/`, commitar `painel.html`, publicar sem testes.
