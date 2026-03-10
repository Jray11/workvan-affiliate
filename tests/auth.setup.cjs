// Auth setup — verifies impersonation works and saves a baseline session
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { getImpersonationUrl } = require('./helpers.cjs');

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'session.json');

test('impersonate affiliate and verify access', async ({ page }) => {
  await page.goto(getImpersonationUrl());
  await page.waitForTimeout(5000);

  // Verify we're logged in — should see the admin view banner or dashboard content
  const adminBanner = page.locator('text=Admin View').first();
  const dashboard = page.locator('text=Dashboard').first();
  const sidebar = page.locator('text=Commissions').first();

  const adminVisible = await adminBanner.isVisible().catch(() => false);
  const dashboardVisible = await dashboard.isVisible().catch(() => false);
  const sidebarVisible = await sidebar.isVisible().catch(() => false);

  console.log(`Admin banner: ${adminVisible}, Dashboard: ${dashboardVisible}, Sidebar: ${sidebarVisible}`);
  expect(adminVisible || dashboardVisible || sidebarVisible).toBe(true);

  // Save storage state (helps persist cookies/localStorage if any)
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
  console.log('Session saved to', AUTH_FILE);
});
