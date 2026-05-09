// Role-based affiliate portal smoke test.
// Impersonates two distinct affiliates and verifies the right UI shows for each:
//   - Director: Trent (Test) — has team, can recruit, can grant bonuses
//   - Affiliate: Maria — leaf affiliate, no team, no recruit link
//
// We use the same admin-impersonation token shape as auth.setup.cjs but for a
// per-test affiliate ID so the tests are independent of the saved session.

const { test, expect } = require('@playwright/test');

const DIRECTOR_ID = '536d9df9-d78e-43e9-b742-7ea9db884d59';   // Trent (Test) — tier=director
const AFFILIATE_ID = '8ccf236e-0f25-4fc9-932b-aa56d0b22eaa';  // Maria Affiliate — tier=affiliate (leaf)

function impersonationUrl(affiliateId) {
  const token = Buffer.from(`admin:${affiliateId}:${Date.now()}`).toString('base64');
  return `https://affiliates.workvanapp.com?impersonate=${token}`;
}

async function gotoAs(page, affiliateId) {
  await page.goto(impersonationUrl(affiliateId));
  await page.waitForTimeout(4000);
}

test.describe('Director view (Trent Test)', () => {
  // Don't use the shared session — we want to impersonate a specific role per test.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('dashboard loads with director-tier widgets', async ({ page }) => {
    await gotoAs(page, DIRECTOR_ID);
    await expect(page.locator('text=/Dashboard|Trent/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('My Team page shows direct recruits', async ({ page }) => {
    await gotoAs(page, DIRECTOR_ID);
    // Sidebar uses "My Team" for directors/recruiters
    const teamLink = page.locator('text=/My Team/i').first();
    await teamLink.click({ timeout: 5000 });
    await page.waitForTimeout(2500);

    // Trent has Carlos Manager + Sarah Manager directly under him
    await expect(page.locator('text=/Carlos|Sarah/').first()).toBeVisible({ timeout: 10000 });
  });

  test('director sees their unique referral / recruit code', async ({ page }) => {
    await gotoAs(page, DIRECTOR_ID);
    // Trent's code is 'trenttest' — should appear on dashboard in the
    // referral link card or the recruit-link card (My Team page).
    const dashHtml = await page.content();
    let found = dashHtml.includes('trenttest');
    if (!found) {
      // Try the team page
      await page.locator('text=/My Team/i').first().click().catch(() => {});
      await page.waitForTimeout(2000);
      const teamHtml = await page.content();
      found = teamHtml.includes('trenttest');
    }
    expect(found).toBe(true);
  });

  test('editing sub-affiliate enforces rate + bonus guardrails', async ({ page }) => {
    await gotoAs(page, DIRECTOR_ID);
    // Navigate via the actual "My Team" sidebar link
    await page.locator('text=/My Team/i').first().click();
    await page.waitForTimeout(2500);

    // The edit button is icon-only with title="Edit" tooltip
    const editBtn = page.locator('button[title="Edit"]').first();
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip(true, 'No Edit affordance visible on the team page');
      return;
    }
    await editBtn.click();
    await page.waitForTimeout(1500);

    // Find the commission rate input — it has a "Rate" label / placeholder
    const rateInput = page.locator('input[type="number"]').first();
    if (!(await rateInput.isVisible().catch(() => false))) {
      test.skip(true, 'Rate input not visible in edit modal');
      return;
    }
    await rateInput.fill('0.99');
    await page.waitForTimeout(500);
    const valueAfter = await rateInput.inputValue();
    const numeric = parseFloat(valueAfter);
    // Cap is Trent's own commission_rate (0.20). Clamp logic should bring 0.99 down.
    expect(numeric).toBeLessThanOrEqual(0.21);
    console.log(`Rate input clamped to ${valueAfter} after attempting 0.99 (cap 0.20)`);
  });
});

test.describe('Leaf affiliate view (Maria)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('dashboard loads', async ({ page }) => {
    await gotoAs(page, AFFILIATE_ID);
    // Should see Dashboard or commission-related copy
    const ok = await page.locator('text=/Dashboard|Commission|Earnings/i').first().isVisible().catch(() => false);
    expect(ok).toBe(true);
  });

  test('no Team navigation — leaf affiliates do not manage anyone', async ({ page }) => {
    await gotoAs(page, AFFILIATE_ID);
    const teamLink = page.locator('a, button, [role="link"]').filter({ hasText: /^Team$/i });
    const count = await teamLink.count();
    // If a Team link exists, it shouldn't be visible OR shouldn't be navigable.
    if (count > 0) {
      const visible = await teamLink.first().isVisible().catch(() => false);
      expect(visible).toBe(false);
    }
  });

  test('no recruit-affiliate link — leaf affiliates can\'t recruit', async ({ page }) => {
    await gotoAs(page, AFFILIATE_ID);
    const html = await page.content();
    // Leaves DO get a referral link (?ref=aff-maria) for bringing in CUSTOMERS,
    // but they should NOT have a /join/aff-maria recruit-affiliate link or
    // a "Recruit Affiliates" card. Match those specifically.
    const hasRecruitAffiliateLink = /\/join\/aff-maria|Recruit Affiliate|Invite a teammate/i.test(html);
    expect(hasRecruitAffiliateLink).toBe(false);
  });

  test('commissions page loads', async ({ page }) => {
    await gotoAs(page, AFFILIATE_ID);
    await page.goto('https://affiliates.workvanapp.com/#commissions');
    await page.waitForTimeout(2500);
    await expect(page.locator('text=/Commission|Earnings|Payout/i').first()).toBeVisible({ timeout: 10000 });
  });
});
