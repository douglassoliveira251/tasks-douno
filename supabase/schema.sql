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
