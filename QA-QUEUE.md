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
- **status:** verified
- **severity:** high
- **reported:** 2026-03-09
- **description:** `git push` to master does NOT trigger Vercel deploys. Last auto-deploy was 44+ days ago. Must use `npx vercel --prod` manually. This means code changes aren't going live unless someone remembers to manually deploy.
- **fix-notes:** Three issues found and fixed: (1) Ran `npx vercel git connect` to link GitHub repo. (2) Added `"installCommand": "npm ci"` to vercel.json to force clean installs (cached Windows binaries had wrong permissions on Linux). (3) Committed `src/pages/LeadTracker.jsx` which was never in git (manual deploys uploaded local files, hiding this). Auto-deploy now confirmed working.
- **files-changed:** `vercel.json`, `src/pages/LeadTracker.jsx`

### QA-AFF-003: LeadTracker.jsx was never committed to git
- **status:** verified
- **severity:** critical
- **reported:** 2026-03-09
- **description:** `src/pages/LeadTracker.jsx` (1377 lines) existed only locally. It was never `git add`ed. All previous deploys used `npx vercel --prod` which uploads local files, masking the issue. Any GitHub-triggered build would fail.
- **fix-notes:** Committed the file. Verified build succeeds.
- **files-changed:** `src/pages/LeadTracker.jsx`
