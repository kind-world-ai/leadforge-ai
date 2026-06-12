-- LeadForge AI — initial Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query) or via supabase CLI.

-- ===== Teams & profiles =====

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Team',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  team_id uuid references public.teams(id),
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Auto-create a team + profile + owner membership on signup.
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

  insert into public.profiles (id, full_name, team_id)
  values (new.id, new.raw_user_meta_data->>'full_name', new_team_id);

  insert into public.team_members (team_id, user_id, role)
  values (new_team_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Leads =====

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  business_name text not null,
  website text,
  city text not null default 'Unknown city',
  country text not null default 'Unknown country',
  sector text not null default 'Unknown sector',
  source text not null default 'Manual',
  source_url text,
  google_place_id text,
  decision_maker text,
  email text,
  phone text,
  socials_json jsonb not null default '[]',
  services_json jsonb not null default '[]',
  status text not null default 'New',
  score integer not null default 0,
  fit_reason text not null default '',
  pain_signals_json jsonb not null default '[]',
  audit_json jsonb,
  outreach_json jsonb,
  next_action text not null default 'Research decision maker',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text not null default '',
  tags_json jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_team on public.leads(team_id);
create index if not exists idx_leads_score on public.leads(score desc);
create index if not exists idx_leads_status on public.leads(status);

-- ===== Search runs =====

create table if not exists public.search_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  market text not null,
  country text not null,
  city text not null,
  sector text not null,
  service_focus text not null,
  source_mix_json jsonb not null default '[]',
  tasks_json jsonb not null default '[]',
  notes text not null default '',
  imported_lead_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_runs_team on public.search_runs(team_id);

-- ===== Crawl jobs (worker queue) =====

create table if not exists public.crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  job_type text not null check (job_type in ('diagnose', 'crawl', 'audit', 'pagespeed')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_crawl_jobs_status on public.crawl_jobs(status, created_at);
create index if not exists idx_crawl_jobs_team on public.crawl_jobs(team_id);

-- ===== Outreach logs =====

create table if not exists public.outreach_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('email', 'call', 'linkedin', 'contact_form', 'whatsapp', 'other')),
  message text not null default '',
  outcome text,
  created_by uuid references auth.users(id),
  sent_at timestamptz not null default now()
);

create index if not exists idx_outreach_logs_lead on public.outreach_logs(lead_id);

-- ===== Row Level Security =====

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.leads enable row level security;
alter table public.search_runs enable row level security;
alter table public.crawl_jobs enable row level security;
alter table public.outreach_logs enable row level security;

-- Helper: the teams the current user belongs to.
create or replace function public.my_team_ids()
returns setof uuid
language sql
security definer set search_path = public
stable
as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;

create policy "members read their teams" on public.teams
  for select using (id in (select public.my_team_ids()));

create policy "users read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "users update own profile" on public.profiles
  for update using (id = auth.uid());

create policy "members read memberships" on public.team_members
  for select using (team_id in (select public.my_team_ids()));

create policy "team members full access leads" on public.leads
  for all using (team_id in (select public.my_team_ids()))
  with check (team_id in (select public.my_team_ids()));

create policy "team members full access search_runs" on public.search_runs
  for all using (team_id in (select public.my_team_ids()))
  with check (team_id in (select public.my_team_ids()));

create policy "team members full access crawl_jobs" on public.crawl_jobs
  for all using (team_id in (select public.my_team_ids()))
  with check (team_id in (select public.my_team_ids()));

create policy "team members full access outreach_logs" on public.outreach_logs
  for all using (team_id in (select public.my_team_ids()))
  with check (team_id in (select public.my_team_ids()));

-- The worker uses the service-role key, which bypasses RLS by design.
