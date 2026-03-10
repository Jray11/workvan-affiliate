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

### QA-AFF-004: Disabled affiliate can still log in and access portal
- **status:** done
- **severity:** critical
- **reported:** 2026-03-09
- **description:** `portal_enabled` is only checked during password reset flow (`Login.jsx` line 49). A disabled/terminated affiliate can still sign in with email+password and access the full portal. No re-validation happens after initial login either — if an affiliate is disabled mid-session, they continue with full access until they log out.
- **fix-notes:** Added `portal_enabled` check in `checkTerminationAccess()` in App.jsx. Now checked every time an affiliate is loaded (login, session restore, auth state change). Also added terminated_at/access_expires_at grace period system as part of AFF-4.
- **files-changed:** `src/App.jsx`

### QA-AFF-005: "Skip" payout setup marks affiliate as complete
- **status:** done
- **severity:** critical
- **reported:** 2026-03-09
- **description:** The "Skip for now" button in DirectDepositSetup (`App.jsx` line 312) sets `payout_setup_complete: true` without any bank info. The commission/payout system has no way to distinguish "completed setup" from "skipped setup." When payout time comes, there's no bank info to pay to.
- **fix-notes:** Added `payout_setup_skipped` column to affiliates table. Skip now sets `payout_setup_skipped: true` (not `payout_setup_complete`). Gate condition updated to allow skipped affiliates through. Dashboard shows reminder banner with "Set Up Now" button.
- **files-changed:** `src/App.jsx`, `src/pages/Dashboard.jsx`

### QA-AFF-006: No error feedback on any page — all errors go to console.log
- **status:** done
- **severity:** high
- **reported:** 2026-03-09
- **description:** Every page (Dashboard, LeadTracker, Referrals, Commissions, Team) catches errors but only logs to `console.log`. If RPC calls, queries, or mutations fail, the user sees $0 / empty data with zero indication that something went wrong. Affects: `Dashboard.jsx` line 66, `LeadTracker.jsx` lines 87-103, `Referrals.jsx` line 20, `Commissions.jsx` line 26, `Team.jsx` line 66.
- **fix-notes:**
- **files-changed:**

### QA-AFF-007: No loading states — plain text "Loading..." on all pages
- **status:** done
- **severity:** high
- **reported:** 2026-03-09
- **description:** All 5 pages show plain centered text ("Loading dashboard...", "Loading leads...", etc.) with no spinner or skeleton. On slow connections, users may think the page is frozen.
- **fix-notes:** Created `Skeleton.jsx` with page-specific skeleton components (DashboardSkeleton, LeadsSkeleton, ReferralsSkeleton, CommissionsSkeleton, TeamSkeleton). Each skeleton uses pulsing gray rectangles matching the real page layout. Wired into all 5 pages replacing plain text loading states.
- **files-changed:** `src/Skeleton.jsx` (new), `src/pages/Dashboard.jsx`, `src/pages/LeadTracker.jsx`, `src/pages/Referrals.jsx`, `src/pages/Commissions.jsx`, `src/pages/Team.jsx`

### QA-AFF-008: Terms/payout DB updates have no try/catch
- **status:** done
- **severity:** high
- **reported:** 2026-03-09
- **description:** In `App.jsx`, the terms acceptance update (line 280) and direct deposit update (line 295) have no error handling. If the Supabase update fails (network issue, RLS, etc.), the user is stuck on that screen with no error message and no way to retry.
- **fix-notes:**
- **files-changed:**

### QA-AFF-009: Double-submit on all forms — buttons not disabled during submission
- **status:** done
- **severity:** high
- **reported:** 2026-03-09
- **description:** LeadTracker add/edit/log-contact forms and Team add-member form don't disable the submit button while the request is in-flight. Clicking multiple times creates duplicate records. Affects: `LeadTracker.jsx` lines 883, 1086, 1301 and `Team.jsx` line 103.
- **fix-notes:** Added `submitting` state to LeadTracker with early-return guards and disabled buttons during submission (add, edit, delete, log contact). Team already had `saving` state with the same pattern.
- **files-changed:** `src/pages/LeadTracker.jsx`

### QA-AFF-010: LeadTracker contact history shows "Invalid Date"
- **status:** done
- **severity:** medium
- **reported:** 2026-03-09
- **description:** `LeadTracker.jsx` line 814: `new Date(contact.contacted_at).toLocaleString()` — if `contacted_at` is null (DB default not set or insert didn't include it), renders "Invalid Date" in the contact history timeline.
- **fix-notes:** Added null check: shows "Date not recorded" when `contacted_at` is null.
- **files-changed:** `src/pages/LeadTracker.jsx`

### QA-AFF-011: Team members cannot be edited or deactivated after creation
- **status:** pending
- **severity:** medium
- **reported:** 2026-03-09
- **description:** `Team.jsx` only has an "Add Team Member" flow. Once a sub-affiliate is created, there is no way to edit their commission rate, deactivate them, or remove them. The sub-affiliate record is permanent.
- **fix-notes:**
- **files-changed:**

### QA-AFF-012: No pagination on leads or referrals
- **status:** pending
- **severity:** medium
- **reported:** 2026-03-09
- **description:** `LeadTracker.jsx` line 90 and `Referrals.jsx` line 16 both fetch all records with no limit/offset. Works fine with <50 records, will degrade with 500+. No pagination UI exists.
- **fix-notes:**
- **files-changed:**

### QA-AFF-013: Plaintext bank routing/account numbers in database
- **status:** pending
- **severity:** medium
- **reported:** 2026-03-09
- **description:** `App.jsx` DirectDepositSetup stores `routing_number` and `account_number` as plaintext in the `affiliates` table. Anyone with DB read access (service role key, Supabase dashboard) can see full bank details. SSN is properly truncated to last 4 digits, but bank info is not.
- **fix-notes:**
- **files-changed:**
