import { auth } from '@clerk/nextjs/server';
import { createFamily, getFamilyStatus, joinFamily, type FamilyRole } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });

export async function GET() {
  const { userId } = await auth();
  if (!userId) return reply({ error: 'Sign in to open your workspace.' }, 401);
  try { return reply({ family: await getFamilyStatus(userId) }); }
  catch { return reply({ error: 'Workspace setup is unavailable.' }, 503); }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid request origin.' }, 403);
  const { userId } = await auth();
  if (!userId) return reply({ error: 'Sign in to set up your workspace.' }, 401);
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required.' }, 415);
    const text = await request.text();
    if (text.length > 20_000) return reply({ error: 'Request is too large.' }, 413);
    const body = JSON.parse(text);
    const action = String(body.action || '');
    const role = String(body.role || '') as FamilyRole;
    const displayName = String(body.displayName || '').trim();
    if (!['dad', 'manager'].includes(role) || !displayName || displayName.length > 100) return reply({ error: 'Check your name and role.' }, 400);
    if (action === 'create') {
      const name = String(body.name || '').trim();
      if (!name || name.length > 100) return reply({ error: 'Add a workspace name.' }, 400);
      return reply({ family: await createFamily(userId, name, role, displayName) });
    }
    if (action === 'join') {
      const code = String(body.code || '').trim().toUpperCase();
      if (!/^[A-F0-9]{8}$/.test(code)) return reply({ error: 'Enter the 8-character invite code.' }, 400);
      return reply({ family: await joinFamily(userId, code, role, displayName) });
    }
    return reply({ error: 'Unknown workspace action.' }, 400);
  } catch (error) {
    const message = error instanceof Error && /invalid invite/i.test(error.message) ? 'That invite code was not found.' : 'Workspace setup could not be completed.';
    return reply({ error: message }, 400);
  }
}
