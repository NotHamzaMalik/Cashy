# Kash

Kash is a private family-money web app for families managing income and spending across countries.

## Main flow

- Dad records salary and spending in ZAR, USD or USDT.
- Cross-border transfers preserve both the amount sent and the PKR amount received.
- The family manager tracks bills, groceries, fuel, education, medical spending and notes.
- Monthly pocket money is planned for siblings and children.
- Personal loans show the original amount, repayments, due date and remaining balance.
- Savings goals and monthly family reports keep progress understandable.
- Digital-text PDF statements can be reviewed and imported in the browser.

## Stack

- Next.js 16 and React 19
- Clerk authentication with same-origin sign-in and sign-up routes
- Supabase Postgres behind authenticated server routes
- IndexedDB device storage with automatic offline-to-cloud synchronization

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and provide matching Clerk keys plus the restricted `DATABASE_URL`. Run `npm run db:setup` with an admin migration connection before using household invitations.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Security

Financial records are authenticated server-side, validated before storage, isolated by database policies and cached locally for offline editing. Secrets belong only in local or deployment environment variables—never in Git.

Cashiro interface reference and AGPL attribution remain documented in [NOTICE.md](NOTICE.md). Kash’s components are independently implemented for this web app.
