import { test, expect } from '@playwright/test';
const url = 'http://127.0.0.1:4173/admin';

test.beforeEach(async ({page}) => {
  await page.goto(url);
  await page.evaluate(() => {localStorage.removeItem('learnly.admin-requests.v1');localStorage.removeItem('learnly.admin-alerts.v1');});
  await page.reload();
});

test('admin command center shows data, filters and review details', async ({page}) => {
  await expect(page.getByRole('heading', {name:/Good day/})).toBeVisible();
  await expect(page.getByRole('heading', {name:'Pending approvals'})).toBeVisible();
  await page.getByRole('button', {name:'Open queue'}).click();
  await expect(page).toHaveURL(/\/admin\/approvals$/);
  await page.getByLabel('Search Approvals').fill('Amani');
  await expect(page.getByText('Amani Wanjiku Kamau')).toBeVisible();
  await page.locator('.aw-table').getByRole('button', {name:'Review'}).first().click();
  await page.getByRole('tab', {name:'Proof'}).click();
  await expect(page.getByText('Fee structure and previous results')).toBeVisible();
});

test('review decision changes the local queue and survives reload', async ({page}) => {
  await page.locator('.ad-queue').getByRole('button', {name:'Review'}).first().click();
  await page.getByRole('button', {name:'Approve request'}).click();
  await page.getByRole('button', {name:'Continue'}).click();
  await page.getByLabel('I understand this is a local demonstration.').check();
  await page.getByRole('button', {name:'Record demo decision'}).click();
  await expect(page.locator('.ad-kpi').filter({hasText:'Pending approvals'})).toContainText('11');
  await page.reload();
  await expect(page.locator('.ad-kpi').filter({hasText:'Pending approvals'})).toContainText('11');
});

test('alerts dismiss locally and report download is available', async ({page}) => {
  await page.getByRole('button', {name:'Dismiss 3 incomplete profiles'}).click();
  await expect(page.getByText('3 incomplete profiles')).toHaveCount(0);
  await page.getByRole('button', {name:'View reports'}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Export sample CSV'}).click();
  expect((await download).suggestedFilename()).toBe('learnly-admin-approvals.csv');
});
