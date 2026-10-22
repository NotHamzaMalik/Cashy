import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const navigate = async (page: Page, name: string) => { await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('button', { name, exact: true }).click(); };
test('desktop dashboard, expense entry, search and persistence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your money, at a glance.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/cashy-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Merchant or description').fill('QA groceries');
  await page.getByLabel('Amount', { exact: true }).fill('1234.56');
  await page.getByLabel('Category', { exact: true }).selectOption('Groceries');
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await navigate(page, 'Transactions');
  await page.getByLabel('Search transactions').fill('QA groceries');
  await expect(page.getByRole('button', { name: /QA groceries/ })).toContainText('Rs 1,234.56');
  await page.reload();
  await expect(page.getByRole('button', { name: /QA groceries/ })).toBeVisible();
  await expect.poll(() => errors).toEqual([]);
});

test('family approval and child submission have one canonical total', async ({ page }) => {
  await page.goto('/#family');
  await expect(page.getByRole('heading', { name: 'Family', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Approve report' }).click();
  await expect(page.locator('.large-value')).toHaveText('Rs 2,600');
  await page.getByRole('button', { name: 'Child view' }).click();
  await page.getByRole('button', { name: 'Submit 1 expenses' }).click();
  await page.getByRole('button', { name: 'Parent view' }).click();
  await page.getByRole('button', { name: 'Approve report' }).click();
  await expect(page.locator('.large-value')).toHaveText('Rs 2,900');
  await page.screenshot({ path: 'test-results/cashy-family.png', fullPage: true });
  await page.getByRole('button', { name: 'Yearly', exact: true }).click();
  await expect(page.locator('.large-value')).toHaveText('Rs 2,900');
});

test('statement review imports selected rows and detects reimport duplicates', async ({ page }) => {
  await page.goto('/#import');
  await page.getByText('Paste or inspect statement text').click();
  await page.getByRole('button', { name: 'Try sample text' }).click();
  await expect(page.getByRole('heading', { name: '3 rows to review' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm & import selected' }).click();
  await expect(page.getByText('3 transactions added', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try sample text' }).click();
  await expect(page.getByText('Possible duplicate · will be skipped')).toHaveCount(3);
  await page.getByRole('button', { name: 'Confirm & import selected' }).click();
  await expect(page.locator('.form-error')).toContainText('No new selected rows');
});

function samplePdf(): Buffer {
  const stream = 'BT /F1 12 Tf 50 750 Td (13/10/2026 Test coffee 850.00 DR) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
test('real PDF extraction runs locally and produces an editable candidate', async ({ page }) => {
  await page.goto('/#import');
  await page.getByLabel('PDF statement', { exact: true }).setInputFiles({ name: 'sample-statement.pdf', mimeType: 'application/pdf', buffer: samplePdf() });
  await expect(page.getByRole('heading', { name: '1 rows to review' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel('Row 1 description')).toHaveValue('Test coffee');
  await expect(page.getByLabel('Row 1 amount')).toHaveValue('850.00');
  await page.screenshot({ path: 'test-results/cashy-import.png', fullPage: true });
});

test('mobile layout has no horizontal overflow and every module is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/cashy-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'More' }).click();
  await navigate(page, 'Import statements');
  await expect(page.getByRole('heading', { name: 'Import statements', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: 'test-results/cashy-mobile-light.png', fullPage: true });
});

test('planning forms create budgets, goals, holdings and USD accounts', async ({ page }) => {
  await page.goto('/#budgets');
  await page.getByRole('button', { name: 'Create budget', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Category', { exact: true }).selectOption('Health');
  await page.getByLabel('Monthly limit').fill('15000');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.locator('.budget-card').filter({ hasText: 'Health' })).toContainText('Rs 15,000');
  await navigate(page, 'Savings goals');
  await page.getByRole('button', { name: 'New goal' }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Learning fund');
  await page.getByLabel('Target amount').fill('50000');
  await page.getByRole('button', { name: 'Save goal' }).click();
  await expect(page.locator('.goal-card').filter({ hasText: 'Learning fund' })).toContainText('Rs 50,000');
  await navigate(page, 'Investments');
  await page.getByRole('button', { name: 'Add investment', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Test holding');
  await page.getByLabel('Cost basis', { exact: true }).fill('10000');
  await page.getByLabel('Current valuation', { exact: true }).fill('11000');
  await page.getByRole('button', { name: 'Save holding' }).click();
  await expect(page.locator('.holding-card').filter({ hasText: 'Test holding' })).toContainText('Rs 1,000');
  await navigate(page, 'Accounts');
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('USD travel');
  await page.getByRole('dialog').getByLabel('Transaction currency').selectOption('USD');
  await page.getByLabel('Opening balance').fill('120');
  await page.getByRole('button', { name: 'Save account' }).click();
  await page.getByLabel('Currency', { exact: true }).selectOption('USD');
  await expect(page.getByRole('button', { name: /USD travel/ })).toContainText('$ 120');
  await expect(page.getByRole('button', { name: /Everyday account/ })).toHaveCount(0);
});

test('all modules fit a narrow phone and a tablet', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['overview', 'transactions', 'accounts', 'budgets', 'goals', 'investments', 'reports', 'family', 'subscriptions', 'import', 'assistant', 'settings']) {
      await page.evaluate(route => { window.location.hash = route; }, route);
      await expect(page.locator('.page-heading h1')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { message: `${route} overflows at ${width}px` }).toBeTruthy();
    }
  }
});
