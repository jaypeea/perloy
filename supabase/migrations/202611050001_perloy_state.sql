create table if not exists public.perloy_state (
  id text primary key default 'global' check (id = 'global'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.perloy_state enable row level security;
revoke all on public.perloy_state from public, anon, authenticated;
grant usage on schema public to anon;
grant select, insert, update on public.perloy_state to anon;

drop policy if exists "Anyone can read Perloy state" on public.perloy_state;
create policy "Anyone can read Perloy state"
  on public.perloy_state for select to anon
  using (id = 'global');

drop policy if exists "Anyone can create Perloy state" on public.perloy_state;
create policy "Anyone can create Perloy state"
  on public.perloy_state for insert to anon
  with check (id = 'global');

drop policy if exists "Anyone can update Perloy state" on public.perloy_state;
create policy "Anyone can update Perloy state"
  on public.perloy_state for update to anon
  using (id = 'global')
  with check (id = 'global');

do $$
begin
  alter publication supabase_realtime add table public.perloy_state;
exception
  when duplicate_object then null;
end;
$$;
