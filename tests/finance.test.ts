import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, summarize, balance, visibleTransactions, csvExport, validateTransaction, nextDue, validDate, inPeriod } from '../src/lib/finance';
import { initialStore } from '../src/lib/seed';
import { prepareImport, parseStatement } from '../src/lib/import';

test('money uses exact minor units and rejects unsafe input', () => {
  assert.equal(parseMoney('1,234.56'), 123456);
  assert.equal(parseMoney('0.29'), 29);
  for (const value of ['-1', '0', 'NaN', '1.234', '1e5', '1,,2', '9007199254740992']) assert.throws(() => parseMoney(value));
});
test('totals isolate currencies and exclude transfers', () => {
  const { transactions } = initialStore();
  const rows = visibleTransactions(transactions, 'personal');
  const before = summarize(rows, 'PKR');
  const transfer = { ...rows[0], type: 'transfer' as const, amount: 50000, toAccountId: 'cash' };
  assert.deepEqual(summarize([...rows, transfer], 'PKR'), before);
  assert.equal(summarize(rows, 'USD').expenses, 1000);
  assert.equal(before.income, 23000000);
});
test('transfer decreases source and increases destination without changing net assets', () => {
  const { accounts } = initialStore();
  const t = { ...initialStore().transactions[0], amount: 50000, type: 'transfer' as const, toAccountId: 'cash' };
  validateTransaction(t, accounts);
  assert.equal(balance(accounts[0], [t]), accounts[0].opening - 50000);
  assert.equal(balance(accounts[1], [t]), accounts[1].opening + 50000);
  assert.throws(() => validateTransaction({ ...t, toAccountId: 'usd' }, accounts));
  assert.throws(() => validateTransaction({ ...t, owner: 'child' }, accounts));
});
test('family includes only approved child expenses, deduplicated by canonical ID', () => {
  const { transactions } = initialStore();
  const child = transactions.find(t => t.owner === 'child')!;
  assert.equal(visibleTransactions([child], 'family').length, 0);
  const approved = { ...child, reportStatus: 'approved' as const };
  assert.equal(visibleTransactions([approved, approved], 'family').length, 1);
  assert.equal(visibleTransactions([approved], 'personal').length, 0);
});
test('date boundaries reject impossible dates and clamp recurring month ends', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(nextDue('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(nextDue('2024-02-29', 'yearly'), '2025-02-28');
  assert.equal(nextDue('2026-12-31', 'monthly'), '2027-01-31');
  assert.equal(inPeriod('2025-10-13', 'month', '2026-10-13'), false);
});
test('CSV escapes quotes, commas and spreadsheet formulas', () => {
  const t = { ...initialStore().transactions[0], merchant: '=HYPERLINK("evil")', note: 'a,b\nc' };
  const csv = csvExport([t]);
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"a,b\nc"'));
});
test('PDF fallback proposes complete rows and import rejects duplicates atomically', () => {
  const rows = parseStatement('13/10/2026 Coffee 650.00 DR\n2026-10-01 Salary 185,000.00 CR\nTotal 185000\n30/02/2026 Impossible 12.00 DR');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].type, 'income');
  const imported = prepareImport([...rows, rows[0]], [], 'bank', 'PKR', 'me');
  assert.equal(imported.length, 2);
  assert.equal(prepareImport(rows, imported, 'bank', 'PKR', 'me').length, 0);
  assert.throws(() => prepareImport([{ ...rows[0], amount: '-99' }], [], 'bank', 'PKR', 'me'));
});
