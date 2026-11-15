import { test, expect } from "@playwright/test";

const URL = "http://127.0.0.1:4173/auth/signin";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(URL);
});

test("S1 brand header, active nav, desktop layout and form validation", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (err) => runtimeErrors.push(err.message));

  await expect(page.getByRole("heading", { name: /Welcome back to Learnly/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Account navigation" }).getByRole("link", { name: "Sign in" })).toHaveAttribute("aria-current", "page");

  const layout = await page.evaluate(() => {
    const header = document.querySelector(".signin-brand-header")!;
    const card = document.querySelector(".signin-card")!;
    const side = document.querySelector(".signin-companion")!;
    return {
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      headerBg: getComputedStyle(header).backgroundColor,
      headingFont: getComputedStyle(document.querySelector(".signin-brand-title")!).fontFamily,
      bodyFont: getComputedStyle(document.body).fontFamily,
      cardLeft: card.getBoundingClientRect().left,
      sideLeft: side.getBoundingClientRect().left,
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  expect(layout.headerBg).toBe("rgb(31, 58, 138)");
  expect(layout.headingFont).toContain("Fraunces");
  expect(layout.bodyFont).toContain("Inter");
  expect(layout.sideLeft).toBeGreaterThan(layout.cardLeft);

  // Validation on empty submit
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#signin-identifier")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#signin-password")).toHaveAttribute("aria-invalid", "true");
  expect(runtimeErrors).toEqual([]);
});

test("S2 student password sign-in, remember me 30d and role-aware redirect to /student", async ({ page }) => {
  await page.locator("#signin-identifier").fill("0712345678");
  await expect(page.getByText("🇰🇪 Kenyan mobile")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Sign in to Learnly" }).getByText("Amani Wanjiku Kamau"),
  ).toBeVisible();

  await page.locator("#signin-password").fill("LearnlyStudent!25");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.locator("#signin-password")).toHaveAttribute("type", "text");
  await page.locator("#signin-remember").check();

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Signed in as Amani Wanjiku Kamau", exact: true })).toBeVisible();
  await expect(page.getByText("S-1 Student Overview", { exact: true })).toBeVisible();
  await expect(page.getByText("Remembered for 30 days", { exact: true })).toBeVisible();

  // Safe persistence check — no password stored!
  const stored = await page.evaluate(() => localStorage.getItem("learnly.session-preview.v1"));
  expect(stored).toBeTruthy();
  expect(stored).not.toContain("LearnlyStudent!25");
  expect(JSON.parse(stored!).targetRoute).toBe("/student");
  expect(JSON.parse(stored!).remember30d).toBe(true);

  // Reload remembers session and lets user sign out
  await page.reload();
  await expect(page.getByText(/Signed in as.*Amani Wanjiku Kamau/)).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText(/Signed in as.*Amani Wanjiku Kamau/)).toHaveCount(0);
});

test("S3 passwordless OTP toggle sends SMS preview, verifies 6-digit auto-advance code", async ({ page }) => {
  await page.getByRole("tab", { name: "Sign in with OTP instead" }).click();
  await page.locator("#signin-otp-identifier").fill("+254722114509");
  await page.getByRole("button", { name: "Send 6-digit OTP", exact: true }).click();

  await expect(page.getByText(/Enter the 6-digit code sent to/)).toBeVisible();
  await expect(page.locator("#signin-otp-0")).toBeFocused();

  // Wrong code blocks
  await page.keyboard.type("999999");
  await page.getByRole("button", { name: "Verify & sign in →", exact: true }).click();
  await expect(page.getByText("Incorrect code. Use preview code 123456.", { exact: true })).toBeVisible();

  // Valid preview code completes sign-in to student workspace
  await page.getByRole("button", { name: "Use preview code 123456 →", exact: true }).click();
  await page.getByRole("button", { name: "Verify & sign in →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Signed in as Brian Otieno Ochieng", exact: true })).toBeVisible();
  await expect(page.getByText("Passwordless SMS OTP", { exact: true })).toBeVisible();
});

test("S4 inline 2FA TOTP challenge (30s countdown + recovery fallback) routes Super Admin to /admin", async ({ page }) => {
  // Click Super Admin preset from companion panel
  await page.getByRole("button", { name: /Grace Nyambura Mwangi/ }).click();
  await expect(page.locator("#signin-identifier")).toHaveValue("grace.mwangi@learnly.co.ke");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Inline 2FA challenge renders with 30s countdown and 6-digit input
  await expect(page.getByRole("region", { name: "Two-factor authentication challenge" })).toBeVisible();
  await expect(page.getByText(/Refreshes in \d+s/)).toBeVisible();
  await expect(page.locator("#signin-totp-0")).toBeFocused();

  // Wrong TOTP code rejected
  await page.keyboard.type("000000");
  await page.getByRole("button", { name: "Verify 2FA & sign in →", exact: true }).click();
  await expect(page.getByText(/Code didn't match/)).toBeVisible();

  // Recovery code path works too
  await page.getByRole("button", { name: "Use a recovery code instead", exact: true }).click();
  await page.getByRole("button", { name: "LY-8492-K9", exact: true }).click();
  await expect(page.locator("#signin-recovery")).toHaveValue("LY-8492-K9");
  await page.getByRole("button", { name: "Verify 2FA & sign in →", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Signed in as Grace Nyambura Mwangi", exact: true })).toBeVisible();
  await expect(page.getByText("AD-1 Admin Command Center", { exact: true })).toBeVisible();
  await expect(page.getByText("2FA verified", { exact: true })).toBeVisible();
  await expect(page.getByText("ALL · 47 counties", { exact: true })).toBeVisible();

  // Never stores TOTP or recovery codes
  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("learnly.session-preview.v1"));
  expect(sessionRaw).toBeTruthy();
  expect(sessionRaw).not.toContain("LY-8492-K9");
  expect(sessionRaw).not.toContain("246810");
});

test("S4 inline TOTP 6-digit code works for 2FA-enabled University student", async ({ page }) => {
  await page.getByRole("button", { name: /Zawadi Mutua Mwende/ }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("region", { name: "Two-factor authentication challenge" })).toBeVisible();
  await page.getByRole("button", { name: "Use preview TOTP 246810 →", exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await expect(page.locator(`#signin-totp-${i}`)).toHaveValue("246810"[i]);
  }
  await page.getByRole("button", { name: "Verify 2FA & sign in →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Signed in as Zawadi Mutua Mwende", exact: true })).toBeVisible();
  await expect(page.getByText("S-1 Student Overview", { exact: true })).toBeVisible();
  await expect(page.getByText("2FA verified", { exact: true })).toBeVisible();
});

test("S5 footer links, all-12 directory dialog, dark mode and 360px mobile layout", async ({ page }) => {
  // All 12 directory dialog
  await page.getByRole("button", { name: "All 12 →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "All 12 Student & RBAC Staff Profiles", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // Help dialog
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Having trouble signing in?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reset your password", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // Dark mode toggle persists
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");

  // 360px mobile layout check
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  const mobile = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cols: getComputedStyle(document.querySelector(".signin-grid")!).gridTemplateColumns,
  }));
  expect(mobile.scrollWidth).toBeLessThanOrEqual(mobile.width);
  expect(mobile.cols.split(" ")).toHaveLength(1);

  // Create account footer link navigates to real /auth/signup route
  await page.locator(".signin-footer-links").getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4173/auth/signup");
});
