# Kash — Product requirements

## Purpose

Kash gives one family a shared, understandable view of money moving between Dad abroad and the household in Pakistan. It is intentionally narrower than a general finance app.

## Roles

- **Dad / parent abroad:** salary and expenses in South Africa, savings, original-currency balances, money sent to Pakistan, and the family’s monthly report.
- **Family manager:** received money, household bills, groceries, fuel, education, medical spending, sibling pocket money, loans and family notes.

Both roles authenticate with Clerk and join one household using a private invite code.

## Product areas

1. **Home:** available money, income, spending, household plan remaining, loans due, large trend chart and family accounts.
2. **Dad’s money:** ZAR/USD/USDT income and South Africa spending, plus cross-currency transfers preserving sent amount, received amount and fee.
3. **Household:** category plans for groceries, bills, fuel, education, medical, rent and family support; show allocated, spent and remaining.
4. **Pocket money:** family-member profiles, monthly planned/paid allowance and explanatory notes.
5. **Loans:** borrower, principal, repayment total, due date, remaining balance and notes.
6. **Savings:** goals, current progress, target date and dedicated savings accounts.
7. **Reports:** monthly/yearly income, spending, cash flow, category chart, loan balance and detailed transaction notes; CSV and print/PDF output.
8. **Records & PDFs:** editable transaction timeline and reviewed digital-text PDF statement import.

## Currency behavior

PKR, ZAR, USD and USDT are supported. Values remain in their original currencies. A remittance records both sides explicitly instead of applying a hidden exchange rate.

## Data and security

- All API reads and writes require a verified Clerk session.
- Family membership is resolved server-side; clients cannot select another household ID.
- Shared workspaces use compare-and-swap revisions and database functions restricted to the runtime role.
- Device edits are durable in IndexedDB and synchronize automatically when online.
- PDFs are read in the browser; original files are not uploaded or retained.
- New users start empty. No demo financial records are loaded.

## Removed from the product

Investment portfolios, stock analytics, subscriptions, generic AI chat and unrelated personal-finance dashboards are not part of Kash.
