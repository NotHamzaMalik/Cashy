'use client';
import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Download } from 'lucide-react';
import type { SyncView } from '@/lib/sync';
import { download } from './ui';

const labels = { loading: 'Opening workspace', saved: 'Saved to cloud', pending: 'Changes waiting to sync', syncing: 'Syncing', offline: 'Offline · saved on device', conflict: 'Review conflicting changes', error: 'Cloud sync paused', auth: 'Sign in again to sync' };
export function SyncStatusPanel({ view, retry, resolve }: { view: SyncView; retry: () => void; resolve: (choice: 'local' | 'cloud') => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function choose(choice: 'local' | 'cloud') {
    setBusy(true); setError('');
    try { await resolve(choice); } catch { setError('Resolution could not be saved. Both versions are still available.'); }
    finally { setBusy(false); }
  }
  const Icon = view.status === 'offline' ? CloudOff : ['error', 'conflict', 'auth'].includes(view.status) ? AlertCircle : view.status === 'syncing' ? RefreshCw : Cloud;
  return <section className={`sync-panel ${view.status}`} aria-label="Workspace sync">
    <div className="sync-line"><span role="status"><Icon size={16} /> {labels[view.status]}</span>
      {['pending', 'error', 'auth'].includes(view.status) && <button className="text-button" onClick={retry}>Retry sync</button>}</div>
    {view.message && <p>{view.message}</p>}
    {view.copy.conflict && <><p>Two devices changed the same records, or related records no longer match. Choose the complete version to keep. Both copies are saved as recovery backups before applying your choice.</p>
      <div className="button-row"><button className="button secondary small" onClick={() => download(JSON.stringify(view.copy, null, 2), 'cashy-conflict-backup.json', 'application/json')}><Download size={14} /> Export both copies</button>
      <button className="button secondary small" disabled={busy} onClick={() => { void choose('local'); }}>Keep this device’s version</button>
      <button className="button secondary small" disabled={busy} onClick={() => { void choose('cloud'); }}>Keep cloud version</button></div>
      {error && <p role="alert">{error}</p>}</>}
  </section>;
}
