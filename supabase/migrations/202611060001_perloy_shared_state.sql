-- Move the existing per-account payload to one shared Perloy row.
-- Keep public.perloy_state intact as a recovery copy.
create table if not exists public.perloy_shared_state (
  id text primary key default 'default' check (id = 'default'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.perloy_shared_state enable row level security;

revoke all on public.perloy_shared_state from public, anon, authenticated;
grant usage on schema public to anon;
grant select, insert, update on public.perloy_shared_state to anon;

drop policy if exists "Anyone can read Perloy shared state" on public.perloy_shared_state;
create policy "Anyone can read Perloy shared state"
  on public.perloy_shared_state for select to anon
  using (true);

drop policy if exists "Anyone can create Perloy shared state" on public.perloy_shared_state;
create policy "Anyone can create Perloy shared state"
  on public.perloy_shared_state for insert to anon
  with check (true);

drop policy if exists "Anyone can update Perloy shared state" on public.perloy_shared_state;
create policy "Anyone can update Perloy shared state"
  on public.perloy_shared_state for update to anon
  using (true)
  with check (true);

do $$
begin
  if to_regclass('public.perloy_state') is not null then
    execute $copy$
      insert into public.perloy_shared_state (id, payload, updated_at)
      select 'default', payload, updated_at
      from public.perloy_state
      where jsonb_typeof(payload->'schemaVersion') = 'number'
        and payload->'schemaVersion' in ('1'::jsonb, '2'::jsonb, '3'::jsonb, '4'::jsonb, '5'::jsonb)
        and jsonb_typeof(payload->'tblProduct') = 'array'
        and jsonb_typeof(payload->'tblSupplier') = 'array'
        and jsonb_typeof(payload->'tblStock') = 'array'
        and jsonb_typeof(payload->'tblSales') = 'array'
        and jsonb_typeof(payload->'tblSupply') = 'array'
      order by updated_at desc
      limit 1
      on conflict (id) do nothing
    $copy$;
  end if;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.perloy_shared_state;
exception
  when duplicate_object then null;
end;
$$;
