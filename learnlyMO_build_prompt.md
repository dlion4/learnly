You are building ONE Learnly page inside the repo dlion4/learnly  
(TanStack Start + React 19 + Bootstrap 5.3 utilities + Bootstrap Icons/Lucide).  

## CONFIG (edit per page)  
PAGE_ID      = S-1  
ROUTE        = /student         # exact path from the learnlyMO.md blueprint heading  
CREATE_SHELL = true             # true ONLY on the first page of a shell group (H-1, A-1, S-1, AD-1); false after  
DATA_FILE    = src/data/students.ts   # the domain mock file for this page; extend, never fork  
                              # pick the right file per page: students.ts · requests.ts · payouts.ts ·  
                              # payoutMethods.ts · documents.ts · academicRecords.ts · schools.ts ·  
                              # relatedUsers.ts · budgets.ts · staff.ts · audit.ts · messages.ts  

## BLUEPRINT (paste the exact page section from learnlyMO.md — §4 Home, §5 Auth/Onboarding,  
##            §6 Student Dashboard, or §7 Admin Dashboard — including PURPOSE, STYLE RULES,  
##            LAYOUT, ALL 5 SECTIONS, KPI fields, table columns, drawer/modal contents,  
##            proof-gating rules, RBAC notes, DATA SOURCES)  

## MANDATORY FIRST READS (open before writing any code)  
1. docs/LEARNLY_THEME.md — the design bible; obey every rule in it.  
2. src/styles/tokens.scss — skim the token map; reuse classes, never invent styles.  
   Tokens: --brand-primary #1f3a8a (indigo) · --brand-accent #f4a531 (gold) ·  
           --brand-success #15803d · --brand-danger #dc2626 · --brand-warning #f59e0b ·  
           --edu-preprimary/primary/junior/senior/tvet/college/university/special/international  
           (education-level ribbon palette) ·  
           --cat-fees/upkeep/pocketmoney/fare/equipment/medical/exam (request-category palette) ·  
           --surface-0/1/2/3 · --text-primary/secondary/tertiary ·  
           --space-1..8 · --radius-sm/md/lg/pill · --shadow-1/2/3/lift ·  
           --font-serif (Lora) · --font-display (Fraunces) · --font-sans (Inter) · --font-mono  
3. src/data/students.ts + the relevant DATA_FILE — reuse helpers (kes(), fmtPercent(),  
   fmtDate(), relativeTime(), maskPhone(), maskAccount(), maskCard(), eduLevelLabel(),  
   catLabel(), examLabel(), requestStatusColor(), payoutStatusColor()) and data shapes  
   (Student, Request, Payout, PayoutMethod, Document, TermRecord, ExamResult,  
   AcademicTenure, School, RelatedUser, BudgetLine, FundSource, StaffUser,  
   ConsentLogEntry, AuditEntry, Notification, MessageThread, Message).  
4. src/components/ui/primitives.tsx + the relevant shell (src/components/shell/StudentShell.tsx  
   for S-pages, src/components/shell/AdminShell.tsx for AD-pages,  
   src/components/auth/AuthShell.tsx for A-pages,  
   src/components/marketing/MarketingNav.tsx for H-pages) — reuse Dialog, Drawer  
   (Offcanvas), Stepper, Tabs, MiniTabs, Dropdown, Toggle, Pagination, EduLevelBadge,  
   CategoryBadge, StatusChip, ProfileCompletenessBar, PayoutMethodCard, DocumentCard,  
   RelatedUserCard, SchoolPicker, ConsentModal, OTPInput, SignaturePad, AmountInput,  
   PhoneInput, AuditDiffViewer, Timeline, FilterBar, EmptyState, Reveal, StatCard.  
   Never rebuild them.  
5. If CREATE_SHELL=false: render inside the shell/layout for this group and set your route  
   ready:true in its nav config (no other edits):  
     S-pages → src/components/shell/StudentShell.tsx  
     AD-pages → src/components/shell/AdminShell.tsx  
     A-pages → src/components/auth/AuthShell.tsx  
     H-pages → src/components/marketing/MarketingNav.tsx  

## WHAT TO BUILD  
0. If the repo is missing theme scaffolding, create it FIRST per learnlyMO.md §1.4/§2  
   (docs/LEARNLY_THEME.md, src/styles/tokens.scss, primitives, both shells, mock data  
   files) — then build the page.  
1. Route file for ROUTE implementing EVERY blueprint section  
   (tables → sortable/filterable/paginated tables + cards/forms;  
   onboarding wizards → multi-step Stepper wizards with draft persistence  
   (localStorage + server incomplete_profile);  
   request flows → drawer form with category-method matrix, proof-upload gating,  
   amount validation against category cap + student annual cap + budget line remaining;  
   approval queue → review drawer with amount adjustment + decision buttons;  
   academic timeline → vertical timeline with expandable tenures + term records + exam  
   results + result-slip document vault;  
   audit trail → immutable table with before/after JSON diff viewer;  
   live widgets → simulated notification/payout/approval pushes with pulse + row-flash).  
2. DATA_FILE additions with realistic Kenyan academic data: KES amounts (school fees  
   ~15k–250k per term depending on level; upkeep ~3k–15k per month; pocket money  
   ~500–3k per week; fare ~200–2k; equipment one-off ~5k–80k; medical variable;  
   exam registration ~1.5k–5k), real Kenyan schools (Nairobi School, Kenya High,  
   Alliance High, Mang'u High, Starehe Boys, Moi Forces Academy, Sunshine Secondary,  
   Precious Blood Riruta, Kenya High, Bahati Girls; primary: Mbagathi Primary,  
   Olympic Primary, Milimani Primary; junior: Junior School sections inside the above;  
   polytechnics: Eldoret National Polytechnic, Kisumu National Polytechnic, Nyeri  
   National Polytechnic, Meru National Polytechnic, Kabete National Polytechnic,  
   Sigalagala National Polytechnic, Kitale National Polytechnic; TVET: Nairobi TTI,  
   Mawira TTI; professional colleges: KMTC (multiple campuses), Kenya Utalii College,  
   Kenya School of Law, Bandari Maritime Academy, KWSTI Naivasha; universities: UoN,  
   KU, JKUAT, Moi, Egerton, Maseno, TUK, TUM, Pwani, Strathmore, USIU-Africa,  
   Daystar, Catholic University of Eastern Africa, Kabarak, KCA University, Mount  
   Kenya University), real Kenyan counties (all 47, with sub-county + ward examples  
   for Nairobi/Kiambu/Machakos/Nakuru/Mombasa/Kisumu), real KNEC exam types  
   (KCPE, KCSE, KPSEA, KJSEA, KSSEA, SBA at Grade 3/4/5/7/8, NITA trade tests,  
   CDACC assessments, ICDL, university end-of-semester), real CBC grades/years  
   (PP1, PP2, Grade 1–6, Grade 7–9 Junior, Grade 10–12 Senior with pathways  
   STEM/Arts & Sports Science/Social Sciences), legacy 8-4-4 (Std 1–8, Form 1–4),  
   TVET levels (artisan Level 1–3, craft Level 4–5, diploma Level 6, higher  
   diploma Level 7), university award levels (Certificate, Diploma, Bachelor's,  
   PGD, Master's, PhD), real Kenyan ID formats (national ID 8-digit like 12345678,  
   birth cert number like 123456, NEMIS UPI 11-digit, KCPE index 12-digit like  
   12345678001/2022, KCSE index similar), real Kenyan phone format +2547XXXXXXXX  
   / 07XXXXXXXX (Safaricom 07XX/Airtel 075X/076X/Telkom 077X), real Kenyan banks  
   (KCB, Equity, Cooperative, NCBA, ABSA, Stanbic, Standard Chartered, I&M, DTB,  
   Family Bank) with real paybill numbers where widely known (e.g. KCB 522522,  
   Equity 247247, Coop 400200, NCBA 885100), real mobile money channels (M-Pesa  
   B2C, Airtel Money, T-Kash), real school paybills (5–6 digit) and till numbers,  
   real pocket-card issuers (Mastercard, Visa, Pesapal card, Cellulant), real  
   request ref codes (LRQ-2025-00123), real M-Pesa transaction IDs (alphanumeric  
   like RKX7H8KP2), real internal audit actions (approved/rejected/disbursed/  
   verified/revoked/consented). No lorem ipsum, ever. No generic "John Doe"  
   students — use realistic Kenyan names (Amani Wanjiku Kamau, Brian Otieno  
   Ochieng, Faith Chebet Kiprop, Hamza Hassan Mohamed, Zawadi Mutua Mwende,  
   Tyler Mwangi Ndirangu, etc.).  
3. Reusable widgets → src/components/ui/ (check dir first; no duplicates).  
4. Page-scoped stylesheet ONLY if the blueprint needs bespoke visuals —  
   namespaced under the page root class (.page-student-financial-assistance { … },  
   .page-admin-approvals { … }), imported by this route only, tokens only, removed  
   on route leave.  

## DESIGN CONSTRAINTS (anti-hallucination — zero exceptions)  
- Style ONLY with master-theme classes/tokens; no hex/rgb in .tsx (use  
  var(--brand-primary), var(--edu-senior), var(--cat-fees), var(--surface-1),  
  var(--text-secondary), var(--space-4), var(--radius-md), var(--shadow-lift),  
  etc.); no new fonts, colors, or libraries.  
- Typography: .ly-h-section/.ly-lead/.ly-eyebrow/.font-display (Fraunces/Lora serif  
  for academic headings); money, amounts, KPI numbers, payout references, and chart  
  numbers in the display font via .font-display. Body in Inter. Italic Lora for  
  blockquotes / academic-voice pull quotes.  
- Cards .ly-card (warm cream surface, subtle indigo border, shadow-1 default,  
  hover-lift via shadow-lift on .hover-lift); stat/KPI cards stay UNcrowded (max  
  1 metric + 1 trend + 1 action each — detail goes in drawers/modals, never  
  squeezed into small cards);  
  tables .ly-table-wrap > .ly-table (sortable header, sticky on long tables,  
  responsive collapse to stacked cards < md via data-label attributes);  
  status via .ly-chip + .ly-status-pending/.ly-status-approved/.ly-status-rejected/  
  .ly-status-disbursed/.ly-status-failed/.ly-status-verified;  
  education level via .ly-edu-badge-preprimary/.primary/.junior/.senior/.tvet/  
  .college/.university/.special/.international;  
  request category via .ly-cat-badge-fees/.upkeep/.pocketmoney/.fare/.equipment/  
  .medical/.exam;  
  live dots .ly-pulse on pending/in-flight indicators;  
  row flashes .ly-flash-approved/.ly-flash-rejected/.ly-flash-disbursed on  
  real-time queue updates;  
  forms via .ly-field/.ly-input/.ly-select/.ly-amount-input (KES-aware, with  
  cap hints + live validation)/.ly-phone-input (Kenyan +254 aware);  
  filters via .ly-filter-chip;  
  OTP via .ly-otp-input (6-digit split, auto-advance);  
  signature pad via .ly-signature-pad;  
  lists paginated with <Pagination>.  
- Motion: .ly-reveal on scroll blocks; pulse/spin only on live elements (pending  
  approvals, in-flight payouts, unverified documents); hover lifts come free from  
  theme; confetti one-shot on first approval (disabled for users who've seen it,  
  disabled under prefers-reduced-motion); honor prefers-reduced-motion throughout  
  (snap count-ups, skip draw-ins, disable row-flash, keep static transitions).  
- Responsive: KPI rows col-12 → sm-6 → lg-3 (1/2/4 flow); card grids  
  row-cols-1 → sm-2 → lg-3/4; side panels collapse to drawers below lg; tables  
  become stacked cards < md; onboarding Stepper is .stepper-h on lg+, .stepper-v  
  on sm; review drawers slide-in-right on lg+, full-screen modal on sm; test  
  mentally at 360px (typical low-end Kenyan Android).  
- If a needed class truly doesn't exist: append it to tokens.scss (or the  
  page-scoped file) using tokens only, and document it in docs/LEARNLY_THEME.md.  
  Last resort.  

## FUNCTIONAL RULES  
- EVERY button/link works: actions open a Dialog/Drawer/wizard, navigate to a  
  REAL route, or fire a visible state change. Zero dead controls; zero 404s;  
  zero blank URLs. NEVER fake navigation with a toast ("Opening X…" without  
  actually opening X is forbidden).  
- Wizards use <Stepper> (7-step onboarding: Account · Personal · Family · Home ·  
  School · Documents · Review) with draft persistence; destructive actions  
  (delete student, hard-delete document, revoke consent, reverse payout, remove  
  payout method, deactivate school, close budget line with remaining funds,  
  reject verification, suspend staff, permanently delete account) use confirm  
  Dialogs with explicit reason fields; long lists get search + filter + pagination  
  + column toggles;  
  request flows end in an Apply confirm: review drawer → category-method matrix →  
  amount validation → proof upload (Zod-gated per category rules) → declaration  
  checkbox → submit with spinner (simulated 800ms save) → ref code assigned  
  (LRQ-2025-XXXXX) + ONE toast, like the rest of the platform;  
  approval flows end in a decision: review drawer → verify proofs (or request  
  more) → optional amount adjustment with delta preview → choose Approve &  
  disburse now / Approve & schedule / Adjust & approve / Request more proof /  
  Reject (with reason) → spinner → row-flash + ONE toast.  
- Academic realism throughout: real Kenyan school names, real KNEC exam names  
  (KCPE/KCSE/KPSEA/KJSEA/KSSEA/SBA), real CBC grades (PP1, Grade 1–6, Grade 7–9  
  Junior, Grade 10–12 Senior with pathways), real 8-4-4 (Std 1–8, Form 1–4), real  
  TVET levels, real university award levels, real KES amounts consistent with  
  Kenyan school fee structures per level, real M-Pesa/Airtel/bank references, real  
  Kenyan ID formats, real 47-county geography. EN primary with academic + Kenyan  
  admin jargon touches (term/semester, NEMIS UPI, KCPE index, sponsor, sponsor  
  cap, fees structure, result slip, paybill).  
- Links to pages not built yet must NOT render — gate them behind the shell nav  
  config (ready flags) or open real in-page content instead.  
- Toasts: use FEW (≤4 distinct triggers per page) — only after a completed  
  action (request submitted, approval decided, payout reversed, document  
  verified, method added). Never on open, never on cancel, never for blank  
  buttons.  
- No placeholders: no "coming soon", no disabled dead buttons, no empty states  
  without a working CTA. Empty states must say exactly what to do next  
  ("You have no active requests. Apply for assistance →", "No payouts yet. Your  
  first approved request will appear here.", "No documents pending  
  verification.", etc.).  

## INTERACTIVITY BUDGET (per page — deep, not flat)  
- 15+ modals/dialogs where the blueprint justifies them: student detail drawers  
  (admin side), request review drawers, payout detail drawers, document  
  verification drawers, school detail drawers, staff user drawers, budget line  
  allocation views, consent capture modals, consent revocation confirms, DPA  
  data-export confirm, account-deletion confirm (OTP + reason), amount-adjust  
  reason modals, reject-with-reason modals, OTP-input modals for sensitive ops  
  (adding verified school bank account, adding verified paybill, configuring  
  payment gateway credentials — 4-eyes principle for some), multi-step onboarding  
  wizards.  
- Well-styled drawers (offcanvas) for row-detail panels: student profile drawer  
  (with 8 tabs: Overview · Profile · Requests · Academic · Payouts · Related  
  Users · Documents · Audit), request review drawer (with adjustment + decision  
  + audit preview sub-sections), payout detail drawer (lifecycle + processor  
  responses), academic verification drawer (side-by-side doc preview + OCR  
  fields), school detail drawer (with 5 sub-sections: Basic · Banking & paybill  
  registry · Linked students · Linked staff · Activity), staff user drawer  
  (Profile · Permissions · Activity · Sessions).  
- Dropdowns open real menus with working items — no decorative dropdowns.  
  Per-row Actions dropdowns on every table (View · Edit · Suspend · Activate ·  
  Delete · Withdraw · Re-request · Verify · Reject proof · Retry payout ·  
  Reverse · Download receipt).  
- Tabs + mini-tabs for section and period switching: requests table filter tabs  
  (All / Pending / Approved / Rejected / Disbursed), category tabs (Fees /  
  Upkeep / Pocket Money / Fare / Equipment / Medical / Exam Reg), document  
  category tabs (Identity / Academic / Financial / Medical / Consent /  
  Residence / Other), audit entity tabs, payout channel tabs, education-level  
  filter tabs, term/semester selectors, period selectors (1M / 3M / 6M / 12M /  
  All) on charts.  
- Comprehensive tables for observational data: sortable, searchable, filterable,  
  paginated, sticky header where long, row actions opening drawers/modals,  
  expandable rows showing mini-summaries (student row → last 3 requests + last 3  
  payouts + verification status).  
- ≥10 realistic mock records per dataset on the page so filters, sorting and  
  pagination are actually demonstrable:  
  • 10+ students across all education levels (at least one each: Pre-Primary,  
    Primary Grade 4, Junior Grade 8, Senior Grade 11 STEM, Senior Form 4 legacy,  
    TVET Diploma, National Polytechnic, KMTC, Bachelor's UoN, Master's KU)  
  • 10+ financial assistance requests (mix of categories + statuses:  
    Draft / Submitted / Under Review / Awaiting Proof / Approved / Rejected /  
    Disbursed / Failed)  
  • 10+ payouts (mix of M-Pesa B2C, Airtel, bank EFT, school paybill, card  
    topup; mix of SETTLED / FAILED / REVERSED)  
  • 10+ documents (mix of KCSE slip, fee structure, birth cert, national ID,  
    medical letter, tenancy proof, consent form)  
  • 10+ schools (mix of public primary, private junior, public senior,  
    mission senior, national polytechnic, KMTC, public university, private  
    university)  
  • 10+ related users (mix of fathers, mothers, guardians, class teachers,  
    patrons, HODs, sponsors, emergency contacts)  
  • 10+ budget lines (mix of cohort-scoped, school-scoped, county-scoped,  
    sponsor-scoped, specific-student-scoped)  
  • 10+ audit entries (mix of approvals, rejections, disbursements,  
    verifications, consent changes, staff actions, login events)  
  • 10+ notifications (mix of approval/payout/document/message/reminder/system)  
  • 10+ term records or exam results on academic pages  

## PROOF-GATING & AMOUNT-VALIDATION RULES (financial-assistance pages specifically)  
- Per-category proof rules (enforced via Zod schema on the request form):  
    Fees            → require fee structure + previous term result slip (per term)  
    Upkeep          → require previous term result slip (per term)  
    Pocket money    → no proof required  
    Fare            → no proof required  
    Equipment       → require proforma invoice or school letter (per request)  
    Medical         → require invoice / receipt / hospital letter (per request)  
    Exam registration → require school KNEC invoice (per exam window)  
  Accepted formats: jpg, png, pdf; max 10 MB each; multi-file (up to 5).  
  OCR pre-extract for fee structures (auto-fill suggested amount) and result  
  slips (auto-fill mean grade for verification cross-check).  
- Amount validation upper bound = min(  
    category.default_cap_per_term_kes,  
    student_annual_cap_remaining_for_this_category,  
    budget_line_remaining_for_this_student,  
    requested_amount × 1.0    // admin CANNOT exceed requested; only adjust down  
  )  
  Adjustments >10% delta require a written reason (UI enforces non-empty  
  reason field when |delta| > 10%). Every adjustment logged in audit_trail  
  with before/after.  
- Term-frequency limits: PER_TERM categories (Fees, Upkeep) enforce one  
  approved request per student per term; second in same term requires explicit  
  override + reason. PER_EXAM_WINDOW (Exam Registration) one per window.  
  PER_REQUEST categories (Equipment, Medical) have no per-term limit but a  
  cumulative-per-year cap applies.  
- Payout-method channel matching: the destination dropdown in the request  
  drawer is filtered by category.allowed_channels — Fees only shows school  
  bank accounts + school paybills on file; Upkeep shows M-Pesa/Airtel lines  
  on file; Pocket money shows school pocket-card + student M-Pesa wallet;  
  Fare shows M-Pesa/Airtel; Equipment shows supplier paybill + M-Pesa + bank;  
  Medical shows M-Pesa + hospital paybill; Exam Reg shows school paybill  
  only. If no verified method exists for the chosen channel, the form blocks  
  submit with a "Add a verified <channel> payout method first" CTA linking  
  to S-6.  

## RBAC RULES (admin pages specifically)  
- Every admin API call is scoped by the logged-in staff's role + data_scope +  
  permissions[] array. Super Admin has ALL permissions + ALL scope.  
  Admin/Finance Officer/Verifier/School Liaison/Read-Only Auditor have scoped  
  permissions per the RBAC matrix in learnlyMO.md §7 AD-7 S5.  
- UI surfaces only the action buttons the current role's permissions allow  
  (e.g. a Verifier sees "Verify proof" but NOT "Approve & disburse"; a  
  Finance Officer sees "Run batch payout" but NOT "Edit RBAC matrix"; a  
  Read-Only Auditor sees View-only on every page). Hidden buttons, not  
  disabled — disabled implies "you might get access"; hidden implies  
  "this is not your job".  
- Double-control actions (4-eyes principle) require OTP + a second-admin  
  approval before committing: adding a new verified school bank account,  
  adding a new verified school paybill, configuring payment gateway  
  credentials, hard-deleting a student (DPA erasure), closing a budget  
  line with funds remaining. Render the first step (OTP modal) and queue  
  the second-admin approval as a visible pending state in the relevant  
  list (school banking registry, budget lines).  

## KENYA-SPECIFIC COMPLIANCE (always on)  
- DPA 2019: every profile write is logged in audit_trail; consent_log tracks  
  per-purpose consent (5 purposes) with hash + IP + UA + timestamp; data  
  export ("Download my data") generates a ZIP asynchronously (~10 min);  
  account deletion has a 30-day soft-delete grace period then hard delete  
  with legal-hold exceptions if there are open payouts or audit obligations.  
- Data residency: all data stays in Kenya/East-Africa region — surfaced as a  
  compliance badge on admin pages.  
- Consent re-consent cadence: 12 months default (admin-configurable in  
  AD-10). UI flags students whose consent will expire in ≤30 days.  
- SMS via Africa's Talking only for transactional + OTP, never marketing  
  unless student opted in AND on an opt-in tariff; suppress duplicate  
  M-Pesa/Learnly SMS on payout settlement (M-Pesa already sends its own).  
- Masking in UI: phone numbers masked to •••• last4 with a "Reveal" toggle  
  that itself is audit-logged; bank accounts masked to •••• last4; card  
  numbers masked to **** last4; CVV never persisted (collected at  
  disbursement time, sent direct to processor).  

## VERIFICATION PROTOCOL (must all pass before finishing)  
1. npm run generate-routes && npm run build — clean, no errors.  
2. Dev server curl ROUTE → HTTP 200 (start server on 0.0.0.0 if needed).  
3. Grep route+data files: no console.log, TODO, lorem, "John Doe", or  
   #[0-9a-f]{3,8} hex literals in .tsx.  
4. Every <Link to> target exists in src/routeTree.gen.ts.  
5. RBAC: log in as each role in turn (Super Admin / Admin / Finance Officer /  
   Verifier / School Liaison / Read-Only Auditor) and confirm only  
   permitted actions render on this page.  
6. Proof-gating: submit a Fees request without proof → must block; with  
   proof → must submit and produce LRQ-2025-XXXXX ref code + ONE toast.  
7. Amount adjustment: as admin, open a request, adjust amount > 10% delta  
  → reason field becomes required; adjust above the cap → blocked with the  
  binding-cap explanation.  
8. Mobile: load at 360px width — KPIs 1-col, tables stacked-cards, drawers  
  full-screen modal, stepper vertical.  
9. Reduced motion: set prefers-reduced-motion: reduce — count-ups snap,  
  draw-ins skip, row-flash skipped, pulse/spin disabled, confetti disabled.  
10. Commit + push ONLY to the current session branch (never switch branches).  

## DELIVERABLE  
Reply with: route built, sections implemented (checklist vs blueprint  
S1–S5 with concrete field counts), reused vs new components (named),  
mock data counts per dataset, RBAC roles tested, proof-gating test  
result, amount-adjustment test result, mobile + reduced-motion test  
result, verification results (build/curl/grep/route-tree), commit hash.  
DO NOT redesign the theme. DO NOT skip blueprint sections. DO NOT  
soften trading-realism rules into generic CRUD — Learnly is an  
academic-sponsorship platform with proof gates, RBAC, DPA compliance,  
and Kenyan payment rails; the depth must reflect that. Build to completion.
