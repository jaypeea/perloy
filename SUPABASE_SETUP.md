# Perloy shared inventory sync

The website and Windows/macOS desktop apps share one Supabase row automatically. No account, sign-in, or manual sync action is required. Any client can create the initial row from its saved data; all others load the shared copy and subscribe to updates.

## Important access model

The app includes a Supabase publishable key. The shared row has anonymous read, insert, and update policies, so anyone with the deployed app or project URL can read and change all inventory data, including sales and customer or supplier details. This is a public shared database with no per-user access control. Do not store data here that must remain private.

## Database migration

For the existing Supabase project, run supabase/migrations/202611060002_perloy_global_row.sql, then 202611060003_disable_legacy_user_sync.sql in the SQL Editor. The first migrates the existing shared row from id=default to id=global, or copies the latest valid payload from the old per-user table if the shared row has not been created yet. It preserves that table as a recovery copy, configures anonymous read/write access to the global row, and enables Realtime. The second removes account-based policies from the unused recovery table without deleting its data.

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
