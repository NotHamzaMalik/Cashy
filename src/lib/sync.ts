import type { Store } from './finance';
import { emptyStore, parseStore } from './storage';

export type CloudCopy = { revision: number; store: Store };
export type LocalCopy = { version: 1; userId: string; base: Store; revision: number; local: Store; conflict?: CloudCopy };
export type SyncStatus = 'loading' | 'saved' | 'pending' | 'syncing' | 'offline' | 'conflict' | 'error' | 'auth';
export const collections = ['accounts', 'transactions', 'budgets', 'goals', 'holdings', 'subscriptions'] as const;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
}
export const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
export function mergeStores(base: Store, local: Store, remote: Store): { store: Store; conflicts: string[] } {
  const result: Record<string, unknown> = { version: 1 }; const conflicts: string[] = [];
  for (const name of collections) {
    const b = new Map(base[name].map(row => [row.id, row]));
    const l = new Map(local[name].map(row => [row.id, row]));
    const r = new Map(remote[name].map(row => [row.id, row]));
    const rows: unknown[] = [];
    for (const id of new Set([...l.keys(), ...r.keys(), ...b.keys()])) {
      const before = b.get(id), here = l.get(id), there = r.get(id);
      let chosen;
      if (equal(here, there) || equal(before, there)) chosen = here;
      else if (equal(before, here)) chosen = there;
      else { conflicts.push(`${name}:${id}`); chosen = here; }
      if (chosen) rows.push(chosen);
    }
    result[name] = rows;
  }
  try { return { store: parseStore(result), conflicts }; }
  catch { return { store: local, conflicts: [...conflicts, 'related-records'] }; }
}
export interface LocalRepository {
  read(): Promise<LocalCopy>;
  update(change: (copy: LocalCopy) => LocalCopy): Promise<LocalCopy>;
  archive(copy: LocalCopy): Promise<void>;
}
export interface RemoteRepository {
  read(): Promise<CloudCopy>;
  write(revision: number, store: Store): Promise<number | null>;
}
export class SyncFailure extends Error {
  constructor(message: string, public status = 0) { super(message); }
}
export type SyncView = { copy: LocalCopy; status: SyncStatus; message?: string };

/** Synchronizes a durable local document. Network failures never roll back local edits. */
export class WorkspaceSync {
  private running?: Promise<void>;
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private retryMs = 2000;
  constructor(private local: LocalRepository, private remote: RemoteRepository,
    private online: () => boolean, private publish: (view: SyncView) => void,
    private lock: (work: () => Promise<void>) => Promise<void> = work => work()) {}

  private show(copy: LocalCopy, status: SyncStatus, message?: string) {
    if (!this.stopped) this.publish({ copy, status, message });
  }
  async refresh() {
    const copy = await this.local.read();
    this.show(copy, copy.conflict ? 'conflict' : !this.online() ? 'offline' : equal(copy.local, copy.base) ? 'saved' : 'pending');
  }
  async edit(next: Store, expected: Store) {
    const valid = parseStore(next);
    if (valid.accounts.some(a => a.owner !== 'me') || valid.transactions.some(t => t.owner !== 'me')) throw new Error('This is a personal workspace. Shared records need family permissions.');
    const copy = await this.local.update(current => {
      const merged = mergeStores(expected, valid, current.local);
      if (merged.conflicts.length) throw new Error('These records changed in another tab. Your form is still open; review the latest values before saving again.');
      return { ...current, local: merged.store };
    });
    this.show(copy, copy.conflict ? 'conflict' : this.online() ? 'pending' : 'offline');
    this.schedule(300);
  }
  async resolve(choice: 'local' | 'cloud') {
    // Archive both versions before making a deliberate whole-workspace choice.
    const current = await this.local.read();
    if (!current.conflict) return;
    await this.local.archive(current);
    const copy = await this.local.update(latest => {
      if (!equal(latest, current)) throw new Error('Workspace changed while resolving. Review the conflict again.');
      return { ...latest, base: current.conflict!.store, revision: current.conflict!.revision,
        local: choice === 'cloud' ? current.conflict!.store : latest.local, conflict: undefined };
    });
    this.show(copy, this.online() ? 'pending' : 'offline'); this.schedule(0);
  }
  schedule(ms = 0) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.sync(); }, ms);
  }
  sync(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    return this.running ??= this.lock(() => this.perform()).finally(() => { this.running = undefined; });
  }
  private async perform() {
    try {
      let copy = await this.local.read();
      if (!this.online()) { this.show(copy, 'offline'); return; }
      this.show(copy, 'syncing');
      // Bounded CAS retries if another device writes between our read and write.
      for (let attempt = 0; attempt < 3; attempt++) {
        const cloud = await this.remote.read();
        if (this.stopped) return;
        copy = await this.local.update(current => {
          const merged = mergeStores(current.base, current.local, cloud.store);
          if (merged.conflicts.length) return { ...current, conflict: cloud };
          return { ...current, base: cloud.store, revision: cloud.revision, local: merged.store, conflict: undefined };
        });
        if (copy.conflict) { this.show(copy, 'conflict'); return; }
        if (equal(copy.local, copy.base)) { this.retryMs = 2000; this.show(copy, 'saved'); return; }
        const candidate = copy.local;
        const revision = await this.remote.write(copy.revision, candidate);
        if (this.stopped) return;
        if (revision === null) continue;
        copy = await this.local.update(latest => latest.revision >= revision ? latest : ({ ...latest, base: candidate, revision }));
        this.retryMs = 2000;
        if (equal(copy.local, copy.base)) this.show(copy, 'saved');
        else { this.show(copy, 'pending'); this.schedule(500); }
        return;
      }
      throw new SyncFailure('Another device is updating this workspace. Retrying shortly.');
    } catch (error) {
      if (this.stopped) return;
      const copy = await this.local.read();
      const status = error instanceof SyncFailure ? error.status : 0;
      this.show(copy, !this.online() ? 'offline' : status === 401 ? 'auth' : 'error',
        error instanceof Error ? error.message : 'Sync could not complete.');
      if (status !== 401 && status !== 400 && status !== 413) {
        this.schedule(this.retryMs); this.retryMs = Math.min(this.retryMs * 2, 60000);
      }
    }
  }
  stop() { this.stopped = true; clearTimeout(this.timer); }
}
export function newLocalCopy(userId: string, store = emptyStore()): LocalCopy {
  return { version: 1, userId, base: emptyStore(), revision: 0, local: store };
}
