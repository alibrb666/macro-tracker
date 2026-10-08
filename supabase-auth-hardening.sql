-- Macro Tracker: one Supabase account = one private customer data set.
-- Run this once in Supabase Dashboard → SQL Editor.
-- This migration is additive: it does not delete existing customer data.

begin;

-- A small, public-safe profile record. Credentials always remain exclusively
-- in auth.users and are never copied into public tables.
create table if not exists public.mt_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar text not null default '🥗' check (char_length(avatar) <= 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mt_profiles enable row level security;
alter table public.mt_cloud_data enable row level security;

drop policy if exists "Users read own profile" on public.mt_profiles;
drop policy if exists "Users insert own profile" on public.mt_profiles;
drop policy if exists "Users update own profile" on public.mt_profiles;

create policy "Users read own profile"
  on public.mt_profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users insert own profile"
  on public.mt_profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users update own profile"
  on public.mt_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Never allow unauthenticated API access to application tables.
revoke all on table public.mt_profiles from anon;
revoke all on table public.mt_cloud_data from anon;
grant select, insert, update on table public.mt_profiles to authenticated;
grant select, insert, update on table public.mt_cloud_data to authenticated;

commit;

-- Legacy tables deliberately are not dropped here. First export or inspect
-- them, then remove them manually when the retired Spring backend is off:
--   public.mt_app_data
--   public.mt_email_tokens (confirm exact name in your project)
--   public.mt_user_data
--   public.mt_users
