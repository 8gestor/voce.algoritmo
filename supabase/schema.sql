-- Progresso do Estudo de Inglês, uma linha por pessoa. Rodar uma vez no SQL Editor do Supabase.
-- Só guarda progresso (estatísticas, vocabulário, posições, histórico). O texto dos livros NUNCA é enviado.

create table if not exists public.progress (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    data       jsonb not null default '{}'::jsonb,
    device     text,
    updated_at timestamptz not null default now()
);

-- Permissões da tabela: só quem está logado (authenticated) acessa; o visitante anônimo (anon) não tem acesso nenhum.
revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

-- Segurança por linha: cada pessoa lê e grava só a própria linha, mesmo com a chave pública no site.
alter table public.progress enable row level security;

drop policy if exists "ler o proprio progresso" on public.progress;
drop policy if exists "criar o proprio progresso" on public.progress;
drop policy if exists "atualizar o proprio progresso" on public.progress;
drop policy if exists "apagar o proprio progresso" on public.progress;

create policy "ler o proprio progresso"       on public.progress for select using (auth.uid() = user_id);
create policy "criar o proprio progresso"     on public.progress for insert with check (auth.uid() = user_id);
create policy "atualizar o proprio progresso" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar o proprio progresso"    on public.progress for delete using (auth.uid() = user_id);
