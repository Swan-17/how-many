-- Lock group join codes permanently.
-- Run this once in the Supabase SQL Editor AFTER group_join_code.sql.
-- Existing group codes remain unchanged. New groups keep the code generated at creation.

create or replace function public.set_group_password(p_group_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'Group codes are permanent and cannot be changed.' using errcode='42501';
end; $$;

grant execute on function public.set_group_password(text) to authenticated;
