import { type Transaction, type Currency, parseMoney, validDate, fingerprint } from './finance';
export type Candidate = { id: string; date: string; merchant: string; amount: string; type: 'income' | 'expense'; selected: boolean; duplicate: boolean };
// Conservative generic fallback. Only complete rows with a date, description and
// amount are proposed. Every proposed row requires review before ledger mutation.
export function parseStatement(text: string): Candidate[] {
  const result: Candidate[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+(?:PKR|Rs\.?|USD|\$)?\s*([\d,]+\.\d{2})\s*(CR|DR)?$/i);
    if (!match) continue;
    const raw = match[1];
    const date = /^\d{4}/.test(raw) ? raw : raw.slice(6) + '-' + raw.slice(3, 5) + '-' + raw.slice(0, 2);
    if (!validDate(date)) continue;
    try { parseMoney(match[3]); } catch { continue; }
    result.push({ id: `candidate-${result.length}`, date, merchant: match[2].trim(), amount: match[3].replace(/,/g, ''), type: match[4]?.toUpperCase() === 'CR' ? 'income' : 'expense', selected: true, duplicate: false });
  }
  return result;
}
export function prepareImport(candidates: Candidate[], existing: Transaction[], accountId: string, currency: Currency, owner: string): Transaction[] {
  const seen = new Set(existing.map(fingerprint));
  const output: Transaction[] = [];
  for (const c of candidates.filter(c => c.selected)) {
    if (!validDate(c.date) || !c.merchant.trim()) throw new Error('Review the date and description of every selected row.');
    const row: Transaction = { id: `import-${crypto.randomUUID()}`, owner, accountId, currency, date: c.date, merchant: c.merchant.trim(), amount: parseMoney(c.amount), type: c.type, category: 'Other', note: 'Reviewed PDF/text import' };
    const key = fingerprint(row);
    if (seen.has(key)) continue;
    seen.add(key); output.push(row);
  }
  return output;
}
