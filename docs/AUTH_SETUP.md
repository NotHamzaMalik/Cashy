# Clerk development setup

Cashy is linked to the user's approved Clerk application `app_3L3dxL5dL7OlYxYZGthXPUK7wZP` (My Application), development instance.

Implemented: ClerkProvider inside body, Next.js proxy including the Clerk proxy matcher, sign-in/sign-up routes, and visible sign-in/user controls. Keys are in ignored `.env.local`, never in source control. Clerk doctor confirms the app is reachable and development keys are present. Production build passes.

This adds authentication infrastructure only. The financial workspace still contains browser-local demo data. Routes are public by default; invite-only authorization, account-specific cloud data, and server-enforced family permissions remain required before real financial use. Production Clerk configuration is not set up. End-to-end user sign-in requires the owner to complete their sign-in flow.

Supabase public configuration has been supplied, but database migrations and live finance storage are not implemented yet. Historical STATUS.md describes the earlier preview milestone; this note records the subsequent authentication integration.
