# Personal workspaces

Signed-in users now start with an empty store. Production no longer loads the seed fixture or the legacy `cashy-demo-v1` browser key. Storage is namespaced by Clerk user ID; changing users remounts the workspace, discarding the prior user's in-memory state. Signed-out visitors see a sign-in screen.

Records remain in browser local storage, not Supabase. This separates account workspaces within the UI but is not server-enforced cloud isolation or protection against someone inspecting a shared browser profile. Export backups until cloud persistence is implemented. Old demo storage is left untouched and is never automatically migrated.

No fictional child profile is displayed in the family module. Live invitations and shared reports require the future cloud account integration. New entries use the current Karachi calendar date. Adding a transaction in a new workspace prompts account creation first. Clearing a workspace returns it to empty rather than restoring seed records.

Validation: production build passed; 11 finance/storage tests passed, including empty initialization and distinct account keys. Existing browser workflow tests use the old anonymous seeded demo and need authenticated fixtures before they can run against this version. Real account-switching and cross-device sync have not been end-to-end tested.
