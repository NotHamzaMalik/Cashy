# Cashy — Build status

13 October 2026

## Delivered

M0 is complete. M1 is implemented and verified as a local, synthetic-data preview. The original Cashiro checkout is unchanged.

| Area | Current implementation | Remaining for launch |
| --- | --- | --- |
| UI | Cashiro-inspired warm dark/light theme, rounded cards, responsive desktop sidebar/mobile floating navigation, entry/chart/progress motion and reduced-motion support | Full accessibility audit, broader browser/device checks, final animation polish |
| Ledger | Add/edit/delete personal demo transactions, validated minor units, search/type filters, same-currency transfers, local persistence | Server persistence, audit/versioning, reconciliation, cross-currency transfers, archive/undo |
| Accounts | Cash/bank/savings accounts, opening balances, computed balances and account details | Liabilities, onboarding and live ownership checks |
| Currency | PKR default, USD accounts and transactions, strictly separated totals | Explicit FX rate storage and converted reporting |
| Budgets | Create category budgets, current-month progress and overrun status | Edit/archive, custom categories/subcategories, history and scheduled alerts |
| Goals | Create goals and manually update saved progress | Linked contributions, allocation validation, history |
| Investments | Manual cost basis/value, gain/loss and valuation dates | Purchases/sales/income ledger, units, realized returns and full net worth |
| Reports | Daily/monthly/yearly filters, personal/family scope, line/bar charts, category breakdown, CSV export and print | Custom range, heatmap, liabilities and complete printable report layout |
| Family | Explicit parent/child simulation, submission, changes requested, approval and unique-ID aggregation | Real invitations, roles, managed minors, scoped auto-sharing, immutable report snapshots, reviewer notes, revocation and audit |
| PDF | Actual PDF.js browser extraction, signature/size/page/time checks, editable candidates, duplicate skipping, commit and immediate undo; original not uploaded | Verified bank templates, encrypted-PDF workflow, persisted import batches, private retention option and cloud atomic import |
| Subscriptions | Create monthly/yearly schedules, record payment, advance due date with month-end clamping | Edit/archive, detection, jobs, notification preferences and push opt-in |
| Assistant | Deterministic period/category insights, explicitly labeled as calculated preview | External AI, provider consent, authorized server context and rate limits |
| Data control | Validated JSON backup/restore with replacement confirmation, CSV formula escaping, confirmed demo reset | Authenticated export/deletion and durable backup/restore drills |
| PWA | Manifest, SVG icon and offline fallback; service worker excludes private responses from cache | PNG/maskable icons, install testing on Android/iOS, offline/private-state checks |
| Authentication/cloud | Packages installed and planned environment variables documented | Clerk routes/allowlist, Supabase schema/RLS, live adapters and integration tests — adding keys alone does not enable live mode |

## Verification completed

- `npm.cmd run test`: **9 passed**. Covers money validation, currency isolation, transfer balances, family deduplication, date boundaries, safe CSV, import/reimport and backup validation.
- `npm.cmd run typecheck`: **passed**.
- `npm.cmd run build`: **passed**, Next.js 16.4.0 production build.
- `npm.cmd run test:e2e`: **7 passed**, installed Chrome, isolated headless profiles. Covers transaction entry/search/reload persistence, family monthly/yearly consolidation, import duplicate handling, actual PDF file extraction, dark/light mobile display, planning forms and narrow/tablet layouts.
- Screens inspected: desktop dashboard, mobile dashboard, light mobile PDF import. Width checks: 360, 390, 768 and 1440 px. No horizontal overflow in checked views.
- A dropdown accessible-name issue and a React SVG title hydration mismatch were found and fixed during browser testing. Final transaction workflow asserts no uncaught browser errors.
- Dependency install audit reported **0 vulnerabilities** for the installed dependency set at setup time. This is not a complete production security audit.

Preview images: [Desktop](previews/desktop.png), [Mobile](previews/mobile.png), [Family](previews/family.png), [PDF review](previews/pdf-import.png), [Light mobile](previews/mobile-light.png).

## Current limitations

This is not live authentication, encrypted financial storage or cloud sync. Use synthetic data only. Shared family roles are UI simulation; they are not a security boundary. No real invitations or notifications are sent. The assistant sends nothing to an AI provider. No bank-template compatibility, production readiness or full PWA installation coverage is claimed.

Service configuration is not available in this workspace. Remaining application work is tracked in milestones M2–M7; those milestones include code and tests as well as credentials. A production deployment has not been attempted. Local test servers are stopped after verification.

## Next implementation milestone

M2: implement Clerk authentication, server-side invite-only access, Supabase schema/migrations and RLS; replace the demo adapter with authenticated cloud operations, beginning with accounts and the ledger. Continue M3–M7 without dropping any agreed launch feature.

Required service inputs when connecting: Clerk application keys and allowed owner subject, Supabase project URL/publishable key with third-party auth configured, deployment secrets and later an AI provider key. Supply secrets through `.env.local` or a deployment secret manager, never committed files. Sanitized bank statements are needed before asserting bank-specific PDF support.

## Run locally

```powershell
cd "C:\Users\Hamza Malik\Desktop\Cash\cashy"
npm.cmd run dev
```

Open http://127.0.0.1:3000. For browser tests, run the production server in a separate terminal (`npm.cmd run build`, then `npm.cmd run start`) and run `npm.cmd run test:e2e`.
