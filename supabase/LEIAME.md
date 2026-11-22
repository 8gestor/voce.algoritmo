# Sincronização do progresso (Supabase)

Guarda o **progresso** do Estudo de Inglês na nuvem para usar em PC, celular, tablet, TV ou leitor de e-books sem perder o histórico.
O site continua funcionando sem isto: o progresso fica salvo no aparelho e a nuvem só copia e mescla.

**O que vai para a nuvem:** estatísticas por dia, vocabulário e revisões, posição de leitura e palavras ouvidas de cada livro, histórico do
roteiro e do dia, textos de escrita. **O que nunca vai:** o texto dos livros que você envia (PDF, EPUB, texto colado). Os 8 livros do roteiro
vêm do próprio site em qualquer aparelho.

## Configurar (uma vez, uns 10 minutos)

1. Crie um projeto gratuito em <https://supabase.com> (região mais próxima, por exemplo São Paulo).
2. **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → *Run*. Cria a tabela `progress` com as permissões (só quem está logado) e a segurança por linha: cada pessoa só enxerga a própria linha. Se o projeto já tinha rodado uma versão antiga do script, rode de novo: ele é repetível.
3. **Authentication → Providers → Email**: deixe ligado. Pode desligar "Confirm email" se quiser entrar só pelo código.
4. **Authentication → Email Templates → Magic Link**: troque o texto para mostrar o **código** de 6 dígitos, por exemplo:
   ```html
   <h2>Seu código de acesso</h2>
   <p>Digite este código no site: <strong>{{ .Token }}</strong></p>
   ```
   (O código funciona em qualquer aparelho, inclusive TV e leitor de e-books, sem precisar abrir links.)
5. **Project Settings → API**: copie o **Project URL** e a chave **anon public**.
6. Edite `assets/js/sync-config.js` com esses dois valores e publique. A chave `anon` é pública por desenho (a proteção é a segurança por linha do passo 2).
   **Nunca** use a chave `service_role` no site.

## Usar

Na Biblioteca, bloco **Conta e sincronização**: digite o e-mail → *Enviar código* → digite o código → *Entrar*. Faça isso uma vez em cada aparelho.
O progresso sobe ao fechar um livro, depois de revisões e a cada minuto com mudanças; *Sincronizar agora* força na hora. Sem conexão, tudo
continua salvo no aparelho e sobe quando voltar.

## Como as versões se juntam (nada se perde)

- Estatísticas: para cada dia e campo, o **maior** valor.
- Vocabulário: o cartão **mais revisado**.
- Livros (casados por título + idioma): a **posição mais recente** e o maior número de palavras ouvidas.
- Históricos e textos de escrita: **união**.
- Dois aparelhos gravando ao mesmo tempo: o segundo relê, mescla e tenta de novo.

## Privacidade

O e-mail fica no Supabase só para o login. Nada além do progresso acima é enviado. Para apagar tudo: Supabase → Table Editor → `progress`
(linha da pessoa) e Authentication → Users.
