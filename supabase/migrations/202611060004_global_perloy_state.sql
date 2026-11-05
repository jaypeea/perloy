-- Upgrade existing Perloy installations to one account-free row.
-- Safe when perloy_state already uses id, or still uses the old user_id schema.
do $$
begin
  if to_regclass('public.perloy_state') is not null and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='perloy_state' and column_name='user_id'
  ) then
    alter table public.perloy_state rename to perloy_state_legacy;
  end if;
end;
$$;

create table if not exists public.perloy_state (
  id text primary key default 'global',
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  updated_at timestamptz not null default now(),
  constraint perloy_state_global_id_check check (id='global')
);

alter table public.perloy_state enable row level security;
revoke all on public.perloy_state from public, anon, authenticated;
grant usage on schema public to anon;
grant select, insert, update on public.perloy_state to anon;
drop policy if exists "Anyone can read Perloy state" on public.perloy_state;
create policy "Anyone can read Perloy state" on public.perloy_state for select to anon using (id='global');
drop policy if exists "Anyone can create Perloy state" on public.perloy_state;
create policy "Anyone can create Perloy state" on public.perloy_state for insert to anon with check (id='global');
drop policy if exists "Anyone can update Perloy state" on public.perloy_state;
create policy "Anyone can update Perloy state" on public.perloy_state for update to anon using (id='global') with check (id='global');

do $$
begin
  if to_regclass('public.perloy_shared_state') is not null then
    insert into public.perloy_state (id,payload,updated_at)
    select 'global',payload,updated_at from public.perloy_shared_state
    where id in ('global','default') order by updated_at desc limit 1
    on conflict(id) do update set payload=excluded.payload,updated_at=excluded.updated_at
    where excluded.updated_at > public.perloy_state.updated_at;
  end if;
  if to_regclass('public.perloy_state_legacy') is not null then
    execute 'revoke all on public.perloy_state_legacy from public, anon, authenticated';
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='perloy_state') then
    alter publication supabase_realtime add table public.perloy_state;
  end if;
end;
$$;
