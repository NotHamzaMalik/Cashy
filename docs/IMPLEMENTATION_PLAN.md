# Cashy — Implementation plan

13 October 2026. This plan delivers the complete PRD through incremental, testable milestones. No agreed launch module is removed.

## M0 — Discovery and specification

- [x] Inspect existing Cashiro checkout, screenshots, theme, navigation and animated components.
- [x] Confirm Next.js/PWA, PKR/USD, personal/family use, cloud and Clerk.
- [x] Write PRD, family workflow, privacy defaults, domain invariants and acceptance criteria.
- [x] Record source provenance and license concerns.

## M1 — Executable interface and finance foundation (complete preview)

- Create isolated `cashy/` application; leave `Cashiro/` reference untouched.
- Establish Next.js/TypeScript, design tokens, original icon mark, warm dark/light themes, responsive sidebar/floating navigation, reusable cards/dialogs/forms and reduced-motion behavior.
- Build a clearly labeled synthetic local demo spanning overview, transactions, accounts, budgets, goals, investments, reports, family, subscriptions, PDF import, assistant and settings.
- Implement integer money, independent currency totals, period filtering, CSV escaping, transfer exclusion, report ID deduplication and domain tests.
- Add local demo persistence with explicit reset/export; no suggestion that this is cloud sync or real authentication.
- Typecheck, production build, domain tests and representative browser checks. Record actual results and remaining work in STATUS.md.

Exit: coherent desktop/mobile application runs locally; core interactions work with sample data; unsupported integrations are explicit.

Verification: production build and typecheck pass; 9 domain tests and 7 browser workflow tests pass. See STATUS.md for the exact implementation boundary and remaining launch work.

## M2 — Identity and durable private data (next)

- Configure Clerk Google/email sign-in, invite-only access, administrator MFA and session controls. Create server-only authenticated data boundary with no identity fallback.
- Create schema/migrations, Clerk third-party auth integration, RLS and narrowly scoped household procedures. Bootstrap owner allowlist through a controlled deployment procedure.
- Replace demo adapter with live queries/mutations for accounts/categories/transactions; optimistic concurrency, idempotency and ownership validation.
- Implement onboarding, profile editing, logout cleanup and account export/deletion.
- Test two unrelated users, two households, parent/child/sibling, expired sessions and forged IDs against the database/API.

Exit: no cross-user access; all money operations persist/reconcile across phone and desktop. Requires Clerk/Supabase configuration.

## M3 — Ledger completion and planning

- Complete transaction edit/archive/undo, account reconciliation, linked same/cross-currency transfers and liabilities.
- Persist budgets/history, category/subcategory management, goals/contributions and manual holdings/events/valuations.
- Build income and expense reports for day/month/year/custom ranges, chart alternatives, net worth and printable/export reports.
- Implement subscriptions, recurring suggestions, due reminders and mark-paid idempotency.
- Test rounding, zero/negative/oversized values, boundary dates/leap years/timezones, overspent budgets, investment proceeds and zero cost basis.

Exit: complete personal finance workflow with reconciled results.

## M4 — Reviewed PDF import

- Retain upload validation and editable preview UI; add bounded extraction worker and explicit parser registry.
- Add verified bank templates from sanitized fixtures and generic date/merchant/amount fallback.
- Confirm account/currency, confidence labels, duplicate review, row selection/edit, atomic commit, idempotency and import undo.
- Private retention opt-in, encryption/password handling, cancellation, timeout and orphan cleanup.
- Test supported, scanned, encrypted, malformed, huge and repeated documents. No template is called supported until a representative fixture passes.

Exit: PDFs produce reviewed transactions without silent loss or duplication. Requires target statement fixtures for bank-specific claims.

## M5 — Family sharing and consolidation

- Owner creates family; parent/adult invitations expire and are single use. Managed child profiles have visibly configured guardian access.
- Implement manual submission and optional account/category-scoped automatic sharing; adult privacy is default.
- Build month/year report preview, immutable versions, submission, reviewer queue, request changes and approval audit.
- Aggregate canonical IDs, retain approved snapshots, supersede changed reports and prevent monthly/yearly overlap duplicates.
- Link allowance/reimbursement transfers; membership removal and revocation affect future access immediately.
- Test unauthorized invites/review, self-elevation, cross-family IDs, changes after submission, duplicate approval and export isolation.

Exit: a parent can review and consolidate a child's expenses safely and exactly once.

## M6 — AI assistant

- Configure provider behind a server adapter, consent controls, per-user quota and usage/error redaction.
- Supply deterministic authorized financial summaries, supporting period/filters and data freshness. Keep originals/identifiers out by default.
- Enable questions, spending comparisons, budget suggestions, anomaly explanations and monthly review drafts.
- Require confirmation for any proposed budget edits; no autonomous ledger writes or fund movement.
- Test hallucinated totals, prompt injection inside merchant/PDF text, child privacy, provider failure, absent consent and quota exhaustion.

Exit: answers reconcile with displayed reports and respect the same permissions. Requires provider configuration.

## M7 — Production hardening and private launch

- Complete PWA icons/install UX/offline shell; never cache private data through the service worker.
- Accessibility and mobile browser checks, loading/error/offline states, reduced motion and performance measurement.
- Dependency/security checks, redacted monitoring, rate limits, audit retention, encrypted backups and restore/deletion drills.
- Review license/asset notices and covered-source availability. Configure private hosting, environment keys, redirects and HTTPS.
- Run full acceptance matrix, seed no real accounts with demo data, deploy invite-only version and verify deployment.

Exit: every PRD release gate passes. M1 preview is not a production launch.

## Test strategy

Domain tests: minor-unit parsing, totals, date periods, transfers, balances, FX boundaries, CSV safety, duplicate detection and family union. Integration tests: real database RLS with distinct identities, invitation/report state transitions and atomic/idempotent imports. End-to-end tests: onboarding → expense → budget → report; PDF → review → commit → reimport; child submission → parent approval → yearly report; sign-out and denied access. Visual review: mobile/desktop, dark/light, empty/loaded/over-budget/error, keyboard-only and reduced motion.

## Operational setup handoff

1. Create private Clerk and Supabase projects in selected region; configure Clerk as Supabase third-party provider.
2. Add secrets through local environment/deployment secret manager; never commit them. See `.env.example`.
3. Apply migrations and access tests, bootstrap owner, then validate live mode with empty data.
4. Configure AI provider and opt-in; add sanitized PDF fixtures.
5. Complete M7 gates before inviting family or importing real financial records.

