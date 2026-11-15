import { test, expect, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:4173";
const URL = `${BASE}/student?live=off`;
const Y = new Date().getFullYear();
const ref = (n: number) => `LRQ-${Y}-${String(n).padStart(5, "0")}`;
const po = (n: number) => `PO-${Y}-${String(n).padStart(4, "0")}`;
const kpi = (page: Page, label: string) => page.locator(".ly-stat", { hasText: label }).locator(".ly-stat-value");
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(URL);
});

test("S1+S2: greeting, completeness, KPIs, theme fonts and no overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.getByRole("heading", { name: "Hello, Amani.", exact: true })).toBeVisible();
  await expect(page.locator(".ov-complete")).toContainText("78%");
  await expect(kpi(page, "Active requests")).toHaveText("2");
  await expect(kpi(page, "Pending approvals")).toHaveText("1");
  await expect(kpi(page, "Total disbursed")).toHaveText("KES 84,500");
  const fonts = await page.evaluate(() => ({
    hello: getComputedStyle(document.querySelector(".ov-hello")!).fontFamily,
    kpi: getComputedStyle(document.querySelector(".ly-stat-value")!).fontFamily,
    cols: getComputedStyle(document.querySelector(".ov-kpis")!).gridTemplateColumns.split(" ").length,
  }));
  expect(fonts.hello).toContain("Lora");
  expect(fonts.kpi).toContain("Fraunces");
  expect(fonts.cols).toBe(4);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await page.locator("section[aria-label='My requests'] tbody tr").count()).toBe(2);
  expect(await page.locator("section[aria-label='Recent payouts'] tbody tr").count()).toBe(5);
  await page.screenshot({ path: "/tmp/student-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("New request wizard: term block, cap validation, proof gating, declaration, ref + one toast", async ({ page }) => {
  await page.locator(".student-topbar").getByRole("button", { name: "New request" }).click();
  const dlg = page.locator(".ly-dialog");
  await expect(dlg).toContainText("Already requested for");
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg).toContainText("Choose a category to continue.");
  await dlg.getByRole("button", { name: /Equipment/ }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();

  await page.locator("#nr-amount").fill("99999");
  await page.locator("#nr-why").fill("Too short");
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg).toContainText("Above the binding cap — the most you can request is KES 33,500.");
  await expect(dlg).toContainText("Give at least 50 characters");

  await page.locator("#nr-amount").fill("5000");
  await page.locator("#nr-why").fill("Stamped proforma for a scientific calculator and a set of STEM practical workbooks.");
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg).toContainText("Proof required for this category");
  await dlg.getByRole("button", { name: "Attach sample file" }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();

  await dlg.getByRole("button", { name: "Submit request" }).click();
  await expect(dlg).toContainText("Tick the declaration");
  await dlg.getByRole("checkbox").check();
  await dlg.getByRole("button", { name: "Submit request" }).click();
  await expect(dlg.getByRole("heading", { name: "Request submitted" })).toBeVisible();
  await expect(dlg).toContainText(ref(190));
  await expect(page.getByRole("status")).toHaveCount(1);

  await dlg.getByRole("button", { name: `Track ${ref(190)}` }).click();
  await expect(page.locator(".ly-drawer")).toContainText(ref(190));
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.locator(`tr[data-request='${ref(190)}']`)).toContainText("Submitted");
  await expect(kpi(page, "Active requests")).toHaveText("3");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Channel locking + draft persistence across reload", async ({ page }) => {
  await page.locator(".student-topbar").getByRole("button", { name: "New request" }).click();
  const dlg = page.locator(".ly-dialog");
  await dlg.getByRole("button", { name: /Exam registration/ }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#nr-method option")).toHaveCount(1);
  await expect(page.locator("#nr-method option")).toContainText("Kenya High School — Fees Paybill");
  await dlg.getByRole("button", { name: "Change category" }).click();
  await dlg.getByRole("button", { name: /Pocket money/ }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#nr-method option:disabled")).toContainText("pending verification");
  await page.locator("#nr-amount").fill("1500");
  await dlg.getByRole("button", { name: "Save draft" }).click();
  await expect(dlg).toHaveCount(0);
  await page.getByRole("tab", { name: /Drafts/ }).click();
  await expect(page.locator(`tr[data-request='${ref(190)}']`)).toContainText("Draft");
  await page.reload();
  await page.getByRole("tab", { name: /Drafts/ }).click();
  await expect(page.locator(`tr[data-request='${ref(190)}']`)).toContainText("KES 1,500");
  await page.getByRole("button", { name: `Actions for ${ref(190)}` }).click();
  await page.getByRole("menuitem", { name: "Resume draft" }).click();
  await expect(page.locator("#nr-amount")).toHaveValue("1500");
  await page.evaluate(() => localStorage.removeItem("learnly.request-drafts.v1"));
});

test("Row menu → upload proof resolves the flag; withdraw needs a reason", async ({ page }) => {
  await expect(page.getByText(`Upload proof to unlock ${ref(183)}`)).toBeVisible();
  await page.getByRole("button", { name: `Actions for ${ref(183)}` }).click();
  await page.getByRole("menuitem", { name: "Upload proof" }).click();
  const dlg = page.locator(".ly-dialog");
  await dlg.getByRole("button", { name: "Send for re-review" }).click();
  await expect(dlg).toContainText("Attach at least one document.");
  await dlg.getByRole("button", { name: "Attach sample file" }).click();
  await dlg.getByRole("button", { name: "Send for re-review" }).click();
  await expect(dlg.getByRole("heading", { name: "Proof sent for re-review" })).toBeVisible();
  await dlg.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(`tr[data-request='${ref(183)}']`)).toContainText("Submitted");
  await expect(page.getByText(`Upload proof to unlock ${ref(183)}`)).toHaveCount(0);

  await page.getByRole("button", { name: `Actions for ${ref(178)}` }).click();
  await page.getByRole("menuitem", { name: "Withdraw request" }).click();
  await dlg.getByRole("button", { name: "Withdraw request" }).click();
  await expect(dlg).toContainText("Add at least 10 characters");
  await page.locator("#wd-detail").fill("Family paid the balance directly.");
  await dlg.getByRole("button", { name: "Withdraw request" }).click();
  await expect(page.locator(`tr[data-request='${ref(178)}']`)).toHaveCount(0);
  await expect(kpi(page, "Pending approvals")).toHaveText("1");
  await page.getByRole("tab", { name: /Closed/ }).click();
  await expect(page.locator(`tr[data-request='${ref(178)}']`)).toContainText("Withdrawn");
});

test("Payout drawer → receipt download; Escape closes only the top overlay", async ({ page }) => {
  await page.locator(`tr[data-payout='${po(698)}']`).getByRole("button", { name: "View", exact: true }).click();
  const drawer = page.locator(".ly-drawer");
  await expect(drawer).toContainText("PSP-915588");
  await drawer.getByRole("button", { name: "Receipt" }).click();
  const dlg = page.locator(".ly-dialog");
  const [download] = await Promise.all([page.waitForEvent("download"), dlg.getByRole("button", { name: "Download receipt" }).click()]);
  expect(download.suggestedFilename()).toBe(`learnly-receipt-${po(698)}.txt`);
  await expect(dlg).toContainText("Receipt downloaded");
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0);
  await expect(drawer).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.getByRole("button", { name: `Actions for ${po(731)}` }).click();
  await page.getByRole("menuitem", { name: "Report an issue" }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg).toContainText("at least 20 characters");
  await page.locator("#ri-detail").fill("Mum has not received any M-Pesa message for this amount.");
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Send to Finance" }).click();
  await expect(dlg).toContainText(/SUP-\d{5}/);
  await dlg.getByRole("button", { name: "Open conversation" }).click();
  await expect(page.locator(".ly-drawer")).toContainText("Money not received");
});

test("Top-bar dropdowns deep-link; messages send; CSV export downloads", async ({ page }) => {
  await page.getByRole("button", { name: "Notifications, 3 unread" }).click();
  await page.getByRole("menuitem", { name: /New message from David Kimani Njoroge/ }).click();
  const drawer = page.locator(".ly-drawer");
  await expect(drawer).toContainText("re-queue it in the next batch");
  await drawer.getByLabel("Message").fill("Asante, I will let my mum know.");
  await drawer.getByRole("button", { name: "Send" }).click();
  await expect(drawer.locator(".chat-bubble.is-me").last()).toContainText("Asante, I will let my mum know.");
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByRole("button", { name: "Notifications, 2 unread" })).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Help & support" }).click();
  await expect(page.locator(".ly-dialog")).toContainText("How can we help?");
  await page.keyboard.press("Escape");

  await page.locator("section[aria-label='My requests']").getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator(".ly-dialog").getByRole("button", { name: "Download CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^learnly-requests-.*\.csv$/);
});

test("Sidebar panels: documents, settings language, account OTP verify raises completeness", async ({ page }) => {
  const side = page.locator(".student-sidebar");
  const drawer = page.locator(".ly-drawer");
  for (const [nav, title] of [["Financial assistance", "Requests & sponsor caps"], ["Academic records", "Your academic journey"], ["Related users", "People on your record"], ["Documents", "Your documents"], ["Notifications", "What's new"]] as const) {
    await side.getByRole("button", { name: new RegExp(`^${nav}`) }).click();
    await expect(drawer.locator(".ly-drawer-title")).toHaveText(title);
    await page.getByRole("button", { name: "Close panel" }).click();
    await expect(drawer).toHaveCount(0);
  }
  await side.getByRole("button", { name: /^Settings/ }).click();
  await drawer.getByRole("tab", { name: "Kiswahili" }).click();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.locator(".ov-hello")).toHaveText("Habari, Amani.");
  await expect(side).toContainText("Msaada wa kifedha");

  await side.getByRole("button", { name: /^Akaunti na malipo/ }).click();
  await drawer.getByRole("button", { name: "Verify this line" }).click();
  const dlg = page.locator(".ly-dialog");
  await dlg.getByRole("button", { name: "Verify & save" }).click();
  await expect(dlg).toContainText("That code doesn't match");
  await dlg.getByRole("button", { name: "Use 123456" }).click();
  await dlg.getByRole("button", { name: "Verify & save" }).click();
  await expect(dlg).toContainText("verified and now appears");
  await dlg.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.locator(".ov-complete")).toContainText("89%");
  await expect(page.getByText("Verify your M-Pesa line")).toHaveCount(0);
});

test("Live push: fees request approved then disbursed with row flash and new payout", async ({ page }) => {
  await page.clock.install();
  await page.goto(`${BASE}/student`);
  await expect(page.locator(`tr[data-request='${ref(178)}']`)).toContainText("Under review");
  await page.clock.fastForward(16_500);
  await expect(page.locator(`tr[data-request='${ref(178)}']`)).toContainText("Approved");
  await page.clock.fastForward(12_500);
  await expect(page.locator(`tr[data-payout='${po(764)}']`)).toContainText("Settled");
  await page.clock.fastForward(3_000);
  await expect(kpi(page, "Total disbursed")).toHaveText("KES 137,900");
  await expect(page.getByRole("button", { name: "Notifications, 5 unread" })).toBeVisible();
});

test("360px mobile: no overflow, stacked tables, offcanvas nav, full-screen drawer + wizard", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  const info = await page.evaluate(() => ({
    thead: getComputedStyle(document.querySelector(".responsive-table thead")!).display,
    kpiCols: getComputedStyle(document.querySelector(".ov-kpis")!).gridTemplateColumns.split(" ").length,
    sidebar: getComputedStyle(document.querySelector(".student-sidebar")!).visibility,
  }));
  expect(info).toEqual({ thead: "none", kpiCols: 1, sidebar: "hidden" });
  await page.screenshot({ path: "/tmp/student-mobile.png", fullPage: true });

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator(".student-sidebar").getByRole("button", { name: /^Financial assistance/ }).click();
  const drawer = page.locator(".ly-drawer");
  await expect(drawer).toBeVisible();
  expect(Math.round((await drawer.boundingBox())!.width)).toBe(360);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await drawer.getByRole("button", { name: "New request" }).click();
  await page.locator(".ly-dialog").getByRole("button", { name: /Fare/ }).click();
  await page.locator(".ly-dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#nr-amount")).toBeVisible();
  const dialogBox = (await page.locator(".ly-dialog").boundingBox())!;
  expect(dialogBox.width).toBeLessThanOrEqual(360);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/student-mobile-wizard.png" });
});

test("Reduced motion snaps KPI count-ups; dark mode keeps accents readable", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL);
  expect(await kpi(page, "Total disbursed").textContent()).toBe("KES 84,500");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
  await expect(page.locator(".ov-hello")).toHaveCSS("color", "rgb(96, 165, 250)");
  await page.screenshot({ path: "/tmp/student-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await ctx.close();
});

test("Sign-in routes a student into the dashboard; sign-out returns to sign-in", async ({ page }) => {
  await page.goto(`${BASE}/auth/signin`);
  await page.locator("#signin-identifier").fill("0712345678");
  await page.locator("#signin-password").fill("LearnlyStudent!25");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Open Student Overview →" }).click();
  await expect(page).toHaveURL(`${BASE}/student`);
  await expect(page.getByRole("heading", { name: "Hello, Amani.", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(/Student Overview/);
  await page.locator(".student-sidebar").getByRole("button", { name: /^Sign out/ }).click();
  await page.locator(".ly-dialog").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${BASE}/auth/signin`);
  expect(await page.evaluate(() => localStorage.getItem("learnly.session-preview.v1") ?? sessionStorage.getItem("learnly.session-preview.v1"))).toBeNull();
});
