-- Only clean up the old account-scoped table shape. The global perloy_state row has no user_id column.
do $$
begin
  if to_regclass('public.perloy_state') is null or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perloy_state' and column_name = 'user_id'
  ) then
    return;
  end if;

  execute 'drop policy if exists "Users read their Perloy state" on public.perloy_state';
  execute 'drop policy if exists "Users create their Perloy state" on public.perloy_state';
  execute 'drop policy if exists "Users update their Perloy state" on public.perloy_state';
  execute 'revoke all on public.perloy_state from public, anon, authenticated';
end;
$$;
