import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStore } from '../src/lib/storage';
import { initialStore } from '../src/lib/seed';
test('valid backups preserve finance data', () => { const original = initialStore(); assert.deepEqual(parseStore(JSON.parse(JSON.stringify(original))), original); });
test('restore rejects invalid versions, amounts, account ownership and duplicate IDs', () => {
  const data = initialStore();
  assert.throws(() => parseStore({ ...data, version: 2 }));
  assert.throws(() => parseStore({ ...data, transactions: [{ ...data.transactions[0], amount: -1 }] }));
  assert.throws(() => parseStore({ ...data, transactions: [{ ...data.transactions[0], accountId: 'child-cash' }] }));
  assert.throws(() => parseStore({ ...data, transactions: [data.transactions[0], data.transactions[0]] }));
});
test('loans support given and taken directions while older records default to given', () => {
  const data = initialStore();
  const base = { id: 'loan-1', borrower: 'Test person', principal: 10000, repaid: 2000, currency: 'PKR' as const, date: '2026-10-01', due: '2026-12-01', note: '' };
  assert.equal(parseStore({ ...data, loans: [base] }).loans[0].direction, 'given');
  assert.equal(parseStore({ ...data, loans: [{ ...base, direction: 'taken' }] }).loans[0].direction, 'taken');
  assert.throws(() => parseStore({ ...data, loans: [{ ...base, direction: 'other' }] }));
});
