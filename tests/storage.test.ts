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
