import { parseStore } from './storage';
import { SyncFailure, type RemoteRepository } from './sync';

async function request(method: 'GET' | 'PUT', scope?: string, body?: unknown) {
  const response = await fetch(scope ? '/api/workspace?workspace=' + encodeURIComponent(scope) : '/api/workspace', {
    method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (response.status === 409) return null;
  let data;
  try { data = await response.json(); } catch { throw new SyncFailure('Cloud returned an invalid response.', response.status); }
  if (!response.ok) throw new SyncFailure(data.error || 'Cloud storage is unavailable.', response.status);
  if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw new SyncFailure('Cloud returned an invalid revision.');
  return data;
}
export const workspaceRemote = (scope?: string): RemoteRepository => ({
  async read() {
    const data = await request('GET', scope);
    if (!data) throw new SyncFailure('Cloud workspace is unavailable.');
    return { revision: data.revision, store: parseStore(data.store) };
  },
  async write(revision, store) { return (await request('PUT', scope, { revision, store }))?.revision ?? null; }
});
