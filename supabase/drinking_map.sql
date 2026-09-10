-- Drinking Map feature: venue/session/event data model.
-- Run this in the Supabase SQL editor for the test environment before testing the UI.

create extension if not exists pgcrypto;

create table if not exists public.drinking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  group_code text,
  google_place_id text not null,
  venue_name text not null,
  venue_address text,
  latitude double precision not null,
  longitude double precision not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists drinking_sessions_user_idx on public.drinking_sessions(user_email);
create index if not exists drinking_sessions_group_idx on public.drinking_sessions(group_code);
create index if not exists drinking_sessions_place_idx on public.drinking_sessions(google_place_id);

create table if not exists public.drink_location_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.drinking_sessions(id) on delete cascade,
  user_email text not null,
  group_code text,
  log_date date not null,
  drink_type text not null check (drink_type in ('pints','bottles','wines','cocktails','shots')),
  delta integer not null check (delta <> 0),
  created_at timestamptz not null default now()
);

create index if not exists drink_location_events_session_idx on public.drink_location_events(session_id);
create index if not exists drink_location_events_user_date_idx on public.drink_location_events(user_email, log_date);
create index if not exists drink_location_events_group_idx on public.drink_location_events(group_code);

alter table public.drinking_sessions enable row level security;
alter table public.drink_location_events enable row level security;

revoke all on public.drinking_sessions from anon;
revoke all on public.drink_location_events from anon;
grant select, insert, update on public.drinking_sessions to authenticated;
grant select, insert on public.drink_location_events to authenticated;

drop policy if exists "drinking_sessions_select_own_or_group" on public.drinking_sessions;
create policy "drinking_sessions_select_own_or_group" on public.drinking_sessions for select to authenticated using (
  lower(user_email) = lower((select auth.jwt()->>'email'))
  or exists (select 1 from public.group_members gm where gm.group_code = drinking_sessions.group_code and lower(gm.user_email) = lower((select auth.jwt()->>'email')))
);

drop policy if exists "drinking_sessions_insert_own" on public.drinking_sessions;
create policy "drinking_sessions_insert_own" on public.drinking_sessions for insert to authenticated with check (lower(user_email) = lower((select auth.jwt()->>'email')));

drop policy if exists "drinking_sessions_update_own" on public.drinking_sessions;
create policy "drinking_sessions_update_own" on public.drinking_sessions for update to authenticated using (lower(user_email) = lower((select auth.jwt()->>'email'))) with check (lower(user_email) = lower((select auth.jwt()->>'email')));

drop policy if exists "drink_location_events_select_own_or_group" on public.drink_location_events;
create policy "drink_location_events_select_own_or_group" on public.drink_location_events for select to authenticated using (
  lower(user_email) = lower((select auth.jwt()->>'email'))
  or exists (select 1 from public.group_members gm where gm.group_code = drink_location_events.group_code and lower(gm.user_email) = lower((select auth.jwt()->>'email')))
);

drop policy if exists "drink_location_events_insert_own" on public.drink_location_events;
create policy "drink_location_events_insert_own" on public.drink_location_events for insert to authenticated with check (lower(user_email) = lower((select auth.jwt()->>'email')));
