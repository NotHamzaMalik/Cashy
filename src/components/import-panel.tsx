'use client';
import { useRef, useState } from 'react';
import { Upload, FileText, ShieldCheck, ArrowRight, CheckCheck, Plus, X } from 'lucide-react';
import { type Store, type Currency, fingerprint, parseMoney, validateTransaction, DEMO_DATE } from '@/lib/finance';
import { type Candidate, parseStatement, prepareImport } from '@/lib/import';
const SAMPLE = '13/10/2026 Grocery store 2,450.00 DR\n12/10/2026 Project payment 15,000.00 CR\n11/10/2026 Coffee shop 850.00 DR';
export function ImportPanel({ store, save }: { store: Store; save: (store: Store, message: string) => void }) {
  const [accountId, setAccountId] = useState('bank');
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<Candidate[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const account = store.accounts.find(a => a.id === accountId && a.owner === 'me');
  const currency: Currency = account?.currency || 'PKR';
  const existing = new Set(store.transactions.map(fingerprint));
  const duplicate = (row: Candidate) => { try { return existing.has(fingerprint({ accountId, currency, date: row.date, merchant: row.merchant, amount: parseMoney(row.amount), type: row.type })); } catch { return false; } };
  function review(text: string) { const candidates = parseStatement(text); setRows(candidates); setReceipt([]); setError(candidates.length ? '' : 'No complete rows recognized. Use a digital-text PDF, edit the extracted text, or add rows manually. Dates must be DD/MM/YYYY or YYYY-MM-DD and amounts must end each row.'); }
  async function extract(file: File) {
    setError(''); setRows([]); setReceipt([]); setRaw(''); setFileName(file.name);
    if (file.size > 10 * 1024 * 1024) { setError('Choose a PDF smaller than 10 MB.'); return; }
    const buffer = await file.arrayBuffer();
    if (new TextDecoder().decode(buffer.slice(0, 5)) !== '%PDF-') { setError('This file is not a valid PDF.'); return; }
    setBusy(true);
    let task: { destroy: () => Promise<void> } | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loading = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }); task = loading;
      const extractText = async () => {
        const document = await loading.promise;
        if (document.numPages > 100) throw new Error('Choose a statement with 100 pages or fewer.');
        const lines: string[] = [];
        for (let i = 1; i <= document.numPages; i++) {
          const content = await (await document.getPage(i)).getTextContent();
          let line = '', previousY: number | undefined;
          for (const item of content.items) {
            if (!('str' in item)) continue;
            const y = Math.round(item.transform[5]);
            if (previousY !== undefined && Math.abs(y - previousY) > 4) { lines.push(line); line = ''; }
            line += item.str + ' '; previousY = y;
            if (item.hasEOL) { lines.push(line); line = ''; previousY = undefined; }
          }
          if (line.trim()) lines.push(line);
        }
        return lines.join('\n');
      };
      const text = await Promise.race([extractText(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('This PDF took too long. Try a smaller statement.')), 20000); })]);
      setRaw(text); review(text);
    } catch (err) { setError(err instanceof Error && err.name === 'PasswordException' ? 'This PDF is password-protected. Import a locally unlocked copy. Cashy does not store PDF passwords.' : err instanceof Error ? err.message : 'Could not read this PDF.'); }
    finally { clearTimeout(timeout); await task?.destroy(); setBusy(false); }
  }
  function update(id: string, value: Partial<Candidate>) { setRows(rows.map(row => row.id === id ? { ...row, ...value } : row)); }
  function commit() {
    try {
      if (!account) throw new Error('Choose an account first.');
      const imported = prepareImport(rows, store.transactions, accountId, currency, 'me');
      imported.forEach(t => validateTransaction(t, store.accounts));
      if (!imported.length) throw new Error('No new selected rows. Existing transactions are skipped.');
      save({ ...store, transactions: [...imported, ...store.transactions] }, `${imported.length} transactions imported into the demo.`);
      setReceipt(imported.map(t => t.id)); setRows([]); setRaw(''); setFileName(''); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Review your selected rows.'); }
  }
  return <div className="import-layout"><section className="card import-main"><div className="eyebrow">LESS TYPING. MORE CLARITY.</div><h2>Your statement,<br /><span className="accent">made simple.</span></h2><p className="muted">Bring your transactions into Cashy. Review every detail before anything is added.</p>
    <button className="upload-zone" disabled={busy} onClick={() => input.current?.click()}><span className="upload-icon"><Upload size={28} /></span><strong>{busy ? 'Reading your statement…' : fileName || 'Choose a PDF statement'}</strong><span>Digital PDFs · up to 10 MB · 100 pages</span></button>
    <input ref={input} type="file" accept="application/pdf,.pdf" hidden aria-label="PDF statement" onChange={e => { const file = e.target.files?.[0]; if (file) void extract(file); e.target.value = ''; }} />
    <label className="standalone-label">Import into<select value={accountId} onChange={e => setAccountId(e.target.value)}>{store.accounts.filter(a => a.owner === 'me').map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <details className="text-import"><summary>Paste or inspect statement text</summary><textarea aria-label="Statement text" rows={7} placeholder={SAMPLE} value={raw} onChange={e => setRaw(e.target.value)} /><div className="split"><button className="button secondary small" onClick={() => { setRaw(SAMPLE); review(SAMPLE); }}>Try sample text</button><button className="button primary small" disabled={!raw.trim()} onClick={() => review(raw)}>Review rows <ArrowRight size={15} /></button></div></details>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!!receipt.length && <div className="import-receipt"><CheckCheck size={24} /><strong>{receipt.length} transactions added</strong><button className="text-button" onClick={() => { save({ ...store, transactions: store.transactions.filter(t => !receipt.includes(t.id)) }, 'Import undone.'); setReceipt([]); }}>Undo this import</button></div>}
    <div className="section-heading"><h3>{rows.length ? `${rows.length} rows to review` : 'Review before importing'}</h3><button className="text-button" onClick={() => setRows([...rows, { id: crypto.randomUUID(), date: DEMO_DATE, merchant: '', amount: '', type: 'expense', selected: true, duplicate: false }])}><Plus size={15} /> Add row</button></div>
    {!!rows.length && <><p className="callout">Generic extraction · confirm dates, currency, amount and income/expense type. Possible duplicates are skipped; identical legitimate purchases may need manual entry.</p><div className="import-rows">{rows.map((row, index) => <div className={`import-row ${duplicate(row) ? 'is-duplicate' : ''}`} key={row.id}>
      <input type="checkbox" aria-label={`Select row ${index + 1}`} checked={row.selected} onChange={e => update(row.id, { selected: e.target.checked })} />
      <label>Date<input aria-label={`Row ${index + 1} date`} type="date" value={row.date} onChange={e => update(row.id, { date: e.target.value })} /></label><label>Description<input aria-label={`Row ${index + 1} description`} value={row.merchant} onChange={e => update(row.id, { merchant: e.target.value })} /></label>
      <label>{currency}<input aria-label={`Row ${index + 1} amount`} value={row.amount} inputMode="decimal" onChange={e => update(row.id, { amount: e.target.value })} /></label><label>Type<select aria-label={`Row ${index + 1} type`} value={row.type} onChange={e => update(row.id, { type: e.target.value as Candidate['type'] })}><option value="expense">Expense</option><option value="income">Income</option></select></label><button className="icon-button" aria-label={`Remove row ${index + 1}`} onClick={() => setRows(rows.filter(r => r.id !== row.id))}><X size={14} /></button>{duplicate(row) && <small className="full">Possible duplicate · will be skipped</small>}
    </div>)}</div><button className="button primary" onClick={commit}>Confirm & import selected <ArrowRight size={17} /></button></>}
  </section><aside className="import-aside"><section className="card"><span className="category-icon green"><ShieldCheck size={24} /></span><h3>Your PDF stays here</h3><p>This demo extracts text in your browser. The original file is never uploaded or retained.</p><p>Only confirmed transactions are saved to this browser’s demo workspace.</p></section><section className="card"><FileText className="accent" /><h3>A quick check goes a long way</h3><ol><li>Choose your statement and account.</li><li>Check proposed rows and duplicates.</li><li>Confirm the transactions you want.</li></ol><p className="muted">Scans need OCR and are not supported yet. Bank-specific templates are awaiting verified sample statements.</p></section></aside></div>;
}
