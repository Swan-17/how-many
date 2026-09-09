-- How Many Beers: persistent unique 5-character group join codes
-- Run this AFTER group_password_security.sql in the Supabase SQL Editor.

alter table public.groups
  add column if not exists join_code text;

create unique index if not exists groups_join_code_unique
  on public.groups (join_code)
  where join_code is not null;

create or replace function public.create_group_secure(p_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  n text := trim(p_name);
  pw text;
  h text;
  c text;
  g public.groups;
  tries integer := 0;
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode='42501'; end if;
  if length(n)<1 or length(n)>80 then raise exception 'Group name must be between 1 and 80 characters.' using errcode='22023'; end if;
  loop
    tries := tries + 1;
    if tries > 50 then raise exception 'Could not generate a unique group code. Please try again.'; end if;
    pw := public.generate_group_password();
    h := public.hash_group_password(pw);
    c := 'G' || upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,11));
    begin
      insert into public.groups(code,name,host_email,password_hash,password_set_at,join_code)
      values(c,n,lower(trim(auth.email())),h,now(),pw)
      returning * into g;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.group_members(group_code,user_email,user_name)
  select g.code,lower(trim(auth.email())),u.display_name from public.users u
  where lower(trim(u.email))=lower(trim(auth.email()))
  on conflict(group_code,user_email) do nothing;
  return jsonb_build_object('code',g.code,'name',g.name,'host_email',g.host_email,'join_code',pw,'password',pw);
end; $$;

create or replace function public.set_group_password(p_group_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  g public.groups;
  pw text;
  h text;
  tries integer := 0;
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode='42501'; end if;
  select * into g from public.groups
  where code=upper(trim(p_group_code)) and lower(trim(host_email))=lower(trim(auth.email()))
  for update;
  if not found then raise exception 'Only the group host can generate the group password.' using errcode='42501'; end if;
  loop
    tries := tries + 1;
    if tries > 50 then raise exception 'Could not generate a unique group code. Please try again.'; end if;
    pw := public.generate_group_password();
    h := public.hash_group_password(pw);
    begin
      update public.groups
      set password_hash=h,password_set_at=now(),join_code=pw
      where code=g.code;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('code',g.code,'name',g.name,'host_email',g.host_email,'join_code',pw,'password',pw);
end; $$;

create or replace function public.join_group_secure(p_group_name text,p_password text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  g public.groups;
  n text := trim(p_group_name);
  pw text := upper(trim(p_password));
  un text;
  em text := lower(trim(auth.email()));
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode='42501'; end if;
  if length(n)<1 or length(n)>80 then raise exception 'Enter a valid group name.' using errcode='22023'; end if;
  if length(pw)<>5 or pw !~ '^[A-Z0-9]{5}$' then raise exception 'Enter the 5-character group code.' using errcode='22023'; end if;
  select * into g from public.groups
  where lower(trim(name))=lower(n) and upper(join_code)=pw;
  if not found then raise exception 'Group name and code do not match.'; end if;
  select display_name into un from public.users where lower(trim(email))=em limit 1;
  insert into public.group_members(group_code,user_email,user_name)
  values(g.code,em,coalesce(un,split_part(em,'@',1)))
  on conflict(group_code,user_email) do nothing;
  return jsonb_build_object('code',g.code,'name',g.name,'host_email',g.host_email);
end; $$;

grant execute on function public.create_group_secure(text) to authenticated;
grant execute on function public.set_group_password(text) to authenticated;
grant execute on function public.join_group_secure(text,text) to authenticated;

-- Give existing groups a unique 5-character code and keep password_hash in sync.
do $$
declare
  g record;
  pw text;
  h text;
  tries integer;
begin
  for g in select code from public.groups where join_code is null loop
    tries := 0;
    loop
      tries := tries + 1;
      if tries > 50 then raise exception 'Could not backfill a unique group code.'; end if;
      pw := public.generate_group_password();
      h := public.hash_group_password(pw);
      begin
        update public.groups set join_code=pw,password_hash=h,password_set_at=now() where code=g.code;
        exit;
      exception when unique_violation then null;
      end;
    end loop;
  end loop;
end $$;
