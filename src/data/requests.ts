import { kes, type EduLevelKey, type RequestCategory } from "./students";

export type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "AWAITING_PROOF"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "FAILED";

export type ProofFrequency = "Per term" | "Per exam window" | "Per request" | "No proof required";

export interface PayoutChannelRule {
  category: RequestCategory;
  label: string;
  channels: string[];
  primaryChannelSummary: string;
  destinationHint: string;
  proofRequired: boolean;
  proofDocs: string;
  frequency: ProofFrequency;
  typicalRangeKes: string;
  defaultCapKes: number;
  ocrNote: string;
  sampleRequestId: string;
}

export const PAYOUT_MATRIX: PayoutChannelRule[] = [
  {
    category: "fees",
    label: "School fees",
    channels: ["School bank account (EFT/RTGS)", "Verified school M-Pesa Paybill"],
    primaryChannelSummary: "School bank account (KCB 522522, Equity 247247, Co-op 400200) · Verified school Paybill",
    destinationHint: "Paid directly to the institution — never to a personal mobile wallet.",
    proofRequired: true,
    proofDocs: "Latest official fee structure + previous term result slip",
    frequency: "Per term",
    typicalRangeKes: "KES 15,000 – 250,000 / term",
    defaultCapKes: 120_000,
    ocrNote: "Google Document AI extracts term totals from the fee structure to suggest the request amount.",
    sampleRequestId: "LRQ-2025-00142",
  },
  {
    category: "upkeep",
    label: "Upkeep & living",
    channels: ["M-Pesa B2C (Daraja)", "Airtel Money B2C"],
    primaryChannelSummary: "M-Pesa B2C · Airtel Money (verified student or guardian line on file)",
    destinationHint: "Sent to the student's or registered guardian's verified mobile money line.",
    proofRequired: true,
    proofDocs: "Previous term result slip (scanned PDF/JPG or verified term record)",
    frequency: "Per term",
    typicalRangeKes: "KES 3,000 – 15,000 / month",
    defaultCapKes: 18_000,
    ocrNote: "OCR reads term label and mean grade for fast verifier cross-checking.",
    sampleRequestId: "LRQ-2025-00145",
  },
  {
    category: "pocketmoney",
    label: "Pocket money",
    channels: ["School pocket-card top-up", "Student M-Pesa wallet"],
    primaryChannelSummary: "School pocket-card top-up (Pesapal / Cellulant) · Student M-Pesa wallet",
    destinationHint: "Ideal for boarding learners using campus cards or tertiary wallets.",
    proofRequired: false,
    proofDocs: "None — governed by weekly/termly sponsor cap",
    frequency: "No proof required",
    typicalRangeKes: "KES 500 – 3,000 / week",
    defaultCapKes: 3_000,
    ocrNote: "Instant submission; sponsor cap and frequency checks still apply.",
    sampleRequestId: "LRQ-2025-00149",
  },
  {
    category: "fare",
    label: "Transport fare",
    channels: ["M-Pesa B2C (Daraja)", "Airtel Money B2C"],
    primaryChannelSummary: "M-Pesa B2C · Airtel Money (opening, closing & mid-term travel)",
    destinationHint: "Disbursed to verified student or parent/guardian line for travel.",
    proofRequired: false,
    proofDocs: "None — capped per trip & route distance on residence profile",
    frequency: "No proof required",
    typicalRangeKes: "KES 200 – 2,000 / trip",
    defaultCapKes: 2_500,
    ocrNote: "Cross-checked against distance-to-school and county on the residence record.",
    sampleRequestId: "LRQ-2025-00151",
  },
  {
    category: "equipment",
    label: "Equipment, books & uniform",
    channels: ["Supplier Paybill", "M-Pesa B2C", "Bank EFT"],
    primaryChannelSummary: "Supplier Paybill · M-Pesa B2C · Supplier bank EFT",
    destinationHint: "Covers laptops, textbooks, school uniforms, TVET toolkits and assistive devices.",
    proofRequired: true,
    proofDocs: "Proforma invoice or official school requirements letter",
    frequency: "Per request",
    typicalRangeKes: "KES 5,000 – 80,000 (one-off)",
    defaultCapKes: 80_000,
    ocrNote: "OCR flags supplier line items and totals for reviewer verification.",
    sampleRequestId: "LRQ-2025-00154",
  },
  {
    category: "medical",
    label: "Medical & emergency",
    channels: ["Hospital / clinic Paybill", "M-Pesa B2C"],
    primaryChannelSummary: "Hospital / clinic Paybill · Emergency M-Pesa B2C",
    destinationHint: "Fast-tracked review for urgent care, prescriptions and SNE therapy.",
    proofRequired: true,
    proofDocs: "Hospital letter, itemized invoice, or official clinic receipt",
    frequency: "Per request",
    typicalRangeKes: "Variable (within annual medical cap)",
    defaultCapKes: 50_000,
    ocrNote: "Special-category health documents are encrypted and governed by DPA 2019 consent.",
    sampleRequestId: "LRQ-2025-00158",
  },
  {
    category: "exam",
    label: "Exam registration",
    channels: ["Verified school M-Pesa Paybill"],
    primaryChannelSummary: "School Paybill only (KNEC / CDACC / KUCCPS fees routed through school)",
    destinationHint: "Always routed to the registered institution paybill on file.",
    proofRequired: true,
    proofDocs: "Official school KNEC / KUCCPS / CDACC exam invoice",
    frequency: "Per exam window",
    typicalRangeKes: "KES 1,500 – 5,000 / exam window",
    defaultCapKes: 6_500,
    ocrNote: "Tied to KNEC exam windows (KPSEA, KJSEA, KSSEA, KCSE, TVET Jul/Nov).",
    sampleRequestId: "LRQ-2025-00161",
  },
];

/* ------------------------------------------------------------------ */
/* Onboarding flows (S2 — Self-onboard A-3 vs Admin-onboard A-4)       */
/* ------------------------------------------------------------------ */
export interface OnboardingPath {
  id: "student" | "admin";
  routeCode: string;
  badge: string;
  title: string;
  subtitle: string;
  who: string;
  otpRule: string;
  activationRule: string;
  budgetRule: string;
  ctaLabel: string;
  steps: { num: string; label: string; detail: string }[];
  highlights: string[];
}

export const ONBOARDING_FLOWS: OnboardingPath[] = [
  {
    id: "student",
    routeCode: "A-3 · /auth/onboard/student",
    badge: "Self-onboard",
    title: "Student or parent / guardian",
    subtitle: "Guided 7-step wizard with automatic draft saving so families on low-bandwidth Android devices never lose progress.",
    who: "Learners ≥18, or parents/guardians applying on behalf of minors.",
    otpRule: "Phone verified via 6-digit SMS OTP (Africa's Talking).",
    activationRule: "Submitted to admin verification queue before first disbursement.",
    budgetRule: "Admin assigns the sponsor & budget line during activation.",
    ctaLabel: "Start student self-onboarding →",
    steps: [
      { num: "01", label: "Account", detail: "Confirm phone (+254), password, and 5-purpose DPA 2019 consent." },
      { num: "02", label: "Personal", detail: "Names, DOB, sex, nationality, languages, disability card (if SNE), photo." },
      { num: "03", label: "Family", detail: "Up to 4 parent/guardian contacts, primary contact, next of kin & household size." },
      { num: "04", label: "Home", detail: "47-county → sub-county → ward, distance to school, optional GPS & address proof." },
      { num: "05", label: "School", detail: "Level (PP1 to PhD), school picker, admission no., class teacher/patron & fee structure." },
      { num: "06", label: "Documents", detail: "Birth cert or National ID, NEMIS UPI, KCPE/KCSE/KPSEA slips & consent form." },
      { num: "07", label: "Review", detail: "Completeness check & submit; drafts persist in localStorage + server table." },
    ],
    highlights: [
      "Drafts auto-save after every step (localStorage + incomplete_profile)",
      "Per-purpose DPA 2019 consent logged with hash, IP and timestamp",
      "Same canonical StudentProfile record as admin-onboarded learners",
    ],
  },
  {
    id: "admin",
    routeCode: "A-4 · /auth/admin-onboard",
    badge: "Admin-onboard",
    title: "Sponsor, bursar or programme staff",
    subtitle: "Fast-track cohort intake using the exact same profile schema — with instant activation and budget-line allocation built in.",
    who: "Super Admin, Admin, or scoped School Liaison staff.",
    otpRule: "Staff session already authenticated (2FA); no student OTP gate.",
    activationRule: "Choose “Create & activate” immediately, or “Create as pending review”.",
    budgetRule: "Pre-links sponsor, active budget line & per-term KES cap at creation.",
    ctaLabel: "Request admin console access →",
    steps: [
      { num: "01", label: "Quick lookup", detail: "Check National ID or birth cert first — avoids duplicate learner profiles." },
      { num: "02", label: "Shared intake", detail: "Same 5-section profile body (Personal · Family · Home · School · Documents)." },
      { num: "03", label: "School registry", detail: "Attach verified institution bank account (KCB/Equity/Co-op) or paybill." },
      { num: "04", label: "Budget cap", detail: "Allocate active fund source, budget line, category rules & per-term KES cap." },
      { num: "05", label: "Activate / chain", detail: "Activate immediately or choose “Create and onboard another” for cohort batches." },
    ],
    highlights: [
      "Pre-checks existing ID / birth certificate before creating a record",
      "Pre-assigns sponsor budget line & termly KES caps in one screen",
      "Supports chain entry and CSV bulk intake for full school cohorts",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 5-step request lifecycle (S3 — Request Lifecycle Diagram)           */
/* ------------------------------------------------------------------ */
export type LifecycleStepKey = "request" | "proof" | "approval" | "disbursement" | "records";

export interface LifecycleStep {
  key: LifecycleStepKey;
  index: string;
  short: string;
  title: string;
  states: string;
  actor: string;
  summary: string;
  engineRules: string[];
  metricLabel: string;
  metricValue: string;
  sampleRequestId: string;
}

export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    key: "request",
    index: "01",
    short: "Request",
    title: "Student submits a scoped request",
    states: "DRAFT → SUBMITTED",
    actor: "Student or guardian",
    summary:
      "The learner picks a category (fees, upkeep, pocket money, fare, equipment, medical or exam registration), enters an amount in KES, and selects from payout destinations permitted for that category.",
    engineRules: [
      "Live cap validation checks category default cap, remaining student annual cap, and budget line balance.",
      "Category-channel locking hides incompatible payout destinations automatically.",
      "Every submission receives a unique reference code (e.g. LRQ-2025-00142) and a declaration timestamp.",
    ],
    metricLabel: "Categories supported",
    metricValue: "7 rails-locked",
    sampleRequestId: "LRQ-2025-00149",
  },
  {
    key: "proof",
    index: "02",
    short: "Proof & OCR",
    title: "Proof gating & automated OCR check",
    states: "SUBMITTED ⇄ AWAITING_PROOF",
    actor: "Student + Document AI",
    summary:
      "For proof-gated categories, submission is blocked until required documents are attached (JPG, PNG or PDF, up to 10 MB, max 5 files). OCR extracts key fields so verifiers check faster.",
    engineRules: [
      "Fees require latest fee structure + previous term result slip; Upkeep requires previous term result slip.",
      "Pocket money and Fare require no proof upload, keeping day-to-day support friction-free.",
      "If proof is missing or blurry, admins transition to AWAITING_PROOF without rejecting the learner.",
    ],
    metricLabel: "Upload ceiling",
    metricValue: "5 files · 10 MB",
    sampleRequestId: "LRQ-2025-00154",
  },
  {
    key: "approval",
    index: "03",
    short: "Approval",
    title: "RBAC-scoped review & cap-safe adjustment",
    states: "UNDER_REVIEW → APPROVED / REJECTED",
    actor: "Verifier & Approver",
    summary:
      "Only staff whose role and data scope cover that school, county or sponsor can review the request. Reviewers verify proofs, optionally adjust the approved amount downward, and record a decision.",
    engineRules: [
      "Admins can never approve above the requested amount or binding budget cap — only adjust down.",
      "Any downward adjustment greater than 10% requires a mandatory written reason.",
      "Rejections require a coded reason (Insufficient proof, Above cap, Duplicate, or Grade threshold).",
    ],
    metricLabel: "Adjustment safeguard",
    metricValue: ">10% needs reason",
    sampleRequestId: "LRQ-2025-00142",
  },
  {
    key: "disbursement",
    index: "04",
    short: "Disbursement",
    title: "Multi-channel payout execution",
    states: "QUEUED → SUBMITTED → SETTLED",
    actor: "BullMQ Payout Engine",
    summary:
      "Approval queues a disbursement job immediately or for a scheduled opening date. Learnly routes directly through Daraja M-Pesa B2C, Airtel Money, bank EFT/RTGS, school paybill, or pocket-card top-up.",
    engineRules: [
      "Automatic 3-attempt retry with exponential backoff (1 min · 5 min · 15 min) on processor timeouts.",
      "Failed payouts raise a high-priority alert for Finance Officers in AD-4.",
      "M-Pesa B2C supports reversals within 24 hours; double-entry ledger updates fund balances atomically.",
    ],
    metricLabel: "Retry policy",
    metricValue: "1m · 5m · 15m",
    sampleRequestId: "LRQ-2025-00145",
  },
  {
    key: "records",
    index: "05",
    short: "Records",
    title: "Receipts, reconciliation & audit trail",
    states: "SETTLED → RECONCILED & ARCHIVED",
    actor: "Ledger + Audit Engine",
    summary:
      "Once settled, Learnly issues a PDF receipt with the processor reference (e.g. RKX7H8KP2), suppresses duplicate SMS when M-Pesa already notified the learner, and reconciles statements nightly.",
    engineRules: [
      "Nightly reconciliation compares every internal ref against Daraja and bank SFTP statements.",
      "Every state transition writes immutable before/after JSON to audit_trail (enforced by DB trigger).",
      "Verified term slips stay anchored to the learner's permanent origin-to-graduation academic timeline.",
    ],
    metricLabel: "Reconciliation",
    metricValue: "Nightly + immutable",
    sampleRequestId: "LRQ-2025-00161",
  },
];

/* ------------------------------------------------------------------ */
/* Sample requests (≥10 realistic Kenyan records for interactive trace)*/
/* ------------------------------------------------------------------ */
export interface RequestTimelineItem {
  state: string;
  at: string;
  actor: string;
  note: string;
}

export interface SampleRequest {
  id: string;
  studentName: string;
  level: EduLevelKey;
  school: string;
  county: string;
  category: RequestCategory;
  term: string;
  requestedKes: number;
  approvedKes: number;
  adjustmentReason?: string;
  status: RequestStatus;
  channel: string;
  destination: string;
  processorRef?: string;
  proofs: string[];
  timeline: RequestTimelineItem[];
}

export const SAMPLE_REQUESTS: SampleRequest[] = [
  {
    id: "LRQ-2025-00142",
    studentName: "Faith Chebet Kiprop",
    level: "senior",
    school: "Kenya High School",
    county: "Nairobi",
    category: "fees",
    term: "Term 2, 2025",
    requestedKes: 53_400,
    approvedKes: 53_400,
    status: "DISBURSED",
    channel: "School Paybill (M-Pesa B2B)",
    destination: "Equity 247247 · Acc ••••4812 (Kenya High Fees)",
    processorRef: "RKX7H8KP2",
    proofs: ["KenyaHigh_Term2_FeeStructure_2025.pdf", "Grade11_Term1_ResultSlip_MeanA-.pdf"],
    timeline: [
      { state: "Submitted", at: "28 Apr 2025 · 09:14 EAT", actor: "Faith Chebet Kiprop", note: "OCR extracted KES 53,400 from Term 2 fee structure." },
      { state: "Proof verified", at: "28 Apr 2025 · 11:42 EAT", actor: "Grace Nyambura (Verifier)", note: "Result slip verified (Mean A-, above sponsor C+ threshold)." },
      { state: "Approved", at: "28 Apr 2025 · 14:05 EAT", actor: "David Kimani (Finance Officer)", note: "Approved in full within Nairobi Girls cohort budget line." },
      { state: "Disbursed & settled", at: "28 Apr 2025 · 14:06 EAT", actor: "Daraja Payout Engine", note: "Settled to Kenya High Equity 247247 · Ref RKX7H8KP2. PDF receipt attached." },
    ],
  },
  {
    id: "LRQ-2025-00145",
    studentName: "Brian Otieno Ochieng",
    level: "junior",
    school: "Mbagathi Junior School",
    county: "Nairobi",
    category: "upkeep",
    term: "Term 2, 2025",
    requestedKes: 9_000,
    approvedKes: 7_500,
    adjustmentReason: "Adjusted down by 16.7% to align with Junior School termly upkeep cap (KES 7,500).",
    status: "DISBURSED",
    channel: "M-Pesa B2C (Daraja)",
    destination: "Guardian line +254 7•• ••• 418",
    processorRef: "RL4N9W2TX",
    proofs: ["Grade8_Term1_SBA_Report.pdf"],
    timeline: [
      { state: "Submitted", at: "29 Apr 2025 · 08:20 EAT", actor: "Margaret Achieng (Mother)", note: "Uploaded Grade 8 Term 1 SBA report." },
      { state: "Adjusted & approved", at: "29 Apr 2025 · 13:18 EAT", actor: "David Kimani (Finance Officer)", note: "KES 9,000 → KES 7,500 (-16.7%). Reason logged to audit_trail." },
      { state: "Disbursed & settled", at: "29 Apr 2025 · 13:19 EAT", actor: "Daraja M-Pesa B2C", note: "Ref RL4N9W2TX. Learnly SMS suppressed (M-Pesa SMS already delivered)." },
    ],
  },
  {
    id: "LRQ-2025-00149",
    studentName: "Zawadi Mutua Mwende",
    level: "university",
    school: "University of Nairobi",
    county: "Nairobi",
    category: "pocketmoney",
    term: "Semester 2, 2025",
    requestedKes: 2_500,
    approvedKes: 2_500,
    status: "DISBURSED",
    channel: "Pocket-card top-up (Pesapal)",
    destination: "Campus Card **** 6094",
    processorRef: "PSP-884129",
    proofs: [],
    timeline: [
      { state: "Submitted", at: "02 May 2025 · 10:05 EAT", actor: "Zawadi Mutua Mwende", note: "No proof required; within KES 3,000 weekly pocket-money cap." },
      { state: "Approved", at: "02 May 2025 · 10:40 EAT", actor: "Samuel Korir (Admin)", note: "Fast-track approval." },
      { state: "Disbursed & settled", at: "02 May 2025 · 10:41 EAT", actor: "Pesapal Card API", note: "Card **** 6094 topped up · Ref PSP-884129." },
    ],
  },
  {
    id: "LRQ-2025-00151",
    studentName: "Tyler Mwangi Ndirangu",
    level: "senior",
    school: "Alliance High School",
    county: "Kiambu",
    category: "fare",
    term: "Term 2, 2025",
    requestedKes: 1_400,
    approvedKes: 1_400,
    status: "DISBURSED",
    channel: "Airtel Money B2C",
    destination: "Guardian line +254 75• ••• 209",
    processorRef: "AIR-77193K",
    proofs: [],
    timeline: [
      { state: "Submitted", at: "03 May 2025 · 07:35 EAT", actor: "Peter Ndirangu (Father)", note: "Closing-day matatu fare Kikuyu → Nyeri (154 km on residence profile)." },
      { state: "Approved & settled", at: "03 May 2025 · 08:12 EAT", actor: "Airtel Money B2C", note: "Ref AIR-77193K settled cleanly." },
    ],
  },
  {
    id: "LRQ-2025-00154",
    studentName: "Hamza Hassan Mohamed",
    level: "tvet",
    school: "Eldoret National Polytechnic",
    county: "Uasin Gishu",
    category: "equipment",
    term: "Term 2, 2025",
    requestedKes: 38_500,
    approvedKes: 38_500,
    status: "UNDER_REVIEW",
    channel: "Supplier Paybill",
    destination: "Rift Tech Tools Paybill 400200 · Acc ••••1190",
    proofs: ["EldoretPoly_ElectricalToolkit_Proforma.pdf", "HOD_Workshop_EquipmentLetter.jpg"],
    timeline: [
      { state: "Submitted", at: "04 May 2025 · 15:10 EAT", actor: "Hamza Hassan Mohamed", note: "Diploma Level 6 electrical engineering toolkit + multimeter." },
      { state: "Awaiting proof", at: "04 May 2025 · 16:02 EAT", actor: "Grace Nyambura (Verifier)", note: "Requested stamped HOD letter alongside supplier proforma." },
      { state: "Re-submitted", at: "05 May 2025 · 09:11 EAT", actor: "Hamza Hassan Mohamed", note: "Uploaded HOD letter; queued for Finance Officer review." },
    ],
  },
  {
    id: "LRQ-2025-00158",
    studentName: "Amani Wanjiku Kamau",
    level: "preprimary",
    school: "Olympic Primary (PP wing)",
    county: "Nairobi",
    category: "medical",
    term: "Term 2, 2025",
    requestedKes: 6_800,
    approvedKes: 6_800,
    status: "APPROVED",
    channel: "Hospital Paybill",
    destination: "Gertrude's Children's Hospital Paybill 522522 · Acc ••••3021",
    proofs: ["Gertrudes_Paediatric_Invoice_May2025.pdf"],
    timeline: [
      { state: "Submitted", at: "05 May 2025 · 11:15 EAT", actor: "Esther Kamau (Mother)", note: "Paediatric clinic invoice uploaded under DPA special-category consent." },
      { state: "Approved (queued)", at: "05 May 2025 · 11:48 EAT", actor: "David Kimani (Finance Officer)", note: "Priority medical approval queued for same-day paybill settlement." },
    ],
  },
  {
    id: "LRQ-2025-00161",
    studentName: "Mercy Akinyi Omondi",
    level: "senior",
    school: "Precious Blood Riruta",
    county: "Nairobi",
    category: "exam",
    term: "KSSEA / KCSE Window 2025",
    requestedKes: 4_800,
    approvedKes: 4_800,
    status: "DISBURSED",
    channel: "School Paybill (KNEC Exam)",
    destination: "Precious Blood Paybill 522522 · Acc ••••9940",
    processorRef: "RM2K7V5LP",
    proofs: ["KNEC_2025_RegistrationInvoice_PBRiruta.pdf"],
    timeline: [
      { state: "Submitted", at: "06 May 2025 · 10:00 EAT", actor: "Mercy Akinyi Omondi", note: "KNEC exam window open; invoice verified." },
      { state: "Approved & settled", at: "06 May 2025 · 12:30 EAT", actor: "Daraja Paybill Push", note: "Ref RM2K7V5LP settled directly to school KNEC account." },
    ],
  },
  {
    id: "LRQ-2025-00164",
    studentName: "Kevin Kipchoge Bett",
    level: "college",
    school: "KMTC Nairobi",
    county: "Nairobi",
    category: "fees",
    term: "Semester 1, 2025",
    requestedKes: 44_200,
    approvedKes: 44_200,
    status: "DISBURSED",
    channel: "Bank EFT (KCB)",
    destination: "KMTC KCB Account ••••7714",
    processorRef: "EFT-KCB-20250507-884",
    proofs: ["KMTC_DiplomaClinicalMed_FeeStructure.pdf", "KMTC_Year1_Transcript.pdf"],
    timeline: [
      { state: "Submitted", at: "07 May 2025 · 09:00 EAT", actor: "Kevin Kipchoge Bett", note: "Clinical Medicine Year 2 semester fees." },
      { state: "Settled via Bank EFT", at: "08 May 2025 · 16:40 EAT", actor: "KCB Direct Rail", note: "Reconciled via nightly SFTP statement match." },
    ],
  },
  {
    id: "LRQ-2025-00167",
    studentName: "Salma Amina Yusuf",
    level: "primary",
    school: "Milimani Primary",
    county: "Kisumu",
    category: "equipment",
    term: "Term 2, 2025",
    requestedKes: 5_600,
    approvedKes: 5_600,
    status: "DISBURSED",
    channel: "M-Pesa B2C (Daraja)",
    destination: "Guardian line +254 7•• ••• 882",
    processorRef: "RM9Q3Z1KD",
    proofs: ["MilimaniPrimary_Uniform_Booklist.jpg"],
    timeline: [
      { state: "Submitted", at: "08 May 2025 · 10:25 EAT", actor: "Hassan Yusuf (Father)", note: "Grade 5 uniform replacement + CBC workbook set." },
      { state: "Approved & settled", at: "08 May 2025 · 15:10 EAT", actor: "Daraja M-Pesa B2C", note: "Ref RM9Q3Z1KD." },
    ],
  },
  {
    id: "LRQ-2025-00170",
    studentName: "Daniel Mutiso Musyoka",
    level: "university",
    school: "JKUAT",
    county: "Kiambu",
    category: "fees",
    term: "Semester 2, 2025",
    requestedKes: 68_500,
    approvedKes: 68_500,
    status: "SUBMITTED",
    channel: "School Paybill (Co-op 400200)",
    destination: "JKUAT Co-op 400200 · Acc ••••2104",
    proofs: ["JKUAT_BScCivilEng_Sem2_Invoice.pdf", "JKUAT_Sem1_ExamResults.pdf"],
    timeline: [
      { state: "Submitted", at: "09 May 2025 · 11:04 EAT", actor: "Daniel Mutiso Musyoka", note: "Queued for academic verification and Finance review." },
    ],
  },
];

export const getSampleRequest = (id: string) =>
  SAMPLE_REQUESTS.find((r) => r.id === id) ?? SAMPLE_REQUESTS[0];

/* ------------------------------------------------------------------ */
/* FAQ Accordion (S5 — exact 8 topics from H-3 blueprint)              */
/* ------------------------------------------------------------------ */
export interface FaqItem {
  id: string;
  topic: string;
  question: string;
  answer: string;
  detail: string;
  interactiveAction?: "toggle-theme" | "open-dpa" | "go-levels";
}

export const HOW_IT_WORKS_FAQS: FaqItem[] = [
  {
    id: "fees",
    topic: "Fees",
    question: "How are school fees paid — can they ever be sent to a personal M-Pesa line?",
    answer:
      "No. School fees are strictly locked to verified institution destinations: the school's registered bank account (such as KCB 522522, Equity 247247, Co-operative 400200 or NCBA 885100) or its verified M-Pesa Paybill. Every Fees request also enforces a per-term frequency check and requires both the current fee structure and the previous term's result slip.",
    detail:
      "Adding a new verified school bank account or paybill uses 4-eyes double control (OTP + second-admin approval) to prevent diversion.",
  },
  {
    id: "proof",
    topic: "Proof",
    question: "Which requests require proof documents, and how does OCR verification work?",
    answer:
      "Five categories are proof-gated before submission: Fees (fee structure + previous term result slip), Upkeep (previous term result slip), Equipment (proforma invoice or school letter), Medical (hospital letter, invoice or receipt), and Exam Registration (school KNEC/CDACC invoice). Pocket money and Fare require no proof upload.",
    detail:
      "Upload up to 5 files (JPG, PNG or PDF, max 10 MB each). Google Document AI extracts totals and mean grades to pre-fill suggestions, while human verifiers still confirm authenticity.",
  },
  {
    id: "mpesa",
    topic: "M-Pesa",
    question: "How do M-Pesa B2C, Airtel Money and school Paybill payouts work?",
    answer:
      "Approved requests enter our BullMQ payout queue and execute via Safaricom Daraja B2C, Airtel Money B2C, bank EFT/RTGS, verified school paybill push, or campus pocket-card top-ups. When a payout settles via M-Pesa, Learnly records the transaction code (e.g. RKX7H8KP2), generates a PDF receipt, and suppresses its own duplicate SMS since M-Pesa already sends one.",
    detail:
      "Transient processor timeouts retry automatically at 1 min, 5 min and 15 min. M-Pesa B2C supports admin-initiated reversals within 24 hours, and every payout is reconciled nightly.",
  },
  {
    id: "nemis",
    topic: "NEMIS",
    question: "Why does Learnly ask for a NEMIS UPI, birth certificate or National ID?",
    answer:
      "Kenyan learners move across schools and exam windows from PP1 to PhD. Linking the learner's Birth Certificate and 11-digit NEMIS UPI (for pre-primary, primary, junior and senior school) alongside KNEC assessment indices (KPSEA, KJSEA, KSSEA, KCPE, KCSE) guarantees one continuous origin-to-graduation record without duplicates.",
    detail:
      "For students aged 18 and above in TVET, colleges or universities, Learnly records the 8-digit National ID (with IPRS match verification logging only a hash + match result, never raw IPRS payloads) and KRA PIN where applicable.",
    interactiveAction: "go-levels",
  },
  {
    id: "dark-mode",
    topic: "Dark mode",
    question: "Does Learnly support dark mode for students and admins?",
    answer:
      "Yes. Learnly ships with a native light/dark theme switcher powered by semantic surface tokens (warm cream parchment in light mode, deep indigo-slate in dark mode) via data-bs-theme. Your choice persists automatically in localStorage across every marketing, student and admin page.",
    detail:
      "Status badges, education-level ribbons and charts stay readable in both themes, and animations respect your device's prefers-reduced-motion setting.",
    interactiveAction: "toggle-theme",
  },
  {
    id: "data-export",
    topic: "Data export",
    question: "Can a student or parent export all their data under the Data Protection Act 2019?",
    answer:
      "Yes. Under Settings → Consent & Data (S-10), clicking “Download my data” queues an asynchronous ZIP archive containing the student's profile, academic tenures, term results, uploaded documents, request history, payout receipts and consent log. The export is ready in about 10 minutes with a secure download link.",
    detail:
      "All personal data stays hosted in the Kenya / East-Africa region, and sensitive identifiers like phone numbers and bank accounts remain masked in the UI unless explicitly revealed (an action that is itself audit-logged).",
    interactiveAction: "open-dpa",
  },
  {
    id: "deletions",
    topic: "Deletions",
    question: "What happens if someone deletes their account or withdraws consent?",
    answer:
      "Account deletion starts a 30-day soft-delete grace period so accidental requests can be cancelled. After 30 days, personal profile data and uploaded documents are permanently hard-deleted — except where an open payout or statutory financial audit obligation requires a temporary legal hold. You can also deactivate reversibly for up to 90 days.",
    detail:
      "Permanent deletion requires OTP verification plus a written reason. Per Kenyan DPA retention rules, anonymised aggregate statistics and immutable financial audit records are retained without personally identifying documents.",
    interactiveAction: "open-dpa",
  },
  {
    id: "language",
    topic: "Language",
    question: "Is Learnly available in Kiswahili as well as English?",
    answer:
      "Yes. English is the primary interface language with Kenyan academic terminology (term/semester, NEMIS UPI, KCPE/KCSE index, fee structure, paybill), and full Kiswahili (Kiswahili / English) language switching is built into Settings (S-10) for both the web app and transactional email/SMS notifications.",
    detail:
      "Transactional SMS via Africa's Talking is used strictly for OTPs, approval outcomes and payout receipts — never unsolicited marketing.",
  },
];

export const formatKesRange = (min: number, max: number) => `${kes(min)} – ${kes(max)}`;

/* ================================================================== */
/* STUDENT WORKSPACE — financial-assistance requests (S-pages)         */
/* ================================================================== */
import { ACADEMIC_YEAR, TERM_NOW, TERM_PREV, daysAgo } from "./students";

export type StudentRequestStatus = RequestStatus | "WITHDRAWN";
export type ProofStatus = "VERIFIED" | "PENDING" | "REJECTED";

export interface RequestProof {
  name: string;
  purpose: string;
  status: ProofStatus;
}

export interface StudentRequest {
  id: string;
  category: RequestCategory;
  amountKes: number;
  approvedKes?: number;
  status: StudentRequestStatus;
  term: string;
  submittedAt: string;
  updatedAt: string;
  methodId: string;
  justification: string;
  proofs: RequestProof[];
  adminNote?: string;
  reason?: string;
  payoutId?: string;
  timeline: RequestTimelineItem[];
}

/** Annual sponsor caps allocated to this learner's budget line. */
export const ANNUAL_CAPS: Record<RequestCategory, number> = {
  fees: 180_000,
  upkeep: 36_000,
  pocketmoney: 18_000,
  fare: 9_000,
  equipment: 40_000,
  medical: 30_000,
  exam: 6_500,
};

export const categoryRule = (c: RequestCategory): PayoutChannelRule =>
  PAYOUT_MATRIX.find((r) => r.category === c) ?? PAYOUT_MATRIX[0];

export const requestRef = (n: number): string =>
  `LRQ-${ACADEMIC_YEAR}-${String(n).padStart(5, "0")}`;
export const payoutRef = (n: number): string => `PO-${ACADEMIC_YEAR}-${String(n).padStart(4, "0")}`;

export const ACTIVE_STATUSES: StudentRequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF", "APPROVED"];
export const isActiveRequest = (r: StudentRequest): boolean => ACTIVE_STATUSES.includes(r.status);
export const countsTowardCap = (r: StudentRequest): boolean => r.status === "APPROVED" || r.status === "DISBURSED";

const VERIFIER = "Esther Wambui Kariuki (Verifier)";
const FINANCE = "David Kimani Njoroge (Finance Officer)";
const LEARNER = "Amani Wanjiku Kamau";

interface Seed {
  n: number;
  cat: RequestCategory;
  amt: number;
  status: StudentRequestStatus;
  d: number;
  term: string;
  method: string;
  why: string;
  proofs?: [string, string, ProofStatus][];
  approved?: number;
  note?: string;
  reason?: string;
  payout?: number;
}

function build(s: Seed): StudentRequest {
  const tl: RequestTimelineItem[] = [];
  const add = (state: string, d: number, actor: string, note: string) =>
    tl.push({ state, at: daysAgo(Math.max(d, 1), 8 + tl.length * 2), actor, note });

  if (s.status === "DRAFT") {
    add("Drafted", s.d, LEARNER, "Saved without submitting — resume any time.");
  } else {
    add("Submitted", s.d, LEARNER, s.proofs?.length ? `${s.proofs.length} proof document(s) attached.` : "No proof required for this category.");
    if (s.status === "WITHDRAWN") add("Withdrawn", s.d - 1, LEARNER, s.reason ?? "Withdrawn by student.");
    else if (s.status === "AWAITING_PROOF") add("Awaiting proof", s.d - 1, VERIFIER, s.note ?? "More proof requested.");
    else if (s.status !== "SUBMITTED") {
      add("Under review", s.d - 1, VERIFIER, "Proof documents cross-checked against OCR extraction.");
      if (s.status === "REJECTED") add("Rejected", s.d - 2, FINANCE, s.reason ?? "Rejected.");
      if (s.status === "APPROVED" || s.status === "DISBURSED" || s.status === "FAILED") {
        const adjusted = s.approved !== undefined && s.approved !== s.amt;
        add("Approved", s.d - 2, FINANCE, adjusted ? `Adjusted to KES ${s.approved?.toLocaleString("en-KE")} — ${s.note}` : "Approved in full within the sponsor cap.");
      }
      if (s.status === "DISBURSED") add("Disbursed", s.d - 2, "Payout engine", `Settled · ${payoutRef(s.payout ?? 0)}`);
      if (s.status === "FAILED") add("Payout failed", s.d - 2, "Payout engine", s.reason ?? "Processor error.");
    }
  }

  return {
    id: requestRef(s.n),
    category: s.cat,
    amountKes: s.amt,
    approvedKes: s.status === "DISBURSED" || s.status === "APPROVED" || s.status === "FAILED" ? s.approved ?? s.amt : undefined,
    status: s.status,
    term: s.term,
    submittedAt: tl[0].at,
    updatedAt: tl[tl.length - 1].at,
    methodId: s.method,
    justification: s.why,
    proofs: (s.proofs ?? []).map(([name, purpose, status]) => ({ name, purpose, status })),
    adminNote: s.note,
    reason: s.reason,
    payoutId: s.payout ? payoutRef(s.payout) : undefined,
    timeline: tl,
  };
}

const SEEDS: Seed[] = [
  { n: 186, cat: "pocketmoney", amt: 2_000, status: "DRAFT", d: 1, term: TERM_NOW, method: "pm-card", why: "Weekly pocket money top-up for toiletries and tuck-shop snacks while boarding at Kenya High this half-term." },
  { n: 183, cat: "equipment", amt: 32_000, status: "AWAITING_PROOF", d: 3, term: TERM_NOW, method: "pm-supplier", why: "Refurbished laptop required for the Grade 10 STEM pathway computer science practicals and KICD digital coursework.", proofs: [["Laptop_Proforma_Savanis.pdf", "Proforma invoice", "REJECTED"]], note: "Proforma invoice is unsigned — upload a stamped copy or a signed HOD letter." },
  { n: 178, cat: "fees", amt: 53_400, status: "UNDER_REVIEW", d: 5, term: TERM_NOW, method: "pm-paybill", why: "Boarding and tuition fees for the current term as per the official Kenya High School fee structure issued by the bursar.", proofs: [["KenyaHigh_FeeStructure_Current.pdf", "Fee structure", "PENDING"], ["Grade10_PrevTerm_Report.pdf", "Previous term result slip", "VERIFIED"]] },
  { n: 171, cat: "medical", amt: 3_200, status: "FAILED", d: 12, term: TERM_NOW, method: "pm-mpesa-mum", why: "Optician review and replacement spectacle lenses prescribed at Karatina Sub-County Hospital eye clinic.", proofs: [["Karatina_Hospital_Invoice.pdf", "Hospital invoice", "VERIFIED"]], reason: "M-Pesa B2C timeout (ResultCode 1037) — automatic retry exhausted, queued for Finance review.", payout: 731 },
  { n: 166, cat: "pocketmoney", amt: 2_500, status: "DISBURSED", d: 24, term: TERM_NOW, method: "pm-card", why: "Pocket money top-up for the second half of term covering toiletries, stationery and tuck shop.", payout: 698 },
  { n: 163, cat: "upkeep", amt: 12_000, status: "WITHDRAWN", d: 33, term: TERM_PREV, method: "pm-mpesa-mum", why: "Termly upkeep for personal effects, shopping and boarding requirements for the term.", proofs: [["Grade10_PrevTerm_Report.pdf", "Previous term result slip", "VERIFIED"]], reason: `Duplicate of ${requestRef(121)} — submitted twice by mistake.` },
  { n: 160, cat: "fare", amt: 1_200, status: "DISBURSED", d: 40, term: TERM_NOW, method: "pm-airtel-dad", why: "Matatu fare Karatina to Nairobi for term opening day, including the connection from Tea Room to school.", payout: 655 },
  { n: 157, cat: "equipment", amt: 25_000, status: "REJECTED", d: 50, term: TERM_PREV, method: "pm-supplier", why: "Smartphone for accessing digital learning content and communicating with teachers over the holiday.", proofs: [["Phone_Quote.jpg", "Proforma invoice", "REJECTED"]], reason: "Above cap — a smartphone is not on the Grade 10 STEM requirements list issued by the school." },
  { n: 152, cat: "pocketmoney", amt: 2_500, status: "DISBURSED", d: 58, term: TERM_PREV, method: "pm-card", why: "Pocket money top-up for mid-term: toiletries, revision booklets and tuck shop allowance.", payout: 602 },
  { n: 147, cat: "equipment", amt: 7_800, approved: 6_500, status: "DISBURSED", d: 70, term: TERM_PREV, method: "pm-supplier", why: "Scientific calculator, lab coat and geometrical set listed on the STEM pathway requirements sheet.", proofs: [["STEM_Requirements_Proforma.pdf", "Proforma invoice", "VERIFIED"]], note: "lab coat price aligned to the school supplier list (−16.7%).", payout: 571 },
  { n: 139, cat: "fare", amt: 1_400, status: "DISBURSED", d: 84, term: TERM_PREV, method: "pm-mpesa-mum", why: "Return matatu fare Nairobi to Karatina for the mid-term break and back to school after the break.", payout: 533 },
  { n: 131, cat: "pocketmoney", amt: 2_500, status: "DISBURSED", d: 96, term: TERM_PREV, method: "pm-card", why: "Opening-week pocket money for toiletries, exercise books and the school tuck shop.", payout: 489 },
  { n: 126, cat: "exam", amt: 2_500, status: "DISBURSED", d: 104, term: TERM_PREV, method: "pm-paybill", why: "KNEC school-based assessment portal registration invoiced by the school for the Grade 10 cohort.", proofs: [["KNEC_SBA_Invoice_KHS.pdf", "School KNEC invoice", "VERIFIED"]], payout: 467 },
  { n: 121, cat: "upkeep", amt: 12_000, status: "DISBURSED", d: 120, term: TERM_PREV, method: "pm-mpesa-mum", why: "Termly upkeep covering boarding shopping, uniform repairs and personal effects for the term.", proofs: [["KJSEA_ResultSlip.pdf", "Previous term result slip", "VERIFIED"]], payout: 431 },
  { n: 118, cat: "fees", amt: 53_400, status: "DISBURSED", d: 128, term: TERM_PREV, method: "pm-paybill", why: "Admission-term boarding and tuition fees per the Kenya High School Grade 10 fee structure.", proofs: [["KenyaHigh_FeeStructure_Admission.pdf", "Fee structure", "VERIFIED"], ["KJSEA_ResultSlip.pdf", "Previous term result slip", "VERIFIED"]], payout: 412 },
];

export const STUDENT_REQUESTS: StudentRequest[] = SEEDS.map(build);
