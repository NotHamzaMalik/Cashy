'use client';
import { useState, type FormEvent } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, CURRENCIES, CURRENCY_LABELS, parseMoney, validDate, validateTransaction, type Currency, type Store, type Transaction } from '@/lib/finance';
import { Modal } from './ui';

export type EditorKind = 'transaction' | 'account' | 'budget' | 'goal' | 'remittance' | 'allowance' | 'loan' | 'member';
type Props = { kind: EditorKind; store: Store; editId?: string; onSave: (store: Store, expected: Store) => Promise<boolean>; onClose: () => void };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const amountValue = (value?: number) => value === undefined ? '' : (value / 100).toFixed(2);

export function Editor({ kind, store: currentStore, editId, onSave, onClose }: Props) {
  const [store] = useState(currentStore);
  const transaction = store.transactions.find(x => x.id === editId);
  const loan = store.loans.find(x => x.id === editId);
  const allowance = store.allowances.find(x => x.id === editId);
  const remittance = store.remittances.find(x => x.id === editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<Transaction['type']>(transaction?.type || 'expense');
  const [currency, setCurrency] = useState<Currency>(transaction?.currency || loan?.currency || allowance?.currency || remittance?.sentCurrency || 'PKR');
  const titles: Record<EditorKind, string> = {
    transaction: transaction ? 'Edit money record' : 'Record money', account: 'Add an account',
    budget: 'Set a household plan', goal: 'Add a savings goal', remittance: remittance ? 'Edit money sent' : 'Record money sent',
    allowance: allowance ? 'Edit pocket money' : 'Plan pocket money', loan: loan ? 'Update a loan' : 'Record a loan', member: 'Add family member'
  };
  const accounts = store.accounts.filter(a => a.currency === currency);
  const field = (form: FormData, name: string) => String(form.get(name) || '').trim();
  const amount = (form: FormData, name: string, allowZero = false) => {
    const value = field(form, name);
    if (allowZero && (!value || Number(value) === 0)) return 0;
    return parseMoney(value);
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (saving) return; setSaving(true); setError('');
    const form = new FormData(e.currentTarget); const id = editId || crypto.randomUUID();
    try {
      let next = store;
      if (kind === 'transaction') {
        const row: Transaction = { id, owner: 'me', merchant: field(form, 'name'), type, currency, amount: amount(form, 'amount'), date: field(form, 'date'), accountId: field(form, 'account'), toAccountId: type === 'transfer' ? field(form, 'destination') : undefined, category: type === 'transfer' ? 'Other' : field(form, 'category'), note: field(form, 'note'), memberId: field(form, 'member') || undefined, location: field(form, 'location') as Transaction['location'] };
        validateTransaction(row, store.accounts);
        next = { ...store, transactions: transaction ? store.transactions.map(x => x.id === id ? row : x) : [row, ...store.transactions] };
      } else if (kind === 'account') {
        next = { ...store, accounts: [...store.accounts, { id, owner: 'me', name: field(form, 'name'), kind: field(form, 'kind'), currency, opening: amount(form, 'amount', true), color: 'forest' }] };
      } else if (kind === 'budget') {
        const category = field(form, 'category');
        if (store.budgets.some(b => b.category === category && b.currency === currency)) throw new Error('A plan already exists for this category and currency.');
        next = { ...store, budgets: [...store.budgets, { id, category, limit: amount(form, 'amount'), currency }] };
      } else if (kind === 'goal') {
        if (!validDate(field(form, 'date'))) throw new Error('Choose a valid target date.');
        next = { ...store, goals: [...store.goals, { id, name: field(form, 'name'), target: amount(form, 'amount'), saved: amount(form, 'saved', true), currency, deadline: field(form, 'date'), icon: 'savings' }] };
      } else if (kind === 'member') {
        next = { ...store, familyMembers: [...store.familyMembers, { id, name: field(form, 'name'), relationship: field(form, 'relationship'), color: 'amber' }] };
      } else if (kind === 'allowance') {
        const row = { id, memberId: field(form, 'member'), amount: amount(form, 'amount'), currency, month: field(form, 'month'), status: field(form, 'status') as 'planned' | 'paid', note: field(form, 'note') };
        if (!store.familyMembers.some(m => m.id === row.memberId)) throw new Error('Choose a family member.');
        next = { ...store, allowances: allowance ? store.allowances.map(x => x.id === id ? row : x) : [row, ...store.allowances] };
      } else if (kind === 'loan') {
        const row = { id, borrower: field(form, 'name'), principal: amount(form, 'amount'), repaid: amount(form, 'repaid', true), currency, date: field(form, 'date'), due: field(form, 'due'), note: field(form, 'note') };
        if (!validDate(row.date) || !validDate(row.due)) throw new Error('Choose valid loan and due dates.');
        if (row.repaid > row.principal) throw new Error('Repaid amount cannot exceed the loan.');
        next = { ...store, loans: loan ? store.loans.map(x => x.id === id ? row : x) : [row, ...store.loans] };
      } else {
        const receivedCurrency = field(form, 'receivedCurrency') as Currency;
        const row = { id, sender: field(form, 'sender'), recipient: field(form, 'recipient'), sentAmount: amount(form, 'amount'), sentCurrency: currency, receivedAmount: amount(form, 'receivedAmount'), receivedCurrency, fee: amount(form, 'fee', true), date: field(form, 'date'), status: field(form, 'status') as 'sent' | 'received', note: field(form, 'note') };
        if (!validDate(row.date)) throw new Error('Choose a valid transfer date.');
        next = { ...store, remittances: remittance ? store.remittances.map(x => x.id === id ? row : x) : [row, ...store.remittances] };
      }
      if (!await onSave(next, store)) { setError('Save failed. Your form is still open.'); return; }
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the details and try again.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!editId || saving) return; setSaving(true);
    const next = kind === 'transaction' ? { ...store, transactions: store.transactions.filter(x => x.id !== editId) }
      : kind === 'loan' ? { ...store, loans: store.loans.filter(x => x.id !== editId) }
      : kind === 'allowance' ? { ...store, allowances: store.allowances.filter(x => x.id !== editId) }
      : { ...store, remittances: store.remittances.filter(x => x.id !== editId) };
    try { if (await onSave(next, store)) onClose(); else setError('Delete failed. Nothing was removed.'); } finally { setSaving(false); }
  }
  return <Modal title={titles[kind]} onClose={onClose} wide={kind === 'remittance'}><form className="editor-form" onSubmit={submit}>
    {kind === 'transaction' && <div className="segmented type-selector">{(['expense', 'income', 'transfer'] as const).map(value => <button type="button" key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{value}</button>)}</div>}
    <div className="form-grid">
      {['transaction', 'account', 'goal', 'loan', 'member'].includes(kind) && <label className="full">{kind === 'transaction' ? 'What was it for?' : kind === 'loan' ? 'Borrower' : kind === 'member' ? 'Name' : 'Name'}<input name="name" required maxLength={100} defaultValue={transaction?.merchant || loan?.borrower} placeholder={kind === 'transaction' ? 'Electricity bill, Dad salary…' : kind === 'loan' ? 'Friend’s name' : ''} /></label>}
      {kind === 'remittance' && <><label>Sender<input name="sender" required defaultValue={remittance?.sender || 'Dad'} /></label><label>Recipient<input name="recipient" required defaultValue={remittance?.recipient} placeholder="Family / person" /></label></>}
      {kind === 'budget' && <label className="full">Household category<select name="category">{CATEGORIES.filter(c => c !== 'Salary').map(c => <option key={c}>{c}</option>)}</select></label>}
      {kind === 'allowance' && <label className="full">Family member<select name="member" required defaultValue={allowance?.memberId}>{store.familyMembers.map(m => <option key={m.id} value={m.id}>{m.name} · {m.relationship}</option>)}</select></label>}
      {kind === 'member' && <label className="full">Relationship<select name="relationship"><option>Sibling</option><option>Child</option><option>Parent</option><option>Other</option></select></label>}
      {!['member'].includes(kind) && <label>{kind === 'budget' ? 'Monthly amount' : kind === 'goal' ? 'Savings target' : kind === 'loan' ? 'Amount lent' : kind === 'remittance' ? 'Amount sent' : kind === 'account' ? 'Opening balance' : 'Amount'}<input name="amount" inputMode="decimal" required defaultValue={amountValue(transaction?.amount || loan?.principal || allowance?.amount || remittance?.sentAmount) || (kind === 'account' ? '0' : '')} placeholder="0.00" /></label>}
      {!['member'].includes(kind) && <label>Currency<select value={currency} onChange={e => setCurrency(e.target.value as Currency)}>{CURRENCIES.map(c => <option key={c} value={c}>{c} · {CURRENCY_LABELS[c]}</option>)}</select></label>}
      {kind === 'remittance' && <><label>Amount received<input name="receivedAmount" required inputMode="decimal" defaultValue={amountValue(remittance?.receivedAmount)} placeholder="0.00" /></label><label>Received currency<select name="receivedCurrency" defaultValue={remittance?.receivedCurrency || 'PKR'}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label><label>Transfer fee<input name="fee" inputMode="decimal" defaultValue={amountValue(remittance?.fee) || '0'} /></label><label>Status<select name="status" defaultValue={remittance?.status || 'received'}><option value="sent">Sent</option><option value="received">Received</option></select></label></>}
      {kind === 'transaction' && <><label>Date<input type="date" name="date" required defaultValue={transaction?.date || today()} /></label><label>Account<select name="account" required defaultValue={transaction?.accountId}>{accounts.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>{type !== 'transfer' && <label>Category<select name="category" defaultValue={transaction?.category || (type === 'income' ? 'Salary' : 'Groceries')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>}<label>Where<select name="location" defaultValue={transaction?.location || (currency === 'ZAR' ? 'south-africa' : 'pakistan')}><option value="pakistan">Pakistan</option><option value="south-africa">South Africa</option><option value="other">Other</option></select></label>{type === 'transfer' && <label className="full">To account<select name="destination" defaultValue={transaction?.toAccountId}>{accounts.filter(a => a.id !== transaction?.accountId).map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>}<label className="full">Family member <span className="muted">(optional)</span><select name="member" defaultValue={transaction?.memberId || ''}><option value="">Whole family / not assigned</option>{store.familyMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label></>}
      {kind === 'account' && <label className="full">Account type<select name="kind"><option>Bank account</option><option>Cash</option><option>USDT wallet</option><option>Savings</option></select></label>}
      {kind === 'goal' && <><label>Saved already<input name="saved" inputMode="decimal" defaultValue="0" /></label><label>Target date<input type="date" name="date" required defaultValue={today()} /></label></>}
      {kind === 'allowance' && <><label>Month<input type="month" name="month" required defaultValue={allowance?.month || today().slice(0, 7)} /></label><label>Status<select name="status" defaultValue={allowance?.status || 'planned'}><option value="planned">Planned</option><option value="paid">Paid</option></select></label></>}
      {kind === 'loan' && <><label>Already repaid<input name="repaid" inputMode="decimal" defaultValue={amountValue(loan?.repaid) || '0'} /></label><label>Loan date<input type="date" name="date" required defaultValue={loan?.date || today()} /></label><label>Due date<input type="date" name="due" required defaultValue={loan?.due || today()} /></label></>}
      {kind === 'remittance' && <label>Date<input type="date" name="date" required defaultValue={remittance?.date || today()} /></label>}
      {['transaction', 'remittance', 'allowance', 'loan'].includes(kind) && <label className="full">Detailed note <span className="muted">(recommended)</span><textarea name="note" maxLength={2000} rows={3} defaultValue={transaction?.note || remittance?.note || allowance?.note || loan?.note} placeholder="Explain what this money was for, who received it, and anything to remember." /></label>}
    </div>
    {!accounts.length && kind === 'transaction' && <p className="form-error">Add an account in this currency before recording money.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <p className="form-footnote">Saved on this device first, then synced to the shared family workspace.</p>
    <div className="dialog-actions">{editId && ['transaction', 'loan', 'allowance', 'remittance'].includes(kind) && <button type="button" className="button danger" disabled={saving} onClick={remove}><Trash2 size={16} /> Delete</button>}<button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving || (kind === 'transaction' && !accounts.length)}><Check size={17} /> {saving ? 'Saving…' : 'Save'}</button></div>
  </form></Modal>;
}
