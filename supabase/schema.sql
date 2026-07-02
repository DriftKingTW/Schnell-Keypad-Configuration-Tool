-- Schnell Keypad Configuration Tool — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- One saved keypad configuration per row. `config` stores the full
-- combinedConfig object produced by the tool (keyConfig, macros,
-- rotaryExtension, onBoardRotaryEncoder).
create table if not exists public.keypad_configs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  config     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Row Level Security: each user can only see and modify their own configs.
alter table public.keypad_configs enable row level security;

drop policy if exists "Users can read own configs" on public.keypad_configs;
create policy "Users can read own configs"
  on public.keypad_configs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own configs" on public.keypad_configs;
create policy "Users can insert own configs"
  on public.keypad_configs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own configs" on public.keypad_configs;
create policy "Users can update own configs"
  on public.keypad_configs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own configs" on public.keypad_configs;
create policy "Users can delete own configs"
  on public.keypad_configs for delete
  using (auth.uid() = user_id);
