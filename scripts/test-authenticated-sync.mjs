// Opt-in integration check. Creates only temporary Clerk test users and removes them afterwards.
import { execSync } from 'node:child_process';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { chromium } from '@playwright/test';

const app = 'app_3L3dxL5dL7OlYxYZGthXPUK7wZP';
const files = 'test-results'; await mkdir(files, { recursive: true });
const users = [];
let browser;
function api(endpoint, options = '') {
  if (!/^\/[a-zA-Z0-9_/?=-]+$/.test(endpoint)) throw Error('Unsafe test endpoint');
  const raw = execSync(`clerk.cmd api ${endpoint} --app ${app} --instance dev ${options}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const result = JSON.parse(raw);
  const data = result.data || result;
  if (data.error || result.error) throw Error('Clerk CLI response: ' + JSON.stringify(data.error || result.error));
  return data;
}
const empty = { version: 1, accounts: [], transactions: [], budgets: [], goals: [], holdings: [], subscriptions: [] };
const origin = process.env.CASHY_TEST_ORIGIN || 'http://localhost:3100';
async function request(token, method = 'GET', body, extra = {}) {
  return fetch(origin + '/api/workspace', { method, redirect: 'manual', signal: AbortSignal.timeout(20000),
    headers: { Authorization: 'Bearer ' + token, Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
}
try {
  const tokens = [];
  for (let i = 0; i < 2; i++) {
    await writeFile(`${files}/temporary-user.json`, JSON.stringify({ email_address: [`cashy-sync-${randomUUID()}+clerk_test@example.com`], skip_password_requirement: true, first_name: 'Cashy Sync Test' }));
    const user = api('/users', '--file test-results/temporary-user.json --yes');
    if (!/^user_[a-zA-Z0-9]+$/.test(user.id)) throw Error('Unexpected Clerk create response keys: ' + Object.keys(user).join(','));
    users.push(user.id);
    await writeFile(`${files}/temporary-session.json`, JSON.stringify({ user_id: user.id }));
    const session = api('/sessions', '--file test-results/temporary-session.json --yes');
    await writeFile(`${files}/temporary-token.json`, '{}');
    const result = api(`/sessions/${session.id}/tokens`, '--file test-results/temporary-token.json --yes');
    if (!result.jwt) throw Error('Session token was not returned');
    tokens.push(result.jwt);
  }
  const [a, b] = tokens;
  assert.equal((await request(a)).status, 200);
  const first = await (await request(a)).json(); assert.equal(first.revision, 0);
  const data = { ...empty, accounts: [{ id: 'test-wallet', owner: 'me', name: 'Temporary wallet', kind: 'Cash', currency: 'PKR', opening: 12300, color: 'green' }] };
  const write = await request(a, 'PUT', { revision: 0, store: data }); assert.equal(write.status, 200);
  assert.equal((await (await request(a)).json()).store.accounts[0].opening, 12300);
  assert.deepEqual((await (await request(b)).json()).store, empty);
  assert.equal((await request(a, 'PUT', { revision: 0, store: empty })).status, 409);
  assert.equal((await request(a, 'PUT', { revision: 1, store: data }, { Origin: 'https://wrong.invalid' })).status, 403);
  assert.equal((await request(a, 'PUT', { revision: 1, store: { ...empty, transactions: [{}] } })).status, 400);
  console.log('Real Clerk-authenticated API: save/read, account isolation, stale revision, origin and validation checks passed.');
  if (process.argv.includes('--browser')) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    async function signIn(context, userId) {
      await writeFile(`${files}/temporary-signin.json`, JSON.stringify({ user_id: userId, expires_in_seconds: 600 }));
      const ticket = api('/sign_in_tokens', '--file test-results/temporary-signin.json --yes').token;
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 30000 });
      await page.evaluate(async ticket => {
        const result = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket });
        await window.Clerk.setActive({ session: result.createdSessionId });
      }, ticket);
      await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
      await page.getByText('Saved to cloud', { exact: true }).waitFor();
      return page;
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await signIn(context, users[0]);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
    await page.getByLabel('Merchant or description').fill('Offline groceries');
    await page.getByLabel('Amount', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Save transaction', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByText('Offline groceries', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: 'test-results/offline-reload-debug.png', fullPage: true });
    console.log('Offline reload:', await page.evaluate(() => ({ online: navigator.onLine, remembered: Boolean(localStorage.getItem('cashy-offline-user')), controlled: Boolean(navigator.serviceWorker.controller), clerkLoaded: Boolean(window.Clerk?.loaded), text: document.body.innerText.slice(0, 300) })));
    await Promise.race([
      page.getByRole('button', { name: 'Open device workspace', exact: true }).waitFor(),
      page.getByText('Offline groceries', { exact: true }).waitFor()
    ]);
    if (await page.getByRole('button', { name: 'Open device workspace', exact: true }).isVisible()) await page.getByRole('button', { name: 'Open device workspace', exact: true }).click();
    await page.getByText('Offline groceries', { exact: true }).waitFor();
    await page.screenshot({ path: 'test-results/offline-workspace.png', fullPage: true });
    await context.setOffline(false);
    await page.getByText('Saved to cloud', { exact: true }).waitFor({ timeout: 45000 });
    const fresh = await signIn(await browser.newContext(), users[0]);
    await fresh.getByText('Offline groceries', { exact: true }).waitFor();
    const other = await signIn(await browser.newContext(), users[1]);
    assert.equal(await other.getByText('Offline groceries', { exact: true }).count(), 0);
    assert.equal(await other.getByText('Temporary wallet', { exact: true }).count(), 0);
    console.log('Real browser: offline edit, offline reload, automatic reconnect, new-device cloud load and separate-user isolation passed.');
  }
} catch (error) {
  console.error('Authenticated API check failed:', error.code || error.name, String(error.message).replace(/(?:sk|pk)_(?:test|live)_[A-Za-z0-9]+/g, '[redacted]').replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted]'));
  if (error.stderr) console.error(String(error.stderr).replace(/(?:sk|pk)_(?:test|live)_[A-Za-z0-9]+/g, '[redacted]').replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted]'));
  process.exitCode = 1;
} finally {
  await browser?.close();
  const admin = postgres(process.env.CASHY_MIGRATION_DATABASE_URL, { ssl: { rejectUnauthorized: true, ca: await readFile('certs/supabase-ca.crt', 'utf8') }, max: 1 });
  try { if (users.length) await admin`delete from cashy.workspaces where user_id in ${admin(users)}`; }
  finally { await admin.end({ timeout: 1 }); }
  for (const id of users) { try { api(`/users/${id}`, '-X DELETE --yes'); } catch { console.error('Temporary Clerk user cleanup failed.'); process.exitCode = 1; } }
}
