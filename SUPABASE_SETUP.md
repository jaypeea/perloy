# Perloy shared inventory sync

The website and Windows/macOS desktop apps share public.perloy_state with id=global automatically. No account, sign-in, or manual sync action is required. Any client can create the initial row from its saved data; all others load the shared copy and subscribe to updates.

## Important access model

The app includes a Supabase publishable key. The shared row has anonymous read, insert, and update policies, so anyone with the deployed app or project URL can read and change all inventory data, including sales and customer or supplier details. This is a public shared database with no per-user access control. Do not store data here that must remain private.

## Database migration

For an existing project, run supabase/migrations/202611060004_global_perloy_state.sql in the SQL Editor after the earlier Perloy migrations. It moves the current id=global payload into public.perloy_state, or migrates the latest valid legacy payload if needed. It keeps the old tables as locked recovery copies, enables anonymous read/write access to the single global row, and adds that table to Realtime. Fresh setups should apply the migrations in timestamp order.

If there is no existing cloud payload, the first client seeds the row from its current saved data. Other clients load that row automatically. Any device-local records replaced by the shared row remain in a local backup included with Export data.

## App configuration

Set these values for web deployments, desktop builds, and local development:

- VITE_SUPABASE_URL: the Supabase project URL
- VITE_SUPABASE_ANON_KEY: the Supabase publishable key (sb_publishable_…) or legacy anon key
- VITE_WINDOWS_INSTALLER_URL (optional): direct HTTPS URL to the Windows .exe installer
- VITE_MAC_INSTALLER_URL (optional): direct HTTPS URL to the macOS .dmg installer

For local development, put them in .env.local. In Vercel, set them for Production, Preview, and Development, then redeploy. In GitHub, set the Supabase values and optional installer URLs under Settings → Secrets and variables → Actions → Variables for desktop release builds. Never use a secret or service-role key in these client applications.

When an installer URL is not configured, the desktop menu opens the Perloy GitHub Releases page rather than a guessed asset URL.

## Sync behavior

Changes save to local storage first and then upsert the global JSON payload. Supabase Realtime pushes updates to running clients, and a client refreshes the row when it returns to the foreground. Simultaneous edits use last-write-wins behavior; a later whole-state update can replace another device's earlier update.
