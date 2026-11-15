import { test, expect } from '@playwright/test';

test('financial assistance route, filters, category dialog and request details work', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/student/financial-assistance?live=off');
  await expect(page.getByRole('heading', { name: 'Financial assistance', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Request history' })).toBeVisible();
  await page.getByRole('tab', { name: /Rejected/ }).click();
  await expect(page.getByText(`LRQ-${new Date().getFullYear()}-00157`).first()).toBeVisible();
  await page.getByRole('tab', { name: /^All/ }).click();
  await page.getByRole('button', { name: /School fees.*Proof required/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Available to request');
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.getByRole('button', { name: new RegExp(`LRQ-${new Date().getFullYear()}-00178`) }).first().click();
  await expect(page.getByText('Justification')).toBeVisible();
});
