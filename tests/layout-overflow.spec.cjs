// Test for layout overflow issues at all viewport sizes
// Catches elements that extend beyond the viewport OR are clipped by overflow:hidden
const { test, expect } = require('@playwright/test');
const path = require('path');
const { getImpersonationUrl } = require('./helpers.cjs');

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'session.json');
test.use({ storageState: AUTH_FILE });

const pages = [
  { name: 'Dashboard', navText: 'Dashboard' },
  { name: 'Lead Tracker', navText: 'Lead Tracker' },
  { name: 'Referrals', navText: 'Referrals' },
  { name: 'Commissions', navText: 'Commissions' },
  { name: 'Team', navText: 'Team', requiresRecruit: true },
];

for (const pg of pages) {
  test(`${pg.name} — no content cut off`, async ({ page }) => {
    // Always use impersonation URL — session is in-memory React state
    await page.goto(getImpersonationUrl());
    await page.waitForTimeout(4000);

    // On mobile, open the sidebar to navigate
    const vpWidth = page.viewportSize().width;
    if (vpWidth < 768) {
      const hamburger = page.locator('button').filter({ has: page.locator('svg') }).first();
      if (await hamburger.isVisible()) {
        await hamburger.click();
        await page.waitForTimeout(500);
      }
    }

    // Navigate to the page
    if (pg.name !== 'Dashboard') {
      const navLink = page.locator(`text=${pg.navText}`).first();
      const navVisible = await navLink.isVisible().catch(() => false);

      if (!navVisible && pg.requiresRecruit) {
        test.skip(true, 'Team page not available');
        return;
      }

      if (navVisible) {
        await navLink.click();
        await page.waitForTimeout(2000);
      }
    }

    // Close mobile sidebar if open so it doesn't interfere
    if (vpWidth < 768) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    const viewportWidth = page.viewportSize().width;

    // Find elements whose right edge extends past the viewport
    // OR elements whose scrollWidth > clientWidth (content clipped by overflow:hidden)
    const issues = await page.evaluate((vpW) => {
      const results = [];
      const allElements = document.querySelectorAll('div, section, table, ul, form, main, article, aside, nav, header');

      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        // Skip invisible/tiny elements
        if (rect.width < 10 || rect.height < 10) continue;
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        // Check if element is inside a scrollable ancestor (content is accessible)
        let hasScrollableAncestor = false;
        let ancestor = el.parentElement;
        while (ancestor) {
          const aStyle = window.getComputedStyle(ancestor);
          if (aStyle.overflowX === 'auto' || aStyle.overflowX === 'scroll') {
            hasScrollableAncestor = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        // Check 1: Element extends past viewport right edge
        const pastViewport = rect.right > vpW + 2 && !hasScrollableAncestor;

        // Check 2: Element's content is wider than its box (clipped by overflow:hidden/auto)
        const isClipped = el.scrollWidth > el.clientWidth + 5
          && style.overflowX !== 'auto'
          && style.overflowX !== 'scroll'
          && style.overflowX !== 'visible'
          && !hasScrollableAncestor;

        // Check 3: Element's content is wider than viewport
        const isScrollable = style.overflowX === 'auto' || style.overflowX === 'scroll';
        const contentPastViewport = el.scrollWidth > vpW + 5 && !isScrollable && !hasScrollableAncestor;

        // Skip sidebar/nav — intentional text truncation
        const tag = el.tagName.toLowerCase();
        if ((tag === 'aside' || tag === 'nav') && !contentPastViewport) continue;

        if (pastViewport || isClipped || contentPastViewport) {
          const cls = el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '';
          const id = el.id ? '#' + el.id : '';

          const textContent = (el.textContent || '').trim().substring(0, 60);
          const firstChild = el.firstElementChild;
          const childText = firstChild ? (firstChild.textContent || '').trim().substring(0, 40) : '';

          const reason = [];
          if (pastViewport) reason.push(`right edge at ${Math.round(rect.right)}px (viewport: ${vpW}px)`);
          if (isClipped) reason.push(`content ${el.scrollWidth}px clipped to ${el.clientWidth}px (overflow: ${style.overflowX})`);
          if (contentPastViewport && !pastViewport && !isClipped) reason.push(`content width ${el.scrollWidth}px exceeds viewport ${vpW}px`);

          results.push({
            selector: `${tag}${id}${cls}`,
            width: Math.round(rect.width),
            right: Math.round(rect.right),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            overflow: style.overflowX,
            reason: reason.join('; '),
            text: childText || textContent.substring(0, 40)
          });
        }
      }

      // Dedupe by selector, keep worst offenders
      const seen = new Set();
      return results
        .filter(r => {
          const key = r.selector;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
        .slice(0, 10);
    }, viewportWidth);

    // Take screenshot regardless
    await page.screenshot({
      path: `playwright-report/${pg.name}-${page.viewportSize().width}px.png`,
      fullPage: true
    });

    if (issues.length > 0) {
      const details = issues
        .map(e => `  ${e.selector}\n    ${e.reason}\n    text: "${e.text}"`)
        .join('\n\n');

      expect(issues.length, `Content cut off on ${pg.name} at ${viewportWidth}px:\n\n${details}`).toBe(0);
    }
  });
}
