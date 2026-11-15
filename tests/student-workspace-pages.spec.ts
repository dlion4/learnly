import { test, expect } from '@playwright/test';
const base = 'http://127.0.0.1:4173';

test('related users can be filtered and added through a wizard', async ({ page }) => {
  await page.goto(`${base}/student/related-users?live=off`);
  await page.evaluate(() => localStorage.removeItem('learnly.related.v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Related users', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /School/ }).click();
  await expect(page.getByText('Mrs. Lucy Achieng Otieno')).toBeVisible();
  await page.getByRole('button', { name: 'Add a person' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Full name').fill('Test Guardian');
  await page.getByLabel('Relationship / role').fill('Guardian');
  await page.getByLabel('Phone number').fill('+254722123456');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await page.getByRole('tab', { name: /^All/ }).click();
  await expect(page.getByText('Test Guardian')).toBeVisible();
});

test('account and documents offer usable filters and details', async ({ page }) => {
  await page.goto(`${base}/student/account?live=off`);
  await expect(page.getByRole('heading', { name: 'Account & payout methods' })).toBeVisible();
  await page.getByRole('tab', { name: 'Category defaults' }).click();
  await expect(page.getByLabel('Default method for School fees')).toBeVisible();
  await page.goto(`${base}/student/documents?live=off`);
  await page.getByRole('tab', { name: /Academic/ }).click();
  await expect(page.getByText('KJSEA result slip (Grade 9)')).toBeVisible();
  await page.getByRole('button', { name: 'Verification queue' }).click();
  await expect(page.getByRole('heading', { name: 'Awaiting verification' })).toBeVisible();
});

test('messages and notifications update in the session', async ({ page }) => {
  await page.goto(`${base}/student/messages?live=off`);
  await page.getByLabel('Write a message').fill('Thank you for the update.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Thank you for the update.')).toBeVisible();
  await page.goto(`${base}/student/notifications?live=off`);
  await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.locator('.wp-stat').filter({ hasText: 'Unread' })).toContainText('0');
  await page.getByRole('button', { name: 'Clear read' }).click();
  await page.getByRole('button', { name: 'Clear read', exact: true }).last().click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
});
