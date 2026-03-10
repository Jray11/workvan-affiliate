# QA Queue — Work Van Affiliate Portal

## How this works
- Playwright tests catch issues automatically
- Claude CLI fixes bugs, pushes, changes status to `done`
- Retest confirms fix, status changes to `verified`

---

## QUEUE

<!-- TEMPLATE for new entries:
### QA-AFF-XXX: Title here
- **status:** pending | done | verified | reopened
- **severity:** critical | high | medium | low
- **reported:** YYYY-MM-DD
- **description:** What happens, steps to reproduce
- **fix-notes:** (filled in after fix)
- **files-changed:** (filled in after fix)
-->

### QA-AFF-001: Mobile layout overflow — content 412px on 375px viewport
- **status:** verified
- **severity:** medium
- **reported:** 2026-03-09
- **description:** On phone (375px), all pages overflowed to 412px wide. The `<main>` element and its flex wrapper had no width constraints, so padding (2rem = 32px/side) pushed content past viewport edge.
- **fix-notes:** Added inline `maxWidth: '100vw'`, `boxSizing: 'border-box'`, `overflowX: 'hidden'` to both the flex wrapper div and `<main>`. Added CSS media query overrides for mobile: reduced padding to 1rem, forced overflow-x hidden on html/body/#root.
- **files-changed:** `src/App.jsx`

### QA-AFF-002: Vercel auto-deploy not connected to GitHub
- **status:** pending
- **severity:** high
- **reported:** 2026-03-09
- **description:** `git push` to master does NOT trigger Vercel deploys. Last auto-deploy was 44+ days ago. Must use `npx vercel --prod` manually. This means code changes aren't going live unless someone remembers to manually deploy.
- **fix-notes:** Needs Vercel project settings updated to connect GitHub repo (Jray11/workvan-affiliate) for auto-deploy on push to master.
- **files-changed:** N/A — Vercel dashboard config issue
