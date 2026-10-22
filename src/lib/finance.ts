export type Currency = 'PKR' | 'USD';
export type Period = 'day' | 'month' | 'year';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type Transaction = {
  id: string; owner: string; merchant: string; amount: number; currency: Currency;
  date: string; type: TransactionType; category: string; accountId: string;
  toAccountId?: string; note: string; reportStatus?: 'draft' | 'submitted' | 'approved' | 'changes';
};
export type Account = { id: string; owner: string; name: string; kind: string; currency: Currency; opening: number; color: string };
export type Budget = { id: string; category: string; limit: number; currency: Currency };
export type Goal = { id: string; name: string; target: number; saved: number; currency: Currency; deadline: string; icon: string };
export type Holding = { id: string; name: string; kind: string; cost: number; value: number; currency: Currency; asOf: string };
export type Subscription = { id: string; name: string; amount: number; currency: Currency; due: string; cadence: 'monthly' | 'yearly'; accountId: string };
export type Store = { version: 1; accounts: Account[]; transactions: Transaction[]; budgets: Budget[]; goals: Goal[]; holdings: Holding[]; subscriptions: Subscription[] };

export const CATEGORIES = ['Food & drinks', 'Groceries', 'Transport', 'Shopping', 'Bills & utilities', 'Health', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'];
export const DEMO_DATE = '2026-10-13';

export function parseMoney(value: string): number {
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a valid amount, such as 1,250.00.');
  const normalized = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a positive amount with up to 2 decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 1_000_000_000_000) throw new Error('Amount must be between 0.01 and 10 billion.');
  return minor;
}
export function money(minor: number, currency: Currency = 'PKR', compact = false): string {
  const value = minor / 100;
  return `${currency === 'PKR' ? 'Rs' : '$'} ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: compact ? 1 : (minor % 100 ? 2 : 0),
    notation: compact && Math.abs(value) >= 10000 ? 'compact' : 'standard'
  }).format(value)}`;
}
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
}
export function inPeriod(date: string, period: Period, anchor: string): boolean {
  return date.slice(0, period === 'day' ? 10 : period === 'month' ? 7 : 4) === anchor.slice(0, period === 'day' ? 10 : period === 'month' ? 7 : 4);
}
export function visibleTransactions(transactions: Transaction[], scope: 'personal' | 'family', member = 'me'): Transaction[] {
  const seen = new Set<string>();
  return transactions.filter(t => {
    if (seen.has(t.id)) return false;
    if (t.owner !== member && !(scope === 'family' && t.reportStatus === 'approved' && t.type === 'expense')) return false;
    seen.add(t.id); return true;
  });
}
export function summarize(transactions: Transaction[], currency: Currency) {
  const rows = transactions.filter(t => t.currency === currency);
  const sum = (type: TransactionType) => rows.filter(t => t.type === type).reduce((n, t) => n + t.amount, 0);
  const income = sum('income'), expenses = sum('expense');
  return { income, expenses, net: income - expenses, count: rows.filter(t => t.type !== 'transfer').length };
}
export function balance(account: Account, transactions: Transaction[]): number {
  return transactions.reduce((value, t) => {
    if (t.currency !== account.currency) return value;
    if (t.type === 'transfer' && t.toAccountId === account.id) return value + t.amount;
    if (t.accountId !== account.id) return value;
    return value + (t.type === 'income' ? t.amount : -t.amount);
  }, account.opening);
}
export function validateTransaction(t: Transaction, accounts: Account[]) {
  if (!t.merchant.trim()) throw new Error('Add a merchant or description.');
  if (!Number.isSafeInteger(t.amount) || t.amount <= 0 || t.amount > 1_000_000_000_000) throw new Error('Invalid amount.');
  if (!validDate(t.date)) throw new Error('Choose a valid date.');
  const account = accounts.find(a => a.id === t.accountId && a.owner === t.owner);
  if (!account || account.currency !== t.currency) throw new Error('Choose an account matching the transaction currency and owner.');
  if (t.type === 'transfer') {
    const destination = accounts.find(a => a.id === t.toAccountId && a.owner === t.owner);
    if (!destination || destination.id === account.id) throw new Error('Choose a different destination account.');
    if (destination.currency !== account.currency) throw new Error('Demo transfers require the same currency. Cross-currency transfers need a confirmed rate.');
  }
}
export function fingerprint(t: Pick<Transaction, 'accountId' | 'date' | 'amount' | 'currency' | 'merchant' | 'type'>): string {
  return [t.accountId, t.date, t.amount, t.currency, t.type, t.merchant.toLowerCase().replace(/\s+/g, ' ').trim()].join('|');
}
export function csvExport(transactions: Transaction[]): string {
  const cell = (v: string) => `"${(/^[\s]*[=+\-@\t\r]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`;
  return '\uFEFF' + ['Date,Description,Type,Category,Amount,Currency,Account,Note', ...transactions.map(t =>
    [t.date, t.merchant, t.type, t.category, (t.amount / 100).toFixed(2), t.currency, t.accountId, t.note].map(cell).join(',')
  )].join('\r\n');
}
export function nextDue(date: string, cadence: 'monthly' | 'yearly'): string {
  const [year, month, day] = date.split('-').map(Number);
  const targetMonth = cadence === 'monthly' ? month : month - 1;
  const targetYear = cadence === 'yearly' ? year + 1 : year;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}
