import postgres from 'postgres';
import { readFile, appendFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

if (!process.env.CASHY_MIGRATION_DATABASE_URL) throw new Error('Set CASHY_MIGRATION_DATABASE_URL in .env.local.');
const sql = postgres(process.env.CASHY_MIGRATION_DATABASE_URL, {
  ssl: { rejectUnauthorized: true, ca: await readFile('certs/supabase-ca.crt', 'utf8') },
  max: 1, connect_timeout: 15, onnotice: () => {}
});
try {
  await sql.unsafe(await readFile('supabase/migrations/202610230001_workspaces.sql', 'utf8'));
  if (!process.env.DATABASE_URL) {
    const password = randomBytes(32).toString('hex');
    // Generated hex is safe in this DDL literal. No supplied text is interpolated.
    await sql.unsafe(`alter role cashy_runtime login password '${password}'`);
    const url = new URL(process.env.CASHY_MIGRATION_DATABASE_URL);
    url.username = url.hostname.includes('pooler') ? 'cashy_runtime.' + url.username.split('.').slice(1).join('.') : 'cashy_runtime';
    url.password = password;
    await appendFile('.env.local', '\nDATABASE_URL=' + url.toString() + '\n');
    console.log('Restricted app connection saved to ignored .env.local. No credentials printed.');
  }
  console.log('Supabase workspace schema and ownership policy installed.');
} catch (error) {
  console.error('Database setup failed:', error.code || error.name);
  process.exitCode = 1;
} finally { await sql.end({ timeout: 2 }); }
