-- LeadForge AI — team invites support
-- Run AFTER 001_init.sql in the Supabase SQL editor.

-- Store email on profiles so members can be found by email.
alter table public.profiles add column if not exists email text;

-- Backfill emails for existing users.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create unique index if not exists idx_profiles_email on public.profiles(lower(email));

-- Update the signup trigger to also store the email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_team_id uuid;
begin
  insert into public.teams (name)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s team')
  returning id into new_team_id;

  insert into public.profiles (id, full_name, email, team_id)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new_team_id);

  insert into public.team_members (team_id, user_id, role)
  values (new_team_id, new.id, 'owner');

  return new;
end;
$$;

-- Members can see profiles of people in their team (for the member list).
drop policy if exists "team members read team profiles" on public.profiles;
create policy "team members read team profiles" on public.profiles
  for select using (
    id = auth.uid() or team_id in (select public.my_team_ids())
  );
