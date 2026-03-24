// Test that all affiliate portal pages load without crashing
const { test, expect } = require('@playwright/test');
const path = require('path');
const { getImpersonationUrl } = require('./helpers.cjs');

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'session.json');
test.use({ storageState: AUTH_FILE });

const pages = [
  { name: 'Dashboard', navText: 'Dashboard', expectText: 'Dashboard' },
  { name: 'Lead Tracker', navText: 'Lead Tracker', expectText: 'Lead' },
  { name: 'Referrals', navText: 'Referrals', expectText: 'Referral' },
  { name: 'Commissions', navText: 'Commissions', expectText: 'Commission' },
  { name: 'Resources', navText: 'Resources', expectText: 'Resource' },
  { name: 'Messages', navText: 'Messages', expectText: 'Message' },
  { name: 'Announcements', navText: 'Announcements', expectText: 'Announcement' },
  { name: 'Team', navText: 'Team', expectText: 'Team', requiresRecruit: true },
];

for (const pg of pages) {
  test(`${pg.name} loads`, async ({ page }) => {
    // Always use impersonation URL — session is in-memory React state
    await page.goto(getImpersonationUrl());
    await page.waitForTimeout(4000);

    // On mobile, open the sidebar first
    const vpWidth = page.viewportSize().width;
    if (vpWidth < 768) {
      const hamburger = page.locator('button').filter({ has: page.locator('svg') }).first();
      if (await hamburger.isVisible()) {
        await hamburger.click();
        await page.waitForTimeout(500);
      }
    }

    // Navigate to the target page via sidebar
    if (pg.name !== 'Dashboard') {
      const navLink = page.locator(`text=${pg.navText}`).first();
      const navVisible = await navLink.isVisible().catch(() => false);

      if (!navVisible && pg.requiresRecruit) {
        test.skip(true, 'Team page not available — affiliate may not have can_recruit=true');
        return;
      }

      if (navVisible) {
        await navLink.click();
        await page.waitForTimeout(2000);
      }
    }

    // Page should not be blank (React crash)
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(100);

    // Should contain expected text somewhere
    const found = await page.locator(`text=${pg.expectText}`).first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(found).toBe(true);
  });
}
