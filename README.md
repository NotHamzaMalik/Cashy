# Cashy

Personal and family finance for the web and mobile, using Next.js. The current application is an explicitly labeled local demo with synthetic data. It is not a production financial service.

## Run

Requires Node.js 20.9+ (this workspace uses Node 24). On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm install
node scripts/copy-pdf-worker.mjs
npm run dev
```

Open http://127.0.0.1:3000. Changes to demo data persist in this browser only. Use Settings to export/restore/reset the demo. Sample records use October 2026; change the report anchor date for other periods. PKR and USD are separate views, not converted totals.

```sh
npm run test
npm run typecheck
npm run build
npm start
```

With the production server running in another terminal, run `npm run test:e2e` to verify workflows using an isolated headless instance of the installed Google Chrome. Test screenshots are written to `test-results/`; reviewed preview images are retained under `docs/previews/`.

## Documents

- [Complete PRD](docs/PRD.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Cashiro design audit](docs/CASHIRO_DESIGN_AUDIT.md)
- [Implementation status](docs/STATUS.md)

## What works in the demo

Responsive warm dark/light interface, transaction add/edit/delete, account balances, same-currency transfers, daily/monthly/yearly filters, PKR/USD separation, budgets, tracked savings progress, manual investment values, subscription payments, CSV export, backup/restore, parent/child report simulation, deterministic spending insights, and browser-local digital-PDF extraction with editable import review and duplicate skipping.

The generic statement parser expects one row per line with DD/MM/YYYY or YYYY-MM-DD, description, amount with two decimals, and optional CR/DR. Scanned/password-protected PDFs and unsupported tables produce an error or manual review fallback. No bank-specific compatibility is claimed. Original PDFs are neither uploaded nor retained. The PDF worker must be copied after installation.

## Still required for live use

Clerk authentication and invite enforcement, Supabase schema/RLS/migrations and cross-user integration tests, durable sync, live family memberships and report audit, bank-template fixtures, linked goal/investment accounting, full net worth/liabilities, external AI provider consent and server routes, reminders/jobs, production PWA/security/accessibility checks and deployment. See the milestone plan; these remain launch requirements.

`.env.example` lists planned configuration without secrets. Do not enter real financial data into the demo. Browser storage is not encrypted financial storage. No demo identity is permitted as a fallback in future authenticated routes.

## Design provenance

Cashiro reference: https://github.com/ritesh-kanwar/Cashiro at `40a387fd0bb87bdc51c80124e0fbf084e8a2b2ce`, AGPL-3.0. Cashy's web components are newly implemented from the observed visual language; the reference Android checkout is untouched. Asset/license and corresponding-source review is a release gate. Lucide icons are from the `lucide-react` package. No Cashiro bank logos, avatars or illustration files are copied.
