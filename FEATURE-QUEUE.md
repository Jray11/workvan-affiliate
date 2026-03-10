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
