# Connect Perloy across devices

Perloy stores the full data dictionary as one JSONB row per signed-in account. Supabase Auth and row-level security isolate each account. Sign in with the same email and password in the web app and every installed app to share records.

## Supabase project

1. Create a Supabase project.
2. In **SQL Editor**, run the Perloy state migration at <code>supabase/migrations/202611050001_perloy_state.sql</code>.
3. In **Project Settings → API**, copy the project URL and the public anon or publishable key. Do not use the service-role key in this client app.
4. Set the project’s Site URL to the deployed Perloy web URL and allow that URL plus <code>http://localhost:5173/**</code> in Auth redirect URLs. Email confirmation can remain enabled; confirm the first account before signing in on the other apps.

## Configure and seed

1. Copy <code>.env.example</code> to <code>.env.local</code> and fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
2. Add the same two variables to the Vercel project’s Production, Preview, and Development environments, then redeploy.
3. Add them as GitHub Actions repository variables with the same names so desktop and Android release builds include the shared backend configuration.
4. Rebuild native apps with the same environment variables. For local builds, <code>.env.local</code> is read by Vite.
5. Open the web version that already contains the current records, choose **Cloud sync**, and sign in or create the account. If the account has no cloud row yet, that web version seeds it. Then sign in with the same account in the installed apps.

The first cloud copy replaces each app’s active local view so all versions match. If an app had different local records, Perloy saves those records in a local backup first; **Download saved local copy** exports that backup. A native app waits for the web version to seed an empty account rather than uploading its local copy over the web data.

Changes save locally first, then sync to Supabase. Other signed-in apps receive database updates in real time and refresh from the cloud when they return to the foreground. Without the two environment variables, the app remains local-only and shows setup status in the Cloud sync dialog.
