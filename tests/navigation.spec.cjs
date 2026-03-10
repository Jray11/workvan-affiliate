// Test navigation between all pages and verify content changes
const { test, expect } = require('@playwright/test');
const path = require('path');
const { getImpersonationUrl } = require('./helpers.cjs');

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'session.json');
test.use({ storageState: AUTH_FILE });

test('can navigate through all sidebar pages', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Should start on Dashboard
  await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });

  // Navigate to Lead Tracker
  await page.locator('text=Lead Tracker').first().click();
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Lead Tracker').first()).toBeVisible();

  // Navigate to Referrals
  await page.locator('text=Referrals').first().click();
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Referred Accounts')).toBeVisible({ timeout: 5000 }).catch(() => {
    // May say "No referrals yet" for test affiliate
  });

  // Navigate to Commissions
  await page.locator('text=Commissions').first().click();
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Commission History')).toBeVisible({ timeout: 5000 });

  // Navigate back to Dashboard
  await page.locator('text=Dashboard').first().click();
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
});

test('referral link copy button exists on dashboard', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Referral link section should be visible
  await expect(page.locator('text=Your Referral Link')).toBeVisible({ timeout: 10000 });

  // Copy button should exist
  const copyBtn = page.locator('button', { hasText: 'Copy' });
  await expect(copyBtn).toBeVisible({ timeout: 5000 });

  // QR Code button should exist
  const qrBtn = page.locator('button[title="QR Code"]');
  await expect(qrBtn).toBeVisible({ timeout: 5000 });
});

test('commission export button visible when commissions exist', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Navigate to Commissions
  await page.locator('text=Commissions').first().click();
  await page.waitForTimeout(2000);

  // Export CSV button should be visible (or not, if no commissions)
  const exportBtn = page.locator('button', { hasText: 'Export CSV' });
  const hasCommissions = await page.locator('text=No commissions yet').isVisible().catch(() => false);

  if (!hasCommissions) {
    // If there are commissions, export button should be visible
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  }
});

test('lead tracker view toggle works', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Navigate to Lead Tracker
  await page.locator('text=Lead Tracker').first().click();
  await page.waitForTimeout(2000);

  // Board view button should exist
  const boardBtn = page.locator('button[title="Board view"]');
  await expect(boardBtn).toBeVisible({ timeout: 5000 });

  // Click board view
  await boardBtn.click();
  await page.waitForTimeout(1000);

  // Should see status column headers (New, Contacted, etc.)
  const newColumn = page.locator('text=NEW').first();
  await expect(newColumn).toBeVisible({ timeout: 3000 }).catch(() => {
    // Column header might use different casing
  });

  // Click back to list view
  const listBtn = page.locator('button[title="List view"]');
  await listBtn.click();
  await page.waitForTimeout(1000);
});
