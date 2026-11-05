-- The global row is now the only app-facing state table.
-- Keep legacy per-user payloads for recovery, but disable all account-scoped access.
do $$
begin
  if to_regclass('public.perloy_state') is null then
    return;
  end if;

  execute 'drop policy if exists "Users read their Perloy state" on public.perloy_state';
  execute 'drop policy if exists "Users create their Perloy state" on public.perloy_state';
  execute 'drop policy if exists "Users update their Perloy state" on public.perloy_state';
  execute 'revoke all on public.perloy_state from public, anon, authenticated';
end;
$$;
