-- How Many Beers: secure group name + password joining
-- Run this in the Supabase SQL Editor BEFORE deploying the frontend changes.

create extension if not exists pgcrypto;

alter table public.groups
  add column if not exists password_hash text,
  add column if not exists password_set_at timestamptz;

create unique index if not exists groups_password_hash_unique
  on public.groups (password_hash)
  where password_hash is not null;

create or replace function public.hash_group_password(p_password text)
returns text language sql immutable security invoker
set search_path = ''
as $$ select encode(extensions.digest(convert_to(lower(trim(p_password)), 'utf8'), 'sha256'), 'hex'); $$;

create or replace function public.create_group_secure(p_name text, p_code text, p_password text)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare v_group public.groups; v_name text := trim(p_name); v_code text := upper(trim(p_code)); v_password text := trim(p_password); v_hash text;
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode = '42501'; end if;
  if length(v_name) < 1 or length(v_name) > 80 then raise exception 'Group name must be between 1 and 80 characters.' using errcode = '22023'; end if;
  if length(v_code) < 1 or length(v_code) > 40 then raise exception 'Group code must be between 1 and 40 characters.' using errcode = '22023'; end if;
  if length(v_password) < 8 or length(v_password) > 128 then raise exception 'Group password must be between 8 and 128 characters.' using errcode = '22023'; end if;
  v_hash := public.hash_group_password(v_password);
  begin
    insert into public.groups (code, name, host_email, password_hash, password_set_at)
    values (v_code, v_name, lower(trim(auth.email())), v_hash, now()) returning * into v_group;
  exception when unique_violation then
    if exists (select 1 from public.groups where code = v_code) then
      raise exception 'Group code already taken.' using errcode = '23505';
    else
      raise exception 'That group password is already in use. Choose a different password.' using errcode = '23505';
    end if;
  end;
  insert into public.group_members (group_code, user_email, user_name)
  select v_group.code, lower(trim(auth.email())), u.display_name from public.users u
  where lower(trim(u.email)) = lower(trim(auth.email())) on conflict (group_code, user_email) do nothing;
  return jsonb_build_object('code', v_group.code, 'name', v_group.name, 'host_email', v_group.host_email);
end; $$;

create or replace function public.set_group_password(p_group_code text, p_password text)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare v_group public.groups; v_password text := trim(p_password); v_hash text;
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode = '42501'; end if;
  select * into v_group from public.groups where code = upper(trim(p_group_code)) and lower(trim(host_email)) = lower(trim(auth.email())) for update;
  if not found then raise exception 'Only the group host can set the group password.' using errcode = '42501'; end if;
  if length(v_password) < 8 or length(v_password) > 128 then raise exception 'Group password must be between 8 and 128 characters.' using errcode = '22023'; end if;
  v_hash := public.hash_group_password(v_password);
  begin
    update public.groups set password_hash = v_hash, password_set_at = now() where code = v_group.code returning * into v_group;
  exception when unique_violation then
    raise exception 'That group password is already in use. Choose a different password.' using errcode = '23505';
  end;
  return jsonb_build_object('code', v_group.code, 'name', v_group.name, 'host_email', v_group.host_email);
end; $$;

create or replace function public.join_group_secure(p_group_name text, p_password text)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare v_group public.groups; v_name text := trim(p_group_name); v_password text := trim(p_password); v_hash text; v_user_name text; v_email text := lower(trim(auth.email()));
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode = '42501'; end if;
  if length(v_name) < 1 or length(v_name) > 80 then raise exception 'Enter a valid group name.' using errcode = '22023'; end if;
  if length(v_password) < 8 or length(v_password) > 128 then raise exception 'Enter the group password.' using errcode = '22023'; end if;
  v_hash := public.hash_group_password(v_password);
  select * into v_group from public.groups where lower(trim(name)) = lower(v_name) and password_hash = v_hash;
  if not found then raise exception 'Group name and password do not match.' using errcode = 'P0001'; end if;
  select display_name into v_user_name from public.users where lower(trim(email)) = v_email limit 1;
  insert into public.group_members (group_code, user_email, user_name)
  values (v_group.code, v_email, coalesce(v_user_name, split_part(v_email, '@', 1))) on conflict (group_code, user_email) do nothing;
  return jsonb_build_object('code', v_group.code, 'name', v_group.name, 'host_email', v_group.host_email);
end; $$;

revoke insert on public.group_members from anon, authenticated;
revoke update on public.group_members from anon, authenticated;

alter table public.groups enable row level security;
drop policy if exists "Authenticated users can view groups" on public.groups;
drop policy if exists "Members can view their groups" on public.groups;
drop policy if exists "Hosts can view their groups" on public.groups;
drop policy if exists "Admin can view all groups" on public.groups;

create policy "Members can view their groups" on public.groups for select to authenticated using (exists (select 1 from public.group_members gm where gm.group_code = groups.code and lower(trim(gm.user_email)) = lower(trim(auth.email()))));
create policy "Hosts can view their groups" on public.groups for select to authenticated using (lower(trim(host_email)) = lower(trim(auth.email())));
create policy "Admin can view all groups" on public.groups for select to authenticated using (lower(trim(auth.email())) = 'matthewswan17@gmail.com');

revoke execute on function public.hash_group_password(text) from public, anon, authenticated;
grant execute on function public.create_group_secure(text, text, text) to authenticated;
grant execute on function public.set_group_password(text, text) to authenticated;
grant execute on function public.join_group_secure(text, text) to authenticated;

-- Existing groups created before this migration have no password. Hosts can set one with:
-- select public.set_group_password('GROUP_CODE', 'new-unique-password');
