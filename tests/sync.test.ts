import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStore } from '../src/lib/storage';
import type { Store } from '../src/lib/finance';
import { mergeStores, newLocalCopy, WorkspaceSync, SyncFailure, type LocalCopy, type LocalRepository, type CloudCopy, type RemoteRepository, type SyncView } from '../src/lib/sync';

const account = (id: string, opening = 0) => ({ id, opening, owner: 'me', name: id, kind: 'Cash', currency: 'PKR' as const, color: 'green' });
const store = (...ids: string[]): Store => ({ ...emptyStore(), accounts: ids.map(id => account(id)) });
const clone = <T,>(value: T): T => structuredClone(value);
class Memory implements LocalRepository {
  copy = newLocalCopy('user_a'); archives: LocalCopy[] = []; fail = false;
  async read() { return clone(this.copy); }
  async update(change: (copy: LocalCopy) => LocalCopy) { if (this.fail) throw Error('disk full'); this.copy = clone(change(clone(this.copy))); return this.read(); }
  async archive(copy: LocalCopy) { if (this.fail) throw Error('disk full'); this.archives.push(clone(copy)); }
}
class Remote implements RemoteRepository {
  copy: CloudCopy = { revision: 0, store: emptyStore() }; writes = 0;
  async read() { return clone(this.copy); }
  async write(revision: number, data: Store) {
    if (revision !== this.copy.revision) return null;
    this.copy = { revision: revision + 1, store: clone(data) }; this.writes++; return this.copy.revision;
  }
}
function setup(online = true) {
  const local = new Memory(), remote = new Remote(); const views: SyncView[] = [];
  const network = { online };
  const sync = new WorkspaceSync(local, remote, () => network.online, view => views.push(view));
  return { local, remote, views, network, sync };
}
test('three-way merge combines unrelated edits and preserves deletions', () => {
  const base = store('a', 'b'), here = store('b', 'local'), cloud = store('a', 'b', 'remote');
  const merged = mergeStores(base, here, cloud);
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual(merged.store.accounts.map(a => a.id).sort(), ['b', 'local', 'remote']);
});
test('same-record edits and delete-versus-edit require resolution', () => {
  const base = store('a'), here = store('a'), cloud = store('a');
  here.accounts[0].opening = 100; cloud.accounts[0].opening = 200;
  assert.deepEqual(mergeStores(base, here, cloud).conflicts, ['accounts:a']);
  assert.deepEqual(mergeStores(base, emptyStore(), cloud).conflicts, ['accounts:a']);
});
test('independent edits cannot merge into orphaned financial records', () => {
  const base = store('a'), cloud = store('a');
  cloud.transactions.push({ id: 't', owner: 'me', merchant: 'Coffee', amount: 100, currency: 'PKR', date: '2026-10-23', type: 'expense', category: 'Other', accountId: 'a', note: '' });
  assert.ok(mergeStores(base, emptyStore(), cloud).conflicts.includes('related-records'));
});
test('offline edit survives controller restart and uploads on reconnect', async () => {
  const x = setup(false);
  await x.sync.edit(store('a'), emptyStore());
  await x.sync.sync(); x.sync.stop();
  assert.equal(x.remote.writes, 0); assert.equal(x.local.copy.local.accounts.length, 1);
  const next = new WorkspaceSync(x.local, x.remote, () => true, view => x.views.push(view));
  try { await next.sync(); assert.equal(x.remote.copy.store.accounts[0].id, 'a'); assert.equal(x.views.at(-1)?.status, 'saved'); }
  finally { next.stop(); }
});
test('new device loads cloud records instead of uploading an empty workspace', async () => {
  const x = setup(); x.remote.copy = { revision: 7, store: store('cloud') };
  try { await x.sync.sync(); assert.equal(x.local.copy.local.accounts[0].id, 'cloud'); assert.equal(x.local.copy.revision, 7); assert.equal(x.remote.writes, 0); }
  finally { x.sync.stop(); }
});
test('an edit made during upload remains pending after that upload is acknowledged', async () => {
  const x = setup(); await x.sync.edit(store('a'), emptyStore());
  let release!: () => void, entered!: () => void;
  const uploading = new Promise<void>(resolve => { entered = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  const write = x.remote.write.bind(x.remote);
  x.remote.write = async (revision, data) => { entered(); await wait; return write(revision, data); };
  try {
    const syncing = x.sync.sync(); await uploading;
    await x.sync.edit(store('a', 'b'), store('a')); release(); await syncing;
    assert.equal(x.local.copy.base.accounts.length, 1); assert.equal(x.local.copy.local.accounts.length, 2);
    await x.sync.sync(); assert.equal(x.remote.copy.store.accounts.length, 2);
  } finally { release(); x.sync.stop(); }
});
test('competing device write retries CAS without losing either independent edit', async () => {
  const x = setup(); await x.sync.edit(store('local'), emptyStore());
  const write = x.remote.write.bind(x.remote); let raced = false;
  x.remote.write = async (revision, data) => {
    if (!raced) { raced = true; x.remote.copy = { revision: 1, store: store('remote') }; return null; }
    return write(revision, data);
  };
  try { await x.sync.sync(); assert.deepEqual(x.remote.copy.store.accounts.map(a => a.id).sort(), ['local', 'remote']); }
  finally { x.sync.stop(); }
});
test('conflict persists without a cloud overwrite and resolution archives both versions', async () => {
  const x = setup(); x.local.copy = { ...newLocalCopy('user_a', store('a')), base: store('a'), revision: 1 };
  x.local.copy.local.accounts[0].opening = 100;
  x.remote.copy = { revision: 2, store: store('a') }; x.remote.copy.store.accounts[0].opening = 200;
  try {
    await x.sync.sync(); assert.equal(x.views.at(-1)?.status, 'conflict'); assert.equal(x.remote.writes, 0);
    await x.sync.resolve('local'); await x.sync.sync();
    assert.equal(x.local.archives.length, 1); assert.equal(x.local.archives[0].conflict?.store.accounts[0].opening, 200);
    assert.equal(x.remote.copy.store.accounts[0].opening, 100);
  } finally { x.sync.stop(); }
});
test('choosing cloud also archives the device version and never uploads it', async () => {
  const x = setup(); x.local.copy.conflict = { revision: 2, store: store('cloud') }; x.local.copy.local = store('local');
  x.remote.copy = clone(x.local.copy.conflict);
  try { await x.sync.resolve('cloud'); await x.sync.sync(); assert.equal(x.remote.writes, 0); assert.equal(x.local.archives[0].local.accounts[0].id, 'local'); }
  finally { x.sync.stop(); }
});
test('failed device write or archive is never reported as saved', async () => {
  const x = setup(); x.local.fail = true;
  try {
    await assert.rejects(x.sync.edit(store('a'), emptyStore()), /disk full/);
    assert.equal(x.views.length, 0); assert.equal(x.local.copy.local.accounts.length, 0);
    x.local.copy.conflict = { revision: 1, store: store('cloud') };
    await assert.rejects(x.sync.resolve('cloud'), /disk full/); assert.ok(x.local.copy.conflict);
  } finally { x.sync.stop(); }
});
test('expired authentication and network errors preserve pending data', async () => {
  for (const status of [401, 503]) {
    const x = setup(); await x.sync.edit(store('local'), emptyStore());
    x.remote.read = async () => { throw new SyncFailure('Unavailable', status); };
    try { await x.sync.sync(); assert.equal(x.local.copy.local.accounts[0].id, 'local'); assert.equal(x.views.at(-1)?.status, status === 401 ? 'auth' : 'error'); }
    finally { x.sync.stop(); }
  }
});
test('stale tab edits merge independent records but cannot silently overwrite the same record', async () => {
  const x = setup(false); x.local.copy.local = store('a');
  try {
    await x.sync.edit(store('b'), emptyStore()); assert.equal(x.local.copy.local.accounts.length, 2);
    const expected = clone(x.local.copy.local), edited = clone(expected);
    x.local.copy.local.accounts[0].opening = 100; edited.accounts[0].opening = 200;
    await assert.rejects(x.sync.edit(edited, expected), /another tab/);
    assert.equal(x.local.copy.local.accounts[0].opening, 100);
  } finally { x.sync.stop(); }
});
