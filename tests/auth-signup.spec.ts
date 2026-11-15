import { test, expect, type Page } from "@playwright/test";

const URL = "http://127.0.0.1:4173/auth/signup";

async function fillValidStudent(page: Page) {
  await page.locator("#fullName").fill("Amani Wanjiku Kamau");
  await page.locator("#nationalId").fill("12345678");
  await page.locator("#phone").fill("712345678");
  await page.locator("#password").fill("Learnly2025!");
  await page.locator("#confirmPassword").fill("Learnly2025!");
  await page.locator("#terms").check();
  await page.locator("#dpa").check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify your phone", exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(URL);
});

test("desktop split layout, scoped theme and no page overflow", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await expect(page.getByRole("heading", { name: "Join Learnly.", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your account", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Student / Parent", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Admin / Sponsor", exact: true })).not.toBeChecked();
  const layout = await page.evaluate(() => {
    const brand = document.querySelector(".signup-brand-panel")!;
    const form = document.querySelector(".signup-form-side")!;
    return {
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      brandWidth: brand.getBoundingClientRect().width,
      formWidth: form.getBoundingClientRect().width,
      brandColor: getComputedStyle(brand).backgroundColor,
      formColor: getComputedStyle(form).backgroundColor,
      headingFont: getComputedStyle(document.querySelector(".signup-brand-heading h1")!).fontFamily,
      bodyFont: getComputedStyle(document.body).fontFamily,
      formHeight: form.getBoundingClientRect().height,
    };
  });
  console.log("Desktop layout:", JSON.stringify(layout));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  expect(layout.brandWidth).toBeLessThan(layout.width);
  expect(layout.formWidth).toBeLessThan(layout.width);
  expect(layout.brandColor).toBe("rgb(31, 58, 138)");
  expect(layout.headingFont).toContain("Fraunces");
  expect(layout.bodyFont).toContain("Inter");
  await page.screenshot({ path: "/tmp/learnly-signup-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Please check the highlighted fields below.")).toBeVisible();
  await expect(page.locator("#fullName")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#nationalId")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#phone")).toHaveAttribute("aria-invalid", "true");
  expect(runtimeErrors).toEqual([]);
});

test("student signup, wrong OTP, preview verification and safe persistence", async ({ page }) => {
  await fillValidStudent(page);
  await expect(page.locator("#signup-otp-0")).toBeFocused();
  await page.getByRole("button", { name: "Use preview code 123456 →", exact: true }).click();
  for (let i = 0; i < 6; i++) await expect(page.locator(`#signup-otp-${i}`)).toHaveValue("123456"[i]);
  for (let i = 0; i < 6; i++) await page.locator(`#signup-otp-${i}`).fill("654321"[i]);
  await page.getByRole("button", { name: "Verify & create account →", exact: true }).click();
  await expect(page.getByText("That code doesn't match. Use the preview code 123456.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use preview code 123456 →", exact: true }).click();
  await page.getByRole("button", { name: "Verify & create account →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're all set, Amani.", exact: true })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("learnly.signup-preview.v1"));
  expect(stored).toBeTruthy();
  const parsed = JSON.parse(stored!);
  expect(parsed.role).toBe("student");
  expect(parsed.phoneLast4).toBe("5678");
  expect(parsed.identityLast4).toBe("5678");
  expect(stored).not.toContain("12345678");
  expect(stored).not.toContain("712345678");
  expect(stored).not.toContain("Learnly2025!");
  expect(stored).not.toContain("123456");
  await page.getByRole("button", { name: "Review account details →", exact: true }).click();
  await expect(page.getByText("DPA consent captured", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("A preview account is saved in this browser.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review it →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're all set, Amani.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create another account", exact: true }).click();
  await expect(page.locator("#fullName")).toHaveValue("");
  await expect(page.locator("#password")).toHaveValue("");
});

test("password mismatch, admin token gate and admin activation preview", async ({ page }) => {
  await page.getByRole("radio", { name: "Admin / Sponsor", exact: true }).check();
  await page.locator("#fullName").fill("Faith Chebet Kiprop");
  await page.locator("#nationalId").fill("K123456");
  await page.locator("#phone").fill("722345678");
  await page.locator("#email").fill("bursar@alliancehigh.ac.ke");
  await page.locator("#password").fill("Learnly2025!");
  await page.locator("#confirmPassword").fill("Mismatch2025!");
  await page.locator("#terms").check();
  await page.locator("#dpa").check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Both passwords must match.", { exact: true })).toBeVisible();
  await expect(page.getByText(/The bootstrap token is invalid|Enter the preview bootstrap token/)).toBeVisible();
  await page.locator("#confirmPassword").fill("Learnly2025!");
  await page.getByRole("button", { name: "Use demo token", exact: true }).click();
  await expect(page.locator("#bootstrapToken")).toHaveValue("LEARNLY-DEMO-2025");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByRole("button", { name: "Use preview code 123456 →", exact: true }).click();
  await page.getByRole("button", { name: "Verify & create account →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're all set, Faith.", exact: true })).toBeVisible();
  await expect(page.getByText("Admin access requires activation", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("learnly.signup-preview.v1"));
  expect(JSON.parse(stored!).role).toBe("admin");
  expect(stored).not.toContain("LEARNLY-DEMO-2025");
});

test("OTP keyboard auto-advance, backspace and full-code paste", async ({ page }) => {
  await fillValidStudent(page);
  await page.keyboard.type("123456");
  for (let i = 0; i < 6; i++) await expect(page.locator(`#signup-otp-${i}`)).toHaveValue("123456"[i]);
  await page.keyboard.press("Backspace");
  await expect(page.locator("#signup-otp-5")).toHaveValue("");
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text", "123456");
    document.querySelector('[aria-label="Six-digit verification code"]')!.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  for (let i = 0; i < 6; i++) await expect(page.locator(`#signup-otp-${i}`)).toHaveValue("123456"[i]);
});

test("OTP expiry and resend cooldown use real state changes", async ({ page }) => {
  await page.clock.install({ time: new Date() });
  await fillValidStudent(page);
  await page.clock.fastForward(301_000);
  await expect(page.getByText("Code expired — request a new one.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify & create account →", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Resend code", exact: true }).click();
  await expect(page.getByRole("button", { name: /Resend in 0:/ })).toBeDisabled();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole("button", { name: "Resend code", exact: true })).toBeEnabled();
});

test("dark mode persists and semantic accents remain readable", async ({ page }) => {
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
  const colors = await page.evaluate(() => ({
    ink: getComputedStyle(document.documentElement).getPropertyValue("--brand-ink").trim(),
    selected: getComputedStyle(document.querySelector(".signup-role-card.is-selected")!).backgroundColor,
  }));
  expect(colors.ink).toBe("#60a5fa");
  await page.screenshot({ path: "/tmp/learnly-signup-dark.png", fullPage: true });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "light");
});

test("360px mobile layout, OTP flow and browser back navigation", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  const mobile = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector(".signup-page-grid")!).gridTemplateColumns,
    passwordColumns: getComputedStyle(document.querySelector(".signup-password-grid")!).gridTemplateColumns,
  }));
  console.log("Mobile layout:", JSON.stringify(mobile));
  expect(mobile.scrollWidth).toBeLessThanOrEqual(mobile.width);
  expect(mobile.columns.split(" ")).toHaveLength(1);
  expect(mobile.passwordColumns.split(" ")).toHaveLength(1);
  await page.screenshot({ path: "/tmp/learnly-signup-mobile.png", fullPage: true });
  await fillValidStudent(page);
  await page.getByRole("button", { name: "Use preview code 123456 →", exact: true }).click();
  await page.getByRole("button", { name: "Verify & create account →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're all set, Amani.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Explore Learnly →", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4173/");
  await expect(page.getByRole("heading", { name: /Sponsor a learner/ })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(URL);
  await expect(page.getByRole("heading", { name: "Create your account", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review it →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're all set, Amani.", exact: true })).toBeVisible();
});

test("footer sign-in route, recovery and legal dialogs work without dead links", async ({ page }) => {
  await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reset your password", exact: true })).toBeVisible();
  await page.locator("#fp-id").fill("712345678");
  await page.getByRole("button", { name: "Send reset OTP →", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Terms", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Terms of Service", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Need help?", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Let's get you started", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL("http://127.0.0.1:4173/auth/signin");
  await expect(page.getByRole("heading", { name: /Welcome back to Learnly/ })).toBeVisible();
});
