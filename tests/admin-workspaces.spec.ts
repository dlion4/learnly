import { test, expect } from '@playwright/test';
const base='http://127.0.0.1:4173';
for (const [path,title] of [['students','Student management'],['approvals','Approvals'],['disbursements','Disbursements & payouts'],['academic-verification','Academic verification'],['schools','Schools & institutions']]) {
  test(`${title} route has a table and opens a detail drawer`,async ({page})=>{
    await page.goto(`${base}/admin/${path}`);
    await expect(page.getByRole('heading',{name:title,exact:true}).first()).toBeVisible();
    await expect(page.locator('.aw-table tbody tr').first()).toBeVisible();
    await page.locator('.aw-table tbody tr').first().getByRole('button',{name:/^(View|Review)/}).first().click();
    await expect(page.getByRole('dialog').last()).toBeVisible();
  });
}
test('onboarding adds a pending student to the sample roster',async ({page})=>{
 await page.goto(`${base}/admin/students`);
 await page.evaluate(()=>localStorage.removeItem('learnly.admin-students.v1')); await page.reload();
 await page.getByRole('button',{name:'Onboard student'}).click();
 await page.getByLabel('Student name').fill('Test Learner'); await page.getByLabel('School', {exact:true}).fill('Example School');
 await page.getByRole('button',{name:'Continue'}).click(); await page.getByLabel('I understand this is a demo.').check();
 await page.getByRole('button',{name:'Save demo action'}).click();
 await page.getByLabel('Search Student management').fill('Test Learner');
 await expect(page.getByText('Test Learner')).toBeVisible();
});
test('approval is stored locally and shown on the dashboard queue',async ({page})=>{
 await page.goto(`${base}/admin/approvals`);await page.evaluate(()=>localStorage.removeItem('learnly.admin-requests.v1'));await page.reload();
 await page.locator('.aw-table tbody tr').first().getByRole('button',{name:'Review'}).click();
 await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Continue'}).click();
 await page.getByLabel('I understand this is a demo.').check();await page.getByRole('button',{name:'Save demo action'}).click();
 await expect(page.locator('.aw-table tbody tr').first()).toContainText('Approved');
 await page.reload(); await expect(page.locator('.aw-table tbody tr').first()).toContainText('Approved');
});
