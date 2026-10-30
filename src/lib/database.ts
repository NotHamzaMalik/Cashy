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
export type FamilyRole = 'dad' | 'manager';
export type FamilyStatus = { id: string; name: string; inviteCode: string; role: FamilyRole; displayName: string; members: { displayName: string; role: FamilyRole }[] };

async function identify(sql: postgres.TransactionSql, userId: string) {
  await sql`select set_config('cashy.user_id', ${userId}, true)`;
}
export async function getFamilyStatus(userId: string): Promise<FamilyStatus | null> {
  return database().begin(async sql => {
    await identify(sql, userId);
    const rows = await sql`select cashy.family_status() as status`;
    return rows[0]?.status ?? null;
  }) as Promise<FamilyStatus | null>;
}
export async function createFamily(userId: string, name: string, role: FamilyRole, displayName: string): Promise<FamilyStatus> {
  return database().begin(async sql => {
    await identify(sql, userId);
    const personal = await sql`select data from cashy.workspaces where user_id = ${userId}`;
    const initial = personal.length ? parseStore(personal[0].data) : emptyStore();
    const rows = await sql`select cashy.create_family(${name}, ${role}, ${displayName}, ${sql.json(initial)}) as status`;
    return rows[0].status;
  }) as Promise<FamilyStatus>;
}
export async function joinFamily(userId: string, code: string, role: FamilyRole, displayName: string): Promise<FamilyStatus> {
  return database().begin(async sql => {
    await identify(sql, userId);
    const rows = await sql`select cashy.join_family(${code}, ${role}, ${displayName}) as status`;
    return rows[0].status;
  }) as Promise<FamilyStatus>;
}
export async function readWorkspace(userId: string): Promise<CloudWorkspace> {
  return database().begin(async sql => {
    await identify(sql, userId);
    const family = await sql`select * from cashy.read_family_workspace()`;
    if (family.length) return { revision: family[0].revision, store: parseStore(family[0].data) };
    const personal = await sql`select revision, data from cashy.workspaces where user_id = ${userId}`;
    return personal.length ? { revision: personal[0].revision, store: parseStore(personal[0].data) } : { revision: 0, store: emptyStore() };
  }) as Promise<CloudWorkspace>;
}
export async function writeWorkspace(userId: string, expectedRevision: number, store: Store): Promise<number | null> {
  return database().begin(async sql => {
    await identify(sql, userId);
    const status = await sql`select cashy.family_status() as status`;
    if (status[0]?.status) {
      const rows = await sql`select cashy.write_family_workspace(${expectedRevision}, ${sql.json(store)}) as revision`;
      return rows[0]?.revision ?? null;
    }
    const rows = expectedRevision === 0
      ? await sql`insert into cashy.workspaces (user_id, revision, data) values (${userId}, 1, ${sql.json(store)}) on conflict (user_id) do nothing returning revision`
      : await sql`update cashy.workspaces set data = ${sql.json(store)}, revision = revision + 1, updated_at = now() where user_id = ${userId} and revision = ${expectedRevision} returning revision`;
    return rows.length ? rows[0].revision : null;
  }) as Promise<number | null>;
}
