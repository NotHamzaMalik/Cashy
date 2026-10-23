import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { readWorkspace, writeWorkspace } from '../src/lib/database';
import { emptyStore } from '../src/lib/storage';

test('Supabase revision writes and database ownership policy', async () => {
  const a = 'cashy_test_' + randomUUID(), b = 'cashy_test_' + randomUUID();
  const options = { ssl: { rejectUnauthorized: true, ca: readFileSync('certs/supabase-ca.crt', 'utf8') }, max: 1, prepare: false };
  const admin = postgres(process.env.CASHY_MIGRATION_DATABASE_URL!, options);
  const runtime = postgres(process.env.DATABASE_URL!, options);
  try {
    assert.deepEqual(await readWorkspace(a), { revision: 0, store: emptyStore() });
    const personal = emptyStore(); personal.accounts.push({ id: 'a', name: 'Test wallet', owner: 'me', opening: 0, kind: 'Cash', currency: 'PKR', color: 'green' });
    assert.equal(await writeWorkspace(a, 0, personal), 1);
    assert.equal(await writeWorkspace(a, 0, emptyStore()), null);
    assert.equal(await writeWorkspace(a, 99, emptyStore()), null);
    assert.equal((await readWorkspace(a)).store.accounts.length, 1);
    assert.deepEqual((await readWorkspace(b)).store, emptyStore());
    assert.equal(await writeWorkspace(b, 0, emptyStore()), 1);
    await runtime.begin(async sql => {
      await sql`select set_config('cashy.user_id', ${b}, true)`;
      assert.equal((await sql`select * from cashy.workspaces where user_id = ${a}`).length, 0);
      assert.equal((await sql`update cashy.workspaces set revision = 9 where user_id = ${a} returning revision`).length, 0);
    });
    await assert.rejects(runtime.begin(async sql => {
      await sql`select set_config('cashy.user_id', ${b}, true)`;
      await sql`insert into cashy.workspaces (user_id, revision, data) values (${a + '_forbidden'}, 1, ${sql.json(emptyStore())})`;
    }), (error: unknown) => (error as { code: string }).code === '42501');
    assert.equal(await writeWorkspace(a, 1, emptyStore()), 2);
    assert.equal((await readWorkspace(a)).store.accounts.length, 0);
  } finally {
    await admin`delete from cashy.workspaces where user_id in (${a}, ${b}, ${a + '_forbidden'})`;
    await runtime.end({ timeout: 1 }); await admin.end({ timeout: 1 });
  }
});
