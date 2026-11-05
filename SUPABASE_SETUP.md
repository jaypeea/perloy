# Perloy shared inventory sync

Perloy web, Android, iOS, Windows, and macOS clients use the same Supabase row. No account or sign-in is required. The browser and installed apps keep local copies for offline use; the web client seeds the shared row when it does not exist, and native clients wait for that initial web copy.

## Important access model

The app uses a Supabase publishable key in client builds. The shared row has anonymous read, insert, and update policies, so anyone with the deployed app or project URL can read and change the inventory. This includes sales and customer or supplier details. Do not store data here that must remain private. There is no per-user isolation or access control.

## Database migration

For the existing Perloy Supabase project, run supabase/migrations/202611060001_perloy_shared_state.sql in the SQL Editor. It creates public.perloy_shared_state with the fixed default row key, copies the most recently updated payload from the old public.perloy_state table when one exists, enables anonymous access and Realtime, and leaves the old table intact as a recovery copy.

If the old per-user table had no rows, the first web app that connects seeds the shared row from its current browser data. Native apps do not seed an empty database, so a blank native install cannot overwrite the web inventory.

## App configuration

Set these values for the web deployment, native builds, and local development:

- VITE_SUPABASE_URL: the project URL, such as https://your-project.supabase.co
- VITE_SUPABASE_ANON_KEY: the Supabase publishable key (sb_publishable_…) or legacy anon key

For local development, put them in .env.local. In Vercel, set them for Production, Preview, and Development, then redeploy. In GitHub, set them under Settings → Secrets and variables → Actions → Variables for native release builds. Never use a secret or service-role key in these client applications.

## Sync behavior

Edits save to local storage first and upsert the shared JSON payload. Supabase Realtime pushes row updates to other running clients, and a client refreshes the row when it returns to the foreground. The newest write replaces the row payload, so simultaneous edits can overwrite one another. Local copies replaced by an existing shared row are saved as downloadable backups from Cloud sync.
