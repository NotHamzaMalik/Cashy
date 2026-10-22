'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Coffee, ShoppingBasket, CarFront, ShoppingBag, Zap, HeartPulse, GraduationCap, Music2, BriefcaseBusiness, Laptop, Ellipsis, type LucideIcon } from 'lucide-react';
import { type Transaction, money } from '@/lib/finance';
export const categoryIcons: Record<string, LucideIcon> = { 'Food & drinks': Coffee, Groceries: ShoppingBasket, Transport: CarFront, Shopping: ShoppingBag, 'Bills & utilities': Zap, Health: HeartPulse, Education: GraduationCap, Entertainment: Music2, Salary: BriefcaseBusiness, Freelance: Laptop, Other: Ellipsis };
export const categoryColors: Record<string, string> = { 'Food & drinks': 'peach', Groceries: 'green', Transport: 'lavender', Shopping: 'pink', 'Bills & utilities': 'yellow', Health: 'pink', Education: 'lavender', Entertainment: 'green', Salary: 'green', Freelance: 'lavender', Other: 'peach' };
export function CategoryIcon({ category }: { category: string }) { const Icon = categoryIcons[category] || Ellipsis; return <span className={`category-icon ${categoryColors[category] || 'peach'}`}><Icon size={20} strokeWidth={1.7} /></span>; }
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; const previous = document.activeElement; el?.showModal(); return () => { el?.close(); if (previous instanceof HTMLElement) previous.focus(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} aria-labelledby="modal-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><header><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>{children}</dialog>;
}
export function Progress({ value, tone = 'peach', label }: { value: number; tone?: string; label: string }) { return <div className={`progress ${tone}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.max(100, Math.round(value))}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty"><span className="empty-orbit">↗</span><h3>{title}</h3><p>{text}</p>{action}</div>; }
export function TransactionRow({ transaction: t, onClick }: { transaction: Transaction; onClick?: () => void }) {
  const Icon = t.type === 'income' ? ArrowDownLeft : t.type === 'transfer' ? ArrowRightLeft : ArrowUpRight;
  return <button type="button" className="transaction-row" onClick={onClick} disabled={!onClick}>
    <CategoryIcon category={t.category} /><span className="transaction-name"><strong>{t.merchant}</strong><small>{new Date(t.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} <span>·</span> {t.category}</small></span>
    <span className={`transaction-amount ${t.type}`}><strong>{t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}{money(t.amount, t.currency)}</strong><small><Icon size={12} /> {t.type}</small></span>
  </button>;
}
export function download(content: string, filename: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
