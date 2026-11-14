# Learnly — Academic Sponsorship & Student Welfare Platform Outline
## Kenyan Education Lifecycle: Pre-Primary → Primary → Junior School → Senior School → TVET/Polytechnic → College → University
> A student welfare and academic-sponsorship platform for an operator (sponsor/admin) who manages financial assistance — fees, upkeep, pocket money, fare, equipment — for students across every academic level in Kenya, with full student onboarding, related-user mapping (parents, next of kin, class teachers), academic-record tracing from origin to current term, proof-gated approvals, and multi-channel payouts (M-Pesa, Airtel Money, school bank accounts, school paybills, school-issued pocket-money cards).
>
> **Revision 1 — TanStack Start + Bootstrap 5.3.x + page-scoped CSS + motion system.** Two dashboards ship side-by-side: a Student Dashboard (10 pages, 5 sections each) and an Admin Dashboard (10 pages, 5 sections each). Every route resolves to exactly one CSS file under `src/styles/pages/` — strict 1-to-1 page-to-stylesheet mapping, scoped isolation, no style leakage.
>
> Companion design contract: this file is self-contained (both dashboards in one outline). Global Styling System (Section 2) is the single source of truth for design tokens, motion tokens, and the page-scoped CSS lifecycle.
---

## TABLE OF CONTENTS

```
1.   PROJECT OVERVIEW & ARCHITECTURE
2.   GLOBAL STYLING SYSTEM  (academic palette + Bootstrap 5.3.x + page-scoped CSS)
3.   KENYAN EDUCATION LEVELS & INSTITUTION TAXONOMY
4.   HOME PAGES (3)
5.   AUTH & ONBOARDING PAGES (8) — incl. self-onboard + admin-onboard
6.   STUDENT DASHBOARD PAGES (10) — 5+ SECTIONS EACH
7.   ADMIN DASHBOARD PAGES (10) — 5+ SECTIONS EACH
8.   SHARED COMPONENTS
9.   STATE MANAGEMENT
10.  DATABASE SCHEMA
11.  FINANCIAL ASSISTANCE ENGINE
12.  PAYOUTS & DISBURSEMENT ENGINE
13.  ACADEMIC RECORDS ENGINE
14.  APPROVALS & PERMISSIONS ENGINE
15.  NOTIFICATIONS & COMMS
16.  COMPLETE PAGE INDEX
17.  IMPLEMENTATION PHASES
```

---

## 1. PROJECT OVERVIEW & ARCHITECTURE

### 1.1 Tech Stack

```
FRONTEND (TanStack-first):
Framework:       TanStack Start  (server functions + file-based routing)
Router:          TanStack Router  (type-safe routes, loaders, search params,
                 code-split route components + assets)
Server State:    TanStack Query  (query keys, mutations, invalidation,
                 background refetch, optimistic updates)
Tables:          TanStack Table v8  (sorting, filtering, pagination,
                 column resizing, row selection, expandable rows)
UI Library:      Bootstrap 5.3.x (latest stable) + Bootstrap Icons
Custom CSS:      Page-scoped stylesheets — one per route, 1-to-1 file mapping
Forms:           React Hook Form + Zod  (schema reuse across client + server)
                 Step wizards: multi-step onboarding via @tanstack/react-form
Charts:          Recharts (KPI/mini charts, disbursement trends, approval funnel)
Realtime:        Socket.IO (admin↔student notifications, approval status push)
Animation:       Framer Motion + CSS keyframes + Bootstrap collapse/tab transitions
Build:           Vite (TanStack Start default)

BACKEND (Node + Express):
Runtime:         Node.js 20 LTS + Express 4
Database:        PostgreSQL 16 (Prisma ORM)
Cache:           Redis 7 (sessions, rate limits, pub/sub, OTP buffers)
Auth:            Auth.js (credentials) + JWT refresh + OTP (via Africa's Talking SMS)
Queue:           BullMQ (payout batches, document OCR, reminder jobs, term reminders)
WebSocket:       ws 8.x / Socket.IO (approval state, message threads)
File Storage:    S3-compatible (result slips, fee structures, ID docs, consent forms)
Mailer:          React Email + Resend (transactional) + Africa's Talking SMS (OTP/bulk)
Payments:        Safaricom Daraja API (M-Pesa STK Push + B2C),
                 Airtel Money API, bank EFT/RTGS integrations per institution
OCR/Doc AI:      Google Document AI (auto-extract KCPE/KCSE slip data, fee structure totals)
ID Verification: Kenya e-Citizen / IPRS bridge (national ID & birth cert lookup)

INFRASTRUCTURE:
Hosting:         VPS or AWS ECS (Fargate) behind Cloudflare
Container:       Docker + docker-compose (dev) / ECS task def (prod)
CI/CD:           GitHub Actions (type-check → test → build → deploy)
Monitoring:      Prometheus + Grafana + Sentry
Logging:         Winston → Loki → Grafana
CDN:             Cloudflare (static assets, cache, WAF)
Compliance:      Data Protection Act 2019 (Kenya) — consent logging,
                 data-subject access exports, retention rules, audit trail
```

### 1.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              CLIENT (TanStack Start + Vite)                       │
│  ┌──────┐  ┌──────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐   │
│  │ Home │  │ Auth │  │ Student │  │ Admin   │  │ Documents │   │
│  │route │  │route │  │ route   │  │ route   │  │ route     │   │
│  │.css  │  │.css  │  │.css     │  │.css     │  │ + uploads │   │
│  └──────┘  └──────┘  └────┬────┘  └────┬────┘  └───────────┘   │
└───────────────────────────┼─────────────┼─────────────────────────┘
                            │ HTTPS / WSS │
┌───────────────────────────▼─────────────▼─────────────────────────┐
│                  API GATEWAY (Express)                             │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ Auth Routes│ │ Student API │ │ Admin API    │ │ Payout API │  │
│  │ OTP/JWT    │ │ Profile,    │ │ Approvals,   │ │ M-Pesa B2C,│  │
│  │ Onboarding │ │ Records,    │ │ Students,    │ │ Bank EFT,  │  │
│  │            │ │ Users       │ │ Budgets, RBAC│ │ Card topup │  │
│  └────────────┘ └─────────────┘ └──────────────┘ └────────────┘  │
└────┬───────────────┬────────────────┬─────────────────┬──────────┘
     │               │                │                 │
┌────▼────┐  ┌───────▼───────┐  ┌─────▼──────────┐  ┌──▼──────────────┐
│PostgreSQL│  │  Redis 7      │  │  BullMQ Queues │  │ Payment Gateways│
│(Students,│  │ (sessions,    │  │ (payouts, OCR, │  │ Daraja M-Pesa,  │
│  Users,  │  │  OTP, pubsub, │  │  reminders,    │  │ Airtel Money,   │
│  Schools,│  │  rate limits) │  │  audit)        │  │ Bank RTGS,      │
│  Records,│  └───────────────┘  └────────────────┘  │ School paybills │
│  Requests│                                             └─────────────────┘
│  Payouts)│
└──────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │   KENYAN ECOSYSTEM        │
        │  NEMIS (learner UPI),     │
        │  KNEC (KPSEA/KCSE/KCPE),  │
        │  KRA (sponsor PIN),       │
        │  IPRS / e-Citizen (ID),   │
        │  TVET/CDACC frameworks,   │
        │  CUE (university charter) │
        └──────────────────────────┘
```

### 1.3 Key Architecture Principle

```
OPERATOR (ADMIN) MODEL:
I (admin) → sponsor a portfolio of students across every Kenyan level
         → students onboard themselves OR I onboard them (admin-initiated)
         → I configure every financial-aid category (fees, upkeep, pocket
            money, fare, equipment, medical, books)
         → students submit requests; categories that require proof
            (fees, termly upkeep) force a document upload before submit
         → I review, adjust amounts, approve or reject with reasons
         → payouts channel to the correct destination per category:
              • fees         → school bank account / school paybill
              • upkeep       → student/parent M-Pesa or Airtel
              • pocket money → school-issued prepaid card / student wallet
              • fare         → student/parent M-Pesa
              • equipment    → supplier paybill (school or vendor)

STUDENT DASH = the student's portal (their profile, records, requests,
               payout destinations, related users, messages, docs)

ADMIN DASH   = my command center (approvals, disbursements, students,
               schools, staff/RBAC, budgets, reports, audit, settings)

There is no peer-to-peer money flow on the student side.
Students REQUEST; the admin AUTHORIZES and the system DISBURSES.
Students never touch pooled funds directly.
```

### 1.4 UI Framework & Styling System (Expanded)

```
BOOTSTRAP 5.3.x RESPONSIVE BASE:
Grid:             container / row / col-* with sm-md-lg-xl-xxl breakpoints
Components:       card, table, modal, offcanvas, accordion, toast,
                  dropdown, nav-tabs, progress, badge, navbar,
                  collapse, scrollspy, tab, popover, tooltip, stepper
Utilities:        spacing (m-*, p-*, gap-*), flex (d-flex, gap-*),
                  display (d-none, d-md-block), rounded-4, shadow-*,
                  text-bg-*, opacity-*, ratio
Breakpoints:      sm 576px / md 768px / lg 992px / xl 1200px / xxl 1400px
Dark mode:        data-bs-theme="dark"  (native 5.3 toggle, persists in localStorage)
Form controls:    form-control, form-select, input-group, form-check,
                  floating labels, validation states (is-valid/is-invalid)
Steppers:         custom .stepper-h / .stepper-v for onboarding & approval workflows
Offcanvas:        mobile sidebar via offcanvas-start, backdrop dismissal
No jQuery — Bootstrap JS bundle imported per route (only when component needs it)

PAGE-SCOPED CUSTOM CSS (1-to-1 FILE MAPPING):
Convention:       one stylesheet per page/route — 31 pages → 31 stylesheets
File location:    src/styles/pages/<route>.css
e.g. /student/financial-assistance → src/styles/pages/student-financial-assistance.css
e.g. /admin/approvals               → src/styles/pages/admin-approvals.css
Namespacing:      every selector scoped under .page-<route> root class
                 .page-student-overview { … }
                 .page-admin-approvals { … }
Layer order:      1) Bootstrap 5.3 (CDN/compiled)
                 2) Global design tokens (src/styles/tokens.css)
                 3) Shared component CSS (src/styles/components/*.css)
                 4) Page-scoped stylesheet (mounted at route enter)
Injection lifecycle:
                 TanStack Router createFileRoute() loader →
                 inject <link> into <head> →
                 on route leave: remove the <link> + clear cached styles
                 Guarantees no style leaks across pages.
Hot-reload:       Vite HMR wires the page stylesheet to its route component;
                 edits reflect instantly without manual refresh.

ANIMATION SYSTEM:
Page entrance:    fade + slide-up stagger (60ms per item, capped at 12 items)
Micro-interact:   hover-lift + shadow on cards; spin/pulse on live icons;
                 draw-in stroke animation on SVG/CSS charts
Data motion:      number count-up on KPI cards (1.2s ease-out, requestAnimationFrame);
                 row flash green/red 800ms on approval state changes;
                 chart draw-in 600ms on data load
Real-time:        pulse dot for "pending" indicators; spin on sync icons;
                 ripple on tap for mobile buttons; confetti on first approval
A11y:             prefers-reduced-motion → disable count-up (snap to final),
                 disable draw-ins, disable flash, keep static transitions only

RESPONSIVE CARD & SECTION SYSTEM:
KPI rows:          row-cols-1 row-cols-md-2 row-cols-xl-4  → 1/2/4 column flow
Card grids:        row-cols-1 row-cols-sm-2 row-cols-lg-3  → 1/2/3 flow
Tables-to-cards:   on < md breakpoint, tables collapse to stacked card layout
                  using data-label attributes (CSS ::before content)
Sidebar:           fixed on lg+; offcanvas on md/sm with backdrop
Top bar:           sticky with collapse-on-scroll; mobile hamburger triggers offcanvas
Form layout:       vertical stack on sm, horizontal label on md+
Drawer panels:     slide-in from right on lg+, full-screen modal on sm
```

---

## 2. GLOBAL STYLING SYSTEM

> This section is the single source of truth for Learnly's design tokens, motion tokens, and page-scoped CSS lifecycle. Any future sibling files (e.g. `learnlyAdminMO.md`, `learnlyStudentMO.md` if ever split) MUST inherit this section verbatim.

### 2.1 Design Tokens

```
COLOR TOKENS (CSS custom properties on :root + [data-bs-theme="dark"]):

/* Brand — Academic Indigo + Gold (scholarly, trustworthy, Kenyan-flag compatible) */
--brand-primary:        #1f3a8a;   /* Learnly indigo (deep navy) */
--brand-primary-rgb:   31, 58, 138;
--brand-primary-soft:  #e6ebf5;   /* tinted backgrounds */
--brand-accent:        #f4a531;   /* academic gold (achievement) */
--brand-accent-rgb:   244, 165, 49;
--brand-warning:       #f59e0b;   /* pending amber */
--brand-danger:        #dc2626;   /* rejected / overdue red */
--brand-success:       #15803d;   /* approved / disbursed green */
--brand-info:          #0ea5e9;   /* info blue */
--brand-purple:        #7c3aed;   /* academic honors purple */

/* Semantic surface tokens (auto-flip in dark mode) */
--surface-0:           #fbfaf7;   /* page bg (light, warm cream) → #0f1117 (dark) */
--surface-1:           #ffffff;   /* card bg  (light) → #161924 (dark) */
--surface-2:           #f4f2ec;   /* nested bg (light, parchment) → #1d2030 (dark) */
--surface-3:           #e7e3d8;   /* hover/active bg */
--border-subtle:       rgba(31, 58, 138, 0.10);
--border-strong:       rgba(31, 58, 138, 0.20);

/* Text */
--text-primary:        #14182b;
--text-secondary:      #525876;
--text-tertiary:       #8b90a8;
--text-on-brand:       #ffffff;
--text-gold:           #946012;   /* dark gold for body emphasis */

/* Education-level ribbon palette (used in badges across dashboards) */
--edu-preprimary:      #f472b6;   /* PP1/PP2 / Play Group */
--edu-primary:         #38bdf8;   /* Grade 1-6 */
--edu-junior:          #34d399;   /* Grade 7-9 (Junior School) */
--edu-senior:          #a78bfa;   /* Grade 10-12 / Form 1-4 (Senior School) */
--edu-tvet:            #fb923c;   /* Polytechnic / TVET / TTI */
--edu-college:         #facc15;   /* Diploma / College */
--edu-university:      #60a5fa;   /* Bachelor / Master / PhD */
--edu-special:         #f87171;   /* SNE / Special Needs */
--edu-international:   #2dd4bf;   /* IGCSE / IB / A-Levels */

/* Request category palette (financial-assistance categories) */
--cat-fees:            #1f3a8a;   /* school fees */
--cat-upkeep:          #15803d;   /* upkeep / living */
--cat-pocketmoney:     #f4a531;   /* pocket money */
--cat-fare:            #0ea5e9;   /* transport fare */
--cat-equipment:       #7c3aed;   /* books, uniform, laptop */
--cat-medical:         #dc2626;   /* medical / emergency */
--cat-exam:            #fb923c;   /* KCSE/KPSEA registration */

/* Data viz palette (charts) */
--viz-1: #1f3a8a;  --viz-2: #f4a531;  --viz-3: #15803d;
--viz-4: #dc2626;  --viz-5: #0ea5e9;  --viz-6: #7c3aed;

SPACING / RADIUS / SHADOW TOKENS:
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 24px;  --space-6: 32px;  --space-7: 48px;  --space-8: 64px;
--radius-sm: 8px;   --radius-md: 12px;   --radius-lg: 18px;
--radius-pill: 999px;
--shadow-1: 0 1px 2px rgba(20,24,43,0.06), 0 1px 3px rgba(20,24,43,0.04);
--shadow-2: 0 4px 12px rgba(20,24,43,0.08);
--shadow-3: 0 12px 32px rgba(20,24,43,0.12);
--shadow-lift: 0 18px 48px rgba(31,58,138,0.18);

TYPOGRAPHY TOKENS:
--font-serif:    "Lora", "Source Serif Pro", Georgia, serif;  /* headings — academic */
--font-sans:     "Inter", "Noto Sans", system-ui, -apple-system, sans-serif;  /* body */
--font-mono:     "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
--font-numeric:  "Inter", tabular-nums, "SF Pro Display";
--font-display:  "Fraunces", "Lora", serif;   /* hero / display headings */
--fs-display:    3rem;
--fs-h1:         2.25rem;  --fs-h2: 1.75rem;  --fs-h3: 1.375rem;
--fs-kpi-xl:     2.5rem;  --fs-kpi:    1.75rem;  --fs-kpi-sm: 1.25rem;
--fs-body:       0.9375rem;  --fs-sm: 0.8125rem;
--fs-label:      0.6875rem; (uppercase, letter-spacing 0.08em, weighted 600)
--lh-tight: 1.15;  --lh-normal: 1.55;  --lh-relaxed: 1.7;
/* Italic / blockquote for academic voice */
--quote-style:   italic var(--font-serif);
```

### 2.2 Page-Scoped CSS Injection Lifecycle

```
TanStack Router integration:

// src/routes/student/financial-assistance.tsx
import { createFileRoute } from "@tanstack/router";
import finAssistanceStyles from "@/styles/pages/student-financial-assistance.css";

export const Route = createFileRoute("/student/financial-assistance")({
  // 1. Inject page stylesheet on enter
  loader: async ({ context }) => {
    context.styles.mount("student-financial-assistance", finAssistanceStyles);
    return await context.queryClient.ensureQueryData(...);
  },
  // 2. Remove on leave
  onLeave: ({ context }) => {
    context.styles.unmount("student-financial-assistance");
  },
  // 3. Component scoped under .page-student-financial-assistance root class
  component: FinancialAssistancePage,
});

BEHAVIOR:
✓ Stylesheet is mounted exactly once when the route becomes active.
✓ Multiple instances of the same route (e.g. dev HMR) deduplicate via loader context.
✓ On route transition (leave), the <link> element is removed from <head> and
  all .page-* scoped rules stop applying.
✓ Page components render a <div className="page-<route>"> wrapper;
  all selectors in the page stylesheet are scoped under this root class.
✓ Cross-page style leakage is structurally impossible.

MIGRATION SAFETY:
- Bootstrap utility classes still apply globally (intended).
- Shared component CSS files (src/styles/components/*.css) are loaded at app root,
  so components like StatCard, EduLevelBadge, ApprovalCard render identically on every page.
- Page stylesheets only override layout/visual specifics for that page.
```

### 2.3 Animation Patterns (Reusable Across All 31 Pages)

```
ENTRANCE PATTERNS:
.page-<route> > * { opacity: 0; transform: translateY(8px); }
.page-<route>.is-entered > * {
  animation: fadeSlideUp var(--dur-base) var(--ease-out) forwards;
  animation-delay: calc(var(--idx) * var(--stagger-step));
}
/* var(--idx) set per child via :nth-child or inline style */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

HOVER-LIFT CARDS:
.page-<route> .card.hover-lift {
  transition: transform var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out);
}
.page-<route> .card.hover-lift:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lift);
}

COUNT-UP KPIs:
→ requestAnimationFrame animates from 0 to value over 1.2s
→ easing: easeOutQuart  (1 - Math.pow(1 - t, 4))
→ currency formatted in KES with thousand separators
→ on tab visibility lost: pause animation, resume on focus
→ prefers-reduced-motion: snap to final value immediately

ANIMATED ICONS:
.icon-pulse   { animation: pulse 1.4s var(--ease-in-out) infinite; }
.icon-spin    { animation: spin 1.2s linear infinite; }
.icon-draw    { stroke-dasharray: 1; stroke-dashoffset: 1;
                animation: draw 800ms var(--ease-out) forwards; }
@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; }
                   50%     { transform: scale(1.12); opacity: 0.7; } }
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes draw  { to { stroke-dashoffset: 0; } }

ROW FLASH ON APPROVAL STATE CHANGES:
.row-flash-approved   { animation: flashApproved 800ms var(--ease-out); }
.row-flash-rejected   { animation: flashRejected 800ms var(--ease-out); }
.row-flash-disbursed  { animation: flashDisbursed 800ms var(--ease-out); }
@keyframes flashApproved { 0% { background: rgba(21,128,61,0.22); }
                           100% { background: transparent; } }
@keyframes flashRejected  { 0% { background: rgba(220,38,38,0.22); }
                           100% { background: transparent; } }
@keyframes flashDisbursed { 0% { background: rgba(31,58,138,0.22); }
                           100% { background: transparent; } }

CHART DRAW-IN:
.chart-draw { animation: chartDraw var(--dur-slower) var(--ease-out) forwards; }
@keyframes chartDraw {
  from { clip-path: inset(0 100% 0 0); opacity: 0; }
  to   { clip-path: inset(0 0 0 0);   opacity: 1; }
}

CONFETTI ON FIRST APPROVAL (student side, once per user):
→ 80 particles, gold + indigo, 1.4s burst, then disabled permanently for that user
→ disabled under prefers-reduced-motion

REDUCED MOTION:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* count-up snaps to final; chart draw-ins skipped;
     row flash skipped; icon spin/pulse disabled; confetti disabled */
}
```

### 2.4 Responsive Card & Section Patterns

```
KPI ROW (1/2/4 column flow):
<div class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
  <div class="col"><StatCard …/></div> …
</div>

CARD GRID (1/2/3 flow with hover-lift):
<div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
  {items.map(p => <div class="col"><Card hover-lift …/></div>)}
</div>

TABLES-TO-CARDS (mobile auto-collapse):
/* desktop: standard Bootstrap table */
/* < md: each row becomes a stacked card */
@media (max-width: 767.98px) {
  .responsive-table thead { display: none; }
  .responsive-table tr {
    display: block; padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md); margin-bottom: var(--space-2);
  }
  .responsive-table td {
    display: flex; justify-content: space-between;
    padding: var(--space-1) 0;
  }
  .responsive-table td::before {
    content: attr(data-label);
    font-weight: 600; color: var(--text-secondary);
    margin-right: var(--space-3);
  }
}

OFFCANVAS MOBILE SIDEBAR:
<nav class="navbar d-lg-none">
  <button class="btn btn-outline-primary" data-bs-toggle="offcanvas"
          data-bs-target="#studentSidebar">☰ Learnly Student</button>
</nav>
<aside class="offcanvas offcanvas-start d-lg-none" id="studentSidebar">…</aside>
<aside class="d-none d-lg-block sidebar-static">…</aside>
/* on lg+: sidebar becomes static d-lg-block */
/* on md/sm: opens as offcanvas with backdrop dismissal */

SECTION DIVIDERS:
.section-divider {
  display: flex; align-items: center; gap: var(--space-3);
  margin: var(--space-6) 0 var(--space-4);
}
.section-divider::before,
.section-divider::after {
  content: ""; flex: 1; height: 1px;
  background: var(--border-subtle);
}
.section-divider .pill {
  font-family: var(--font-serif);
  font-size: var(--fs-h3);
  color: var(--brand-primary);
}

STEPPER (onboarding & approval workflow):
.stepper-h { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.stepper-h .step {
  flex: 1; min-width: 120px;
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-secondary);
}
.stepper-h .step.is-active {
  background: var(--brand-primary); color: #fff;
}
.stepper-h .step.is-done {
  background: var(--brand-success); color: #fff;
}
```

### 2.5 Page-Scoped Stylesheet Index (1-to-1 Mapping)

```
The platform has 31 pages. Each ships its own stylesheet under
src/styles/pages/<route>.css. Strict 1-to-1 page-to-stylesheet mapping.

HOME PAGES (3 stylesheets):
H-1  src/styles/pages/landing.css
H-2  src/styles/pages/levels.css                (Kenyan education-levels explainer)
H-3  src/styles/pages/how-it-works.css

AUTH & ONBOARDING PAGES (8 stylesheets):
A-1  src/styles/pages/auth-signup.css
A-2  src/styles/pages/auth-signin.css
A-3  src/styles/pages/auth-onboard-student.css  (self-onboard wizard)
A-4  src/styles/pages/auth-admin-onboard.css    (admin onboards a student)
A-5  src/styles/pages/auth-forgot-password.css
A-6  src/styles/pages/auth-reset-password.css
A-7  src/styles/pages/auth-verify-otp.css
A-8  src/styles/pages/auth-consent.css          (DPA 2019 consent capture)

STUDENT DASHBOARD (10 stylesheets):
S-1   src/styles/pages/student-overview.css
S-2   src/styles/pages/student-profile.css
S-3   src/styles/pages/student-financial-assistance.css
S-4   src/styles/pages/student-academic-records.css
S-5   src/styles/pages/student-related-users.css
S-6   src/styles/pages/student-account.css
S-7   src/styles/pages/student-documents.css
S-8   src/styles/pages/student-messages.css
S-9   src/styles/pages/student-notifications.css
S-10  src/styles/pages/student-settings.css

ADMIN DASHBOARD (10 stylesheets):
AD-1   src/styles/pages/admin-command-center.css
AD-2   src/styles/pages/admin-students.css
AD-3   src/styles/pages/admin-approvals.css
AD-4   src/styles/pages/admin-disbursements.css
AD-5   src/styles/pages/admin-academic-verification.css
AD-6   src/styles/pages/admin-schools.css
AD-7   src/styles/pages/admin-users-permissions.css
AD-8   src/styles/pages/admin-finance-budget.css
AD-9   src/styles/pages/admin-reports.css
AD-10  src/styles/pages/admin-audit-settings.css

SHARED LAYOUT STYLESHEET (always mounted):
src/styles/app-shell.css
(sidebar, top bar, mobile nav, dark-mode toggle, page wrapper, edu-ribbon)

SHARED COMPONENT CSS (loaded at app root, NOT page-scoped):
src/styles/components/*.css — StatCard, EduLevelBadge, RequestCard,
ApprovalCard, PayoutMethodCard, DocumentUploader, DataTable, ChartWrapper,
ProfileCompletenessBar, RelatedUserCard, SchoolPicker, ConsentModal, etc.

TOTAL: 31 page stylesheets + 1 app-shell + N shared components
= strict 1-to-1 page-to-stylesheet mapping across both dashboards
```

### 2.6 Page Style Block Template

```
Every page in sections 4-7 below carries this STYLE block at its intro:

STYLE RULES:
Page stylesheet:   src/styles/pages/<route>.css
Root class:        .page-<route>  (scoped under this root only)
Mount lifecycle:   TanStack Router loader → mount <link>; onLeave → unmount
Motion hooks:      fadeSlideUp stagger (60ms/item, max 12 items)
                  hover-lift on .card.hover-lift
                  count-up on KPI numbers (1.2s ease-out-quart, KES formatted)
                  icon-pulse on live status indicators
                  row-flash-approved/rejected/disbursed on approval rows
                  chart-draw on data charts (600ms ease-out)
Responsive:        KPIs 1/2/4 cols (sm/md/xl)
                  card grids 1/2/3 cols (sm/lg)
                  tables collapse to stacked cards < md
                  sidebar offcanvas < lg, static lg+
                  forms vertical < md, horizontal md+
Reduced motion:    count-up snaps to final; draw-ins skipped;
                  pulse/spin disabled; row-flash disabled
```

---

## 3. KENYAN EDUCATION LEVELS & INSTITUTION TAXONOMY

> This taxonomy drives every dropdown, badge color, validation rule and report filter in Learnly. It is the canonical reference for `edu_level` enums across the schema.

### 3.1 Full Education-Level Hierarchy

```
PRE-PRIMARY (ECDE — Early Childhood Development Education):
├── Play Group (PG)                  — age ~3
├── Pre-Primary 1 (PP1)              — age ~4
└── Pre-Primary 2 (PP2)              — age ~5

PRIMARY (CBC — Competency-Based Curriculum):
├── Grade 1                          — age ~6
├── Grade 2                          — age ~7
├── Grade 3                          — age ~8   (first SBA assessment)
├── Grade 4                          — age ~9
├── Grade 5                          — age ~10
└── Grade 6                          — age ~11  (KPSEA — Kenya Primary School
                                                 Education Assessment)

JUNIOR SCHOOL (CBC — formerly "junior secondary"):
├── Grade 7                          — age ~12
├── Grade 8                          — age ~13
└── Grade 9                          — age ~14  (KJSEA — Kenya Junior School
                                                 Education Assessment)

SENIOR SCHOOL (CBC — replacing 8-4-4 secondary):
├── Grade 10                         — age ~15  (pathway selection:
│                                                STEM / Arts & Sports Science /
│                                                Social Sciences)
├── Grade 11                         — age ~16
└── Grade 12                         — age ~17  (Kenya Senior School Education
                                                 Assessment — KCSE-equivalent)

LEGACY 8-4-4 (still transitioning out; supported for historical records):
├── Standard 1 → Standard 8          (primary, with KCPE at end of Std 8)
└── Form 1 → Form 4                  (secondary, with KCSE at end of Form 4)

SPECIAL NEEDS EDUCATION (SNE):
├── Schools for the Deaf
├── Schools for the Blind
├── Schools for the Physically Challenged
├── Schools for the Intellectually Challenged
└── Integrated / Inclusive units within mainstream schools

INTERNATIONAL CURRICULA (private/international schools in Kenya):
├── IGCSE (Cambridge) — Year 1 to Year 11, with IGCSE exams at Year 11
├── International Baccalaureate (IB) — PYP, MYP, DP
├── A-Levels (Cambridge / Edexcel) — AS (Year 12) and A2 (Year 13)
└── American Curriculum — K-12 with AP exams

TECHNICAL & VOCATIONAL EDUCATION AND TRAINING (TVET):
├── Vocational Training Centres (VTCs)        — artisan level (Level 1-3)
├── Technical Training Institutes (TTIs)      — craft & diploma (Level 4-6)
├── Technical & Vocational Colleges (TVCs)    — diploma & higher diploma
└── National Polytechnics (Level 5-7):
    ├── The Kenya Polytechnic (now TUK legacy arm)
    ├── Mombasa Polytechnic (now TUM legacy arm)
    ├── Eldoret National Polytechnic
    ├── Kisumu National Polytechnic
    ├── Nyeri National Polytechnic
    ├── Meru National Polytechnic
    ├── Bungoma National Polytechnic
    ├── Kabete National Polytechnic
    ├── Kitale National Polytechnic
    ├── Sigalagala National Polytechnic
    ├── Nairobi Technical Training Institute (NTTI)
    └── Mawira Technical Training Institute

TEACHER TRAINING COLLEGES:
├── Primary Teacher Training Colleges (PTTCs) — legacy, transitioning to diploma
├── Kenya Technical Teachers College (KTTC)
└── Diploma in Teacher Education (DTE) colleges

MEDICAL & PROFESSIONAL COLLEGES:
├── Kenya Medical Training College (KMTC) — cert / diploma / higher diploma
├── Kenya School of Law (KSL) — Advocates Training Programme (ATP)
├── Kenya School of Government (KSG)
├── Kenya Institute of Management (KIM)
├── Kenya Forestry College, Londiani
├── Kenya Wildlife Service Training Institute (KWSTI), Naivasha
├── Bandari Maritime Academy
├── Kenya Utalii College (tourism & hospitality)
├── Kenya Industrial Training Institute (KITI), Nakuru
└── Railways Training School, Nairobi

PRIVATE COLLEGES (a non-exhaustive sample; admin can register any):
├── NIBS (Nairobi Institute of Business Studies)
├── Nairobi Aviation College
├── East Africa School of Management
├── Summit Business School
├── Inoorero University
└── (any registered private TVC/college)

UNIVERSITIES (PUBLIC — chartered by CUE):
University of Nairobi (UoN) | Kenyatta University (KU) |
Jomo Kenyatta University of Agriculture & Technology (JKUAT) |
Moi University | Egerton University | Maseno University |
Technical University of Kenya (TUK) | Technical University of Mombasa (TUM) |
Pwani University | Murang'a University of Technology |
Meru University of Science & Technology (MUST) |
Dedan Kimathi University of Technology (DeKUT) | Laikipia University |
Chuka University | Karatina University | Kisii University |
Masinde Muliro University of Science & Technology (MMUST) |
Jaramogi Oginga Odinga University of Science & Technology (JOOUST) |
South Eastern Kenya University (SEKU) | University of Eldoret (UoE) |
Taita Taveta University (TTU) | Rongo University | Kibabii University |
Garissa University | Maasai Mara University | Kirinyaga University |
Tom Mboya University | Alupe University | Turkana University College |
Multimedia University of Kenya (MMU) | Cooperative University of Kenya |
Karatina University | Machakos University

UNIVERSITIES (PRIVATE — chartered):
Strathmore University | Daystar University |
United States International University-Africa (USIU-Africa) |
Catholic University of Eastern Africa (CUEA) | Africa International University (AIU) |
Africa Nazarene University (ANU) | Kabarak University |
Kenya Methodist University (KeMU) | KCA University (KCAU) |
Mount Kenya University (MKU) | St. Paul's University |
Pan-Africa Christian University (PAC) | Zetech University |
Inoorero University | Gretsa University | Lukenya University |
Management University of Africa (MUA) | Pioneer International University |
University of Eastern Africa, Baraton (UEAB)

DEGREE / AWARD LEVELS:
├── Certificate (post-secondary, Level 4-5)
├── Craft Certificate (TVET, Level 4-5)
├── Diploma (TVET/College, Level 6)
├── Higher Diploma (Level 7)
├── Bachelor's Degree (Level 7-8) — BA, BSc, BEd, BCom, LLB, MBChB, BPharm,
│                                    BArch, BEng, BNursing, etc.
├── Postgraduate Diploma (PGD)
├── Master's Degree (Level 9) — MA, MSc, MBA, MEd, MPhil, MMED
├── Doctorate (Level 10) — PhD, DPhil, DBA, EdD
└── Professional Doctorates (MD, DClinPsy)
```

### 3.2 KNEC Examination Calendar

```
KENYA NATIONAL EXAMINATIONS COUNCIL — assessment touch-points:

CBC pathway:
├── Grade 3, 4, 5, 7, 8 — SBA (School-Based Assessment), continuous
├── Grade 6  — KPSEA  (Kenya Primary School Education Assessment)     — Oct/Nov
├── Grade 9  — KJSEA  (Kenya Junior School Education Assessment)      — Oct/Nov
└── Grade 12 — KSSEA  (Kenya Senior School Education Assessment)      — Oct/Nov

Legacy 8-4-4 (historical records supported):
├── Std 8 — KCPE  (Kenya Certificate of Primary Education)            — Oct/Nov (phasing out)
└── Form 4 — KCSE (Kenya Certificate of Secondary Education)          — Oct/Nov

TVET exams:
├── NITA (National Industrial Training Authority) trade tests
├── City & Guilds
├── ICDL (International Computer Driving Licence)
├── KNEC TVET exams — July/August and November/December series
└── CDACC (Curriculum Development, Assessment & Certification Council)
    competency-based assessments

University exams: per-semester, set by individual universities
                  (typically Dec/Jan and May/June)

THIS CALENDAR DRIVES:
→ term-start/end reminders pushed to students & admin
→ automatic "results expected" flag on academic-records page after each window
→ admin-side batch prompt to upload termly results during the upload window
```

### 3.3 Kenyan Identity & Identification Numbers

```
Every student profile carries a stack of identifiers depending on level:

BIRTH CERTIFICATE NUMBER   — required for pre-primary, primary, junior
                              (the parent's birth cert copy is uploaded)
NEMIS UPI                  — Unique Personal Identifier issued by the
                              National Education Management Information System
                              (every learner in a Kenyan public/basic
                              school is supposed to have one)
KCPE INDEX NUMBER          — for legacy/secondary/senior students who sat KCPE
KCSE INDEX NUMBER          — for tertiary/university students who sat KCSE
KNEC ASSESSMENT INDEX      — KPSEA / KJSEA / KSSEA index numbers (CBC)
NATIONAL ID NUMBER         — required for students ≥ 18 years (university,
                              polytechnic, college); KRA PIN linked
KRA PIN                    — for university students who file taxes / receive
                              stipends above the PAYE threshold
PASSPORT NUMBER            — for international students studying in Kenya

IPRS / e-Citizen BRIDGE:
→ On student ≥ 18, admin can run an IPRS lookup to verify national ID
→ Returns: name match, DOB match, sex, validity of the ID
→ Result logged in audit trail; raw response NOT stored (only hash + match result)
→ For birth certs under 18, the parent's e-Citizen child record is referenced
```

---

## 4. HOME PAGES (3 PAGES)

---

### PAGE H-1: Landing Page (`/`)

```
PURPOSE:
First impression. Convince sponsors, parents, and students to sign up.
Position Learnly as the academic-sponsorship platform for Kenya.

STYLE RULES:
Page stylesheet:   src/styles/pages/landing.css
Root class:        .page-landing
Motion hooks:      hero fadeSlideUp stagger (4 items, 80ms each)
                  hover-lift on feature cards
                  count-up on "1,200+ students sponsored" stat
                  icon-draw on hero illustration (graduation cap SVG)
                  marquee on partner-schools strip (pauses on hover,
                  static under prefers-reduced-motion)
Responsive:        hero 2-col on lg, stacked on md
                  feature cards 3-col on lg, 1-col on sm
                  trust bar wraps on sm

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                          │
│  [Logo: Learnly]  [Levels] [How it Works] [Login] [Sign Up]    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  HERO SECTION                                                    │
│  "Sponsor a learner. From PP1 to PhD."                          │
│  "Manage school fees, upkeep, pocket money & fare for every    │
│   Kenyan academic level — with proof, approvals & payouts."     │
│  [🎓 Apply as Student →]   [📋 Admin Console →]                │
│  Hero illustration: CBC pathway ribbon (PP1 → Grade 12 → TVET  │
│  → University) in edu-level palette colors                      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  TRUST BAR                                                       │
│  "M-Pesa B2C" | "Airtel Money" | "NEMIS-linked" |               │
│  "DPA 2019 Compliant" | "1,200+ students sponsored"             │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  FEATURE CARDS (3)                                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │ 💰 Multi-channel │ │ 📚 Proof-gated   │ │ 🏛️ Full Kenyan   │  │
│  │ Payouts          │ │ Approvals        │ │ Education Map   │  │
│  │ Fees→school bank,│ │ Fees & upkeep    │ │ Every level —   │  │
│  │ upkeep→M-Pesa,   │ │ require result   │ │ PP1 to PhD —    │  │
│  │ pocket→card      │ │ slip uploads     │ │ covered.        │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  CTA SECTION                                                     │
│  "Ready to onboard a student?"                                  │
│  [Get Started] — self-onboard or admin-onboard                  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  FOOTER                                                          │
│  Learnly • Nairobi, Kenya • hello@learnly.co.ke                 │
│  Privacy | Terms | Data Protection Act 2019 Notice              │
└─────────────────────────────────────────────────────────────────┘

SECTIONS (5):
S1 — HERO
    • H1 (display serif, Fraunces): "Sponsor a learner. From PP1 to PhD."
    • Subhead (Inter 1.125rem): mission statement
    • Two CTA buttons (btn-primary + btn-outline-primary)
    • Hero illustration with 4 edu-level ribbons animating in (icon-draw)

S2 — TRUST BAR
    • 5 inline pill badges (count-up on the "1,200+" stat)
    • M-Pesa, Airtel, NEMIS, DPA 2019, students-sponsored

S3 — FEATURE CARDS (3, hover-lift)
    • Multi-channel payouts / Proof-gated approvals / Full Kenyan education map
    • Each card has icon, title, 2-line description, "Learn more →" link

S4 — HOW IT WORKS (3-step horizontal stepper)
    • Step 1: Student or admin onboards profile
    • Step 2: Student requests; admin approves (with proof where needed)
    • Step 3: System disburses to the right destination

S5 — CTA + FOOTER
    • Final CTA banner (indigo background, gold accent line)
    • Footer with legal links and Kenyan contact block
```

---

### PAGE H-2: Education Levels Explainer (`/levels`)

```
PURPOSE:
Public reference page that lists every Kenyan education level supported by
Learnly. Acts as a discoverability page for parents who don't know what
level to choose and as the canonical enum reference.

STYLE RULES:
Page stylesheet:   src/styles/pages/levels.css
Root class:        .page-levels
Motion hooks:      fadeSlideUp stagger per accordion item (60ms)
                  icon-draw on each level badge SVG
                  hover-lift on level cards

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  "Every Kenyan academic level, supported."                       │
│  "From Play Group to PhD — one platform, one student record."   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  LEVEL CARDS GRID (1/2/3 cols)                                   │
│  Each card: ribbon color (edu-* palette), level name,           │
│  age range, exam touch-points, sample institutions              │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  ACCORDION                                                       │
│  Per level: full breakdown of grades/years, exam names,         │
│  typical Learnly request categories available                    │
└─────────────────────────────────────────────────────────────────┘

SECTIONS (5):
S1 — HEADER + intro paragraph (2 sentences explaining CBC + legacy + tertiary)

S2 — LEVEL CARDS GRID (9 cards, one per top-level category):
     Pre-Primary / Primary / Junior School / Senior School /
     Special Needs Education / International Curricula / TVET /
     College / University
     Each card uses its edu-* palette color as a top ribbon.

S3 — ACCORDION per level (Bootstrap accordion, accordion-flush):
     Each item expands to show:
       • Grades/Years (e.g. "PP1, PP2" for Pre-Primary)
       • Age range
       • KNEC exam touch-points
       • Sample institutions (3-5 named)
       • Default request categories enabled in Learnly
         (e.g. Pre-Primary: fees, uniform, fare; University: fees,
          upkeep, pocket money, equipment, medical)

S4 — PATHWAY DIAGRAM (SVG)
     Visual: PP1 → Grade 6 (KPSEA) → Grade 9 (KJSEA) → Grade 12 (KSSEA)
     → University OR TVET, with branching arrows. Draw-in animation.

S5 — CTA: "Find your level — start onboarding"
```

---

### PAGE H-3: How It Works (`/how-it-works`)

```
PURPOSE:
Explain the full lifecycle: onboarding → request → proof → approval →
disbursement → record-keeping.

STYLE RULES:
Page stylesheet:   src/styles/pages/how-it-works.css
Root class:        .page-how-it-works
Motion hooks:      fadeSlideUp stagger, draw-in on flowchart SVG

SECTIONS (5):
S1 — Hero subhead
S2 — Onboarding flow (self-onboard vs admin-onboard, side-by-side)
S3 — Request lifecycle diagram (5 steps with icons)
S4 — Payout channeling matrix (table: category → channel)
S5 — FAQ accordion (Bootstrap accordion, 8 Q&As covering fees, proof,
    M-Pesa, NEMIS, dark mode, data export, deletions, language)
```

---

## 5. AUTH & ONBOARDING PAGES (8 PAGES)

---

### PAGE A-1: Sign Up (`/auth/signup`)

```
PURPOSE:
Entry point for new students (self-onboard) and admins (the first
admin account bootstrap, restricted to a one-time bootstrap token).

STYLE RULES:
Page stylesheet:   src/styles/pages/auth-signup.css
Root class:        .page-auth-signup
Motion hooks:      fadeSlideUp, icon-draw on logo
Responsive:        2-col on lg (illustration | form), 1-col on sm

SECTIONS (5):
S1 — SPLIT LAYOUT
    Left: brand panel (indigo bg, gold accent, Fraunces display heading
    "Join Learnly", supporting line "Sponsorship from PP1 to PhD",
    student/parent testimonial quote in Lora italic)
    Right: the signup form card

S2 — ACCOUNT-TYPE SELECTOR (radio cards)
    Two cards: "I am a student / parent onboarding myself" vs
    "I am an admin (operator sponsor)"
    Selecting admin reveals the bootstrap-token field (one-time,
    configured in env at deploy time)

S3 — SIGNUP FORM (React Hook Form + Zod)
    Fields: full_name, national_id_or_birth_cert, phone (Kenyan format
    +2547XXXXXXXX), email (optional for students), password, confirm
    password, accept Terms checkbox, accept DPA 2019 consent checkbox
    Validation:
      • phone: regex ^\+254[17]\d{8}$
      • password: ≥ 10 chars, ≥ 1 number, ≥ 1 symbol
      • national_id_or_birth_cert: regex ^(K|\d{8}|\d{9,10})$ (handles
        birth cert, national ID, and K-prefixed IDs)

S4 — OTP PREVIEW BANNER
    After submit → "We're sending a 6-digit OTP via SMS to <phone>.
    Standard SMS rates may apply."

S5 — FOOTER LINKS
    "Already have an account? Sign in" | "Forgot password?" |
    "Privacy Notice" | "Terms"
```

---

### PAGE A-2: Sign In (`/auth/signin`)

```
PURPOSE:
Login for both students and admins. Role-aware redirect.

STYLE RULES:
Page stylesheet:   src/styles/pages/auth-signin.css
Root class:        .page-auth-signin

SECTIONS (5):
S1 — Brand header
S2 — Sign-in form (phone or email, password, "remember me" 30d)
S3 — "Sign in with OTP instead" toggle (passwordless path)
S4 — 2FA challenge inline (if user has TOTP enabled) — 6-digit input,
    30s auto-advance between digits
S5 — Footer links (sign up, forgot password, help)
```

---

### PAGE A-3: Student Self-Onboarding Wizard (`/auth/onboard/student`)

```
PURPOSE:
Multi-step wizard that captures a student's comprehensive profile when
they onboard themselves. Equivalent to A-4 (admin-onboard) but initiated
by the student/parent. Both paths produce the same StudentProfile record.

STYLE RULES:
Page stylesheet:   src/styles/pages/auth-onboard-student.css
Root class:        .page-auth-onboard-student
Motion hooks:      fadeSlideUp per step, .stepper-h progress animation,
                  icon-draw on completed step check marks
Responsive:        wizard card max-width 720px, centered; on sm the
                  stepper becomes vertical (.stepper-v)

WIZARD STEPS (7):
Step 1 — Account basics (already pre-filled from signup; just confirm)
Step 2 — Personal details
Step 3 — Family / parent / guardian details
Step 4 — Home & residence details
Step 5 — Current school & class teacher details
Step 6 — Identification & verification docs upload
Step 7 — Review & submit (sends to admin for activation)

SECTIONS (5 — the wizard shows 5 visible chunks via UI; under the hood
it carries 7 logical steps; the visible "sections" panel groups them):

S1 — STEPPER HEADER (horizontal, 7 steps)
    Each step: number, label, is-active/is-done states
    Labels: Account · Personal · Family · Home · School · Documents · Review

S2 — PERSONAL DETAILS FORM (Step 2 visible body)
    Fields:
      • First name, middle name, last name
      • Date of birth (date picker; min 1900-01-01, max today)
      • Sex (Male / Female / Intersex — Kenyan ID options)
      • Blood group (optional, ABO+Rh)
      • Nationality (default: Kenyan; dropdown of all nationalities)
      • Religion (optional: Christian/Catholic, Christian/Protestant,
        Muslim, Hindu, Sikh, Buddhist, Other, None)
      • Languages spoken (multi-select: English, Kiswahili, mother tongue
        — full list of Kenyan ethnic languages)
      • Disability status (None / Physical / Visual / Hearing /
        Intellectual / Multiple) — if any, opens disability_card_no field
      • Marital status (Single / Married / Widowed / Separated) — typically
        for adult/tertiary students
      • Profile photo upload (jpg/png, max 5 MB, square crop tool)

S3 — FAMILY / PARENT / GUARDIAN DETAILS FORM (Step 3 visible body)
    Repeating sub-form: a student can add up to 4 parent/guardian records.
    Each record:
      • Relationship (Father / Mother / Guardian / Aunt / Uncle /
        Grandparent / Sibling / Other)
      • Full name
      • National ID number (if Kenyan; validation regex)
      • Phone (primary, Kenyan format)
      • Alt phone (optional)
      • Email (optional)
      • Occupation
      • Employer / institution (optional)
      • Monthly income band (None / <10k / 10-30k / 30-60k / 60-100k /
        100-200k / 200k+ KES) — sensitivity flagged, stored encrypted
      • Is primary contact (boolean, single-select per student)
      • Is next of kin (boolean, single-select per student; defaults to
        primary contact if none chosen)
      • Consent to be contacted (checkbox)
    Then a "Household composition" block:
      • Total dependents in household (number)
      • Number of siblings in school (number)
      • Number of siblings also on Learnly (number, cross-link prompt)

S4 — HOME & RESIDENCE DETAILS FORM (Step 4 visible body)
    Fields:
      • County (47 Kenyan counties dropdown — auto-populates sub-county)
      • Sub-county
      • Ward
      • Constituency (auto-derived from ward)
      • Nearest town / trading centre
      • Estate / Village / Location
      • Street / Plot number (optional)
      • Landmark (text — "near X school", "opposite Y mosque")
      • Building type (Permanent / Semi-permanent / Temporary / Apartment /
        Hostel / Rental)
      • Ownership (Owned / Rented / Employer-provided / Family / Other)
      • Rent per month (KES, if rented)
      • Distance to school (km) + travel mode (Walk / Matatu / Boda /
        Bicycle / Car / School bus)
      • GPS coordinates (capture button — uses navigator.geolocation;
        optional, accuracy flagged)
      • Address proof upload (utility bill, tenancy agreement, chief's
        letter — any one, pdf/jpg, max 5 MB)

S5 — CURRENT SCHOOL & CLASS TEACHER DETAILS FORM (Step 5 visible body)
    Two-part sub-form:
    Part A — School:
      • Education level (dropdown per Section 3.1)
      • Institution type (Public / Private / Mission / International /
        Special Needs / TVET / National Polytechnic / University)
      • School name (autocomplete from registered_schools table; if not
        found, "Register a new school" link opens a side modal with
        school-registration mini-form)
      • School registration / MOE code (auto-filled if school found)
      • County where school is located
      • Boarding status (Day scholar / Boarding / Half-boarding)
      • Class / Grade / Form / Year (dynamic dropdown based on level)
      • Stream / Option (e.g. 4 East, Yellow stream, STEM pathway,
        Arts pathway, BCom Year 2 Semester 1)
      • Enrolment date at this school (date picker)
      • Expected completion date (auto-derived from level + entry)
      • Admission number (school-issued)
      • Fees structure upload (pdf/jpg, max 5 MB) — required if fees
        category will be requested

    Part B — Class teacher / Course advisor / Patron:
      • Teacher's name
      • Title (Mr / Mrs / Ms / Dr / Prof)
      • Phone (optional but recommended)
      • Email (optional)
      • Subject(s) taught (multi-select)
      • Role (Class teacher / Dean of studies / Patron / Academic advisor /
        HOD / Dean of students)
      • Relationship to student (Direct / Department head / Patron)

    Navigation footer: "← Back" / "Save & Continue →" / "Save draft"
    (drafts persist to localStorage + server-side incomplete_profile table)
```

---

### PAGE A-4: Admin-Onboard Student (`/auth/admin-onboard`)

```
PURPOSE:
The admin's variant of the student-onboarding flow. Same data shape as
A-3, but with three differences:
  1. The admin's identity is already authenticated; no phone-OTP gateway.
  2. The admin can mark the profile "active immediately" — no review queue.
  3. The admin can pre-link a sponsor/budget line at creation time.

STYLE RULES:
Page stylesheet:   src/styles/pages/auth-admin-onboard.css
Root class:        .page-auth-admin-onboard
Motion hooks:      same as A-3; plus an admin-context ribbon at top

SECTIONS (5):
S1 — Admin context banner ("Onboarding as: <admin name>, role: <role>")
S2 — Quick-add bar (national ID + birth cert lookup; if student exists,
    route to their profile instead)
S3 — The same 5-step form body as A-3 (Personal / Family / Home /
    School / Documents) — implemented as a shared component <OnboardForm
    mode="admin" />
S4 — Sponsor allocation block (admin-only):
      • Default sponsor: <admin user>
      • Budget line assignment (from active budgets — see AD-8)
      • Sponsorship cap per term (KES)
      • Notes (internal, not shown to student)
S5 — Submit actions: "Create & activate" / "Create as pending review" /
    "Create and onboard another" (chain entry)
```

---

### PAGE A-5: Forgot Password (`/auth/forgot-password`)

```
PURPOSE: Standard forgot-password flow with OTP-first design.
SECTIONS (5):
S1 — Header ("Reset your password")
S2 — Identifier input (phone or email)
S3 — Send OTP button (rate-limited: 1 per 60s, 5 per hour)
S4 — "Try signing in instead" link
S5 — Footer / help block
```

---

### PAGE A-6: Reset Password (`/auth/reset-password`)

```
PURPOSE: Enter OTP + new password.
SECTIONS (5):
S1 — OTP 6-digit input (auto-advance)
S2 — New password + confirm
S3 — Password strength meter (zxcvbn)
S4 — Reset button (invalidates all sessions, rotates refresh token)
S5 — Success state — auto-redirect to /auth/signin after 3s
```

---

### PAGE A-7: Verify OTP (`/auth/verify-otp`)

```
PURPOSE: OTP gate after signup/signin-with-OTP/password-reset.
SECTIONS (5):
S1 — "Enter the 6-digit code sent to <masked phone>"
S2 — 6-digit input (split inputs, auto-advance, paste-friendly)
S3 — Resend OTP (countdown 60s, then enabled)
S4 — "I'm having trouble" link (escalates to admin review)
S5 — Footer
```

---

### PAGE A-8: DPA 2019 Consent Capture (`/auth/consent`)

```
PURPOSE:
Mandatory consent capture under Kenya's Data Protection Act 2019
before any profile data is persisted.

SECTIONS (5):
S1 — Consent preamble ("Learnly collects…")
S2 — Purpose list (financial assistance processing, school verification,
    payment-channel verification, audit & compliance)
S3 — Consent toggles (5 checkboxes, each independently revocable):
      • Process personal data for sponsorship
      • Process special-category data (disability, medical, ID)
      • Share with named school for verification
      • Receive transactional SMS & emails
      • Receive marketing (opt-in, default off)
S4 — Signature pad (canvas-based, exported as PNG; timestamped hash)
S5 — "I consent" button (writes to consent_log table with hash + IP +
    user agent + timestamp)
```

---

## 6. STUDENT DASHBOARD PAGES (10 PAGES)

> The student dashboard is the student's portal. Every page below has **5+ sections** with concrete fields, components and actions — no placeholders.

---

### PAGE S-1: Student Overview (`/student`)

```
PURPOSE:
The student's home. At-a-glance summary of profile completeness, active
requests, recent payouts, upcoming term dates, unread messages, and
flags requiring action.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-overview.css
Root class:        .page-student-overview
Motion hooks:      fadeSlideUp stagger (12 items),
                  count-up on KPI numbers,
                  icon-pulse on "pending" badges,
                  chart-draw on the 6-month disbursement sparkline
Responsive:        KPIs 1/2/4 cols, cards 1/2/3, tables collapse < md,
                  sidebar offcanvas < lg

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky)                                                │
│  [☰] Learnly Student · <student first name>                     │
│  [🔔 3] [💬 1] [☀/🌙] [Profile ▾]                               │
└─────────────────────────────────────────────────────────────────┘
┌───────────────┬─────────────────────────────────────────────────┐
│  SIDEBAR       │  MAIN                                            │
│  (lg static,   │  ┌─────────────────────────────────────────┐   │
│   md/sm        │  │ GREETING + EDU-LEVEL RIBBON              │   │
│   offcanvas)   │  │ "Hello, Amani. You're in Grade 10 /     │   │
│                │  │  Senior School · STEM pathway."          │   │
│  • Overview    │  │ Profile completeness: 78% [progress bar] │   │
│  • Profile     │  └─────────────────────────────────────────┘   │
│  • Financial   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐ │
│    Assistance  │  │ Active  │ │ Pending │ │ Total   │ │ Next │ │
│  • Academic    │  │ Requests│ │ Approvals│ │Disbursed│ │ Term │ │
│    Records     │  │    2    │ │    1    │ │ KES 84k │ │ date │ │
│  • Related     │  └─────────┘ └─────────┘ └─────────┘ └──────┘ │
│    Users       │  ┌─────────────────────────────────────────┐   │
│  • Account     │  │ MY ACTIVE REQUESTS (table)               │   │
│  • Documents   │  │ Category · Amount · Status · Submitted   │   │
│  • Messages    │  └─────────────────────────────────────────┘   │
│  • Notifications│ ┌─────────────────────────────────────────┐   │
│  • Settings     │ │ RECENT PAYOUTS (table)                   │   │
│                  │ │ Date · Channel · Amount · Reference     │   │
│                  │ └─────────────────────────────────────────┘   │
│                  │ ┌──────────────────────┐ ┌────────────────┐  │
│                  │ │ 6-MO DISBURSEMENT    │ │ UPCOMING       │  │
│                  │ │ SPARKLINE            │ │ TERM DATES     │  │
│                  │ └──────────────────────┘ └────────────────┘  │
│                  │ ┌─────────────────────────────────────────┐   │
│                  │ │ ACTION FLAGS (cards)                    │   │
│                  │ │ "Upload KCSE term results to unlock     │   │
│                  │ │  fees request"                          │   │
│                  │ │ "Add a payout method for upkeep"        │   │
│                  │ └─────────────────────────────────────────┘   │
└───────────────┴─────────────────────────────────────────────────┘

SECTIONS (5):

S1 — GREETING + PROFILE COMPLETENESS
    • H2: "Hello, <first name>." (Lora serif, brand-primary)
    • Edu-level ribbon (badge colored by edu-* palette) — shows the
      student's current level + pathway/stream
    • Profile completeness bar (Bootstrap progress, gradient indigo→gold)
      with breakdown tooltip: "Personal 100% · Family 100% · Home 80% ·
      School 100% · Documents 60%"
    • "Complete your profile →" button if < 100%

S2 — KPI ROW (4 cards, count-up animation, KES formatted)
    • Active requests (count)
    • Pending approvals (count, icon-pulse on badge if any)
    • Total disbursed this year (KES, sum of payouts YTD)
    • Next term start date (date + days-until countdown)

S3 — MY ACTIVE REQUESTS (responsive table)
    Columns: Category (with cat-* colored badge) · Amount requested
    (KES) · Status (Pending / Under review / Approved / Rejected /
    Disbursed) · Submitted (relative time) · Action ("View" link →
    S-3 detail)
    Empty state: "You have no active requests. Apply for assistance →"
    Row flash approved/rejected/disbursed on real-time update via Socket.IO

S4 — RECENT PAYOUTS + UPCOMING TERM DATES (2-col)
    Left: RECENT PAYOUTS table — Date · Channel (M-Pesa / School Bank /
    Pocket Card) · Amount · Reference number. "View all →" link to Account.
    Right: UPCOMING TERM DATES card — list of next 3 terms with start/end
    dates and an automatic "results upload window opens on <date>" reminder.
    Bottom: 6-month disbursement sparkline (Recharts, chart-draw animation)

S5 — ACTION FLAGS (3-4 alert cards)
    These are derived flags; each links to the page that resolves them:
    • "Upload <exam> term results to unlock fees request" → S-3 + S-4
    • "Add a payout method for upkeep" → S-6
    • "Your national ID is unverified — upload a copy" → S-2
    • "Consent for marketing expires in 7 days" → S-10
    Each card uses Bootstrap alert-* variants (alert-warning for action
    needed, alert-info for FYI, alert-success for recently resolved)
```

---

### PAGE S-2: My Profile (`/student/profile`)

```
PURPOSE:
The student's complete, comprehensive profile — personal, family,
home, school, class teacher — in a single reviewable, editable surface.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-profile.css
Root class:        .page-student-profile
Motion hooks:      fadeSlideUp stagger per accordion section
                  count-up on "Household dependents" stat
                  icon-draw on profile photo silhouette if no photo

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  PROFILE HEADER CARD                                             │
│  [Photo] Amani Wanjiku Kamau                                    │
│  Grade 10 · Senior School · STEM pathway · Nairobi School      │
│  [Edit Profile] [Upload Photo]                                  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  TABS / ACCORDION                                                │
│  Personal · Family · Home · School · Class Teacher · Identity · │
│  Disability · Consent                                            │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PER-TAB CONTENT (5 sections always visible as a sticky index   │
│  on the right rail, with anchor scrollspy)                       │
└─────────────────────────────────────────────────────────────────┘

SECTIONS (5 — these are the 5 always-visible index anchors):

S1 — PERSONAL DETAILS
    Displayed as a definition list (dl.row):
      Full name · Date of birth · Age (auto) · Sex · Blood group ·
      Nationality · Religion · Languages spoken · Marital status ·
      Profile photo thumbnail
    Editable inline (Bootstrap modal on click of any field, with
    audit-diff preview before save)
    Lock rules: name & DOB locked after admin verification — to change,
    admin must approve a "Vital Records Correction" request

S2 — FAMILY / GUARDIAN / NEXT OF KIN
    Repeated RelatedUserCard components (one per parent/guardian):
      • Relationship badge (Father/Mother/Guardian/…)
      • Full name + photo (if uploaded)
      • Phone (masked, with "Reveal" toggle)
      • Email
      • Occupation + Employer
      • Income band (masked, only "Low / Mid / High" bucket shown to
        student; full band visible to admin)
      • Primary contact flag (★)
      • Next-of-kin flag (🛡)
    "Add another guardian" button (max 4)
    Each card has Edit / Remove actions (Remove requires OTP + admin
    audit note; system prevents removing the last remaining primary
    contact)

S3 — HOME & RESIDENCE
    Card with:
      • Full postal-style address block (county, sub-county, ward,
        constituency, town, estate/village, street/plot, landmark)
      • Mini-map embed (OpenStreetMap, centered on GPS coords if
        captured; marker is draggable for adjustment)
      • Building type + Ownership badges
      • Rent per month (if applicable)
      • Distance to school (km) + travel mode icon
    "Edit address" / "Capture GPS" buttons

S4 — CURRENT SCHOOL & ACADEMIC CONTEXT
    School summary card:
      • School crest/logo (if uploaded by admin in AD-6)
      • School name + MOE code + type (Public/Private/Mission/…)
      • County of school
      • Boarding status (Day/Boarding/Half-boarding)
      • Class/Grade/Form/Year + Stream/Pathway
      • Admission number + enrolment date + expected completion
    Below: a CLASS TEACHER / ACADEMIC ADVISOR card:
      • Title + Name
      • Role (Class teacher / Patron / HOD / Dean)
      • Subjects taught (chips)
      • Phone + Email (with click-to-call / click-to-email if consented)
      • "Send message" link → S-8
    "Change school" button opens a wizard that triggers an academic
    record entry (origin tracking — see S-4) automatically

S5 — IDENTITY, DISABILITY & CONSENT (collapsible)
    Identity sub-block:
      • Birth cert number (masked)
      • NEMIS UPI
      • National ID (if 18+; masked, with verification status badge:
        Unverified / Pending IPRS / Verified)
      • KCPE index (if applicable, historical)
      • KCSE index (if applicable, historical)
      • KPSEA/KJSEA/KSSEA index (if CBC)
      • KRA PIN (if university + receiving taxable stipend)
      • Passport (if international)
    Disability sub-block (only if disability_status != None):
      • Type, disability card number, supporting doc link
    Consent sub-block:
      • Per-purpose consent toggles (read-only here; revocation lives in
        Settings S-10)
      • "Consent last recorded: <date>" + "View full consent log →"
```

---

### PAGE S-3: Financial Assistance (`/student/financial-assistance`)

```
PURPOSE:
The heart of the student experience. Apply for any financial-assistance
category — fees, upkeep, pocket money, fare, equipment, medical, exam
registration — with proof-upload gating, amount validation against admin
caps, and live status tracking.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-financial-assistance.css
Root class:        .page-student-financial-assistance
Motion hooks:      fadeSlideUp stagger,
                  count-up on category limits,
                  icon-pulse on pending rows,
                  row-flash-approved/rejected/disbursed on updates,
                  chart-draw on category-usage donut
Responsive:        KPIs 1/2/4 cols, request cards 1/2/2 cols,
                  tables collapse < md, forms vertical < md

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  "Financial Assistance"                                          │
│  Sub: "Apply for fees, upkeep, pocket money, fare, equipment…"  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Used YTD    │ │ Pending     │ │ Available   │ │ Avg Approval│
│ KES 84,500  │ │    1        │ │ KES 215,500 │ │   2.3 days  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  CATEGORY USAGE DONUT (left)  │  NEW REQUEST BUTTON (right)      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  REQUESTS TABLE (filter tabs: All / Pending / Approved /        │
│  Rejected / Disbursed)                                          │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  NEW REQUEST DRAWER (slide-in right) — form per category         │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  APPROVAL HISTORY (timeline)                                     │
└─────────────────────────────────────────────────────────────────┘

SECTIONS (5):

S1 — KPI ROW (4 cards, count-up, KES-formatted)
    • Used YTD (sum of disbursed amounts this calendar year)
    • Pending requests (count, icon-pulse)
    • Available (annual cap − used − pending)
    • Avg approval time (derived from last 10 closed requests)

S2 — CATEGORY USAGE + NEW REQUEST
    Left card: donut chart (Recharts) of YTD disbursements split by
    category, colored with cat-* palette. Click a slice → filters the
    table below.
    Right card: 7 big "category buttons" — Fees, Upkeep, Pocket Money,
    Fare, Equipment, Medical, Exam Registration. Each opens the new-
    request drawer pre-filled with that category. Disabled state if the
    student's level doesn't qualify for that category (e.g. pre-primary
    can't request "Exam registration").

S3 — REQUESTS TABLE (TanStack Table, responsive)
    Columns:
      • Ref ID (e.g. LRQ-2025-00123)
      • Category (badge, cat-* color)
      • Amount requested (KES)
      • Amount approved (KES) — empty until approved; shows "—"
      • Proof (icon: ✅ uploaded / ⚠ required / – not required)
      • Status (badge: Draft / Submitted / Under Review / Approved /
        Rejected / Disbursed / Failed)
      • Submitted (relative time)
      • Updated (relative time)
      • Actions: View · Edit (only if Draft) · Withdraw · Re-request
        (clone, for rejected)
    Filter tabs above table; default tab = "All"
    Empty state per tab with appropriate CTA

S4 — NEW REQUEST DRAWER (slide-in right, Bootstrap offcanvas-end
    on mobile, custom drawer on lg+)
    Dynamic form built from the request_category config. Common fields:
      • Category (read-only, pre-set)
      • Amount requested (KES, with min/max hints from category cap +
        sponsor allocation; live validation: "Max you can request:
        KES 45,000")
      • Currency (locked KES)
      • Requested disbursement date (date picker; min = today+1)
      • Payout destination (dropdown filtered by category — populated
        from S-6 account methods):
            - Fees → school bank accounts / school paybills on file
            - Upkeep → M-Pesa / Airtel lines on file
            - Pocket money → school pocket-card / student wallet
            - Fare → M-Pesa / Airtel lines on file
            - Equipment → supplier paybill OR M-Pesa
            - Medical → M-Pesa / facility paybill
            - Exam reg → school paybill (KNEC fees go to school)
      • Justification (textarea, 50-500 chars, with character counter)
      • Term selector (Term 1 / 2 / 3, or Semester 1 / 2 for tertiary)
      • Proof upload (conditional — see rule below)
      • Declaration checkbox: "I confirm this request is genuine and
        the proof documents are authentic. I understand misrepresentation
        may lead to suspension of sponsorship."
      • Submit button (disabled until validation passes)

    PROOF-UPLOAD RULES (the gating logic):
    ┌─────────────────┬────────────────────────────┬──────────────────┐
    │ Category        │ Proof required?             │ Frequency        │
    ├─────────────────┼────────────────────────────┼──────────────────┤
    │ Fees            │ YES — latest fee structure  │ Per term         │
    │                 │      + previous term results│                  │
    │ Upkeep          │ YES — previous term results │ Per term         │
    │                 │      (manual or scanned)    │                  │
    │ Pocket money    │ NO                          │ —                │
    │ Fare            │ NO                          │ —                │
    │ Equipment       │ YES — proforma invoice or   │ Per request      │
    │                 │      school letter          │                  │
    │ Medical         │ YES — invoice / receipt /   │ Per request      │
    │                 │      hospital letter        │                  │
    │ Exam reg        │ YES — school invoice for    │ Per exam window  │
    │                 │      KNEC / KUCCPS          │                  │
    └─────────────────┴────────────────────────────┴──────────────────┘

    When proof is required, the file input is enforced via Zod schema
    (.refine(files => files.length > 0, "Proof required for this category"))
    Accepted formats: jpg, png, pdf; max 10 MB each; multi-file (up to 5).

    Each upload is queued through BullMQ → Google Document AI for OCR
    extraction (e.g. fee structure total auto-extracted → pre-fills the
    amount requested suggestion).

S5 — APPROVAL HISTORY TIMELINE
    Vertical timeline (Bootstrap list-group timeline) showing every
    state transition for the selected request:
      • Drafted — <date> · <student>
      • Submitted — <date> · <student>
      • Under review — <date> · <admin name>
      • Approved — <date> · <admin name> · amount approved (if adjusted,
        show original → adjusted with delta badge)
      • Rejected — <date> · <admin name> · reason (with category-coded
        reason: "Insufficient proof" / "Above cap" / "Duplicate" /
        "Term results below threshold" / "Other — free text")
      • Disbursed — <date> · channel · reference number
      • Failed — <date> · reason (e.g. "M-Pesa B2C timeout")
    Each entry has an admin-comment bubble if the admin left a note.
```

---

### PAGE S-4: Academic Records (`/student/academic-records`)

```
PURPOSE:
Trace the student's full academic journey — from origin (first school
enrolled) through every transfer, every term, every exam, every result
slip — in a single chronological view. This is the spine that unlocks
proof-gated financial assistance.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-academic-records.css
Root class:        .page-student-academic-records
Motion hooks:      fadeSlideUp per timeline node,
                  count-up on average-score KPIs,
                  chart-draw on the performance trend line,
                  icon-draw on school crests
Responsive:        timeline vertical on all sizes; tables collapse < md

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  "Academic Records"                                              │
│  Sub: "Your full education timeline — from origin to today."   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Schools     │ │ Terms       │ │ Exams sat   │ │ Avg score   │
│ attended: 3 │ │ recorded: 9 │ │      6      │ │   B+ (74%)  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PERFORMANCE TREND CHART (Recharts line — term-over-term avg)    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  TIMELINE OF SCHOOLS (vertical)                                  │
│  Each node = school tenure with expandable term + exam records   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  EXAM RESULTS TABLE (filter by exam type)                        │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  DOCUMENTS VAULT (per term result slips)                         │
└─────────────────────────────────────────────────────────────────┘

SECTIONS (5):

S1 — KPI ROW (4 cards)
    • Schools attended (count — derived from academic_tenures)
    • Terms recorded (count of distinct term records)
    • Exams sat (count of exam entries)
    • Avg score (latest available — formatted per Kenyan grading:
      KCSE letter A/B+/B/… or CBC percentage or GPA for tertiary)

S2 — PERFORMANCE TREND CHART
    Recharts LineChart, x-axis = term labels (e.g. "2024 T1", "2024 T2",
    "2024 T3", "2025 T1"), y-axis = normalized score (0-100%).
    Multiple series if the student has sat different exam types
    (e.g. SBA + KPSEA, or CATs + end-term).
    Hover tooltip shows raw score + grade + class position if available.
    Chart-draw animation on first render.
    "Export as PNG" and "Export as PDF" buttons.

S3 — SCHOOL TIMELINE (vertical)
    A node per school tenure:
      • School crest + name + MOE code (left rail)
      • Education level at the time (edu-* ribbon)
      • Class/Grade/Form/Year range (e.g. "Grade 4 → Grade 6")
      • Date range (start – end)
      • Reason for leaving (Transferred / Completed level / Dropped /
        Graduated / Moved schools) — auto-logged
      • Expandable to show per-term entries
    The ORIGIN node (first school) is marked with a star icon and a
    "First enrolled" badge.
    Each tenure node has an "Add term record" button (admin-or-self;
    auto-routed to admin verification queue).

S4 — EXAM RESULTS TABLE (TanStack Table)
    Columns:
      • Exam name (KCPE / KCSE / KPSEA / KJSEA / KSSEA / University
        end-of-semester / TVET trade test / IGCSE / etc.)
      • Year + term/semester
      • Subjects / papers (count)
      • Total marks (if applicable)
      • Grade / Mean score
      • Position in class (if recorded)
      • Result slip (link to document, opens in lightbox)
      • Verification status (Verified by admin / Pending / Rejected)
    Filter tabs: by exam type; date-range filter (year selector).
    Per-row "Request correction" link if a recorded score is wrong.

S5 — DOCUMENTS VALET (term result slips)
    Grid of DocumentCard components, one per uploaded result slip:
      • Thumbnail (pdf page-1 preview, or image)
      • Term label
      • Upload date
      • Verification status badge
      • "View" / "Replace" / "Delete" actions (replace/delete require
        admin verification — old version is archived, not destroyed,
        for audit)
    "Upload new result slip" CTA opens uploader with term + exam-type
    metadata form.
```

---

### PAGE S-5: Related Users (`/student/related-users`)

```
PURPOSE:
Manage every person related to the student — parents, guardians,
next of kin, class teachers, patrons, sponsors, emergency contacts.
A complete directory with role-coded cards.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-related-users.css
Root class:        .page-student-related-users
Motion hooks:      fadeSlideUp per RelatedUserCard,
                  count-up on role counts,
                  icon-draw on role badges

SECTIONS (5):

S1 — KPI ROW (role counts)
    Parents/Guardians · Teachers · Sponsors · Emergency contacts

S2 — RELATED USERS GRID (RelatedUserCard × N)
    Each card:
      • Avatar (or initial circle with role color)
      • Full name + title
      • Role badge (Parent / Guardian / Next-of-kin / Class teacher /
        Patron / HOD / Dean / Sponsor / Emergency contact)
      • Primary contact ★ + Next-of-kin 🛡 flags
      • Phone (masked, reveal on click) + email
      • Subjects/department (for teachers) or occupation/employer (for
        guardians)
      • Relationship to student (Father / Aunt / Patron / etc.)
      • Consent status (consented to be contacted / not yet)
      • Edit · Remove · Send message actions

S3 — ADD RELATED USER (modal wizard)
    Two-step: pick role → fill fields (same shape as A-3 step 3, but
    role-specific — e.g. teacher doesn't have income band).

S4 — EMERGENCY CONTACTS PANEL
    A focused sub-list (filtered view of related users flagged as
    emergency contacts). Always shows the top 2 in priority order.

S5 — RELATIONSHIP GRAPH (SVG)
    Optional visualization: nodes (student at center, related users
    around) connected by labeled edges. Hover on a node highlights its
    edges. "Switch to list view" toggle.
```

---

### PAGE S-6: Account & Payout Methods (`/student/account`)

```
PURPOSE:
The student's financial-destination center. Configure where money goes
when each category is disbursed — M-Pesa numbers, Airtel lines, school
bank accounts, school paybills, school-issued pocket-money cards.
The student ADDS methods; the admin APPROVES them before they can be
used in a payout. This is the anti-fraud chokepoint.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-account.css
Root class:        .page-student-account
Motion hooks:      fadeSlideUp per PayoutMethodCard,
                  count-up on total-payouts YTD,
                  row-flash-disbursed on live payout rows

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  "Account & Payout Methods"                                      │
│  Sub: "Where money lands when your request is approved."        │
└─────────────────────────────────────────────────────────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total in YTD│ │ Methods     │ │ Verified    │ │ Default     │
│ KES 84,500  │ │     4       │ │    3/4      │ │ M-Pesa ●●●●7│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  ADD METHOD BUTTON + CATEGORY-METHOD MATRIX                      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PAYOUT METHODS LIST (PayoutMethodCard × N)                      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PAYOUT HISTORY (table)                                          │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  DEFAULTS PER CATEGORY (table)                                   │
└─────────────────────────────────────────────────────────────────┘

SECTIONS (5):

S1 — KPI ROW (4 cards)
    • Total received YTD (KES)
    • Payout methods on file (count)
    • Verified methods (verified / total)
    • Default method for upkeep (last 4 digits)

S2 — CATEGORY-METHOD MATRIX (a static reference table)
    Shows which channel each category can disburse to:
    ┌──────────────────┬──────────────────────────────────────────────┐
    │ Category         │ Allowed channels                              │
    ├──────────────────┼──────────────────────────────────────────────┤
    │ Fees             │ School bank account · School paybill          │
    │ Upkeep           │ M-Pesa · Airtel Money · Bank account          │
    │ Pocket money     │ School pocket-card · Student M-Pesa wallet    │
    │ Fare             │ M-Pesa · Airtel Money                         │
    │ Equipment        │ Supplier paybill · M-Pesa · Bank account      │
    │ Medical          │ M-Pesa · Hospital/facility paybill            │
    │ Exam registration│ School paybill (KNEC goes via school)         │
    └──────────────────┴──────────────────────────────────────────────┘
    Below: "Add payout method" button → opens the add-method modal

S3 — PAYOUT METHODS LIST (PayoutMethodCard × N)
    Each card:
      • Method type icon (M-Pesa / Airtel / Bank / Paybill / Card)
      • Display label (e.g. "Mom's M-Pesa", "Nairobi School Fees A/C")
      • Masked identifier (•••• 7233)
      • Linked category chips (which categories can use this method)
      • Verification status (Verified · Pending · Rejected)
      • "Set as default for <category>" toggle
      • Edit · Remove (removal requires OTP + admin approval if any
        payouts used it in the last 6 months)

    ADD-METHOD MODAL — fields vary by type:
    M-Pesa / Airtel:
      • Phone number (Kenyan, validated)
      • Holder name (must match relationship — parent/guardian/student)
      • Holder relationship to student
      • OTP sent to that phone (proves ownership) — 6-digit
    School bank account (for fees):
      • School (autocomplete from registered_schools)
      • Bank name (dropdown: KCB, Equity, Coop, NCBA, ABSA, Stanbic,
        Standard Chartered, I&M, DTB, Family, etc.)
      • Account number (validated against school's verified accounts if
        admin has registered them; if not in the verified list, flagged
        "requires admin verification")
      • Account name (must match school name)
      • Branch code
    School paybill:
      • School (autocomplete)
      • Paybill number (5-6 digits)
      • Account number (student admission number)
      • Paybill type (M-Pesa paybill / Pochi la Biashara for small
        private schools / Till number)
    School-issued pocket-money card:
      • School (autocomplete)
      • Card number (masked after entry)
      • Card holder name
      • Card issuer (Mastercard / Visa / Pesapal card / etc.)
      • Expiry
      • CVV (never stored — collected only at disbursement time, sent
        direct to processor, never persisted)

S4 — PAYOUT HISTORY TABLE
    Columns: Date · Category (badge) · Channel (icon + masked) ·
    Amount (KES) · Reference (M-Pesa transaction ID / bank RRN /
    card auth code) · Status (Success / Failed / Reversed) ·
    Request ref (link back to S-3) · Receipt (PDF download)
    Filter: date range + category + channel
    Row-flash-disbursed on real-time payout push

S5 — DEFAULTS PER CATEGORY (table)
    Shows, for each category the student is eligible for, the default
    payout method that will be pre-selected in S-3's drawer:
      Fees → Nairobi School Fees A/C (verified)
      Upkeep → Mom's M-Pesa ●●●●7233 (verified)
      Pocket money → School pocket card ****4210 (verified)
      Fare → My M-Pesa ●●●●1188 (pending verification)
      …
    Each row has "Change default" dropdown.
```

---

### PAGE S-7: Documents (`/student/documents`)

```
PURPOSE:
Centralized vault for every document the student has uploaded — ID
copies, fee structures, result slips, medical letters, consent forms,
tenancy proofs. With verification status, version history, and DPA-aware
expiry rules.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-documents.css
Root class:        .page-student-documents

SECTIONS (5):

S1 — KPI ROW
    Total documents · Verified · Pending · Rejected · Expired (5 cards
    if rejected exists, else 4)

S2 — DOCUMENT CATEGORIES (tab nav)
    Tabs: Identity · Academic · Financial · Medical · Consent ·
    Residence · Other
    Each tab filters the grid.

S3 — DOCUMENT GRID (DocumentCard × N)
    Each card:
      • Thumbnail (page-1 preview)
      • Title (e.g. "Form 1 Term 2 Result Slip")
      • Category badge
      • Uploaded date + uploaded-by (self / admin)
      • Verification badge (Verified · Pending · Rejected · Expired)
      • File size + type
      • Actions: View · Download (if consent permits) · Replace ·
        Delete (with audit-diff)
      • Version indicator (v3 — click to see prior versions)

S4 — UPLOAD CENTER
    Big dropzone + metadata form:
      • Category (required)
      • Document type (per category: e.g. for Identity → Birth Cert /
        National ID / Passport / NEMIS card; for Academic → KCPE slip /
        KCSE slip / KPSEA / KJSEA / University transcript / etc.)
      • Issue date / term / year (depending on type)
      • Description (optional)
      • File (drag-drop or browse; multi-file supported for related
        batches, e.g. "all Form 1 term slips")
    OCR pre-extract for known document types (fee structure totals,
    result slip scores) — shows extracted value, student confirms or
    corrects before submit.

S5 — VERIFICATION QUEUE (student view)
    Shows documents awaiting admin verification with status breakdown.
    Each row: Document · Submitted · Days waiting · Action (Nudge admin —
    rate-limited to 1 nudge per 7 days per document)
```

---

### PAGE S-8: Messages (`/student/messages`)

```
PURPOSE:
Threaded messaging between the student (or their primary guardian, if
the student is a minor) and the admin/sponsor. Also class-teacher threads
if consent given. Built on Socket.IO for real-time delivery + read receipts.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-messages.css
Root class:        .page-student-messages

SECTIONS (5):

S1 — THREAD LIST (left rail, lg+; modal on mobile)
    Each thread: avatar · participant name · last message preview ·
    timestamp · unread badge · pin icon

S2 — CONVERSATION PANE
    Message bubbles (student right, admin/teacher left), timestamps,
    read-receipt ticks, file attachment chips (links back to S-7 vault
    if doc was shared)

S3 — COMPOSER
    Textarea + emoji + attach button + send button
    Reply quoting (select text → "Quote")
    Quick-templates: "Fees request follow-up" / "Result slip uploaded" /
    "Payout not received"

S4 — THREAD META PANEL (right rail)
    Participants list · linked entity (which request or document this
    thread is attached to) · mute · archive

S5 — QUICK ACTIONS
    "Start new thread with admin" / "Start new thread with class teacher
    (requires consent)" / "Report a problem"
```

---

### PAGE S-9: Notifications (`/student/notifications`)

```
PURPOSE:
Single stream of every system notification — approvals, payout receipts,
document verification outcomes, term reminders, consent expiry warnings,
message alerts.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-notifications.css
Root class:        .page-student-notifications

SECTIONS (5):

S1 — KPI ROW
    Unread · Today · This week · Muted categories

S2 — FILTER TABS
    All · Approvals · Payouts · Documents · Reminders · Messages · System

S3 — NOTIFICATION LIST (Bootstrap list-group, with read/unread styling)
    Each item:
      • Icon (per category)
      • Title + body
      • Deep-link ("View request" → S-3 detail)
      • Timestamp
      • Read indicator (dot left, dimmed text when read)
      • Actions: Mark read · Mute this category · Delete

S4 — PREFERENCES QUICK PANEL
    Inline toggle for top preferences (email/SMS/push per category),
    links to S-10 for full settings.

S5 — BULK ACTIONS BAR
    Mark all as read · Clear all read · Filter by date
```

---

### PAGE S-10: Settings (`/student/settings`)

```
PURPOSE:
The student's control panel — account, security, communication
preferences, language, consent management, data export, account deletion.

STYLE RULES:
Page stylesheet:   src/styles/pages/student-settings.css
Root class:        .page-student-settings

SECTIONS (5):

S1 — ACCOUNT
    • Email + phone (change requires OTP)
    • Profile photo (replace/remove)
    • Language (English / Kiswahili — full app i18n; toggle persists)
    • Theme (light / dark / system)
    • Timezone (default Africa/Nairobi, editable)

S2 — SECURITY
    • Password (change with current-password gate)
    • 2FA (TOTP via authenticator app; recovery codes shown once)
    • Active sessions list (device · location · last seen · revoke)
    • Login alerts (toggle)

S3 — COMMUNICATION PREFERENCES
    Matrix: rows = event categories (Approval · Payout · Document ·
    Message · Term reminder · Marketing), columns = channels
    (In-app · Email · SMS · Push). Per-cell toggle.

S4 — CONSENT & DATA (DPA 2019)
    • Per-purpose consent toggles (5, same as A-8) with last-updated
      timestamp per purpose
    • "Download my data" button → generates a ZIP of all profile, records,
      documents, logs (asynchronous, ready in ~10 min)
    • "Delete my account" button → 30-day soft-delete grace period, then
      hard delete (with legal-hold exceptions if there are open payouts
      or audit obligations)

S5 — DANGER ZONE
    • Deactivate account (reversible within 90 days)
    • Permanently delete (irreversible — OTP + reason required;
      deletes profile, documents, records; retains anonymized
      aggregate stats + audit trail per DPA retention rules)
```

---

## 7. ADMIN DASHBOARD PAGES (10 PAGES)

> The admin dashboard is the operator's command center. Absolute control, granular RBAC, full audit trail. Every page below has **5+ sections** with concrete fields, components and actions — no placeholders.

---

### PAGE AD-1: Admin Command Center (`/admin`)

```
PURPOSE:
The admin's home. Birds-eye view of the entire student portfolio —
total students, pending approvals queue, YTD disbursements, budget
burn-down, alerts requiring action, recent activity.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-command-center.css
Root class:        .page-admin-command-center
Motion hooks:      fadeSlideUp stagger (12 items),
                  count-up on KPIs (KES formatted),
                  icon-pulse on pending-approval badges,
                  chart-draw on disbursement trend + budget burn,
                  row-flash-approved/rejected/disbursed on live queue

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky)                                                │
│  [☰] Learnly Admin · <admin name> · role: Super Admin           │
│  [🔔 12] [💬 5] [☀/🌙] [Profile ▾]                              │
└─────────────────────────────────────────────────────────────────┘
┌───────────────┬─────────────────────────────────────────────────┐
│  SIDEBAR       │  MAIN                                            │
│  (lg static)   │  ┌─────────────────────────────────────────┐   │
│                │  │ WELCOME + ALERTS RIBBON                 │   │
│  • Command     │  │ "12 approvals awaiting your review"     │   │
│    Center      │  │ "3 students have incomplete profiles"   │   │
│  • Students    │  │ "Term-end reminder: KCSE results window │   │
│  • Approvals   │  │  opens in 5 days"                       │   │
│  • Disburse-   │  └─────────────────────────────────────────┘   │
│    ments       │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  • Academic    │  │Total │ │Active│ │Pend- │ │YTD   │ │Budget││
│    Verification│  │Students│ │Students│ │ing   │ │Disb. │ │Used ││
│  • Schools     │  │ 1,247 │ │1,189 │ │Appr. │ │KES   │ │73%   ││
│  • Users &     │  │       │ │      │ │ 12   │ │18.4M │ │      ││
│    Permissions │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘│
│  • Finance &   │  ┌─────────────────────────────────────────┐   │
│    Budget      │  │ DISBURSEMENT TREND (12-mo line chart)    │   │
│  • Reports     │  └─────────────────────────────────────────┘   │
│  • Audit &     │  ┌──────────────────────┐ ┌────────────────┐  │
│    Settings    │  │ PENDING APPROVALS    │ │ BUDGET BURN    │  │
│                │  │ QUEUE (top 5)        │ │ DOWN (donut)   │  │
│                │  │ [Open queue →]       │ └────────────────┘  │
│                │  └──────────────────────┘                     │
│                │  ┌─────────────────────────────────────────┐   │
│                │  │ RECENT ACTIVITY FEED (audit stream)     │   │
│                │  └─────────────────────────────────────────┘   │
│                │  ┌──────────────────────┐ ┌────────────────┐  │
│                │  │ STUDENTS BY LEVEL    │ │ TOP SCHOOLS    │  │
│                │  │ (bar chart)          │ │ BY STUDENT COUNT│  │
│                │  └──────────────────────┘ └────────────────┘  │
└───────────────┴─────────────────────────────────────────────────┘

SECTIONS (5):

S1 — ALERTS RIBBON
    Stack of alert-* cards (warning/info/danger) for time-sensitive items:
      • "12 approvals awaiting review" → AD-3 (link)
      • "3 students with incomplete profiles > 14 days" → AD-2
      • "KCSE results upload window opens in 5 days" → AD-5
      • "Budget line XYZ at 85% utilization" → AD-8
      • "2 M-Pesa B2C failures in last 24h" → AD-4
    Each card is dismissible (writes to admin_alerts_ack table).

S2 — KPI ROW (5 cards, count-up, KES formatted)
    • Total students (count)
    • Active students (status=active)
    • Pending approvals (count, icon-pulse)
    • YTD disbursed (KES, sum across all categories)
    • Budget used (percentage, with color: green <70%, amber 70-90%,
      red >90%)

S3 — DISBURSEMENT TREND CHART
    Recharts LineChart, 12-month window, x-axis = months, y-axis = KES,
    multi-series split by category (cat-* palette).
    Toggle: monthly / weekly / daily granularity.
    Chart-draw animation, hover tooltip with category breakdown.
    "Export PDF report" button.

S4 — PENDING APPROVALS QUEUE + BUDGET BURN-DOWN (2-col)
    Left: top 5 pending requests (compact rows):
      • Student name + photo
      • Category badge
      • Amount (KES)
      • Days waiting (red if >3)
      • "Review →" button → AD-3
      • "Open queue (12) →" link
    Right: Budget burn-down donut — overall annual budget vs used vs
    remaining; center hole shows "73% used". Legend below.

S5 — RECENT ACTIVITY + BOTTOM CHARTS (3 panels stacked)
    Panel A: Recent Activity feed (audit stream) — list of last 20
    admin/student actions: "Admin approved KES 25,000 fees for Amani
    Wanjiku", "Student Brian uploaded KCSE Term 3 result slip",
    "M-Pesa B2C success: KES 8,500 to ●●●●7233 (ref: RKX7H8KP2)".
    Each entry: actor avatar · action verb · object · timestamp.
    Panel B: Students by education level — horizontal bar chart, one
    bar per edu-* level (Pre-Primary, Primary, Junior, Senior, TVET,
    College, University, SNE, International).
    Panel C: Top schools by student count — table top 10.
```

---

### PAGE AD-2: Student Management (`/admin/students`)

```
PURPOSE:
The roster. List every student, search/filter across any dimension,
drill into a single student's full record (profile, requests, records,
payouts, related users), onboard new students, deactivate/reactivate.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-students.css
Root class:        .page-admin-students
Motion hooks:      fadeSlideUp, count-up on KPIs, hover-lift on
                  student profile cards, row-flash on status changes

SECTIONS (5):

S1 — KPI ROW
    Total · Active · Pending onboarding review · Inactive · New this month

S2 — FILTER BAR (TanStack Table filters)
    Filters (multi-select / range):
      • Education level (edu-* categories)
      • Institution type (Public/Private/Mission/TVET/University/…)
      • School (autocomplete)
      • County
      • Status (Active / Pending review / Inactive / Suspended)
      • Sponsor (if multi-admin/sponsor RBAC)
      • Profile completeness (range slider 0-100%)
      • Has pending request (boolean)
      • Date onboarded (range)
    Search box: full-text on name, admission number, NEMIS, national ID.

S3 — STUDENTS TABLE (TanStack Table, responsive, column toggle,
    server-side pagination)
    Columns:
      • Photo + Name
      • Education level (edu-* ribbon badge)
      • School
      • Class/Grade/Form/Year
      • County
      • Status (Active/Pending/Inactive/Suspended)
      • Profile completeness (%)
      • Total disbursed YTD (KES)
      • Pending requests (count, icon-pulse if >0)
      • Onboarded (date)
      • Actions: View · Edit · Suspend · Activate · Delete
    Row expansion reveals a mini-summary: latest 3 requests, latest 3
    payouts, latest verification status.
    Bulk select + bulk actions: Bulk approve · Bulk suspend · Export CSV.

S4 — STUDENT DETAIL DRAWER (slide-in right)
    Tabs (within the drawer):
      • Overview — KPIs + alert flags for that student
      • Profile — full read of S-2 data
      • Requests — all requests (link to S-3 / AD-3)
      • Academic — all records (link to S-4 / AD-5)
      • Payouts — all payouts (link to S-6 / AD-4)
      • Related users — full read
      • Documents — full vault read
      • Audit — every admin action on this student

S5 — ONBOARD + BULK ACTIONS BAR
    • "Onboard a student" → A-4 (admin-onboard)
    • "Import students (CSV)" → opens import wizard with column-mapping
      and validation preview
    • "Export filtered list (CSV/XLSX)"
    • "Bulk message" → opens composer targeting filtered list (BCC
      SMS/email, rate-limited per DPA consent)
```

---

### PAGE AD-3: Approvals (`/admin/approvals`)

```
PURPOSE:
The single most important admin page. The queue of every student
request awaiting admin review — with the ability to approve, adjust the
amount, reject with reason, request more proof, and trigger disbursement.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-approvals.css
Root class:        .page-admin-approvals
Motion hooks:      fadeSlideUp, count-up on queue stats, icon-pulse on
                  new arrivals, row-flash-approved/rejected on action

SECTIONS (5):

S1 — KPI ROW
    Pending review · Submitted today · Awaiting more proof · Avg wait time ·
    Approved today · Rejected today

S2 — QUEUE FILTER BAR
    Tabs: All · Fees · Upkeep · Pocket money · Fare · Equipment · Medical ·
    Exam registration
    Sub-filters: by education level · by school · by sponsor · by days-
    waiting (>3 days highlighted red)
    Sort: oldest first / newest first / highest amount / longest waiting

S3 — QUEUE TABLE (TanStack Table, responsive)
    Columns:
      • Student (photo + name + level ribbon)
      • Category (cat-* badge)
      • Amount requested (KES)
      • Proof (✅ verified / ⚠ uploaded-unverified / ✖ missing-required)
      • Justification (truncated text, expand on click)
      • Term
      • Days waiting (red if >3)
      • Submitted (timestamp)
      • Actions: Review →
    Selecting a row opens the REVIEW DRAWER (S4).

S4 — REVIEW DRAWER (slide-in right, full-height on lg+, modal on sm)
    The decision surface. Sub-sections within the drawer:
      A — Request summary: student name, category, amount, term,
          justification, payout destination selected by student
      B — Student context: profile completeness, last 3 requests,
          current term results status, current term disbursements YTD
      C — Proof documents: thumbnail grid of uploaded proof with
          "Verify" / "Reject proof" per-doc actions; OCR-extracted
          values shown for fee structures and result slips
      D — Adjustment panel:
            • Original amount (read-only)
            • Adjusted amount (editable; live validation against
              category cap + student annual cap + budget line remaining)
            • Reason for adjustment (free text, required if adjusted)
            • Disbursement channel override (defaults to student's
              chosen method, but admin can change to any verified
              method for that student+category)
            • Effective disbursement date
      E — Decision buttons:
            • Approve & disburse now (writes approval + triggers
              payout immediately via the engine)
            • Approve & schedule (date picker; queues a payout job)
            • Adjust amount & approve (opens adjustment panel)
            • Request more proof (sends a message to student via S-8,
              sets request status "Awaiting proof", notifies student)
            • Reject (opens reason modal: predefined reasons +
              free-text; sends notification to student)
      F — Audit preview: every action will be logged with admin ID,
          timestamp, IP, before/after diff

S5 — DECISION HISTORY TIMELINE (drawer footer)
    Same shape as S-3 section 5, but enriched with admin identity.
    Visible to admin as a sanity-check before final action.
```

---

### PAGE AD-4: Disbursements & Payouts (`/admin/disbursements`)

```
PURPOSE:
Track every payout from approval → processor → settlement. Reconcile
M-Pesa B2C, Airtel, bank EFT, school paybill, card topup. Handle
failures, retries, reversals.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-disbursements.css
Root class:        .page-admin-disbursements
Motion hooks:      fadeSlideUp, count-up on totals, icon-pulse on
                  "in-flight" payouts, row-flash-disbursed on settlement,
                  chart-draw on volume-by-channel bar

SECTIONS (5):

S1 — KPI ROW
    Disbursed today (KES) · In-flight (count) · Failed (24h) ·
    Success rate · Avg settlement time

S2 — VOLUME BY CHANNEL CHART
    Horizontal bar chart: M-Pesa B2C · Airtel Money · Bank EFT/RTGS ·
    School paybill · Card topup — last-30-day totals in KES.
    Stacked by category.

S3 — PAYOUTS TABLE (TanStack Table, server-paginated)
    Columns:
      • Reference (internal ID + processor ref)
      • Student (photo + name)
      • Category (badge)
      • Channel (icon)
      • Destination (masked)
      • Amount (KES)
      • Status (Queued · Submitted · Settled · Failed · Reversed)
      • Initiated (timestamp)
      • Settled (timestamp; empty if not settled)
      • Actions: View · Retry (if failed) · Reverse (if settled) ·
        Download receipt
    Filter: date range · channel · category · status · school

S4 — PAYOUT DETAIL DRAWER
    Full payout lifecycle:
      • Request ref (link to AD-3)
      • Approval ref (link to AD-3 decision)
      • Channel + destination (full, unmasked in admin view)
      • Processor responses (Daraja ConversationID + TransactionID +
        ResponseCode; bank RRN; card auth code)
      • Fee breakdown (processor fee, Learnly fee, net to recipient)
      • Failure reason + retry log if applicable
      • Reversal status if initiated
      • Receipt PDF link

S5 — BATCH OPERATIONS BAR
    • "Run batch payout" — selects queued approvals, batches them into a
      single BullMQ job that runs Daraja B2C in rate-limited waves
      (max 50 per minute per Safaricom tier)
    • "Reconcile today" — fetches Daraja transaction query, matches
      every internal ref to external status, flags mismatches
    • "Export reconciliation report (CSV/XLSX)"
    • "Export recipient statements (PDF, bulk — one per student)"
```

---

### PAGE AD-5: Academic Verification (`/admin/academic-verification`)

```
PURPOSE:
Review and verify every academic document students upload — result
slips, fee structures, school letters, exam registrations. Verified
documents unlock proof-gated request categories.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-academic-verification.css
Root class:        .page-admin-academic-verification
Motion hooks:      fadeSlideUp, count-up, icon-pulse on waiting,
                  row-flash on verify/reject

SECTIONS (5):

S1 — KPI ROW
    Pending verification · Verified today · Rejected today · Avg verify
    time · Expiring soon (verifications that lapse in 30 days — fee
    structures are termly)

S2 — QUEUE FILTER BAR
    Tabs: All · Result slips · Fee structures · School letters ·
    Exam registrations · Medical letters · Residence proofs
    Sub-filters: by education level · by school · by term

S3 — VERIFICATION TABLE
    Columns:
      • Student
      • Document type
      • Term / year
      • Uploaded (timestamp)
      • OCR-extracted summary (e.g. "Total fees: KES 42,500",
        "Mean grade: B+ (74%)")
      • Status (Pending · Verified · Rejected · Expired)
      • Days waiting
      • Actions: Review →

S4 — VERIFICATION DRAWER
    Side-by-side layout:
      Left: full document preview (PDF page or image), zoomable,
      rotatable
      Right: OCR-extracted fields (editable — admin corrects before
      persisting), student context, decision buttons:
        • Verify & save extracted values
        • Reject with reason (free text + predefined: "Illegible" /
          "Forged" / "Wrong term" / "Wrong student" / "Other")
        • "Mark for re-upload" (sends student back to S-7 with a
          reason message)
    Auto-checks running in background:
      • Cross-reference extracted totals against the school's registered
        fee structure (warns if mismatch)
      • Cross-reference extracted student name against profile name
        (warns if mismatch)
      • Cross-reference KCSE/KPSEA mean grade against historical grades
        (flags impossible jumps)

S5 — VERIFICATION RULES CONFIGURATOR
    Admin-only settings panel:
      • Per-document-type expiry rules (e.g. fee structure expires at
        end of term; result slip expires after 1 year)
      • Auto-verify rules (e.g. "result slips from schools in the
        verified-schools list with extracted mean within ±5% of last
        term — auto-verify, log for spot audit")
      • Spot-audit sample rate (e.g. 5% of auto-verifications get
        randomly queued for manual review)
```

---

### PAGE AD-6: Schools & Institutions (`/admin/schools`)

```
PURPOSE:
Manage the registry of schools, universities, polytechnics, colleges,
TVET institutions — including their verified bank accounts, paybills,
pocket-card programs. This is the source of truth that powers the
student's "School" autocomplete (S-2) and the payout-destination
validation (S-6).

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-schools.css
Root class:        .page-admin-schools

SECTIONS (5):

S1 — KPI ROW
    Total institutions · Active · By type (Public/Private/Mission/TVET/
    University) · Linked students · Verified bank/paybill count

S2 — FILTER + TABLE
    Filters: type · level (Pre-Primary/Primary/Junior/Senior/TVET/
    College/University/SNE/International) · county · MOE-code status
    Table columns:
      • School crest + name
      • MOE code
      • Type + level (badges)
      • County
      • Boarding status offered (Day/Boarding/Both)
      • Linked students (count)
      • Bank accounts on file (count)
      • Paybills on file (count)
      • Pocket-card program (Yes/No)
      • Status (Active / Inactive)
      • Actions: View · Edit · Deactivate · Verify MOE code

S3 — SCHOOL DETAIL DRAWER
    Sub-sections within:
      A — Basic info: name, alias, MOE code, type, level, county,
          sub-county, physical address, GPS, principal/headteacher
          name + phone, school email, school crest upload
      B — Banking & paybill registry (the critical anti-fraud block):
          • Verified bank accounts (Bank · Branch code · Account # ·
            Account name · Verified-by · Verified-on)
          • Verified paybills (Paybill # · Type · Account-name pattern
            · Verified-by)
          • Pocket-card program details (Issuer · Card BIN range ·
            School contact for topup)
          • "Add verified account" / "Add verified paybill" buttons —
            each requires admin OTP + audit
      C — Linked students (list with link to AD-2)
      D — Linked staff (teachers registered as related users — list)
      E — Activity feed for this school (recent fee requests, recent
          payouts to school accounts)

S4 — REGISTER NEW INSTITUTION (modal wizard)
    Step 1: Name + alias + MOE code (with MOE-code lookup that hits
            the e-Citizen institutions registry)
    Step 2: Type + level + county
    Step 3: Principal / registrar contact
    Step 4: Verify bank account (admin enters the school's official
            bank account; system sends a micro-deposit + callback code
            the school returns; admin enters callback code → verifies)
    Step 5: Verify paybill (admin enters school paybill + does a
            test 1-KES push from a dedicated test wallet, then confirms
            receipt on the school's side)
    On completion, school becomes available in the student-facing
    autocomplete.

S5 — POCKET-CARD PROGRAMS PANEL
    Specialized list of schools that have an active prepaid pocket-money
    card program (common in Kenyan boarding secondary schools). Per
    school:
      • Card issuer (Mastercard / Visa / Pesapal / Cellulant / etc.)
      • BIN range
      • Topup API endpoint (configured in env / settings)
      • Daily limit per card (KES)
      • "Test topup" button (sends 1 KES to a test card, verifies the
        round-trip works)
```

---

### PAGE AD-7: Users & Permissions (`/admin/users-permissions`)

```
PURPOSE:
Manage every staff/admin user on the platform — the sponsor-operator
(you), any sub-admins you delegate, finance officers, verifiers, school
liaisons. Full RBAC with role-based permissions, scoped data access,
and audit trail.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-users-permissions.css
Root class:        .page-admin-users-permissions

SECTIONS (5):

S1 — KPI ROW
    Total staff · Active now · By role · Pending invites

S2 — STAFF TABLE
    Columns:
      • Photo + name
      • Email
      • Phone
      • Role (Super Admin / Admin / Finance Officer / Verifier /
        School Liaison / Read-Only Auditor)
      • Data scope (All · By school · By county · By sponsor)
      • Last login
      • Status (Active / Suspended / Invited)
      • 2FA enabled (badge)
      • Actions: View · Edit · Suspend · Reset 2FA · Revoke sessions

S3 — USER DETAIL DRAWER
    Tabs:
      • Profile — name, contact, role, scope, photo
      • Permissions — granular matrix (see S5 below)
      • Activity — audit log filtered to this user
      • Sessions — active sessions with revoke buttons

S4 — INVITE STAFF (modal)
    Fields: name · email · phone · role · data scope · custom message
    On submit: creates invited user record, sends OTP-protected invite
    link via SMS+email. First-login forces password set + 2FA enrollment.

S5 — ROLES & PERMISSIONS MATRIX (the canonical RBAC table)
    Editable matrix (admin-only for Super Admin role; other roles
    read-only):
    Rows = permission keys, columns = roles, cells = checkbox (✓/✖)
    Permission keys (sample of the ~40):
      • students.view · students.create · students.edit · students.delete
      • students.suspend · students.reactivate
      • requests.view · requests.approve · requests.reject
      • requests.adjust_amount · requests.override_channel
      • payouts.view · payouts.initiate · payouts.reverse
      • payouts.batch_run · payouts.reconcile
      • documents.view · documents.verify · documents.reject
      • schools.view · schools.create · schools.edit · schools.verify_bank
      • schools.verify_paybill · schools.deactivate
      • staff.view · staff.invite · staff.edit · staff.suspend
      • staff.assign_role · staff.revoke_2fa
      • budget.view · budget.create · budget.edit · budget.allocation
      • reports.view · reports.export · reports.schedule
      • audit.view · audit.export · audit.delete
      • settings.view · settings.edit · settings.payment_gateways
      • settings.integrations · settings.feature_flags
    Each role's permissions are stored in a Postgres enum-backed
    permissions table; changes are diff-logged to audit_trail.
```

---

### PAGE AD-8: Finance & Budget (`/admin/finance-budget`)

```
PURPOSE:
The money map. Track incoming sponsor funds (donors, self, grants),
budget lines (allocations per student or per cohort or per category),
burn-down, forecasts, and per-student caps.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-finance-budget.css
Root class:        .page-admin-finance-budget
Motion hooks:      fadeSlideUp, count-up on totals, chart-draw on
                  burn-down + forecast, row-flash on allocation changes

SECTIONS (5):

S1 — KPI ROW
    Total funds available · Allocated YTD · Disbursed YTD · Available
    to allocate · Forecast month-end · Over-budget alerts

S2 — FUND SOURCES PANEL
    Cards per fund source:
      • Self (operator capital) — running balance
      • Donor A (named, if multi-donor) — pledged vs received vs
        earmarked
      • Donor B
      • Grant: XYZ Education Trust — with reporting obligations badge
    Each card: total in · total out · current balance · linked budget
    lines · "Add deposit" button (records an incoming transaction)

S3 — BUDGET LINES TABLE
    Each budget line = an allocation pot:
      • Name (e.g. "Form 4 cohort 2025 fees")
      • Fund source
      • Total allocation (KES)
      • Disbursed (KES) + percentage bar
      • Remaining
      • Scope (which students — by cohort, by school, by county, by
        sponsor, or specific student IDs)
      • Category restrictions (Fees only / Upkeep only / Any)
      • Term / period (Term 1 2025 / Annual / One-off)
      • Per-student cap (KES per term)
      • Status (Active / Exhausted / Closed)
      • Actions: View · Edit · Close · Allocate to students

S4 — ALLOCATION VIEW (drill into a budget line)
    Shows every student currently allocated to this budget line:
      • Student
      • Per-term cap
      • Used this term
      • Available this term
      • Override (admin can set a per-student cap that differs from the
        budget default)
    "Add student to budget" / "Remove from budget" actions.

S5 — FORECAST & REPORTING
    • 6-month disbursement forecast (line chart, based on historical
      avg + pending approvals + scheduled payouts)
    • "Cashflow" report (in vs out per month, with surplus/deficit
      bars)
    • "Donor report" generator — produces a PDF for a specific fund
      source showing every disbursement funded by it (for donor
      accountability)
```

---

### PAGE AD-9: Reports (`/admin/reports`)

```
PURPOSE:
Generate, schedule, and export every report the operator and external
stakeholders (donors, auditors, KRA, schools) need.

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-reports.css
Root class:        .page-admin-reports

SECTIONS (5):

S1 — KPI ROW
    Reports run this month · Scheduled reports · Failed exports ·
    Avg generation time

S2 — REPORT TEMPLATES GRID
    Cards, each = a pre-built report:
      • Student roster (CSV/XLSX)
      • Disbursement ledger (CSV/XLSX) — with date range, channel,
        category filters
      • Donor impact report (PDF) — per fund source, with narrative +
        disbursement table + photos (if consented)
      • Per-statement statement (PDF, batch)
      • Reconciliation report (XLSX) — internal vs Daraja vs bank
      • Academic performance cohort report (PDF)
      • KRA-compliant stipend report (for university students
        receiving taxable stipends)
      • Audit trail export (CSV/JSON)
      • DPA-2019 consent log export (CSV)
      • Custom report (SQL builder — admin-only)

S3 — REPORT BUILDER (for custom reports)
    Visual SQL builder:
      • Source tables (students, requests, payouts, schools, etc.)
      • Joins (auto-suggested)
      • Columns (drag from schema)
      • Filters (date, level, school, category, status)
      • Group by / aggregations
      • Output format (CSV / XLSX / PDF / JSON)
      • Save as template (named, reusable)

S4 — SCHEDULED REPORTS PANEL
    List of recurring reports:
      • Name · template · frequency (daily/weekly/monthly/termly) ·
        recipients (email list) · last run · next run · status
      • Edit · Pause · Run now · Delete

S5 — EXPORT QUEUE
    Background export jobs (BullMQ):
      • Job name · requested by · format · size · status (queued /
        running / completed / failed) · progress bar
      • On completion: download link + email/SMS notification
```

---

### PAGE AD-10: Audit & Settings (`/admin/audit-settings`)

```
PURPOSE:
Two-in-one: the immutable audit trail of every admin action, and the
global platform settings (payment gateways, integrations, feature flags,
compliance).

STYLE RULES:
Page stylesheet:   src/styles/pages/admin-audit-settings.css
Root class:        .page-admin-audit-settings

SECTIONS (5):

S1 — AUDIT TRAIL TABLE (TanStack Table)
    Columns:
      • Timestamp
      • Actor (admin/staff name, or "system" for automated)
      • Action (verb: approved / rejected / disbursed / verified /
        created / updated / deleted / logged-in / consent-revoked)
      • Entity type (Student · Request · Payout · Document · School ·
        Staff · Budget)
      • Entity ref (link)
      • Before (JSON diff preview)
      • After (JSON diff preview)
      • IP address
      • User agent
      • Location (geo-IP derived, city-level)
    Filter: actor · action · entity · date range
    Search: full-text on JSON diffs
    "Export filtered audit (CSV/JSON)"
    Immutable — no row can be edited or deleted (DB-level enforcement
    via triggers; only Super Admin can run retention pruning per DPA).

S2 — AUDIT ALERTS PANEL
    Real-time alerts derived from audit patterns:
      • "Same admin approved 8 requests in 5 min" (unusual velocity)
      • "Payout initiated from new IP"
      • "Staff login from new device"
      • "Failed login × 5 from same IP"
    Each alert: acknowledge · escalate · auto-rule config

S3 — PAYMENT GATEWAYS SETTINGS
    Per-gateway cards:
      • Safaricom Daraja M-Pesa (B2C + STK Push) — ConsumerKey,
        ConsumerSecret (stored in vault, never exposed), Shortcode,
        passkey, environment (sandbox/prod), "Test connection" button
      • Airtel Money — same shape
      • Bank EFT/RTGS integrations (per-bank: KCB, Equity, Coop, etc.)
        — credentials, account numbers, "Test transfer" button
      • Card topup processor (Cellulant / Pesapal) — API key, merchant
        ID, environment

S4 — INTEGRATIONS PANEL
    External systems Learnly talks to:
      • NEMIS (learner UPI lookup — read-only)
      • KNEC (exam results verification — read-only, batch)
      • IPRS / e-Citizen (national ID verification for ≥18 students)
      • KRA PIN validation (for university stipend tax)
      • Google Document AI (OCR for fee structures / result slips)
      • Africa's Talking (SMS OTP + bulk)
      • Resend (transactional email)
      • Cloudflare (WAF, CDN)
    Each integration: status (connected / disconnected / error) ·
    last sync · "Test" button · credentials editor

S5 — FEATURE FLAGS + COMPLIANCE
    Feature flags (toggle per environment):
      • enable_self_onboarding
      • enable_admin_onboarding
      • enable_ocr_extraction
      • enable_iprs_lookup
      • enable_confetti_on_first_approval
      • enable_kiswahili_ui
      • enable_bulk_payouts
      • enable_auto_verify_threshold
      • enable_donor_portal (future)
    Compliance block:
      • DPA 2019 retention policy (per-data-class retention days)
      • Data residency (all data stays in Kenya/East-Africa region —
        enforced via infra tagging)
      • Consent re-consent cadence (default 12 months — settable)
      • Breach notification config (who gets alerted, how fast)
      • "Run DPA compliance check" button (audits current state vs
        policy, generates a gap report)
```

---

## 8. SHARED COMPONENTS

```
Located at src/styles/components/*.css — loaded once at app root,
rendered identically on every page.

COMPONENT INVENTORY:
├── StatCard                 — KPI card with label, value, delta, icon
├── EduLevelBadge            — ribbon badge colored by edu-* palette
├── CategoryBadge            — pill colored by cat-* palette
├── StatusBadge              — Pending/Approved/Rejected/Disbursed
├── ApprovalCard             — compact request row for queues
├── PayoutMethodCard         — M-Pesa/Bank/Paybill/Card with masked id
├── DocumentUploader         — drag-drop + metadata form + OCR preview
├── DocumentCard             — vault item with verify status
├── DataTable                — TanStack Table + Bootstrap styling +
│                              responsive-table collapse behavior
├── ChartWrapper             — Recharts wrapper with chart-draw animation
├── ProfileCompletenessBar   — gradient progress bar with tooltip
├── RelatedUserCard          — parent/teacher/guardian display
├── SchoolPicker             — autocomplete with "register new" side modal
├── ConsentModal             — DPA 2019 consent capture with signature pad
├── Stepper                  — horizontal/vertical wizard steps
├── Timeline                 — vertical timeline for audit + approvals
├── AuditDiffViewer          — before/after JSON diff with syntax highlight
├── AmountInput              — KES formatted, with cap hints + validation
├── PhoneInput               — Kenyan +254 aware, with carrier detect
├── Drawer                   — slide-in right panel (lg+) / modal (sm)
├── OffcanvasSidebar         — mobile sidebar with backdrop
├── FilterBar                — reusable filter chips + search box
├── EmptyState               — illustration + headline + CTA
├── Confetti                 — one-shot celebration on first approval
├── OTPInput                 — 6-digit split input with auto-advance
└── SignaturePad             — canvas signature with hash + timestamp
```

---

## 9. STATE MANAGEMENT

```
SERVER STATE (TanStack Query):
queryClient with the following query-key conventions:
  • ["students", { filters }]                — list
  • ["student", id]                          — single
  • ["student", id, "requests"]              — embedded list
  • ["student", id, "records"]               — embedded list
  • ["student", id, "payouts"]               — embedded list
  • ["student", id, "documents"]             — embedded list
  • ["student", id, "related-users"]         — embedded list
  • ["requests", { filters }]                — admin queue
  • ["request", id]                          — single
  • ["payouts", { filters }]                 — admin payouts
  • ["documents", "pending"]                 — verification queue
  • ["schools", { filters }]                 — admin schools
  • ["staff", { filters }]                   — admin staff
  • ["budgets", { filters }]                 — admin budgets
  • ["audit", { filters }]                   — audit trail
  • ["me"]                                   — current user
  • ["my-payout-methods"]                    — student methods
  • ["my-notifications"]                     — student notifications

INVALIDATION STRATEGY:
  • On mutation (approve/reject/disburse), invalidate ["request", id]
    and ["requests"] for the affected scope, plus ["student", id,
    "requests"] and the dashboard KPI queries.
  • On document verification, invalidate ["documents"] and any
    ["request", id] that depended on that document's verification.

CLIENT STATE (Zustand, minimal):
  • uiStore: sidebar open/closed, theme, active filter chip, drawer state
  • onboardingStore: multi-step wizard progress (persisted to localStorage
    AND server-side incomplete_profile table; localStorage for resume-on-
    refresh, server for resume-on-device-switch)

REALTIME (Socket.IO):
  • Room per user (user:<uuid>) — notifications, payout status pushes
  • Room per admin (admin:<uuid>) — approval status changes, new
    requests, payout failures
  • Room per request (request:<id>) — both student and admin subscribed
    for status transitions
  • Events: request:status_changed · payout:settled · payout:failed ·
    document:verified · message:received · notification:new
```

---

## 10. DATABASE SCHEMA

```
PostgreSQL 16 + Prisma ORM. Core tables (simplified):

users
  id (uuid, pk) · email (unique, nullable) · phone (unique) ·
  password_hash · role (enum: STUDENT · ADMIN · STAFF) ·
  status (enum: ACTIVE · PENDING · SUSPENDED · INACTIVE) ·
  two_factor_enabled · two_factor_secret · created_at · last_login_at

student_profiles
  id (uuid, pk) · user_id (fk→users) ·
  first_name · middle_name · last_name · dob · sex · blood_group ·
  nationality · religion · languages (text[]) · marital_status ·
  disability_status (enum) · disability_card_no ·
  profile_photo_url · profile_completeness_pct ·
  onboarded_by (fk→users, nullable for self-onboard) ·
  onboarded_at · activated_at · status

student_identity
  student_id (fk→student_profiles) · birth_cert_no · nemis_upi ·
  national_id_no (nullable, ≥18) · kra_pin (nullable) ·
  kcpe_index_no · kcse_index_no · kpsea_index_no · kjsea_index_no ·
  passport_no (nullable) · iprs_verification_status · iprs_verified_at

related_users
  id (uuid, pk) · student_id (fk→student_profiles) ·
  relationship (enum: FATHER · MOTHER · GUARDIAN · AUNT · UNCLE ·
    GRANDPARENT · SIBLING · CLASS_TEACHER · PATRON · HOD · DEAN ·
    SPONSOR · EMERGENCY_CONTACT · OTHER) ·
  full_name · title · phone · alt_phone · email · occupation ·
  employer · income_band (enum, nullable, encrypted) ·
  is_primary_contact · is_next_of_kin · consented_to_contact ·
  subjects_taught (text[], nullable, teacher-only) ·
  department (text, nullable, teacher-only) ·
  created_at · updated_at

student_residences
  student_id (fk→student_profiles) · county · sub_county · ward ·
  constituency · town · estate_or_village · street_or_plot ·
  landmark · building_type · ownership · rent_per_month ·
  distance_to_school_km · travel_mode · gps_lat · gps_lng ·
  address_proof_doc_id (fk→documents)

academic_tenures
  id (uuid, pk) · student_id (fk→student_profiles) · school_id
    (fk→schools) ·
  education_level (enum: PRE_PRIMARY · PRIMARY · JUNIOR · SENIOR ·
    TVET · COLLEGE · UNIVERSITY · SNE · INTERNATIONAL) ·
  grade_or_form_or_year · stream_or_pathway ·
  admission_number · enrolment_date · expected_completion_date ·
  actual_end_date (nullable) · reason_for_leaving (enum) ·
  boarding_status (enum: DAY · BOARDING · HALF_BOARDING) ·
  is_current (boolean)

term_records
  id (uuid, pk) · tenure_id (fk→academic_tenures) · student_id ·
  academic_year · term (enum: TERM_1 · TERM_2 · TERM_3 ·
    SEMESTER_1 · SEMESTER_2 · TRIMESTER_1 · TRIMESTER_2 ·
    TRIMESTER_3) · start_date · end_date ·
  attendance_pct (nullable) · mean_score (nullable) ·
  grade_letter (nullable) · class_position (nullable) ·
  result_slip_doc_id (fk→documents, nullable) ·
  verification_status (enum: PENDING · VERIFIED · REJECTED) ·
  verified_by (fk→users) · verified_at

exam_results
  id (uuid, pk) · student_id · tenure_id · exam_type (enum: KCPE ·
    KCSE · KPSEA · KJSEA · KSSEA · SBA · UNIVERSITY_END_SEM ·
    TVET_TRADE_TEST · IGCSE · IB · A_LEVEL · AP · OTHER) ·
  exam_year · subjects (jsonb: [{subject, marks, grade}]) ·
  total_marks (nullable) · mean_grade (nullable) ·
  position_in_class (nullable) · result_slip_doc_id (fk→documents) ·
  verification_status · verified_by · verified_at

schools
  id (uuid, pk) · name · alias (nullable) · moe_code (nullable, unique) ·
  type (enum: PUBLIC · PRIVATE · MISSION · INTERNATIONAL · SNE ·
    TVET · NATIONAL_POLYTECHNIC · UNIVERSITY_PUBLIC · UNIVERSITY_PRIVATE) ·
  education_levels_offered (enum[]) · county · sub_county ·
  physical_address · gps_lat · gps_lng ·
  principal_name · principal_phone · school_email ·
  crest_image_url · boarding_offered (boolean) · day_offered (boolean) ·
  pocket_card_program_enabled (boolean) · status (ACTIVE/INACTIVE) ·
  verified_at · verified_by

school_bank_accounts (verified, anti-fraud registry)
  id · school_id · bank_name · branch_code · account_number ·
  account_name · verified_by · verified_at · status

school_paybills
  id · school_id · paybill_number · paybill_type (MPESA_PAYBILL ·
    POCHI_LA_BIASHARA · TILL_NUMBER) · account_name_pattern ·
  verified_by · verified_at · status

school_pocket_card_programs
  id · school_id · card_issuer (MASTERCARD · VISA · PESAPAL ·
    CELLULANT · OTHER) · bin_range · topup_api_endpoint ·
  daily_limit_kes · status

request_categories (admin-configurable enum-backed table)
  id · code (FEES · UPKEEP · POCKET_MONEY · FARE · EQUIPMENT ·
    MEDICAL · EXAM_REGISTRATION) · display_name ·
  proof_required (boolean) · proof_frequency (PER_TERM · PER_REQUEST ·
    PER_EXAM_WINDOW · NONE) · default_cap_per_term_kes ·
  allowed_channels (enum[]: MOBILE_MONEY · BANK_EFT · SCHOOL_BANK ·
    SCHOOL_PAYBILL · POCKET_CARD · SUPPLIER_PAYBILL) ·
  education_levels_eligible (enum[]) · is_active

requests
  id (uuid, pk) · ref_code (unique, e.g. LRQ-2025-00123) ·
  student_id · category_id ·
  amount_requested_kes · amount_approved_kes (nullable) ·
  adjustment_reason (nullable) ·
  payout_method_id (fk→payout_methods) ·
  payout_method_override_id (nullable, admin override) ·
  term_label · justification_text ·
  status (enum: DRAFT · SUBMITTED · UNDER_REVIEW · AWAITING_PROOF ·
    APPROVED · REJECTED · DISBURSED · FAILED · WITHDRAWN) ·
  submitted_at · reviewed_by (nullable, fk→users) · reviewed_at ·
  decision_reason (nullable) ·
  scheduled_disbursement_at (nullable) · created_at · updated_at

request_documents (proof uploads)
  id · request_id · document_id (fk→documents) ·
  proof_purpose (enum: FEE_STRUCTURE · TERM_RESULT · PROFORMA_INVOICE ·
    HOSPITAL_LETTER · SCHOOL_INVOICE · OTHER) ·
  ocr_extracted_data (jsonb, nullable) · created_at

payout_methods
  id (uuid, pk) · student_id ·
  channel_type (enum: MPESA · AIRTEL · BANK_ACCOUNT · SCHOOL_BANK ·
    SCHOOL_PAYBILL · POCKET_CARD) ·
  display_label · masked_identifier ·
  phone (nullable, encrypted) ·
  bank_name (nullable) · branch_code (nullable) · account_number
    (nullable, encrypted) · account_name (nullable) ·
  paybill_number (nullable) · paybill_account_number (nullable) ·
  card_number_masked (nullable) · card_holder_name (nullable) ·
  card_expiry (nullable) · card_issuer (nullable) ·
  school_id (nullable, fk→schools, for SCHOOL_* and POCKET_CARD) ·
  verification_status (enum: PENDING · VERIFIED · REJECTED) ·
  verified_by · verified_at ·
  is_default_for_category (jsonb: {FEES: true, UPKEEP: false, …}) ·
  created_at

payouts
  id (uuid, pk) · request_id (fk→requests) · student_id ·
  channel_type · payout_method_id · amount_kes ·
  processor_ref (nullable, M-Pesa TransactionID / bank RRN / card
    auth code) ·
  internal_ref (unique) · status (enum: QUEUED · SUBMITTED · SETTLED ·
    FAILED · REVERSED) · initiated_at · submitted_at · settled_at ·
  failure_reason (nullable) · retry_count · receipt_url (nullable) ·
  fee_breakdown (jsonb: {processor_fee, learnly_fee, net_to_recipient})

documents
  id (uuid, pk) · student_id ·
  category (enum: IDENTITY · ACADEMIC · FINANCIAL · MEDICAL ·
    CONSENT · RESIDENCE · OTHER) ·
  document_type (enum: BIRTH_CERT · NATIONAL_ID · PASSPORT · NEMIS ·
    KCPE_SLIP · KCSE_SLIP · KPSEA_SLIP · KJSEA_SLIP · KSSEA_SLIP ·
    UNIVERSITY_TRANSCRIPT · TVET_RESULT · FEE_STRUCTURE ·
    PROFORMA_INVOICE · HOSPITAL_LETTER · SCHOOL_INVOICE ·
    TENANCY_AGREEMENT · CHIEF_LETTER · CONSENT_FORM · OTHER) ·
  title · description (nullable) · issue_date (nullable) ·
  term_label (nullable) · file_url · file_size_bytes · mime_type ·
  page_count · ocr_extracted_text (nullable) ·
  ocr_extracted_fields (jsonb, nullable) ·
  verification_status · verified_by · verified_at ·
  expires_at (nullable, for termly docs) ·
  version (int) · previous_version_id (nullable, self-ref) ·
  uploaded_by (fk→users) · created_at

staff_users
  id (uuid, pk) · user_id (fk→users, role=ADMIN/STAFF) ·
  full_name · role (enum: SUPER_ADMIN · ADMIN · FINANCE_OFFICER ·
    VERIFIER · SCHOOL_LIAISON · READ_ONLY_AUDITOR) ·
  data_scope (jsonb: {type: ALL | BY_SCHOOL | BY_COUNTY | BY_SPONSOR,
    values: [...]}) ·
  permissions (text[]) · invited_by · invited_at · activated_at ·
  status

fund_sources
  id (uuid, pk) · name · type (enum: SELF · DONOR · GRANT ·
    CORPORATE) · total_received_kes · total_disbursed_kes ·
  current_balance_kes · reporting_obligations (text, nullable) ·
  status · created_at

budget_lines
  id (uuid, pk) · name · fund_source_id (fk→fund_sources) ·
  total_allocation_kes · disbursed_kes · remaining_kes ·
  scope (jsonb: {type: COHORT | SCHOOL | COUNTY | SPONSOR |
    SPECIFIC_STUDENTS, values: [...]}) ·
  category_restrictions (enum[], nullable) ·
  per_student_cap_kes · term_or_period · start_date · end_date ·
  status (enum: ACTIVE · EXHAUSTED · CLOSED) · created_at

student_budget_allocations
  id · student_id · budget_line_id · per_term_cap_override_kes
    (nullable) · active (boolean) · allocated_at

consent_log
  id (uuid, pk) · user_id · purpose (enum: PROCESS_SPONSORSHIP ·
    PROCESS_SPECIAL_CATEGORY · SHARE_WITH_SCHOOL · TRANSACTIONAL_COMMS ·
    MARKETING) · consent_given (boolean) · consent_hash ·
  ip_address · user_agent · recorded_at · expires_at (nullable)

audit_trail
  id (uuid, pk) · actor_id (fk→users, nullable for system) ·
  action (enum) · entity_type (enum) · entity_id (uuid) ·
  before_state (jsonb) · after_state (jsonb) · ip_address ·
  user_agent · location (text, derived) · created_at
  -- IMMUTABLE: enforced by BEFORE UPDATE/DELETE trigger raising exception

notifications
  id (uuid, pk) · user_id · category (enum: APPROVAL · PAYOUT ·
    DOCUMENT · MESSAGE · TERM_REMINDER · SYSTEM · MARKETING) ·
  title · body · deep_link (nullable) · read_at (nullable) ·
  created_at

message_threads
  id · student_id · admin_id (nullable, for school liaison threads) ·
  related_entity_type (enum: REQUEST · DOCUMENT · NONE) ·
  related_entity_id (uuid, nullable) · created_at · last_message_at

messages
  id · thread_id · sender_id (fk→users) · body ·
  attachment_doc_id (nullable, fk→documents) · read_at · created_at
```

---

## 11. FINANCIAL ASSISTANCE ENGINE

```
THE REQUEST LIFECYCLE (state machine):

  DRAFT
   │ student saves without submitting
   ▼
  SUBMITTED ──────► AWAITING_PROOF (if admin requests more proof)
   │                     │
   │                     ▼ student uploads additional proof
   │                  SUBMITTED (re-review)
   ▼ admin opens review
  UNDER_REVIEW
   │
   ├──► REJECTED (with reason) ──► [closed]
   │
   ├──► APPROVED (with optional amount adjustment)
   │        │
   │        ▼ triggers payout engine (Section 12)
   │     DISBURSED ──► [closed]
   │        │
   │        └──► FAILED (processor error) ──► retry queue ──►
   │             DISBURSED or manual REVERSE
   │
   └──► WITHDRAWN (student cancels before review) ──► [closed]

AMOUNT ADJUSTMENT RULES:
  • Admin can adjust the approved amount to any value between:
      lower_bound = 0 (full rejection equivalent — must use REJECT instead)
      upper_bound = min(
        category.default_cap_per_term_kes,
        student_annual_cap_remaining,
        budget_line_remaining_for_this_student,
        requested_amount × 1.0  (admin CANNOT exceed requested)
      )
  • Adjustments >10% delta from requested require a written reason.
  • Every adjustment is logged in audit_trail with before/after.

PROOF-UPLOAD GATING (enforced at SUBMITTED transition):
  • If category.proof_required AND request_documents WHERE
    proof_purpose IN category.required_proof_purposes is empty →
    transition is blocked with error "Proof required for this category."
  • If proof documents exist but their verification_status != VERIFIED,
    request can still transition but a flag is set so the admin sees
    "proof uploaded but unverified" and is prompted to verify first.

TERM-BASED FREQUENCY LIMITS:
  • For PER_TERM categories (FEES, UPKEEP): one approved request per
    student per term. A second request in the same term requires
    explicit override + reason.
  • For PER_EXAM_WINDOW (EXAM_REGISTRATION): one per exam window.
  • For PER_REQUEST (EQUIPMENT, MEDICAL): no frequency limit, but
    cumulative-per-year cap applies.

STUDENT ANNUAL CAP:
  • Each student has an effective annual cap = sum of caps from all
    budget_lines they're allocated to. If a student is in 2 budget
    lines (one for fees, one for upkeep), the caps are per-category.
  • Engine checks: requesting_amount + sum(approved_this_year for
    this category) ≤ student_annual_cap_for_this_category.
```

---

## 12. PAYOUTS & DISBURSEMENT ENGINE

```
THE PAYOUT LIFECYCLE:

  APPROVED (request enters payout engine)
   │
   ▼
  QUEUED (BullMQ job created, scheduled for scheduled_disbursement_at
   or now)
   │
   ▼
  SUBMITTED (processor called — Daraja B2C / Airtel / bank EFT / card
   topup / school paybill push)
   │
   ├──► SETTLED (processor returns success + ref number)
   │        │
   │        ▼
   │     receipt generated + stored, notification pushed to student
   │     reconciliation scheduled for end-of-day batch
   │
   ├──► FAILED (processor returns error: insufficient balance in
   │        sponsor wallet, wrong paybill, network timeout, etc.)
   │        │
   │        ▼ retry policy: 3 attempts with exponential backoff
   │        (1min · 5min · 15min); if still failing → human review
   │        alert raised in AD-4
   │
   └──► REVERSED (admin-initiated reversal after settlement —
            supported for M-Pesa B2C within 24h; bank reversals
            require manual offline process)

CHANNEL-SPECIFIC PROCESSOR LOGIC:

M-PESA B2C (Daraja API):
  • POST /b2c/v3/paymentrequest with OriginatorConversationID
    (= internal_ref), CommandID="BusinessPayment" (or
    "SalaryPayment" for recurring upkeep), Amount, PartyA (our
    shortcode), PartyB (student/parent phone), Remarks,
    Occasion (request ref code)
  • Sync response: ConversationID + OriginatorConversationID +
    ResponseCode (0=success queued)
  • Async callback: POST to our /webhooks/daraja/b2c/result with
    TransactionID, ResultCode, ResultParameters
  • On ResultCode 0: status=SETTLED, persist TransactionID
  • On non-zero: status=FAILED, persist ResultDesc

AIRTEL MONEY:
  • Similar B2C API; different auth (OAuth2 client-credentials);
    callback URL per env

BANK EFT/RTGS:
  • Per-bank integration (KCB, Equity via their developer APIs, or
    shared PesaPal / Cellulant rails for banks without direct APIs)
  • EFT: 1-2 business days settlement (status updated via reconciliation
    job that pulls bank statement via SFTP)
  • RTGS: same-day for ≥ KES 1M

SCHOOL PAYBILL (for fees):
  • Two modes:
    a) Push to school paybill via M-Pesa Paybill API (we're the
       originator) — funds land in school's M-Pesa wallet
    b) Generate a "payment voucher" PDF that the student/parent
       presents at an M-Pesa agent or via STK push to themselves
       then they pay the paybill (fallback when direct B2B isn't
       available for the school)
  • Mode (a) preferred for verified schools; mode (b) for unverified

POCKET CARD TOPUP:
  • Per school's card issuer API (Cellulant / Pesapal)
  • POST topup with card number (or virtual card token), amount,
    sponsor reference
  • Settled on issuer's 200 response

RECONCILIATION:
  • Nightly BullMQ job: pulls Daraja transaction query API for
    yesterday's date range, matches every internal_ref to external
    status, flags any mismatches (internal=SETTLED but external=FAILED
    or vice versa) into a reconciliation_exceptions table.
  • Same for bank EFTs (statement matching) and card topups.
  • Mismatches surface as alerts in AD-4 / AD-10.

FEES & LEDGER:
  • Every payout writes a ledger entry in fund_sources ledger:
    debit fund_source.current_balance_kes, debit fee_breakdown.
    processor_fee, debit fee_breakdown.learnly_fee (revenue),
    credit payout.amount_kes to recipient.
  • Ledger is double-entry; imbalance raises an exception.
```

---

## 13. ACADEMIC RECORDS ENGINE

```
ORIGIN TRACKING:
  • The earliest academic_tenures row (min enrolment_date) for a
    student is auto-flagged as the "origin tenure" — surfaced as the
    starred timeline node in S-4.
  • When a student transfers schools (admin or self triggers a
    "Change school" action), the current tenure's actual_end_date is
    set, reason_for_leaving="TRANSFERRED", and a new tenure is created
    with the new school. The origin flag never moves.

TERM RECORD VERIFICATION FLOW:
  • Student uploads term result slip (S-4 or S-7).
  • OCR extracts: year, term, subjects + marks, mean grade.
  • Admin verifies (AD-5) — confirms OCR or corrects.
  • On verification, a term_records row is created with the verified
    values, linked to the result slip document.
  • That term record then unlocks proof-gated categories for the
    next FEES / UPKEEP request in the next term.

EXAM RESULTS INDEXING:
  • When an exam result slip is verified, the system writes an
    exam_results row keyed by (student, exam_type, exam_year) —
    unique constraint prevents duplicates.
  • Historical KCPE / KCSE records (for students who already sat
    them) are captured during onboarding (A-3 step 6 documents
    upload).

PERFORMANCE THRESHOLD RULES (admin-configurable in AD-10):
  • Some sponsors set minimum grade thresholds for continued
    sponsorship (e.g. "KCSE mean grade ≥ C+ for fees category to
    unlock").
  • Engine checks: latest verified exam_results row for the student;
    if mean_grade below threshold → request submission blocked with
    message "Your latest KCSE grade (D+) is below the sponsor
    threshold (C+). Please contact admin."
  • Admin can override per-request with a reason (logged in audit).
```

---

## 14. APPROVALS & PERMISSIONS ENGINE

```
RBAC EVALUATION:
  • On every API request, middleware extracts the user's role +
    data_scope + permissions[].
  • For a given action (e.g. "approve a request"), the middleware:
      1. Checks the permission key "requests.approve" is in the user's
         permissions array.
      2. Resolves data_scope:
           - ALL: any student
           - BY_SCHOOL: only students whose current tenure.school_id
             is in scope.values
           - BY_COUNTY: only students whose residence county is in
             scope.values
           - BY_SPONSOR: only students allocated to budget_lines
             whose fund_source is owned by this staff's sponsor
      3. Checks the entity (request.student_id) matches the scope.
  • Failures return 403 with a structured error; logged in audit.

SUPER ADMIN POWERS (absolute control):
  • The first admin (bootstrap) is Super Admin.
  • Super Admin can:
      - Create / edit / delete any staff user
      - Assign any role to any staff
      - Revoke 2FA for any staff
      - Override any approval decision
      - Manually disburse (bypass approval flow)
      - Reverse any settled payout (within processor windows)
      - Edit any school's bank/paybill registry
      - Run DPA retention pruning
      - Export full audit trail
      - Toggle any feature flag
      - Configure payment gateway credentials
  • Every Super Admin action is logged in audit_trail with full
    before/after; Super Admin actions are themselves auditable by
    the next Super Admin up (if any) or by external auditor.

DOUBLE-CONTROL ACTIONS (sensitive operations):
  • Adding a new verified school bank account: requires OTP + a
    second-admin approval (4-eyes principle).
  • Adding a new verified school paybill: same.
  • Configuring payment gateway credentials: Super Admin OTP only.
  • Hard-deleting a student (DPA erasure): Super Admin OTP + reason +
    30-day grace period (cancellable).
  • Closing a budget line with funds remaining: Super Admin approval.
```

---

## 15. NOTIFICATIONS & COMMS

```
CHANNELS:
  • In-app (always on, free)
  • Email (via Resend; transactional always on, marketing opt-in)
  • SMS (via Africa's Talking; transactional only — OTP, payout
    receipts, approval outcomes; marketing SMS forbidden per Kenyan
    CA guidelines unless student opts in AND is on an opt-in tariff)
  • Push (Web Push API; mobile PWA notifications)

EVENT → NOTIFICATION MATRIX (sample):

  request:status_changed (approved)
    → student: in-app ✓ · email ✓ · SMS ✓ · push ✓
    → admin: in-app ✓ (audit), no email/SMS

  request:status_changed (rejected)
    → student: in-app ✓ · email ✓ · SMS ✓ · push ✓
    → admin: in-app ✓

  payout:settled
    → student: in-app ✓ · email ✓ (with receipt attached) · SMS ✓
        (M-Pesa already sends its own SMS, so Learnly SMS is suppressed
         if the channel is M-Pesa B2C to avoid double-SMS) · push ✓
    → admin: in-app ✓

  payout:failed
    → student: in-app ✓ · email ✓ · SMS ✓
    → admin: in-app ✓ · email ✓ (high-priority)

  document:verified
    → student: in-app ✓ · email ✓

  message:received
    → recipient: in-app ✓ · push ✓ (if thread not muted) · email ✓
       (digest mode: hourly batch if multiple messages)

  term_reminder (KCSE window opens in 5 days)
    → student + admin: in-app ✓ · email ✓

  consent:expiring (consent expires in 7 days)
    → student: in-app ✓ · email ✓ · SMS ✓

TEMPLATES:
  • All templates in React Email at src/emails/*
  • Multi-language: English + Kiswahili (toggle from user.language)
  • Each template is reviewed for DPA compliance (no unnecessary
    personal data in marketing emails; transactional can include
    reference numbers but never full account numbers — masked).

BULK COMMS:
  • Admin → filtered student list (AD-2 "Bulk message"): composes a
    single message, sends to all matched recipients as BCC emails +
    individual SMS (no PII in SMS body).
  • Rate-limited: max 100 messages per minute, queued via BullMQ.
  • Every bulk send is logged with recipient count + filter criteria
    + content hash for audit.
```

---

## 16. COMPLETE PAGE INDEX

```
HOME (3):
H-1   /                                  Landing
H-2   /levels                            Education levels explainer
H-3   /how-it-works                     How it works

AUTH & ONBOARDING (8):
A-1   /auth/signup                       Sign up
A-2   /auth/signin                       Sign in
A-3   /auth/onboard/student              Student self-onboarding wizard
A-4   /auth/admin/onboard                Admin onboards a student
A-5   /auth/forgot-password              Forgot password
A-6   /auth/reset-password               Reset password
A-7   /auth/verify-otp                   Verify OTP
A-8   /auth/consent                      DPA 2019 consent capture

STUDENT DASHBOARD (10):
S-1   /student                           Overview
S-2   /student/profile                   My profile
S-3   /student/financial-assistance      Financial assistance
S-4   /student/academic-records          Academic records
S-5   /student/related-users             Related users
S-6   /student/account                   Account & payout methods
S-7   /student/documents                 Documents vault
S-8   /student/messages                  Messages
S-9   /student/notifications             Notifications
S-10  /student/settings                  Settings

ADMIN DASHBOARD (10):
AD-1  /admin                             Command center
AD-2  /admin/students                    Student management
AD-3  /admin/approvals                   Approvals queue
AD-4  /admin/disbursements               Disbursements & payouts
AD-5  /admin/academic-verification       Academic verification
AD-6  /admin/schools                     Schools & institutions
AD-7  /admin/users-permissions           Users & permissions (RBAC)
AD-8  /admin/finance-budget              Finance & budget
AD-9  /admin/reports                     Reports
AD-10 /admin/audit-settings              Audit & settings

TOTAL PAGES: 3 + 8 + 10 + 10 = 31
TOTAL STYLESHEETS: 31 page-scoped + 1 app-shell = 32 (strict 1-to-1)
SHARED COMPONENT STYLESHEETS: N (under src/styles/components/)
```

---

## 17. IMPLEMENTATION PHASES

```
PHASE 0 — FOUNDATION (Weeks 1-2)
  • Repo scaffolding: TanStack Start + Vite + Bootstrap 5.3 + Prisma
  • Design tokens (Section 2) committed to src/styles/tokens.css
  • App shell (sidebar, top bar, mobile offcanvas) at src/styles/app-shell.css
  • Auth foundations: signup/signin/OTP/JWT (A-1, A-2, A-5, A-6, A-7)
  • DB schema migrations up for users, student_profiles, consent_log,
    audit_trail
  • DPA consent capture flow (A-8)

PHASE 1 — STUDENT ONBOARDING (Weeks 3-5)
  • Self-onboard wizard (A-3) — all 7 steps
  • Admin-onboard variant (A-4) — reuses OnboardForm
  • Related users, residences, academic_tenures, term_records tables
  • Profile page (S-2) — read view + inline edit modals
  • Documents vault (S-7) — uploader + DocumentCard grid
  • OCR integration (Google Document AI) for fee structures + result slips

PHASE 2 — FINANCIAL ASSISTANCE CORE (Weeks 6-9)
  • Request categories config (admin-seeded)
  • Financial assistance page (S-3) — drawer form, proof gating,
    category-method matrix
  • Approvals page (AD-3) — queue + review drawer + decision buttons
  • Financial Assistance Engine (Section 11) — state machine + caps
  • Audit trail wired into every transition

PHASE 3 — PAYOUTS (Weeks 10-13)
  • Account & payout methods (S-6) — method registry + verification
  • Schools registry (AD-6) — including bank/paybill/card verification
  • Daraja B2C integration (sandbox) + Airtel + bank EFT (one bank)
  • Disbursements page (AD-4) — table + reconciliation
  • Payouts Engine (Section 12) — BullMQ workers + reconciliation job
  • Receipt generation (PDF via React Email + Puppeteer)

PHASE 4 — ACADEMIC VERIFICATION + COMMAND CENTER (Weeks 14-16)
  • Academic records page (S-4) — timeline + chart
  • Academic verification page (AD-5) — drawer + OCR cross-checks
  • Command center (AD-1) — KPIs + alerts + activity feed
  • Student overview (S-1)
  • Notifications (S-9) + socket events live

PHASE 5 — ADMIN CONTROL SURFACE (Weeks 17-20)
  • Student management (AD-2) — table + detail drawer + CSV import
  • Users & permissions (AD-7) — RBAC matrix + staff invite
  • Finance & budget (AD-8) — fund sources + budget lines + allocations
  • Reports (AD-9) — templates + builder + scheduled reports
  • Audit & settings (AD-10) — audit table + integrations + flags

PHASE 6 — COMMS + POLISH (Weeks 21-23)
  • Messages (S-8) — threaded Socket.IO
  • Settings (S-10) — full settings including DPA data export/delete
  • Related users page (S-5)
  • Home pages (H-1, H-2, H-3)
  • Kiswahili i18n pass
  • Accessibility pass (WCAG 2.1 AA: keyboard nav, screen-reader labels,
    prefers-reduced-motion compliance, color contrast)
  • Performance pass (route-level code-splitting, image lazy-load,
    query prefetch on link hover)

PHASE 7 — PILOT + HARDENING (Weeks 24-26)
  • Onboard 20 pilot students across 5 levels (primary, junior,
    senior, TVET, university)
  • Run end-to-end: onboard → request → proof upload → verify →
    approve → disburse (M-Pesa sandbox) → reconcile
  • Bug bash + Sentry triage
  • Load test (k6) — 500 concurrent users on dashboard pages
  • DPA compliance audit (gap report from AD-10)
  • Production deploy (Cloudflare + ECS Fargate + RDS PostgreSQL +
    ElastiCache Redis + S3)

PHASE 8 — POST-PILOT EXPANSION (Ongoing)
  • Airtel Money production integration
  • Additional bank integrations (per-school demand-driven)
  • Donor portal (future feature flag — already scaffolded)
  • KUCCPS integration (for university placement verification)
  • Mobile app (React Native sharing the same API + design tokens)
```

---

## END OF OUTLINE

```
This file (learnlyMO.md) is the single source of truth for the Learnly
platform's page-level outline, design tokens, page-to-stylesheet
mapping, dashboard structures, data model, engine contracts, and
implementation phasing.

COMPANION FILES (when split later, inherit Section 2 verbatim):
  learnlyStudentMO.md   — student dashboard deep-dive (10 pages)
  learnlyAdminMO.md     — admin dashboard deep-dive (10 pages)

For now, this single file contains both dashboards in full.
```
