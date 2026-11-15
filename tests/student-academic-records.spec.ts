import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:4173/student/academic-records?live=off';

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => { localStorage.removeItem('learnly.academic-records.v1'); localStorage.removeItem('learnly.academic-reviews.v1'); });
  await page.reload();
});

test('S-4 shows the journey, filters results and opens term details', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Academic records', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your school journey' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand Mbagathi Junior School' }).click();
  await expect(page.getByText('Grade 9').first()).toBeVisible();
  await page.getByRole('tab', { name: /KJSEA/ }).click();
  await expect(page.locator('.ar-results-table tbody tr')).toHaveCount(1);
  await page.locator('.ar-results-table').getByRole('button', { name: 'View' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('term record wizard validates, saves and lists a pending review', async ({ page }) => {
  await page.locator('.ar-school').first().getByRole('button', { name: /Add term/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert')).toContainText('valid year');
  await page.getByLabel('Mean score (%)').fill('78');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await page.getByRole('button', { name: 'View review requests' }).click();
  await expect(page.getByRole('dialog')).toContainText('New term record');
  await page.reload();
  await expect(page.locator('.ar-stat').filter({ hasText: 'Terms recorded' })).toContainText('11');
});
