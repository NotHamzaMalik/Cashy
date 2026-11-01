import { z } from 'zod';
import type { Store } from './finance';
import { validDate, validateTransaction } from './finance';
const currency = z.enum(['PKR', 'ZAR', 'USD', 'USDT']);
const minor = z.number().int().min(0).max(1_000_000_000_000);
const id = z.string().min(1).max(100);
const label = z.string().min(1).max(200);
const note = z.string().max(2000);
const date = z.string().refine(validDate, 'Invalid date');
const schema = z.object({
  version: z.literal(1),
  accounts: z.array(z.object({ id, owner: id, name: label, kind: label, currency, opening: z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000), color: label })).max(100),
  transactions: z.array(z.object({ id, owner: id, merchant: label, amount: minor.positive(), currency, date, type: z.enum(['expense', 'income', 'transfer']), category: label, accountId: id, toAccountId: id.optional(), note, memberId: id.optional(), location: z.enum(['south-africa', 'pakistan', 'other']).optional(), reportStatus: z.enum(['draft', 'submitted', 'approved', 'changes']).optional() })).max(20000),
  budgets: z.array(z.object({ id, category: label, limit: minor.positive(), currency })).max(100),
  goals: z.array(z.object({ id, name: label, target: minor.positive(), saved: minor, currency, deadline: date, icon: label })).max(100),
  holdings: z.array(z.object({ id, name: label, kind: label, cost: minor, value: minor, currency, asOf: date })).max(1000).default([]),
  subscriptions: z.array(z.object({ id, name: label, amount: minor.positive(), currency, due: date, cadence: z.enum(['monthly', 'yearly']), accountId: id })).max(1000).default([]),
  familyMembers: z.array(z.object({ id, name: label, relationship: label, color: label })).max(100).default([]),
  remittances: z.array(z.object({ id, sender: label, recipient: label, sentAmount: minor.positive(), sentCurrency: currency, receivedAmount: minor.positive(), receivedCurrency: currency, fee: minor, date, status: z.enum(['sent', 'received']), note })).max(5000).default([]),
  allowances: z.array(z.object({ id, memberId: id, amount: minor.positive(), currency, month: z.string().regex(/^\d{4}-\d{2}$/), status: z.enum(['planned', 'paid']), note })).max(5000).default([]),
  loans: z.array(z.object({ id, borrower: label, principal: minor.positive(), repaid: minor, currency, date, due: date, note, direction: z.enum(['given', 'taken']).default('given') })).max(5000).default([])
});
export function parseStore(raw: unknown): Store {
  const data = schema.parse(raw) as Store;
  for (const list of [data.accounts, data.transactions, data.budgets, data.goals, data.holdings, data.subscriptions, data.familyMembers, data.remittances, data.allowances, data.loans]) {
    if (new Set(list.map(x => x.id)).size !== list.length) throw new Error('Backup contains duplicate IDs.');
  }
  data.transactions.forEach(t => validateTransaction(t, data.accounts));
  data.allowances.forEach(a => { if (!data.familyMembers.some(m => m.id === a.memberId)) throw new Error('Allowance references an invalid family member.'); });
  data.loans.forEach(l => { if (l.repaid > l.principal) throw new Error('Loan repayment exceeds the principal.'); });
  return data;
}
export const STORAGE_KEY = 'cashy-demo-v1';
export function emptyStore(): Store {
  return { version: 1, accounts: [], transactions: [], budgets: [], goals: [], holdings: [], subscriptions: [], familyMembers: [], remittances: [], allowances: [], loans: [] };
}
export function workspaceKey(userId: string): string {
  if (!userId.trim()) throw new Error('A signed-in user is required.');
  return 'cashy-workspace-v1:' + userId;
}
