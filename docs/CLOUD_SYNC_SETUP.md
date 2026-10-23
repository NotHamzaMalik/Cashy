# Cloud sync setup and verification

Implemented locally on 23 October 2026. **Not pushed or deployed.** The Supabase schema has been installed in project `zpyomhqfsmgxmzoftyjp` and tested with temporary records. Test users and test records are removed by the integration runner.

## Configuration

The ignored `.env.local` contains `DATABASE_URL` for a generated, restricted `cashy_runtime` login. It uses the verified session pooler at `aws-0-ap-southeast-1.pooler.supabase.com:5432`, with username `cashy_runtime.zpyomhqfsmgxmzoftyjp`. The admin connection is used only by setup and integration cleanup. Never expose either URL through a `NEXT_PUBLIC_` variable or commit them.

Before deployment, add this restricted `DATABASE_URL` to the appropriate Vercel environment alongside the existing Clerk keys. Supabase public API keys are not database passwords and are not sufficient for this server connection. No extra Clerk/Supabase JWT integration is required: the API verifies Clerk, sets the verified user ID inside a database transaction, and the restricted role's RLS policy enforces ownership. The private `cashy` schema is unavailable through the public Data API.

TLS checks both the certificate chain and hostname. `certs/supabase-ca.crt` is a public CA certificate, included in the deployment trace. Source: Supabase's certificate distribution at `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.

## Behavior

- IndexedDB saves before the form closes. Failed saves keep the editor open.
- Sync runs after edits, on reconnect, on focus and every 30 seconds. Expired sessions pause sync without deleting device changes.
- Revision checks and three-way merging preserve independent edits from other devices. Conflicting records require a full-version choice; both copies are archived locally first and can be exported under Settings.
- Device changes survive a refresh. The public app shell and static assets are cached after an online visit. APIs, statements and authentication responses are never put in the service-worker cache.
- Reopening offline offers explicit access to the last device workspace; reconnecting reloads authentication before cloud sync. Signing out clears the remembered offline identity. Device data is not a security boundary against someone inspecting the browser profile.
- Existing per-user browser data migrates automatically. The legacy anonymous demo key is never read or uploaded. New users remain empty.
- PDF files stay in the browser; only confirmed transaction rows enter the synced workspace. Family invitations and live AI remain separate unfinished features.
- A workspace is limited to 3 MB per cloud write; larger device data remains available for export. Clearing a workspace syncs deletions, so export a backup first.

## Checks completed

- Production build on Next.js 16.4.3 passed; package audit reported zero vulnerabilities after the compatible security patch.
- 23 finance, storage and sync unit tests passed.
- Real Supabase integration passed: conditional revisions, empty/new-user reads, cross-user SELECT/UPDATE/INSERT rejection under RLS.
- Real Clerk-authenticated API passed: read/write, user isolation, stale revisions, origin checks and invalid payload rejection.
- Real Chrome workflow passed: offline transaction entry, offline reload, automatic reconnect/upload, fresh-device retrieval and separate-user isolation.

Commands: `npm run db:setup`, `npm run test`, `npm run test:database`, `npm run test:e2e`, `npm run test:sync:e2e`. The authenticated integration runner expects the production build running at `http://localhost:3100` (override with `CASHY_TEST_ORIGIN`). It uses the Clerk CLI with temporary development users. Historical anonymous-demo workflow tests are retained under `tests/legacy` for reference.

Unverified until deployment: Vercel's actual environment configuration and production-host end-to-end sync. No Git push has been performed for this change.
