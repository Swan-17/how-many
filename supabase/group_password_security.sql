-- How Many Beers: secure group name + generated group password joining
create extension if not exists pgcrypto;
alter table public.groups add column if not exists password_hash text, add column if not exists password_set_at timestamptz;
create unique index if not exists groups_password_hash_unique on public.groups (password_hash) where password_hash is not null;

create or replace function public.hash_group_password(p_password text)
returns text language sql immutable security invoker set search_path = ''
as $$ select encode(extensions.digest(convert_to(lower(trim(p_password)), 'utf8'), 'sha256'), 'hex'); $$;

create or replace function public.generate_group_password()
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare b bytea := extensions.gen_random_bytes(5); outp text := ''; i integer;
begin for i in 0..4 loop outp := outp || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',(get_byte(b,i)%32)+1,1); end loop; return outp; end; $$;

create or replace function public.create_group_secure(p_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare n text:=trim(p_name); pw text; h text; c text; g public.groups; tries integer:=0;
begin
 if auth.uid() is null then raise exception 'You must be signed in.' using errcode='42501'; end if;
 if length(n)<1 or length(n)>80 then raise exception 'Group name must be between 1 and 80 characters.' using errcode='22023'; end if;
 loop
  tries:=tries+1; if tries>20 then raise exception 'Could not generate a unique group password. Please try again.'; end if;
  pw:=public.generate_group_password(); h:=public.hash_group_password(pw); c:='G'||upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,11));
  begin
   insert into public.groups(code,name,host_email,password_hash,password_set_at) values(c,n,lower(trim(auth.email())),h,now()) returning * into g; exit;
  exception when unique_violation then null; end;
 end loop;
 insert into public.group_members(group_code,user_email,user_name) select g.code,lower(trim(auth.email())),u.display_name from public.users u where lower(trim(u.email))=lower(trim(auth.email())) on conflict(group_code,user_email) do nothing;
 return jsonb_build_object('code',g.code,'name',g.name,'host_email',g.host_email,'password',pw);
end; $$;

create or replace function public.set_group_password(p_group_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g public.groups; pw text; h text; tries integer:=0;
begin
 if auth.uid() is null then raise exception 'You must be signed in.' using errcode='42501'; end if;
 select * into g from public.groups where code=upper(trim(p_group_code)) and lower(trim(host_email))=lower(trim(auth.email())) for update;
 if not found then raise exception 'Only the group host can generate the group password.' using errcode='42501'; end if;
 loop
  tries:=tries+1; if tries>20 then raise exception 'Could not generate a unique group password. Please try again.'; end if;
  pw:=public.generate_group_password(); h:=public.hash_group_password(pw);
  begin update public.groups set password_hash=h,password_set_at=now() where code=g.code; exit; exception when unique_violation then null; end;
 end loop;
 return jsonb_build_object('code',g.code,'name',g.name,'host_email',g.host_email,'password',pw);
end; $$;

create or replace function public.join_group_secure(p_group_name text,p_password text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g public.groups; n text:=trim(p_group_name); pw text:=upper(trim(p_password)); h text; un text; em text:=lower(trim(auth.email()));
begin
 if auth.uid() is null then raise exception 'You must be signed in.' using errcode='42501'; end if;
 if length(n)<1 or length(n)>80 then raise exception 'Enter a valid group name.' using errcode='22023'; end if;
 if length(pw)<>5 or pw !~ '^[A-Z0-9]{5}$' then raise exception 'Enter the 5-character group password.' using errcode='22023'; end if;
 h:=public.hash_group_password(pw); select * into g from public.groups where lower(trim(name))=lower(n) and password_hash=h;
 if not found then raise exception 'Group name and password do not match.'; end if;
 select display_name into un from public.users where lower(trim(email))=em limit 1;
 insert into public.group_members(group_code,user_email,user_name) values(g.code,em,coalesce(un,split_part(em,'@',1))) on conflict(group_code,user_email) do nothing;
 return jsonb_build_object('code',g.code,'name',g.name,'host_email',g.host_email);
end; $$;

revoke insert,update on public.group_members from anon,authenticated;
alter table public.groups enable row level security;
drop policy if exists "Authenticated users can view groups" on public.groups;
drop policy if exists "Members can view their groups" on public.groups;
drop policy if exists "Hosts can view their groups" on public.groups;
drop policy if exists "Admin can view all groups" on public.groups;
create policy "Members can view their groups" on public.groups for select to authenticated using(exists(select 1 from public.group_members gm where gm.group_code=groups.code and lower(trim(gm.user_email))=lower(trim(auth.email()))));
create policy "Hosts can view their groups" on public.groups for select to authenticated using(lower(trim(host_email))=lower(trim(auth.email())));
create policy "Admin can view all groups" on public.groups for select to authenticated using(lower(trim(auth.email()))='matthewswan17@gmail.com');
revoke execute on function public.hash_group_password(text) from public,anon,authenticated;
revoke execute on function public.generate_group_password() from public,anon,authenticated;
grant execute on function public.create_group_secure(text) to authenticated;
grant execute on function public.set_group_password(text) to authenticated;
grant execute on function public.join_group_secure(text,text) to authenticated;

-- Existing groups have no password. A host can generate one with: select public.set_group_password('GROUP_CODE');
