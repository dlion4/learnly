import { test, expect } from '@playwright/test';
const base = 'http://127.0.0.1:4173';

test('settings preferences persist and account changes are clearly local', async ({page}) => {
  await page.goto(`${base}/student/settings?live=off`);
  await expect(page.getByRole('heading', {name:'Settings', exact:true})).toBeVisible();
  await page.getByLabel('Language', {exact:true}).selectOption('sw');
  await page.reload();
  await expect(page.getByLabel('Language', {exact:true})).toHaveValue('sw');
  await page.getByRole('button', {name:'Request deletion'}).click();
  await page.getByLabel('Reason for your request').fill('I want to understand the process before making a decision.');
  await page.getByRole('button', {name:'Continue'}).click();
  await page.getByLabel('I understand this is a demonstration.').check();
  await page.getByRole('button', {name:'Save local request'}).click();
  await expect(page.getByRole('dialog')).toContainText('No request was sent');
  await page.getByRole('button', {name:'Done'}).click();
  await expect(page.getByText('Deletion · Pending')).toBeVisible();
});

test('help search, guide and support request wizard', async ({page}) => {
  await page.goto(`${base}/student/help?live=off`);
  await page.getByLabel('Search help articles').fill('payout fails');
  await page.getByRole('button', {name:/What should I do if a payout fails/}).click();
  await expect(page.getByRole('dialog')).toContainText('Report an issue');
  await page.getByRole('button', {name:'Close', exact:true}).last().click();
  await page.getByRole('button', {name:'Contact support', exact:true}).first().click();
  await page.getByRole('button', {name:'Continue'}).click();
  await page.getByLabel('Subject').fill('Question about fees');
  await page.getByLabel('How can we help?').fill('Please help me understand the status of my fees request.');
  await page.getByRole('button', {name:'Continue'}).click();
  await page.getByRole('button', {name:'Save request'}).click();
  await expect(page.getByRole('dialog')).toContainText('not been sent');
});
