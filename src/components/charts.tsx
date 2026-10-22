'use client';
import { useState } from 'react';
import { BarChart3, ChartNoAxesCombined } from 'lucide-react';
import { type Transaction, type Currency, type Period, money } from '@/lib/finance';
import { CategoryIcon } from './ui';
export function SpendingChart({ rows, currency, period, anchor }: { rows: Transaction[]; currency: Currency; period: Period; anchor: string }) {
  const [mode, setMode] = useState<'line' | 'bar'>('line');
  const count = period === 'year' ? 12 : period === 'day' ? 1 : new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0).getDate();
  const series = Array.from({ length: count }, (_, i) => rows.filter(t => t.type === 'expense' && t.currency === currency && (period === 'day' || Number(t.date.slice(period === 'year' ? 5 : 8, period === 'year' ? 7 : 10)) === i + 1)).reduce((n, t) => n + t.amount, 0));
  const max = Math.max(...series, 10000);
  const points = series.map((v, i) => `${45 + i * (600 / Math.max(1, count - 1))},${172 - v / max * 140}`).join(' ');
  return <section className="card chart-card"><div className="section-heading"><div><h3>Spending rhythm</h3><p>The little things. The bigger picture.</p></div><button className="chip" onClick={() => setMode(mode === 'line' ? 'bar' : 'line')}>{mode === 'line' ? <ChartNoAxesCombined size={15} /> : <BarChart3 size={15} />}{mode === 'line' ? 'Line' : 'Bars'}</button></div>
    <div className="chart-legend"><span className="dot peach" /> Expenses <span className="muted">· {currency}</span></div>
    <svg className="spending-chart" viewBox="0 0 680 215" role="img" aria-label={`${period} expense trend. Total ${money(series.reduce((a, b) => a + b, 0), currency)}. Expand chart values for details.`}>
      <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".26" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      {[0, .5, 1].map(v => <g key={v}><line x1="45" x2="650" y1={172 - v * 140} y2={172 - v * 140} stroke="var(--line)" strokeDasharray="4 7" /><text x="0" y={177 - v * 140} fill="var(--muted)" fontSize="10">{money(max * v, currency, true).replace('Rs ', '').replace('$ ', '')}</text></g>)}
      {mode === 'line' ? <><polygon points={`45,172 ${points} ${45 + (count - 1) * (600 / Math.max(1, count - 1))},172`} fill="url(#chart-fill)" /><polyline className="chart-line" points={points} stroke="var(--accent)" fill="none" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{series.map((v, i) => v > 0 && <circle key={i} cx={45 + i * (600 / Math.max(1, count - 1))} cy={172 - v / max * 140} r="4" fill="var(--accent)"><title>{`${i + 1}: ${money(v, currency)}`}</title></circle>)}</> : series.map((v, i) => <rect key={i} x={45 + i * (600 / count)} y={172 - v / max * 140} width={Math.max(4, 600 / count - 7)} height={v / max * 140} rx="4" fill="var(--accent)"><title>{`${i + 1}: ${money(v, currency)}`}</title></rect>)}
      {[...new Set([0, Math.floor((count - 1) / 3), Math.floor((count - 1) * 2 / 3), count - 1])].map(i => <text key={i} x={45 + i * (600 / Math.max(1, count - 1))} y="202" textAnchor="middle" fill="var(--muted)" fontSize="11">{period === 'year' ? new Date(2026, i, 1).toLocaleDateString('en', { month: 'short' }) : period === 'day' ? 'Today' : `${i + 1} ${new Date(anchor + 'T12:00:00').toLocaleDateString('en', { month: 'short' })}`}</text>)}
    </svg><details className="chart-values"><summary>Chart values</summary><div>{series.map((value, i) => <span key={i}>{period === 'year' ? 'Month' : 'Day'} {i + 1}: {money(value, currency)}</span>)}</div></details>
  </section>;
}
export function CategoryBreakdown({ rows, currency }: { rows: Transaction[]; currency: Currency }) {
  const grouped = rows.filter(t => t.type === 'expense' && t.currency === currency).reduce<Record<string, number>>((a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + t.amount }), {});
  const categories = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const total = categories.reduce((n, [, value]) => n + value, 0);
  return <section className="card"><div className="section-heading"><div><h3>Where it goes</h3><p>Spending by category</p></div><span className="muted">{categories.length} categories</span></div><div className="category-breakdown">{categories.length ? categories.map(([category, amount]) => <div className="category-line" key={category}><CategoryIcon category={category} /><div><div className="split"><strong>{category}</strong><span>{money(amount, currency)}</span></div><div className="mini-track"><span style={{ width: `${amount / total * 100}%` }} /></div></div><small>{Math.round(amount / total * 100)}%</small></div>) : <p className="muted">No expenses in this period.</p>}</div></section>;
}
