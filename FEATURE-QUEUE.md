# Feature Queue — Work Van Affiliate Portal

## How this works
- User describes features, Claude builds them
- Status tracks progress: pending → in-progress → done
- Each feature has acceptance criteria for verification

---

## QUEUE

<!-- TEMPLATE:
## Feature AFF-N: [Name]
**Status:** pending | in-progress | done
**Priority:** N

### Description
[What and why]

### Acceptance Criteria
- [ ] [Testable behavior]

### Notes
[Optional]

---
-->

## Feature AFF-1: Playwright Test Suite
**Status:** done
**Priority:** 1

### Description
Set up Playwright testing infrastructure for the affiliate portal, matching the main app's pattern. Enables automated smoke testing and layout overflow detection across desktop, tablet, and phone viewports.

### Acceptance Criteria
- [x] playwright.config.cjs with 3 viewport projects + auth setup
- [x] Auth via admin impersonation token (no real credentials needed)
- [x] pages-load.spec.cjs — smoke tests all 5 pages load
- [x] layout-overflow.spec.cjs — overflow checks at all viewports
- [x] All tests passing (19 pass, 2 skipped)

### Notes
- Uses `.cjs` extensions because package.json has `"type": "module"`
- Auth is impersonation-based (generates fresh token each run, valid 24h)
- Test affiliate: Josh Ray (7c709f3c..., can_recruit=true)
- Team page skips on tablet/phone because sidebar nav closes after impersonation load

---

## Feature AFF-2: Toast Notification System
**Status:** done
**Priority:** 2

### Description
Replace all `console.log` errors and `alert()` calls with a global toast notification system. Every user action (save, delete, copy, upload, error) should give visible feedback. This is the single biggest UX improvement — touches every page.

### Acceptance Criteria
- [x] Toast component with success/error/info variants
- [x] Auto-dismiss after 4s, manual dismiss with X
- [x] Stacks multiple toasts (max 3 visible)
- [x] All existing `console.log` error catches show error toast
- [x] All `alert()` calls replaced with toast
- [x] Copy referral link → success toast
- [x] W-9 upload → success/error toast
- [x] LeadTracker CRUD → success/error toast
- [x] Team add member → success/error toast

### Notes
- No external dependency — built as ToastContext.jsx with inline styles
- Position: bottom-right, slide-in animation, dark theme matching app
- Also fixes QA-AFF-006 (no error feedback) and QA-AFF-008 (terms/payout no try/catch)

---

## Feature AFF-3: Loading Skeletons
**Status:** done
**Priority:** 3

### Description
Replace "Loading..." plain text with animated skeleton placeholders on all pages. Makes the app feel faster and more polished.

### Acceptance Criteria
- [x] Skeleton component with pulse animation
- [x] Dashboard: skeleton stat cards + referral link card
- [x] LeadTracker: skeleton lead cards
- [x] Referrals: skeleton table rows
- [x] Commissions: skeleton stat cards + month groups
- [x] Team: skeleton member cards

### Notes
- Keep it simple — gray pulsing rectangles matching the layout of real content
- Same dark theme colors (#1a1a1a → #2a2a2a pulse)

---

## Feature AFF-4: Terminated/Cancelled Affiliate Access Window
**Status:** pending
**Priority:** 4

### Description
When an affiliate is terminated or cancelled, they should retain read-only portal access for a grace period (e.g., 90 days) so they can view final commissions, download tax docs, etc. After the grace period, access is fully revoked.

### Acceptance Criteria
- [ ] New DB columns: `terminated_at` (timestamp), `access_expires_at` (timestamp) on `affiliates` table
- [ ] Login checks: if `terminated_at` is set AND `access_expires_at` is past → block login
- [ ] If `terminated_at` is set but within grace period → allow login, show "read-only" banner
- [ ] Read-only mode: disable add/edit/delete on LeadTracker, disable Team add member, disable W-9 upload
- [ ] Dashboard shows "Your affiliate account was terminated on [date]. Portal access expires [date]."
- [ ] Internal app (CompanyViewer/Affiliates page) can set termination with configurable grace period

### Notes
- Default grace period: 90 days
- Access during grace period is read-only — view commissions, referrals, download reports
- Fixes QA-AFF-004 (disabled affiliate access) as part of a proper access lifecycle

---

## Feature AFF-5: Minimum Payout Threshold
**Status:** pending
**Priority:** 5

### Description
Introduce a minimum threshold (e.g., $50) that must be met before commissions are paid out. Owed amounts below the threshold roll over to the next period. Prevents tiny ACH transfers that cost more to process than they're worth.

### Acceptance Criteria
- [ ] Configurable threshold (default $50, stored in DB or app config)
- [ ] Commissions page shows "Minimum payout: $50" near the pending amount
- [ ] If pending < threshold, show message: "$XX.XX owed — rolls over to next period ($50 minimum)"
- [ ] If pending >= threshold, show: "$XX.XX ready for payout"
- [ ] Payout report (AFF-6) respects threshold — only includes affiliates at or above minimum
- [ ] Dashboard "Pending Payout" card shows threshold context

### Notes
- Threshold applies per payout cycle (monthly), not per commission
- Rolled-over amounts accumulate — affiliate doesn't lose anything
- Consider making threshold visible in terms acceptance

---

## Feature AFF-6: Payout Report Export (Ramp Integration)
**Status:** pending
**Priority:** 6

### Description
Generate a monthly payout report that can be used to process payments in Ramp. The report lists all affiliates who are owed >= minimum threshold, with their bank details and amounts. Accessible from the Internal app.

### Acceptance Criteria
- [ ] Internal app: new "Generate Payout Report" button on Commissions/Reports page
- [ ] Report includes: affiliate name, bank name, routing (masked except last 4), account (masked except last 4), payout amount, period
- [ ] CSV export for Ramp batch upload
- [ ] Only includes affiliates where: owed >= threshold AND payout_setup_complete = true AND bank info is present (not skipped)
- [ ] After export, option to mark commissions as "paid" in bulk
- [ ] Affiliates who skipped payout setup are flagged separately: "Setup incomplete — cannot pay"

### Notes
- Payout method: Ramp vendor ACH. Ramp handles 1099s.
- Future: if affiliate count exceeds ~50, consider Tremendous API for automation
- Full bank details only visible in the report (not in the portal itself)
- Report should be downloadable, not just displayed

---

## Feature AFF-7: Commission Detail View
**Status:** pending
**Priority:** 7

### Description
Click a commission row to see which referred company generated it, what plan they're on, and the calculation breakdown. Currently commissions are just a dollar amount with no context.

### Acceptance Criteria
- [ ] Clickable/expandable commission rows on Commissions page
- [ ] Detail shows: company name, subscription plan, monthly revenue, commission rate, calculated amount
- [ ] For recruiters: show override calculation (sub-affiliate name, their commission, override rate, override amount)
- [ ] Detail panel or modal, consistent with app style

### Notes
- May require joining `affiliate_commissions` with `companies` and `subscription_tiers`
- Helps affiliates verify they're being paid correctly — builds trust

---

## Feature AFF-8: Team Member Management (Edit/Deactivate)
**Status:** pending
**Priority:** 8

### Description
Allow recruiters to edit sub-affiliate commission rates and deactivate team members. Currently, sub-affiliates can only be created — no modifications possible after creation.

### Acceptance Criteria
- [ ] Edit button on each team member card
- [ ] Editable fields: commission_model, commission_rate, active status
- [ ] Deactivate toggle with confirmation: "Deactivate [name]? They will lose portal access."
- [ ] Deactivated members shown in separate "Inactive" section (greyed out)
- [ ] Audit trail: `updated_at`, `updated_by` on affiliate record

### Notes
- Fixes QA-AFF-011
- Deactivation should follow the same terminated access pattern as AFF-4

---

## Feature AFF-9: Getting Started Checklist (New Affiliate Onboarding)
**Status:** pending
**Priority:** 9

### Description
For new affiliates with 0 referrals, show a guided checklist on the Dashboard instead of empty stats. Walks them through their first actions.

### Acceptance Criteria
- [ ] Checklist appears when: total_referrals = 0 AND account age < 30 days
- [ ] Steps: (1) Copy your referral link, (2) Add your first lead, (3) Complete payout setup, (4) Upload W-9
- [ ] Each step shows done/not-done state based on real data
- [ ] Checklist dismissible ("Got it, hide this")
- [ ] Links directly to relevant pages/actions

### Notes
- Replaces the empty-feeling dashboard that new affiliates currently see
- Should feel encouraging, not overwhelming

---

## Feature AFF-10: Lead Pipeline Board View (Kanban)
**Status:** pending
**Priority:** 10

### Description
Add a kanban-style board view as an alternative to the LeadTracker list view. Columns for each pipeline stage (New → Contacted → Qualified → Demo → Won/Lost). Drag-and-drop to move stages.

### Acceptance Criteria
- [ ] Toggle between "List" and "Board" views
- [ ] Columns for each status stage
- [ ] Drag-and-drop cards between columns updates status in DB
- [ ] Card shows: company name, contact name, priority badge, follow-up date
- [ ] Responsive: horizontal scroll on mobile
- [ ] Persists view preference

### Notes
- Lower priority — list view works fine for now
- Only implement drag-and-drop if it can be done without a heavy library

---

## Feature AFF-11: Commission Export (CSV/PDF)
**Status:** pending
**Priority:** 11

### Description
Allow affiliates to export their commission history for tax filing and record-keeping. Monthly or yearly, filterable by date range.

### Acceptance Criteria
- [ ] "Export" button on Commissions page
- [ ] Options: CSV or PDF, date range selector
- [ ] CSV columns: period, company name, commission amount, status, paid date
- [ ] PDF: formatted report with totals, affiliate info header
- [ ] Filename: `commissions-{affiliate_code}-{date_range}.csv`

### Notes
- Essential for tax season — affiliates need this for 1099 reconciliation
- Could combine with AFF-6 payout report for internal use

---

## Feature AFF-12: Referral Link QR Code
**Status:** pending
**Priority:** 12

### Description
One-tap generate a QR code from the referral URL on the Dashboard. Useful for in-person networking, trade shows, business cards.

### Acceptance Criteria
- [ ] "QR Code" button next to referral link on Dashboard
- [ ] Modal/popup showing QR code with referral URL embedded
- [ ] Download as PNG button
- [ ] QR code uses Work Van orange accent color

### Notes
- Can use a lightweight library or canvas-based generation
- Nice-to-have, not urgent

---

## Feature AFF-13: Lead Follow-Up Reminders
**Status:** pending
**Priority:** 13

### Description
Visual indicators when a lead's `next_follow_up` date is past due. Badge count in sidebar nav for overdue leads.

### Acceptance Criteria
- [ ] LeadTracker: overdue follow-ups highlighted in red
- [ ] Sidebar "Lead Tracker" nav item shows badge count of overdue leads
- [ ] Dashboard: "X overdue follow-ups" warning if any exist
- [ ] Overdue = `next_follow_up < today AND status not in (closed_won, closed_lost)`

### Notes
- No email/SMS reminders for now — just in-app visual indicators

---

## Feature AFF-14: Expanded Playwright Test Coverage
**Status:** pending
**Priority:** 14

### Description
Add test coverage for auth flows, CRUD operations, form validation, and mobile interactions beyond the current smoke tests.

### Acceptance Criteria
- [ ] Auth tests: bad credentials show error, expired impersonation token rejected
- [ ] LeadTracker CRUD: add lead, edit, log contact, delete
- [ ] Form validation: required fields, routing number format, etc.
- [ ] Navigation: click through all sidebar pages, verify content changes
- [ ] Mobile: hamburger menu toggle, modal scrolling on small screens
- [ ] Empty states: verify correct messaging with no data

### Notes
- Build on existing test infrastructure (AFF-1)
- Use impersonation for all tests — no real credentials
