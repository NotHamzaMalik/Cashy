# Kash — Build status

## Complete

- Renamed and redesigned as Kash with large responsive cards and readable charts.
- Focused navigation: Home, Dad’s money, Household, Pocket money, Loans, Savings, Reports, Records & PDFs.
- PKR, ZAR, USD and USDT support.
- Income, expenses, accounts, remittances, household plans, allowances, loans, savings and detailed notes.
- CSV reports, printable/PDF reports and digital-text PDF statement import.
- Clerk authentication with same-origin `/sign-in` and `/sign-up` completion redirects.
- Secure device-first offline editing and automatic cloud synchronization.
- Household create/join API and restricted Supabase migration with private invite codes.
- Desktop and 390px mobile visual QA.
- Unit, access and production-build checks.

## Deployment dependency

The supplied Supabase project must be active and reachable before `npm run db:setup` can install `202610300001_households.sql`. Until then, Kash safely falls back to the device workspace and reports cloud sync as unavailable; family invitation sharing cannot activate.
