import { emptyStore, parseStore, workspaceKey } from './storage';
import { newLocalCopy, type LocalCopy, type LocalRepository } from './sync';

let opening: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  return opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('cashy-offline-v1', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('workspaces', { keyPath: 'userId' });
      request.result.createObjectStore('recoveries', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { opening = undefined; reject(request.error); };
    request.onblocked = () => { opening = undefined; reject(new Error('Close other Cashy tabs to open device storage.')); };
  });
}
function validate(copy: LocalCopy, userId: string): LocalCopy {
  if (copy.userId !== userId || copy.version !== 1 || !Number.isInteger(copy.revision) || copy.revision < 0) throw new Error('Invalid saved workspace metadata.');
  return { ...copy, local: parseStore(copy.local), base: parseStore(copy.base),
    conflict: copy.conflict ? { revision: copy.conflict.revision, store: parseStore(copy.conflict.store) } : undefined };
}
export class BrowserWorkspace implements LocalRepository {
  constructor(private userId: string, private notify: () => void = () => {}) {}
  async read(): Promise<LocalCopy> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workspaces', 'readonly');
      const request = transaction.objectStore('workspaces').get(this.userId);
      request.onsuccess = () => {
        try { resolve(validate(request.result || newLocalCopy(this.userId), this.userId)); }
        catch (error) { reject(error); }
      };
      request.onerror = () => reject(request.error);
    });
  }
  async update(change: (copy: LocalCopy) => LocalCopy): Promise<LocalCopy> {
    const db = await database();
    const result = await new Promise<LocalCopy>((resolve, reject) => {
      const transaction = db.transaction('workspaces', 'readwrite');
      const table = transaction.objectStore('workspaces');
      const request = table.get(this.userId); let next: LocalCopy; let error: unknown;
      request.onsuccess = () => {
        try { next = validate(change(validate(request.result || newLocalCopy(this.userId), this.userId)), this.userId); table.put(next); }
        catch (cause) { error = cause; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(next);
      transaction.onabort = () => reject(error || transaction.error || new Error('Device save failed.'));
      transaction.onerror = () => { /* onabort reports the final failure */ };
    });
    this.notify(); return result;
  }
  async migrateLegacy() {
    // The old per-user key only; never read the anonymous demo key.
    const db = await database();
    const exists = await new Promise<boolean>((resolve, reject) => {
      const request = db.transaction('workspaces').objectStore('workspaces').count(this.userId);
      request.onsuccess = () => resolve(request.result > 0); request.onerror = () => reject(request.error);
    });
    if (exists) return;
    const raw = localStorage.getItem(workspaceKey(this.userId));
    const initial = raw ? parseStore(JSON.parse(raw)) : emptyStore();
    if (initial.accounts.some(a => a.owner !== 'me') || initial.transactions.some(t => t.owner !== 'me')) throw new Error('Legacy workspace contains shared records. Export it before migrating.');
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workspaces', 'readwrite');
      const table = tx.objectStore('workspaces'); const request = table.get(this.userId);
      request.onsuccess = () => { if (!request.result) table.add(newLocalCopy(this.userId, initial)); };
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
  }
  async archive(copy: LocalCopy) {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('recoveries', 'readwrite');
      tx.objectStore('recoveries').add({ userId: this.userId, savedAt: new Date().toISOString(), copy });
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
  }
  async recoveries(): Promise<unknown[]> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction('recoveries').objectStore('recoveries').getAll();
      request.onsuccess = () => resolve(request.result.filter(row => row.userId === this.userId));
      request.onerror = () => reject(request.error);
    });
  }
}
