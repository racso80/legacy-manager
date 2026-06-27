-- LEGACY MANAGER - Supabase Fase 1
-- Ejecutar en Supabase SQL Editor.
-- IMPORTANTE: no usar service_role_key en el frontend. La app usa VITE_SUPABASE_ANON_KEY.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savegames (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  coach_name text,
  club_id text,
  season text,
  current_game_date text,
  data jsonb not null,
  data_version text,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savegames_user_updated_idx
  on public.savegames(user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists savegames_set_updated_at on public.savegames;
create trigger savegames_set_updated_at
before update on public.savegames
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.savegames enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "savegames_select_own" on public.savegames;
create policy "savegames_select_own"
on public.savegames for select
using (auth.uid() = user_id);

drop policy if exists "savegames_insert_own" on public.savegames;
create policy "savegames_insert_own"
on public.savegames for insert
with check (auth.uid() = user_id);

drop policy if exists "savegames_update_own" on public.savegames;
create policy "savegames_update_own"
on public.savegames for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "savegames_delete_own" on public.savegames;
create policy "savegames_delete_own"
on public.savegames for delete
using (auth.uid() = user_id);

-- Perfil automático al crear usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
