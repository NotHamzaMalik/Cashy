'use client';
import { useState, type FormEvent } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { CATEGORIES, DEMO_DATE, parseMoney, validateTransaction, type Store, type Transaction, type Currency, validDate } from '@/lib/finance';
import { Modal } from './ui';
export type EditorKind = 'transaction' | 'account' | 'budget' | 'goal' | 'holding' | 'subscription';
export function Editor({ kind, store: currentStore, edit, onSave, onClose }: { kind: EditorKind; store: Store; edit?: Transaction; onSave: (store: Store, expected: Store) => Promise<boolean>; onClose: () => void }) {
  const [store] = useState(currentStore);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<Transaction['type']>(edit?.type || 'expense');
  const [currency, setCurrency] = useState<Currency>(edit?.currency || 'PKR');
  const titles: Record<EditorKind, string> = { transaction: edit ? 'Edit transaction' : 'A new transaction', account: 'Add an account', budget: 'Plan a budget', goal: 'Something to save for', holding: 'Add an investment', subscription: 'Track a subscription' };
  const accounts = store.accounts.filter(a => a.owner === 'me' && a.currency === currency);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (saving) return; setSaving(true); setError('');
    const form = new FormData(e.currentTarget);
    const field = (name: string) => String(form.get(name) || '').trim();
    const amount = (name: string) => parseMoney(field(name));
    const id = crypto.randomUUID();
    try {
      if (kind === 'transaction') {
        const row: Transaction = { id: edit?.id || id, owner: 'me', merchant: field('name'), type, currency, amount: amount('amount'), date: field('date'), accountId: field('account'), toAccountId: type === 'transfer' ? field('destination') : undefined, category: type === 'transfer' ? 'Other' : field('category'), note: field('note') };
        validateTransaction(row, store.accounts);
        if (!await onSave({ ...store, transactions: edit ? store.transactions.map(t => t.id === edit.id ? row : t) : [row, ...store.transactions] }, store)) { setError("Save failed. Your form has been kept open; check the workspace message."); return; }
      } else if (kind === 'account') {
        const opening = field('amount') === '0' ? 0 : amount('amount');
        if (!await onSave({ ...store, accounts: [...store.accounts, { id, owner: 'me', name: field('name'), kind: field('kind'), currency, opening, color: 'lavender' }] }, store)) { setError("Save failed. Your form has been kept open; check the workspace message."); return; }
      } else if (kind === 'budget') {
        const category = field('category');
        if (store.budgets.some(b => b.category === category && b.currency === currency)) throw new Error('A budget already exists for this category and currency.');
        if (!await onSave({ ...store, budgets: [...store.budgets, { id, category, limit: amount('amount'), currency }] }, store)) { setError("Save failed. Your form has been kept open; check the workspace message."); return; }
      } else if (kind === 'goal') {
        if (!validDate(field('date'))) throw new Error('Choose a valid target date.');
        if (!await onSave({ ...store, goals: [...store.goals, { id, name: field('name'), target: amount('amount'), saved: 0, currency, deadline: field('date'), icon: 'shield' }] }, store)) { setError("Save failed. Your form has been kept open; check the workspace message."); return; }
      } else if (kind === 'holding') {
        if (!validDate(field('date'))) throw new Error('Choose a valid valuation date.');
        if (!await onSave({ ...store, holdings: [...store.holdings, { id, name: field('name'), kind: field('kind'), cost: amount('amount'), value: amount('value'), currency, asOf: field('date') }] }, store)) { setError("Save failed. Your form has been kept open; check the workspace message."); return; }
      } else {
        if (!validDate(field('date'))) throw new Error('Choose a valid due date.');
        if (!accounts.find(a => a.id === field('account'))) throw new Error('Choose a matching account.');
        if (!await onSave({ ...store, subscriptions: [...store.subscriptions, { id, name: field('name'), amount: amount('amount'), currency, due: field('date'), cadence: field('cadence') as 'monthly' | 'yearly', accountId: field('account') }] }, store)) { setError("Save failed. Your form has been kept open; check the workspace message."); return; }
      }
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Please check your entries.'); } finally { setSaving(false); }
  }
  return <Modal title={titles[kind]} onClose={onClose}><form className="editor-form" onSubmit={submit}>
    {kind === 'transaction' && <div className="segmented type-selector">{(['expense', 'income', 'transfer'] as const).map(t => <button type="button" key={t} aria-pressed={type === t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>{t}</button>)}</div>}
    <div className="form-grid"><label className="full">{kind === 'transaction' ? 'Merchant or description' : kind === 'budget' ? 'Category' : 'Name'}{kind !== 'budget' && <input name="name" required maxLength={100} placeholder={kind === 'transaction' ? 'What was it for?' : 'Give it a name'} defaultValue={edit?.merchant} />}{kind === 'budget' && <select name="category" aria-label="Category">{CATEGORIES.filter(c => !['Salary', 'Freelance'].includes(c)).map(c => <option key={c}>{c}</option>)}</select>}</label>
    <label>{kind === 'goal' ? 'Target amount' : kind === 'budget' ? 'Monthly limit' : kind === 'account' ? 'Opening balance' : kind === 'holding' ? 'Cost basis' : 'Amount'}<input name="amount" inputMode="decimal" required pattern="[0-9,]+(\.[0-9]{1,2})?" placeholder="0.00" defaultValue={edit ? (edit.amount / 100).toFixed(2) : kind === 'account' ? '0' : undefined} /></label>
    <label>Currency<select aria-label="Transaction currency" value={currency} onChange={e => setCurrency(e.target.value as Currency)}><option value="PKR">PKR · Pakistani rupee</option><option value="USD">USD · US dollar</option></select></label>
    {['transaction', 'goal', 'holding', 'subscription'].includes(kind) && <label>{kind === 'goal' ? 'Target date' : kind === 'subscription' ? 'Next due' : kind === 'holding' ? 'Valuation date' : 'Date'}<input type="date" name="date" required defaultValue={edit?.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })} /></label>}
    {['transaction', 'subscription'].includes(kind) && <label>Account<select name="account" aria-label="Account" key={currency} defaultValue={edit?.accountId} required>{accounts.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>}
    {kind === 'transaction' && type !== 'transfer' && <label className="full">Category<select name="category" aria-label="Category" defaultValue={edit?.category || (type === 'income' ? 'Salary' : 'Food & drinks')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>}
    {kind === 'transaction' && type === 'transfer' && <label className="full">To account<select name="destination" aria-label="To account" defaultValue={edit?.toAccountId}>{accounts.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select><small>Transfers use the same currency. Transfers are excluded from spending.</small></label>}
    {kind === 'transaction' && <label className="full">Note <span className="muted">(optional)</span><input name="note" maxLength={500} placeholder="A little context for later" defaultValue={edit?.note} /></label>}
    {kind === 'account' && <label className="full">Account type<select name="kind"><option>Bank account</option><option>Cash</option><option>Savings</option></select></label>}
    {kind === 'holding' && <><label>Current valuation<input name="value" inputMode="decimal" required placeholder="0.00" /></label><label className="full">Asset type<select name="kind"><option>Mutual fund</option><option>Stocks</option><option>Gold</option><option>Property</option><option>Other</option></select></label></>}
    {kind === 'subscription' && <label className="full">Repeats<select name="cadence"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>}
    </div>{error && <p role="alert" className="form-error">{error}</p>}
    <p className="form-footnote">Saved on this device first, then synced to your account.</p>
    <div className="dialog-actions">{edit && <button type="button" className="button danger" disabled={saving} onClick={async () => { setSaving(true); try { if (await onSave({ ...store, transactions: store.transactions.filter(t => t.id !== edit.id) }, store)) onClose(); else setError('Delete failed; your transaction has been kept.'); } finally { setSaving(false); } }}><Trash2 size={16} /> Delete</button>}<button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{edit ? <Check size={17} /> : <Plus size={17} />}{edit ? 'Save changes' : 'Save ' + kind}</button></div>
  </form></Modal>;
}
