import { test, expect, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:4173";
const URL = `${BASE}/student/profile?live=off`;
const dlg = (p: Page) => p.locator(".ly-dialog");
const drw = (p: Page) => p.locator(".ly-drawer");
const overflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(URL);
});

test("layout, header, eight-tab index and five-item scrollspy rail", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.getByRole("heading", { name: "Amani Wanjiku Kamau", level: 1 })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(8);
  await expect(page.locator(".pf-rail-item")).toHaveCount(5);
  await expect(page.locator(".pf-rail-item.is-active")).toHaveCount(1);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Home", exact: true })).toHaveAttribute("aria-selected", "true", { timeout: 6000 });
  await page.locator(".pf-rail-item", { hasText: "School & teachers" }).click();
  await expect(page).toHaveURL(`${BASE}/student/profile#school`);
  expect(errors).toEqual([]);
});

test("locked fields explain themselves; the correction wizard submits and can be withdrawn", async ({ page }) => {
  await page.getByRole("button", { name: "Locked: Date of birth. Request a correction." }).click();
  await expect(dlg(page)).toContainText("Date of birth is locked");
  await dlg(page).getByRole("button", { name: "Request a correction" }).click();
  await dlg(page).getByLabel("Which field?").selectOption("Date of birth");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await expect(dlg(page)).toContainText("Enter the correct value.");
  await dlg(page).getByLabel("Correct value").fill("2011-03-15");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await expect(dlg(page)).toContainText("Attach at least one piece of evidence.");
  await dlg(page).getByRole("button", { name: "Attach sample file" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Submit for verification" }).click();
  await expect(dlg(page)).toContainText("Tick the declaration");
  await dlg(page).getByRole("checkbox").check();
  await dlg(page).getByRole("button", { name: "Submit for verification" }).click();
  await expect(dlg(page)).toContainText("Correction request sent");
  await dlg(page).getByRole("button", { name: "Done" }).click();
  const row = page.locator(".pf-correction", { hasText: "Date of birth" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Withdraw" }).click();
  await expect(row).toHaveCount(0);
});

test("languages need one choice; edit profile saves a diff that appears in change history", async ({ page }) => {
  await page.getByRole("button", { name: "Edit languages spoken" }).click();
  for (const l of ["English", "Kiswahili", "Gĩkũyũ"]) await dlg(page).getByRole("button", { name: l, exact: true }).click();
  await expect(dlg(page)).toContainText("Select at least one language.");
  await dlg(page).getByRole("button", { name: "Dholuo", exact: true }).click();
  await dlg(page).getByRole("button", { name: "Review changes" }).click();
  await expect(dlg(page).locator(".diff-new", { hasText: "Dholuo" })).toBeVisible();
  await dlg(page).getByRole("button", { name: "Save languages" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await expect(page.locator(".pf-field", { hasText: "Languages spoken" })).toContainText("Dholuo");

  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByLabel("Preferred name").fill("Amy");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await expect(dlg(page).locator(".diff-new", { hasText: "Amy" })).toBeVisible();
  await dlg(page).getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await dlg(page).getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "More profile actions" }).click();
  await page.getByRole("menuitem", { name: "Change history" }).click();
  await expect(dlg(page).locator("table")).toContainText("Amy");
  await expect(dlg(page).locator("table")).toContainText("Dholuo");
});

test("edits survive navigation between student pages", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Preferred name" }).click();
  await dlg(page).getByLabel("Preferred name").fill("Amy");
  await dlg(page).getByRole("button", { name: "Review change" }).click();
  await dlg(page).getByRole("button", { name: "Save change" }).click();
  await page.locator(".student-sidebar").getByRole("link", { name: /Overview/ }).click();
  await expect(page).toHaveURL(`${BASE}/student`);
  await page.locator(".student-sidebar").getByRole("link", { name: /My profile/ }).click();
  await expect(page).toHaveURL(`${BASE}/student/profile`);
  await page.getByRole("button", { name: "Edit Preferred name" }).click();
  await expect(dlg(page).getByLabel("Preferred name")).toHaveValue("Amy");
});

test("photo upload updates the header; primary change and blocked removal", async ({ page }) => {
  await page.getByRole("button", { name: "Upload photo", exact: true }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await expect(dlg(page)).toContainText("Choose a photo first.");
  await dlg(page).getByRole("button", { name: "Attach sample file" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("status")).toContainText("Profile photo updated");
  await expect(page.locator(".pf-photo")).toContainText("v1");

  await page.locator(".pf-guardian", { hasText: "Mary Wairimu Mwangi" }).getByRole("button", { name: "Details" }).click();
  await drw(page).getByRole("button", { name: "Make primary contact" }).click();
  await expect(dlg(page)).toContainText("Make Mary Wairimu Mwangi your primary contact?");
  await dlg(page).getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator(".pf-guardian.is-primary")).toContainText("Mary Wairimu Mwangi");

  await page.locator(".pf-guardian", { hasText: "Esther Njeri Kamau" }).getByRole("button", { name: "Remove Esther Njeri Kamau" }).click();
  await dlg(page).getByRole("button", { name: "Remove guardian" }).click();
  await expect(dlg(page)).toContainText("Give an admin audit note");
  await dlg(page).getByLabel("Admin audit note").fill("Mother asked to be removed after moving abroad.");
  await dlg(page).getByLabel(/Confirmation code/).fill("123456");
  await dlg(page).getByRole("button", { name: "Remove guardian" }).click();
  await expect(dlg(page)).toContainText("removed");
  await dlg(page).getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".pf-guardian", { hasText: "Esther Njeri Kamau" })).toHaveCount(0);

  await page.locator(".pf-guardian", { hasText: "Mary Wairimu Mwangi" }).getByRole("button", { name: "Remove Mary Wairimu Mwangi" }).click();
  await expect(dlg(page)).toContainText("This is your only primary contact");
  await dlg(page).getByRole("button", { name: "Keep guardian" }).click();
});

test("add-guardian validation, then the four-guardian limit disables adding", async ({ page }) => {
  await page.getByRole("button", { name: "Add another guardian" }).click();
  await dlg(page).getByLabel("Full name").fill("Grace");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await expect(dlg(page)).toContainText("Enter the guardian's full name");
  await dlg(page).getByLabel("Full name").fill("Grace Wambui Njoroge");
  await dlg(page).getByLabel("Occupation").fill("Teacher");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByLabel("Mobile number").fill("12345");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await expect(dlg(page)).toContainText("Enter a Kenyan number");
  await dlg(page).getByLabel("Mobile number").fill("722345678");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Add guardian" }).click();
  await expect(page.getByRole("status")).toContainText("Guardian saved");
  await expect(dlg(page)).toContainText("Grace Wambui Njoroge is saved");
  await dlg(page).getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".pf-guardian")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Add another guardian" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Add guardian/ })).toBeDisabled();
});

test("home wizard, GPS fallback, pin nudge with arrow keys and a school transfer", async ({ page }) => {
  await page.getByRole("button", { name: "Edit address", exact: true }).click();
  for (let i = 0; i < 3; i++) await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Save address" }).click();
  await expect(dlg(page)).toContainText("No changes to save yet.");
  for (let i = 0; i < 3; i++) await dlg(page).getByRole("button", { name: "Back" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).locator("#hw-landmark").fill("Opposite Karatina Market, behind the tea kiosk");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Save address" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  await page.getByRole("button", { name: "Capture GPS" }).click();
  await dlg(page).getByRole("button", { name: "Capture from this device" }).click();
  await expect(dlg(page).getByRole("alert")).toContainText(/permission was denied|could not get a fix|cannot read device/);
  await dlg(page).getByRole("button", { name: "Enter manually" }).click();
  await dlg(page).getByLabel("Latitude").fill("-1.2921");
  await dlg(page).getByLabel("Longitude").fill("36.8219");
  await dlg(page).getByRole("button", { name: "Save position" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  await page.getByRole("button", { name: "Adjust pin" }).click();
  await dlg(page).getByRole("application").focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowUp");
  await expect(dlg(page)).toContainText("from the saved pin");
  await dlg(page).getByRole("button", { name: "Save position" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  await page.getByRole("button", { name: "Change school" }).click();
  await dlg(page).getByRole("button", { name: /Alliance High School/ }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByLabel("Tell us more").fill("Family moved to Kiambu; the learner needs a closer boarding school.");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Attach sample file" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Submit transfer" }).click();
  await expect(page.getByRole("status")).toContainText("Transfer request submitted");
  await expect(dlg(page)).toContainText(/TR-\d{4}-001/);
  await dlg(page).getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".pf-transfer")).toContainText("Alliance High School");
  await expect(page.locator(".pf-transfer")).toContainText("Pending admin approval");
});

test("identifiers, disability wizard, consent log export, teacher message and sidebar routing", async ({ page }) => {
  await page.locator(".pf-id-row", { hasText: "KPSEA index" }).click();
  await expect(dlg(page)).toContainText("Waiting for KNEC");
  await dlg(page).getByRole("button", { name: "Request a correction" }).click();
  await expect(dlg(page).getByLabel("Which field?")).toHaveValue("KPSEA index");
  await dlg(page).getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Record disability status" }).click();
  await dlg(page).getByRole("button", { name: "Physical", exact: true }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByLabel("Disability card number").fill("NCPWD-204481");
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Attach sample file" }).click();
  await dlg(page).getByRole("button", { name: "Continue" }).click();
  await dlg(page).getByRole("button", { name: "Save status" }).click();
  await expect(page.locator("#s-disability")).toContainText("Physical");
  await expect(page.locator("#s-disability")).toContainText("•••• 4481");

  await page.getByRole("button", { name: "View full consent log" }).click();
  await dlg(page).getByRole("tab", { name: /Marketing/ }).click();
  await expect(dlg(page).locator("tbody tr")).toHaveCount(3);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dlg(page).getByRole("button", { name: "Export CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("learnly-consent-log.csv");
  await dlg(page).getByRole("button", { name: "Close", exact: true }).last().click();

  await page.locator(".pf-teacher", { hasText: "Lucy" }).getByRole("button", { name: "View profile" }).click();
  await expect(drw(page)).toContainText("Mrs. Lucy Achieng Otieno");
  await drw(page).getByRole("tab", { name: /Subjects/ }).click();
  await expect(drw(page)).toContainText("Mathematics");
  await drw(page).getByRole("button", { name: "Send message" }).click();
  await expect(drw(page)).toContainText("New message");
  await expect(drw(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Close panel" }).click();

  await page.locator(".student-sidebar").getByRole("link", { name: /Overview/ }).click();
  await expect(page).toHaveURL(`${BASE}/student`);
});

test("disclosure sections collapse and expand", async ({ page }) => {
  const toggle = page.getByRole("button", { name: /Identity documents & indices/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".pf-id-row")).toHaveCount(0);
  await toggle.click();
  await expect(page.locator(".pf-id-row")).toHaveCount(8);
});

test("360px: stacked layout, index rail hidden, dialogs fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await expect(page.locator(".pf-rail")).toBeHidden();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  const box = await dlg(page).boundingBox();
  expect(box!.width).toBeLessThanOrEqual(360);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
