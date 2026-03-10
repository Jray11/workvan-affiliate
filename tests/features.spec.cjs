// Test new features: skeleton loading, QR code, commission detail, team management
const { test, expect } = require('@playwright/test');
const path = require('path');
const { getImpersonationUrl } = require('./helpers.cjs');

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'session.json');
test.use({ storageState: AUTH_FILE });

test('dashboard shows stats cards', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Should show stat labels
  await expect(page.locator('text=Total Referrals')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Pending Payout')).toBeVisible({ timeout: 5000 });

  // Pending payout should show threshold context
  const thresholdText = page.locator('text=minimum').first();
  const readyText = page.locator('text=ready for payout').first();
  const hasThreshold = await thresholdText.isVisible().catch(() => false);
  const hasReady = await readyText.isVisible().catch(() => false);
  expect(hasThreshold || hasReady).toBe(true);
});

test('QR code modal opens and closes', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Click QR Code button
  const qrBtn = page.locator('button[title="QR Code"]');
  await expect(qrBtn).toBeVisible({ timeout: 10000 });
  await qrBtn.click();
  await page.waitForTimeout(1000);

  // Modal should be visible
  await expect(page.locator('text=Your QR Code')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Download PNG')).toBeVisible({ timeout: 3000 });

  // QR image should be loaded
  const qrImg = page.locator('img[alt="Referral QR Code"]');
  await expect(qrImg).toBeVisible({ timeout: 5000 });

  // Close modal
  const closeBtn = page.locator('text=Your QR Code').locator('..').locator('button').first();
  await closeBtn.click();
  await page.waitForTimeout(500);

  // Modal should be gone
  await expect(page.locator('text=Your QR Code')).not.toBeVisible();
});

test('commission rows are expandable', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  await page.locator('text=Commissions').first().click();
  await page.waitForTimeout(2000);

  // Check if there are commissions
  const noCommissions = await page.locator('text=No commissions yet').isVisible().catch(() => false);
  if (noCommissions) {
    test.skip(true, 'No commission data to test expansion');
    return;
  }

  // Click first commission row (should have a chevron)
  const firstRow = page.locator('[style*="cursor: pointer"]').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await page.waitForTimeout(500);

    // Should show detail info (Status label in expanded view)
    const statusLabel = page.locator('text=Status').first();
    await expect(statusLabel).toBeVisible({ timeout: 3000 });
  }
});

test('team page shows member cards or empty state', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  // Check if Team nav exists (requires can_recruit)
  const teamNav = page.locator('text=My Team').first();
  const teamVisible = await teamNav.isVisible().catch(() => false);

  if (!teamVisible) {
    test.skip(true, 'Team page not available — affiliate may not have can_recruit=true');
    return;
  }

  await teamNav.click();
  await page.waitForTimeout(2000);

  // Should see either team members or empty state
  const hasMembers = await page.locator('text=Team Size').isVisible().catch(() => false);
  const hasEmpty = await page.locator('text=No team members yet').isVisible().catch(() => false);
  expect(hasMembers || hasEmpty).toBe(true);

  // Add Team Member button should be visible (not read-only)
  const addBtn = page.locator('text=Add Team Member');
  await expect(addBtn).toBeVisible({ timeout: 5000 });
});

test('filter buttons work on commissions page', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(4000);

  await page.locator('text=Commissions').first().click();
  await page.waitForTimeout(2000);

  // Filter buttons should be visible
  await expect(page.locator('button', { hasText: 'All' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('button', { hasText: 'Pending' })).toBeVisible({ timeout: 3000 });
  await expect(page.locator('button', { hasText: 'Paid' })).toBeVisible({ timeout: 3000 });

  // Click Pending filter
  await page.locator('button', { hasText: 'Pending' }).click();
  await page.waitForTimeout(500);

  // Click back to All
  await page.locator('button', { hasText: 'All' }).click();
  await page.waitForTimeout(500);
});
