-- Tabelas do DOUNO Tasks. Rodar no SQL Editor do projeto Supabase.

create table public.taskin_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  ics_token text unique
);

alter table public.taskin_state enable row level security;

create policy "taskin_state select own" on public.taskin_state
  for select using (auth.uid() = user_id);
create policy "taskin_state insert own" on public.taskin_state
  for insert with check (auth.uid() = user_id);
create policy "taskin_state update own" on public.taskin_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "taskin_state delete own" on public.taskin_state
  for delete using (auth.uid() = user_id);

-- Tokens do Outlook: sem policies de proposito. Nenhum papel de cliente
-- (anon/authenticated) acessa; so a service role, usada pelas funcoes da Vercel.
create table public.outlook_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  ms_account text,
  updated_at timestamptz not null default now()
);

alter table public.outlook_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- Etapa C (v3.64): conteudo grande da Biblioteca fora do registro principal.
-- Paginas HTML e textos de skills ficam aqui; o taskin_state guarda so os
-- metadados do item e o conteudo e carregado sob demanda. Idempotente: pode
-- ser rodado mais de uma vez. Nao altera nem apaga nada de taskin_state.
-- ---------------------------------------------------------------------------
create table if not exists public.library_contents (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    text not null,
  kind       text not null check (kind in ('html', 'skill', 'text')),
  content    text not null check (length(content) <= 8000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.library_contents enable row level security;

drop policy if exists "library_contents select own" on public.library_contents;
drop policy if exists "library_contents insert own" on public.library_contents;
drop policy if exists "library_contents update own" on public.library_contents;
drop policy if exists "library_contents delete own" on public.library_contents;

create policy "library_contents select own" on public.library_contents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "library_contents insert own" on public.library_contents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "library_contents update own" on public.library_contents
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "library_contents delete own" on public.library_contents
  for delete to authenticated using ((select auth.uid()) = user_id);

-- anon nao acessa nada desta tabela
revoke all on public.library_contents from anon;


-- ---------------------------------------------------------------------------
-- Copia de seguranca automatica (v3.65): uma copia por dia, as ultimas 7, mais a
-- linha 'pre-restauracao' (como a conta estava antes da ultima restauracao).
-- Pode ser rodado mais de uma vez. Nao altera nem apaga nada de taskin_state.
-- ---------------------------------------------------------------------------
create table if not exists public.state_backups (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        text not null check (day ~ '^\d{4}-\d{2}-\d{2}$' or day = 'pre-restauracao'),
  data       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.state_backups enable row level security;

drop policy if exists "state_backups select own" on public.state_backups;
drop policy if exists "state_backups insert own" on public.state_backups;
drop policy if exists "state_backups update own" on public.state_backups;
drop policy if exists "state_backups delete own" on public.state_backups;

create policy "state_backups select own" on public.state_backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "state_backups insert own" on public.state_backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "state_backups update own" on public.state_backups
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "state_backups delete own" on public.state_backups
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.state_backups from anon;
