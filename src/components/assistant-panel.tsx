'use client';
import { useState, type FormEvent } from 'react';
import { Sparkles, ArrowUp, ShieldCheck } from 'lucide-react';
import { money, summarize, type Transaction, type Currency } from '@/lib/finance';
export function AssistantPanel({ rows, currency, scope }: { rows: Transaction[]; currency: Currency; scope: string }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ question: string; answer: string }[]>([]);
  function ask(value: string) {
    if (!value.trim()) return;
    const totals = summarize(rows, currency);
    let answer = '';
    if (/food|coffee|dining/i.test(value)) {
      const amount = rows.filter(t => t.type === 'expense' && t.currency === currency && t.category === 'Food & drinks').reduce((n, t) => n + t.amount, 0);
      answer = `Food & drinks comes to ${money(amount, currency)} for the selected period. That is ${totals.expenses ? Math.round(amount / totals.expenses * 100) : 0}% of your recorded expenses.`;
    } else if (/big|where|category/i.test(value)) {
      const grouped = rows.filter(t => t.type === 'expense' && t.currency === currency).reduce<Record<string, number>>((a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + t.amount }), {});
      const top = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
      answer = top ? `${top[0]} is your largest spending category at ${money(top[1], currency)}, or ${Math.round(top[1] / totals.expenses * 100)}% of expenses. Review the transactions in Reports before changing a budget.` : 'There are no recorded expenses in this period yet.';
    } else if (/summary|review|spent|save|income/i.test(value)) {
      answer = `For this period, recorded income is ${money(totals.income, currency)} and expenses are ${money(totals.expenses, currency)}. Net cash flow is ${money(totals.net, currency)}. Transfers are excluded. This is a cash-flow summary, not a measure of investment returns or allocated savings.`;
    } else {
      answer = 'This preview can calculate your period summary, food spending, and largest category. Open-ended AI answers will become available after the provider and privacy consent flow are connected. No data has been sent to an AI service.';
    }
    setMessages([...messages, { question: value, answer }]); setQuestion('');
  }
  function submit(e: FormEvent) { e.preventDefault(); ask(question); }
  return <section className="assistant-shell card"><div className="assistant-intro"><span className="assistant-mark"><Sparkles size={32} strokeWidth={1.4} /></span><span className="eyebrow">A LITTLE HELP WITH THE BIGGER PICTURE</span><h2>Make sense of your money.</h2><p>Start with a question. Find a little more clarity.</p><span className="tag">Calculated preview · AI provider not connected</span></div>
    <div className="prompt-grid">{['Give me a period summary', 'Where do I spend the most?', 'How much did I spend on food?'].map(prompt => <button key={prompt} onClick={() => ask(prompt)}><Sparkles size={16} /><span>{prompt}</span></button>)}</div>
    <div className="chat-history" aria-live="polite">{messages.map((message, i) => <div key={i} className="chat-pair"><p className="question">{message.question}</p><div className="answer"><Sparkles size={19} /><div><p>{message.answer}</p><small>{scope} · {currency} · current filters · calculated locally</small></div></div></div>)}</div>
    <form className="chat-input" onSubmit={submit}><input aria-label="Ask about your spending" placeholder="Ask about your spending…" value={question} maxLength={500} onChange={e => setQuestion(e.target.value)} /><button className="icon-button primary" disabled={!question.trim()} aria-label="Send question"><ArrowUp size={20} /></button></form><p className="privacy-note"><ShieldCheck size={13} /> Nothing is sent to an AI provider in this preview.</p>
  </section>;
}
