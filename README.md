# Data Double

Livro-manifesto sobre capitalismo de vigilância, privacidade, inteligência artificial e resistência, em português e inglês, com narração.
Leia em **https://vocealgoritmo.com.br/**

Cinco partes: I. A Mente · II. A Máquina · III. O Cerco · IV. Infraestrutura · V. Resistência.

## Para quem desenvolve

Site estático (HTML + JS puro, sem build), publicado pelo GitHub Pages a cada push em `main`.
Tudo o que é preciso saber, as regras do autor, a arquitetura e as ferramentas estão em [`CLAUDE.md`](CLAUDE.md).
Rotinas prontas (capítulo, tradução, verificação de fatos, publicação, diagnóstico editorial) estão em `.claude/skills/`.

```powershell
pwsh tools/i18n.ps1 build      # compila a tradução
pwsh tools/test_idiomas.ps1    # testa PT/EN em todas as páginas
```
