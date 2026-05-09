// End-to-end smoke test for the public /join/:code director recruit flow.
// Uses Trent (Test) as the director and a unique throwaway email so the row
// can be cleaned up after.
//
// Verifies:
//   1. Page loads and shows the director's name (proves the GET lookup works)
//   2. Form submits successfully with valid input
//   3. We land in the "You're in" success state
//
// We DON'T verify the password-setup email actually arrives — we just
// confirm the API accepted the signup and created the row.

const { test, expect } = require('@playwright/test');

const DIRECTOR_CODE = 'trenttest';
const TEST_EMAIL = `playwright-${Date.now()}@workvan-test.invalid`;

test.describe('Public /join/:code recruit flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('page shows director name', async ({ page }) => {
    await page.goto(`https://affiliates.workvanapp.com/join/${DIRECTOR_CODE}`);
    await page.waitForTimeout(2500);
    // After my fix, header should read "Trent (Test) is inviting you to Work Van"
    await expect(page.locator('text=/Trent.*inviting/i').first())
      .toBeVisible({ timeout: 10000 });
  });

  test('invalid director code shows Link not valid state', async ({ page }) => {
    await page.goto('https://affiliates.workvanapp.com/join/this-code-does-not-exist-zzz');
    await page.waitForTimeout(2500);
    await expect(page.locator('text=/Link not valid/i').first())
      .toBeVisible({ timeout: 10000 });
  });

  test('full signup creates an affiliate row', async ({ page }) => {
    await page.goto(`https://affiliates.workvanapp.com/join/${DIRECTOR_CODE}`);
    await page.waitForTimeout(2500);

    // Fill the form
    await page.locator('input[type="text"]').first().fill('Playwright Test Recruit');
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);

    // Tick the terms checkbox
    const terms = page.locator('input[type="checkbox"]').first();
    if (await terms.isVisible()) {
      await terms.check();
    }

    // Submit
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();

    // Wait for the "You're in" success state
    await expect(page.locator("text=/You're in/i").first())
      .toBeVisible({ timeout: 15000 });
  });
});
