import { test, expect } from '@playwright/test';

test('signed-out visitors cannot open finance records or legacy demo data', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cashy-demo-v1', JSON.stringify({ accounts: [{ name: 'Legacy demo account' }] })));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Cashy' })).toBeVisible();
  await expect(page.locator('.stats-grid')).toHaveCount(0);
  await expect(page.getByText('Legacy demo account')).toHaveCount(0);
  await expect(page.getByText('Demo · local data', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('unauthenticated cloud requests cannot read or write finance records', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Cashy' })).toBeVisible();
  expect((await page.request.get('/api/workspace')).status()).toBe(401);
  const put = await page.request.put('/api/workspace', { headers: { Origin: 'http://localhost:3100' }, data: { revision: 0, store: {} } });
  expect(put.status()).toBe(401);
});
