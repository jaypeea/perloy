# Perloy shared inventory sync

Perloy web, Android, iOS, Windows, and macOS clients use one Supabase row automatically. No account, sign-in, or manual sync action is required. The web client seeds the shared row when it does not exist; native apps wait for the web copy rather than seeding an empty database.

## Important access model

The app includes a Supabase publishable key. The shared row has anonymous read, insert, and update policies, so anyone with the deployed app or project URL can read and change all inventory data, including sales and customer or supplier details. This is a public shared database with no per-user access control. Do not store data here that must remain private.

## Database migration

For the existing Supabase project, run supabase/migrations/202611060002_perloy_global_row.sql in the SQL Editor. It migrates the existing shared row from id=default to id=global, or copies the latest valid payload from the old per-user table if the shared row has not been created yet. It preserves the old per-user table as a recovery copy, configures anonymous read/write access, and enables Realtime.

If there is no existing cloud payload, the first web client seeds the row from its current browser data. Other web and native clients load that row automatically. Any device-local records replaced by the shared row remain in a local backup included with Export data.

## App configuration

Set these values for web deployments, native builds, and local development:

- VITE_SUPABASE_URL: the project URL, such as https://your-project.supabase.co
- VITE_SUPABASE_ANON_KEY: the Supabase publishable key (sb_publishable_…) or legacy anon key

For local development, put them in .env.local. In Vercel, set them for Production, Preview, and Development, then redeploy. In GitHub, set them under Settings → Secrets and variables → Actions → Variables for native release builds. Never use a secret or service-role key in these client applications.

## Sync behavior

Changes save to local storage first and then upsert the global JSON payload. Supabase Realtime pushes updates to running clients, and a client refreshes the row when it returns to the foreground. Simultaneous edits use last-write-wins behavior; a later whole-state update can replace another device's earlier update.
