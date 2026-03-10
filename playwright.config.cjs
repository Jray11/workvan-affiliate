const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL: 'https://affiliates.workvanapp.com',
    screenshot: 'on',
  },
  projects: [
    // Auth setup — runs first, saves session
    {
      name: 'auth',
      testMatch: 'auth.setup.cjs',
      use: { viewport: { width: 1280, height: 800 } },
    },
    // Desktop tests
    {
      name: 'desktop',
      testIgnore: 'auth.setup.cjs',
      use: { viewport: { width: 1280, height: 800 } },
      dependencies: ['auth'],
    },
    // Tablet tests (layout overflow only)
    {
      name: 'tablet',
      testMatch: 'layout-overflow.spec.cjs',
      use: { viewport: { width: 768, height: 1024 } },
      dependencies: ['auth'],
    },
    // Phone tests (layout overflow only)
    {
      name: 'phone',
      testMatch: 'layout-overflow.spec.cjs',
      use: { viewport: { width: 375, height: 812 } },
      dependencies: ['auth'],
    },
  ],
});
