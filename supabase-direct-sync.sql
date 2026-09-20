-- Direkter Cloud-Sync ohne Spring Boot / externes Backend.
-- Einmal im Supabase Dashboard unter SQL Editor ausführen.

create table if not exists public.mt_cloud_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mt_cloud_data enable row level security;

-- Sicher erneut ausführbar: Jeder angemeldete Nutzer darf ausschließlich
-- seinen eigenen Datenblock lesen und schreiben.
drop policy if exists "Users read own cloud data" on public.mt_cloud_data;
drop policy if exists "Users insert own cloud data" on public.mt_cloud_data;
drop policy if exists "Users update own cloud data" on public.mt_cloud_data;

create policy "Users read own cloud data"
  on public.mt_cloud_data for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own cloud data"
  on public.mt_cloud_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own cloud data"
  on public.mt_cloud_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.mt_cloud_data to authenticated;
