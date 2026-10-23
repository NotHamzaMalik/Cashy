import { auth } from '@clerk/nextjs/server';
import { readWorkspace, writeWorkspace } from '@/lib/database';
import { parseStore } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
export async function GET() {
  const { userId } = await auth();
  if (!userId) return reply({ error: 'Sign in to sync your workspace.' }, 401);
  try { return reply(await readWorkspace(userId)); }
  catch { return reply({ error: 'Cloud storage is unavailable. Your local changes are safe.' }, 503); }
}
export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid request origin.' }, 403);
  const { userId } = await auth();
  if (!userId) return reply({ error: 'Sign in to sync your workspace.' }, 401);
  let revision: number, store;
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required.' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Missing workspace.' }, 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 3_000_000) { await reader.cancel(); return reply({ error: 'Workspace exceeds the 3 MB cloud limit. Export a backup.' }, 413); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Number.isInteger(body.revision) || body.revision < 0 || body.revision >= 2147483647) throw new Error('Invalid revision');
    revision = body.revision; store = parseStore(body.store);
    if (store.accounts.some(a => a.owner !== 'me') || store.transactions.some(t => t.owner !== 'me')) throw new Error('Shared records require family permissions');
  } catch { return reply({ error: 'Invalid personal workspace.' }, 400); }
  try {
    const next = await writeWorkspace(userId, revision, store);
    return next === null ? reply({ error: 'Workspace changed on another device.' }, 409) : reply({ revision: next });
  } catch { return reply({ error: 'Cloud storage is unavailable. Your local changes are safe.' }, 503); }
}
