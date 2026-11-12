---
name: dd-traducao
description: Traduzir ou revisar PT↔EN no livro Data Double — fonte .en.txt, paridade de frases para a narração, compilar e auditar com tools/i18n.ps1. Use ao mexer em qualquer texto bilíngue.
---

Base: `CLAUDE.md` §3 e §5. A pasta `traducao/` e o diário `traducao/ALTERACOES.md` são da aba tradutora/revisora: **não editar nem commitar `traducao/`**; relatar o que mudou na resposta.

## Fluxo
1. `pwsh tools/i18n.ps1 status` → cobertura. `pwsh tools/i18n.ps1 show <pág>` → unidades (id + HTML PT).
2. Editar `assets/i18n/src/<pág>.en.txt`: um bloco por unidade, mesmo `data-id`, mesmas tags inline do PT.
3. `pwsh tools/i18n.ps1 build <pág>` (gera `assets/i18n/en/<pág>.js`, nunca editar à mão) e ler os avisos.
4. `pwsh tools/test_idiomas.ps1` (troca PT↔EN, sobra de português, restauração exata) e `test_narracao.ps1`.

## Regras de qualidade
- **Paridade de frases**: mesma quantidade de frases PT e EN por unidade (a narração destaca por frase). Aviso novo = corrigir; os antigos estão listados em `CLAUDE.md` §4.
- Tradução fiel e com a mesma voz (ironia, ritmo curto, termos de sistema em maiúsculas). Não resumir nem explicar o que o PT não explica.
- Termos seguem `cap15.en.txt`; leis e instituições brasileiras mantêm o original com glosa na primeira ocorrência.
- Glossário: ordem de verbetes PT = EN (o `raiox.ps1` aborta se as contagens diferirem).
- Números e datas idênticos ao PT; se o PT foi corrigido por verificação de fato, corrigir o EN junto.
