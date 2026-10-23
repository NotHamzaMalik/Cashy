# Supabase persistence and offline sync

## Scope

All personal finance collections (accounts, transactions, budgets, goals, holdings and subscriptions) belong to the signed-in Clerk user. New users start empty. The existing anonymous demo fixture is never migrated. Existing personal browser records migrate into the device cache and sync only for their matching Clerk account. No Git push or deployment is included in this task.

## Architecture

- A Next.js API verifies Clerk on every read/write. User IDs never come from request bodies. Only the server holds the PostgreSQL connection secret.
- Supabase stores one validated, versioned finance document per user. Compare-and-swap writes prevent lost updates. A restricted database role and row-level security provide an additional ownership boundary.
- IndexedDB stores the last acknowledged cloud snapshot, its revision, and the current local document in one transaction. Edits persist locally before the UI reports success.
- A sync controller pulls, performs a three-way merge, validates references, and conditionally writes. It retries transient failures, runs on reconnect/focus and checks for remote changes periodically. Pending work survives refresh.
- Different records merge automatically. Concurrent changes to the same record, including deletion versus modification, pause for explicit resolution. Neither copy is discarded before resolution is saved. Invalid merged references also become a conflict.
- Web Locks serialize tabs; BroadcastChannel refreshes other tabs after local writes/sync. The server revision remains authoritative across devices.

## Offline behavior

Editing an already opened workspace works offline. A cached public application shell supports reopening after the first successful online visit. Reopening a previously used device workspace offline requires an explicit device-access choice and is not authentication for cloud requests. Signing out clears the remembered offline identity. Offline changes sync only after the matching user authenticates again.

## Delivery and verification

1. Inspect connectivity, add migration and least-privilege database setup.
2. Implement and test authenticated reads/writes, validation and revision conflicts.
3. Implement and test durable local edits, retry/reconnect, concurrent edits and conflict recovery.
4. Integrate status and resolution UI; retain PDF import and all personal finance flows.
5. Verify build, unit tests, database RLS and browser offline/reconnect behavior. Document any unavailable external configuration precisely.

## Boundaries

Family invitations and live AI remain separate features. IndexedDB is device storage, not protection against someone with access to the browser profile. Unsynced data can be lost if that profile is cleared; export remains available. Cloud credentials must be configured in Vercel before deployment, without committing secrets.
