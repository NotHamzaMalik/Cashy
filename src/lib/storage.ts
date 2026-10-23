import { z } from 'zod';
import type { Store } from './finance';
import { validDate, validateTransaction } from './finance';
const currency = z.enum(['PKR', 'USD']);
const minor = z.number().int().min(0).max(1_000_000_000_000);
const id = z.string().min(1).max(100);
const label = z.string().min(1).max(200);
const date = z.string().refine(validDate, 'Invalid date');
const schema = z.object({
  version: z.literal(1),
  accounts: z.array(z.object({ id, owner: id, name: label, kind: label, currency, opening: z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000), color: label })).max(100),
  transactions: z.array(z.object({ id, owner: id, merchant: label, amount: minor.positive(), currency, date, type: z.enum(['expense', 'income', 'transfer']), category: label, accountId: id, toAccountId: id.optional(), note: z.string().max(2000), reportStatus: z.enum(['draft', 'submitted', 'approved', 'changes']).optional() })).max(20000),
  budgets: z.array(z.object({ id, category: label, limit: minor.positive(), currency })).max(100),
  goals: z.array(z.object({ id, name: label, target: minor.positive(), saved: minor, currency, deadline: date, icon: label })).max(100),
  holdings: z.array(z.object({ id, name: label, kind: label, cost: minor, value: minor, currency, asOf: date })).max(1000),
  subscriptions: z.array(z.object({ id, name: label, amount: minor.positive(), currency, due: date, cadence: z.enum(['monthly', 'yearly']), accountId: id })).max(1000)
});
export function parseStore(raw: unknown): Store {
  const data = schema.parse(raw);
  for (const list of [data.accounts, data.transactions, data.budgets, data.goals, data.holdings, data.subscriptions]) {
    if (new Set(list.map(x => x.id)).size !== list.length) throw new Error('Backup contains duplicate IDs.');
  }
  data.transactions.forEach(t => validateTransaction(t, data.accounts));
  for (const s of data.subscriptions) {
    if (!data.accounts.some(a => a.id === s.accountId && a.owner === 'me' && a.currency === s.currency)) throw new Error('Subscription references an invalid account.');
  }
  return data;
}
export const STORAGE_KEY = 'cashy-demo-v1';

export function emptyStore(): Store {
  return { version: 1, accounts: [], transactions: [], budgets: [], goals: [], holdings: [], subscriptions: [] };
}
export function workspaceKey(userId: string): string {
  if (!userId.trim()) throw new Error('A signed-in user is required.');
  return 'cashy-workspace-v1:' + userId;
}
