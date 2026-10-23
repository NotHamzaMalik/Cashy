import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { emptyStore, parseStore } from './storage';
import type { Store } from './finance';

let connection: ReturnType<typeof postgres> | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  return connection ??= postgres(process.env.DATABASE_URL, {
    ssl: { rejectUnauthorized: true, ca: readFileSync(path.join(process.cwd(), 'certs/supabase-ca.crt'), 'utf8') },
    max: 2, idle_timeout: 20, connect_timeout: 10, prepare: false
  });
}
export type CloudWorkspace = { revision: number; store: Store };
export async function readWorkspace(userId: string): Promise<CloudWorkspace> {
  return database().begin(async sql => {
    await sql`select set_config('cashy.user_id', ${userId}, true)`;
    const rows = await sql`select revision, data from cashy.workspaces where user_id = ${userId}`;
    return rows.length ? { revision: rows[0].revision, store: parseStore(rows[0].data) } : { revision: 0, store: emptyStore() };
  }) as Promise<CloudWorkspace>;
}
export async function writeWorkspace(userId: string, expectedRevision: number, store: Store): Promise<number | null> {
  return database().begin(async sql => {
    await sql`select set_config('cashy.user_id', ${userId}, true)`;
    const rows = expectedRevision === 0
      ? await sql`insert into cashy.workspaces (user_id, revision, data) values (${userId}, 1, ${sql.json(store)}) on conflict (user_id) do nothing returning revision`
      : await sql`update cashy.workspaces set data = ${sql.json(store)}, revision = revision + 1, updated_at = now() where user_id = ${userId} and revision = ${expectedRevision} returning revision`;
    return rows.length ? rows[0].revision : null;
  }) as Promise<number | null>;
}
