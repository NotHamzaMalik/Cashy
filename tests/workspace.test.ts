import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStore, workspaceKey, parseStore, STORAGE_KEY } from '../src/lib/storage';

test('new workspaces contain no seeded money or family records', () => {
  const first = emptyStore();
  assert.deepEqual(parseStore(first), { version: 1, accounts: [], transactions: [], budgets: [], goals: [], holdings: [], subscriptions: [] });
  first.accounts.push({ id: 'a', owner: 'me', name: 'Wallet', kind: 'Cash', currency: 'PKR', opening: 0, color: 'green' });
  assert.equal(emptyStore().accounts.length, 0);
});
test('account storage cannot use another account or legacy demo key', () => {
  assert.notEqual(workspaceKey('user_a'), workspaceKey('user_b'));
  assert.notEqual(workspaceKey('user_a'), STORAGE_KEY);
  assert.throws(() => workspaceKey(''));
});
