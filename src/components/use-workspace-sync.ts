'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Store } from '@/lib/finance';
import { BrowserWorkspace } from '@/lib/workspace-cache';
import { WorkspaceSync, type SyncView } from '@/lib/sync';
import { workspaceRemote } from '@/lib/workspace-remote';

export function useWorkspaceSync(userId: string) {
  const [view, setView] = useState<SyncView>();
  const [error, setError] = useState('');
  const controller = useRef<WorkspaceSync | null>(null);
  const repository = useRef<BrowserWorkspace | null>(null);
  useEffect(() => {
    let active = true;
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cashy:' + userId) : null;
    const local = new BrowserWorkspace(userId, () => channel?.postMessage('changed'));
    repository.current = local;
    const sync = new WorkspaceSync(local, workspaceRemote, () => navigator.onLine,
      next => { if (active) setView(next); },
      work => navigator.locks ? navigator.locks.request('cashy-sync:' + userId, work) : work());
    controller.current = sync;
    const reconnect = () => sync.schedule();
    const refresh = () => { void sync.refresh().catch(() => { if (active) setError('Device storage could not be read.'); }); };
    const visible = () => { if (document.visibilityState === 'visible') reconnect(); };
    channel?.addEventListener('message', refresh);
    window.addEventListener('online', reconnect); window.addEventListener('offline', refresh);
    window.addEventListener('focus', reconnect); document.addEventListener('visibilitychange', visible);
    const interval = setInterval(reconnect, 30000);
    void local.migrateLegacy().then(async () => { if (active) { await sync.refresh(); sync.schedule(); } })
      .catch(() => { if (active) setError('Your device workspace could not be opened. Stored data has been left untouched.'); });
    return () => {
      active = false; sync.stop(); channel?.close(); clearInterval(interval);
      window.removeEventListener('online', reconnect); window.removeEventListener('offline', refresh);
      window.removeEventListener('focus', reconnect); document.removeEventListener('visibilitychange', visible);
      if (controller.current === sync) controller.current = null;
    };
  }, [userId]);
  const edit = useCallback(async (next: Store, expected: Store) => {
    if (!controller.current) throw new Error('Workspace is still opening.');
    await controller.current.edit(next, expected);
  }, []);
  const resolve = useCallback(async (choice: 'local' | 'cloud') => {
    if (!controller.current) throw new Error('Workspace is still opening.');
    await controller.current.resolve(choice);
  }, []);
  return { view, error, edit, resolve, retry: () => controller.current?.schedule(),
    recoveries: () => repository.current?.recoveries() ?? Promise.resolve([]) };
}
