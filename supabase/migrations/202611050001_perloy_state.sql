create table if not exists public.perloy_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.perloy_state enable row level security;

revoke all on public.perloy_state from anon, authenticated;
grant select, insert, update on public.perloy_state to authenticated;

drop policy if exists "Users read their Perloy state" on public.perloy_state;
create policy "Users read their Perloy state"
  on public.perloy_state for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their Perloy state" on public.perloy_state;
create policy "Users create their Perloy state"
  on public.perloy_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their Perloy state" on public.perloy_state;
create policy "Users update their Perloy state"
  on public.perloy_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
begin
  alter publication supabase_realtime add table public.perloy_state;
exception
  when duplicate_object then null;
end;
$$;
