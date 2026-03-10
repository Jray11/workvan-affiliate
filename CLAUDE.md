# CLAUDE.md - Work Van Affiliate Portal

**Last Updated**: March 9, 2026
**App Name**: Work Van Affiliate Portal
**Live URL**: https://affiliates.workvanapp.com
**GitHub**: https://github.com/Jray11/workvan-affiliate.git
**Branch**: `master`

---

# STOP AND READ THIS FIRST

## THE USER DOES NOT RUN ANYTHING. EVER. PERIOD.

**DO NOT TELL THE USER TO:**
- Run SQL queries, migrations, terminal commands, npm commands
- Push to GitHub or deploy to Vercel
- Create database tables or storage buckets
- Do ANYTHING technical

**CLAUDE DOES 100% OF EVERYTHING:**
- Write all code
- `git add`, `git commit`, `git push` (auto-deploys to Vercel)
- Run SQL via Supabase Management API if needed
- ALL technical operations — NO EXCEPTIONS

## Workflow:
1. User describes what they want
2. **Claude** writes the code
3. **Claude** pushes to GitHub (auto-deploys to Vercel)
4. **Claude** runs migrations/SQL as needed
5. User tests and provides feedback

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (**Vite**, NOT Create React App) |
| Database | Supabase (shared with main app + internal app) |
| Hosting | Vercel (auto-deploy on push to master) |
| Icons | lucide-react |
| Styling | Inline CSS only (no CSS files, no CSS-in-JS) |
| State | Local component state (no Redux, no Context) |

**IMPORTANT**: This app uses **Vite**, not CRA. Build output goes to `dist/`, not `build/`.

---

## CREDENTIALS & ACCESS

### Supabase (Shared Instance)
**Project Ref**: `wrgmicftdykgaygbnkqn`
**Dashboard**: https://supabase.com/dashboard/project/wrgmicftdykgaygbnkqn

**Client in `src/supabase.js`** (Anon Key — respects RLS):
```
URL: https://wrgmicftdykgaygbnkqn.supabase.co
Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZ21pY2Z0ZHlrZ2F5Z2Jua3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDIzNTYsImV4cCI6MjA4MTE3ODM1Nn0.CpRdUWBAti0qGCLKIZCaydk4h4Nnifx6apBEwy0k4E8
```

**Service Role Key** (for admin operations / running SQL):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZ21pY2Z0ZHlrZ2F5Z2Jua3FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTYwMjM1NiwiZXhwIjoyMDgxMTc4MzU2fQ.ssiKFe5dGjiP9QAjFmVeyVrkHCFKz_AznT_85Qsvqxg
```

**Management API Token** (for running SQL):
```
sbp_336f95b1a02143b6bca2b09d00a9e36414172bd3
```

### Vercel
- **Project**: workvan-affiliate-portal (prj_RaVmAJEtPkiVc9NeUSWLgoCBWjyW)
- **URL**: https://affiliates.workvanapp.com
- **Auto-deploy**: Push to `master` triggers deploy
- **Build**: Vite → output to `dist/`
- **SPA rewrite**: All routes → `/index.html` (configured in vercel.json)

### GitHub
```bash
cd C:\Users\joshr\Desktop\WorkVanAffiliate
git add -A && git commit -m "message" && git push
```

---

## AUTH SYSTEM

This app has **three ways to authenticate**:

### 1. Password Login
- Affiliate enters email + password on Login page
- Calls `supabase.auth.signInWithPassword()`
- Looks up `affiliate_users` to find their affiliate record
- If no `affiliate_users` link exists, tries matching by email in `affiliates` table

### 2. Magic Link
- Hash fragment contains `access_token` + `refresh_token`
- App.jsx detects and calls `supabase.auth.setSession()`

### 3. Admin Impersonation
- From the Internal app, admin opens `?impersonate=<base64-token>`
- Token format: `btoa('admin:affiliateId:timestamp')`
- Valid for 24 hours
- Shows purple "Admin View" banner
- Logout closes the tab (`window.close()`)

### Post-Auth Flow
After authentication, the app checks:
1. **Terms acceptance** — if `agreed_to_terms_at` is null → show TermsAcceptance screen
2. **Payout setup** — if `payout_setup_complete` is false → show DirectDepositSetup (bank + tax info)
3. Then loads the main dashboard

---

## APP ARCHITECTURE

### File Structure
```
WorkVanAffiliate/
├── src/
│   ├── main.jsx                   # Vite entry point
│   ├── App.jsx                    # Main app (auth, routing, sidebar, onboarding)
│   ├── supabase.js                # Supabase client (anon key)
│   ├── pages/
│   │   ├── Login.jsx              # Email + password login, forgot password
│   │   ├── SetPassword.jsx        # First-time password setup via token
│   │   ├── Dashboard.jsx          # Stats, referral link, W-9 upload
│   │   ├── LeadTracker.jsx        # Sales pipeline (8-stage funnel)
│   │   ├── Referrals.jsx          # Referred companies list + status
│   │   ├── Commissions.jsx        # Monthly commission breakdown
│   │   └── Team.jsx               # Sub-affiliate management (recruiters only)
├── index.html                     # Vite entry HTML
├── vite.config.js                 # Vite config (React plugin)
├── vercel.json                    # SPA rewrite rules
├── package.json                   # Dependencies
└── .env.local                     # Supabase URL + anon key
```

### Navigation (App.jsx)
| Page ID | Component | Condition |
|---------|-----------|-----------|
| `dashboard` | Dashboard | Always (default) |
| `leads` | LeadTracker | Always |
| `referrals` | Referrals | Always |
| `commissions` | Commissions | Always |
| `team` | Team | Only if `affiliate.can_recruit === true` |

### Responsive Layout
- **Desktop**: 240px fixed sidebar + main content
- **Mobile (<768px)**: Fixed top header (60px) + sliding hamburger menu

---

## PAGE DETAILS

### Dashboard
- Referral link card (orange gradient): `https://workvanapp.com?ref={code}`
- Stats: Total Referrals, Total Earned, Pending Payout, Team Size (if recruiter)
- Commission structure display (fixed $ or % model)
- W-9 upload (stored in `affiliate-documents` bucket)
- Uses RPC: `get_affiliate_referral_stats(p_affiliate_id)`

### Lead Tracker
- 8-stage pipeline: new → contacted → qualified → demo → negotiating → stalled → closed_won → closed_lost
- 3 priority levels: hot, warm, cold
- Contact logging modal (call, email, text, meeting, demo)
- Pipeline value calculation based on subscription tier pricing
- Tables: `affiliate_leads`, `affiliate_lead_contacts`, `subscription_tiers`

### Referrals
- All companies that signed up with affiliate's referral code
- Status badges: Active (green), Trial (orange), Inactive (red)
- Uses RPC: `get_affiliate_referral_stats(p_affiliate_id)`

### Commissions
- Grouped by month with totals
- Filter: All / Pending / Paid
- Summary: Pending Payout, Total Paid, All Time Total
- Table: `affiliate_commissions`

### Team (Recruiters Only)
- Sub-affiliate list with stats (accounts, earnings)
- Override rate display
- Add team member form
- Tables: `affiliates` (where `parent_affiliate_id = current`)

---

## DATABASE TABLES

### Core Affiliate Tables
| Table | Purpose |
|-------|---------|
| `affiliates` | Affiliate profiles, commission models, hierarchy, portal settings, payout info |
| `affiliate_users` | Links Supabase auth users to affiliate records |
| `affiliate_commissions` | Monthly commission records per company |
| `affiliate_override_commissions` | Recruiter override earnings from sub-affiliate sales |
| `affiliate_leads` | Sales pipeline leads |
| `affiliate_lead_contacts` | Contact history per lead |

### Referenced Tables
| Table | Purpose |
|-------|---------|
| `companies` | Company data (referred_by_affiliate_id, subscription_status) |
| `subscription_tiers` | Pricing tiers for lead value calculation |

### Storage Buckets
| Bucket | Purpose |
|--------|---------|
| `affiliate-documents` | W-9 forms (path: `{affiliate_id}/w9.{ext}`) |

### RPC Functions
```sql
get_affiliate_referral_stats(p_affiliate_id UUID)
-- Returns: { total_referrals, active_referrals, companies: [...] }
```

---

## API ENDPOINTS (Hosted on Main App)

This app calls API routes on the **main Work Van app** (`workvanapp.com`):

| Endpoint | Purpose |
|----------|---------|
| `POST /api/send-affiliate-email` | Send welcome, portal invite, password setup emails |
| `POST /api/affiliate-set-password` | Set/update affiliate password via token |

These live in `C:\Users\joshr\Desktop\GarageDoorHub\api\`.

---

## AFFILIATE HIERARCHY

```
Partner (Affiliate Manager)
  ├── can_recruit: true
  ├── override_model: 'fixed' | 'percentage_of_sub' | 'from_pool'
  ├── override_rate: decimal
  │
  ├── Affiliate A (sub-affiliate)
  │   ├── parent_affiliate_id → Partner
  │   ├── commission_model: 'fixed' | 'percentage'
  │   └── commission_rate: decimal
  │
  └── Affiliate B (sub-affiliate)
      └── ...
```

**Commission Models:**
- **Fixed**: Flat $ amount per referred account per month
- **Percentage**: % of referred account's monthly revenue

**Override Models (for recruiters):**
- **fixed**: Flat % of the sale (regardless of sub's cut)
- **percentage_of_sub**: % of the sub-affiliate's commission
- **from_pool**: Total pool rate minus sub rate = parent's cut

---

## THEME & STYLING

All inline styles. No CSS files.

| Element | Color |
|---------|-------|
| Background | `#0a0a0a` |
| Cards | `#1a1a1a` |
| Borders | `#222`, `#2a2a2a` |
| Text | `#e0e0e0` |
| Muted text | `#888` |
| Accent | Linear gradient `#ff6b35` → `#f7931e` (orange) |
| Success | `#4ecca3` (teal) |
| Warning | `#f39c12` (orange) |
| Error | `#e74c3c` (red) |
| Recruiter badge | `#9b59b6` (purple) |
| Font | Archivo |

---

## KNOWN GOTCHAS

1. **Vite, NOT CRA** — uses `import.meta.env.VITE_*` for env vars, NOT `process.env.REACT_APP_*`. Build output is `dist/`, not `build/`.
2. **Anon key only** — this app uses the anon key (respects RLS), unlike the Internal app which uses service role. Affiliates can only see their own data.
3. **Shared database** — same Supabase as main app and internal app. Schema changes affect all three.
4. **API routes live in main app** — password setup and email sending endpoints are in `C:\Users\joshr\Desktop\GarageDoorHub\api/`. If you need to modify them, edit there and push that repo.
5. **Hash-based auth** — Magic link tokens come in the URL hash fragment. App.jsx handles them manually.
6. **Impersonation is time-limited** — 24-hour window from token creation.
7. **Terms + Payout gating** — New affiliates must accept terms and complete payout setup before accessing the dashboard.
8. **No CSS files** — everything is inline `style={{}}`. Keep it that way.
9. **Team page is conditional** — only renders for affiliates with `can_recruit === true`.

---

## ONBOARDING FLOW

```
Login/Magic Link/Impersonation
  ↓
Check affiliate_users link (or auto-link by email)
  ↓
Terms not accepted? → TermsAcceptance screen
  ↓
Payout not set up? → DirectDepositSetup (bank + tax info, can skip)
  ↓
Dashboard
```

**Direct Deposit Setup collects:**
- Bank: account holder, bank name, routing number (9 digits), account number, account type
- Tax: SSN or EIN (9 digits), stores only last 4 as `tax_id_last4`

---

## RELATED APPS

| App | URL | Repo | Local Path |
|-----|-----|------|-----------|
| **Work Van** (main) | workvanapp.com | Jray11/workvan.git | `C:\Users\joshr\Desktop\GarageDoorHub` |
| **Internal** (admin) | internal.workvanapp.com | Jray11/workvan-internal.git | `C:\Users\joshr\Desktop\WorkVanInternal` |

All three apps share the same Supabase database.

---

## TESTING (Playwright)

Tests should be set up following the same pattern as the main app:
- `playwright.config.js` with auth setup project + phone/tablet/desktop viewports
- `tests/auth.setup.js` — logs in with a test affiliate account, saves session
- `tests/pages-load.spec.js` — smoke test all pages load
- `tests/layout-overflow.spec.js` — check for content clipping at all viewports
- `tests/lead-actions.spec.js` — create lead, log contact, change status
- `tests/onboarding.spec.js` — terms acceptance, payout setup flow

**Test approach**: Use impersonation URL from internal app, OR create a dedicated test affiliate account with portal access.

---

## WHAT NEEDS WORK (As of March 2026)

This app has the core structure but needs significant feature development:
- Dashboard stats accuracy and completeness
- Lead Tracker UX improvements
- Commission history accuracy
- Team management features for recruiters
- Mobile responsiveness polish
- Notification system (new referral, commission paid)
- Performance metrics and analytics
- Better onboarding experience

---

## SUMMARY

The Work Van Affiliate Portal is the **partner-facing app** where affiliates (and affiliate managers/recruiters) can:
- See their referral link and stats
- Track sales leads through a pipeline
- View referred companies and their status
- Monitor commissions by month
- Manage their team of sub-affiliates (if recruiter)
- Upload tax documents (W-9)

**Key URLs**:
- Affiliate Portal: https://affiliates.workvanapp.com
- Main App: https://workvanapp.com
- Admin Portal: https://internal.workvanapp.com

**Remember**: YOU (Claude) do everything. The user does not run commands, push code, or touch the terminal.
