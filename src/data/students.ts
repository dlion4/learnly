/* ------------------------------------------------------------------ */
/* Shared helpers & domain types (extend, never fork)                  */
/* ------------------------------------------------------------------ */
export type EduLevelKey =
  | "preprimary"
  | "primary"
  | "junior"
  | "senior"
  | "tvet"
  | "college"
  | "university"
  | "special"
  | "international";

export type RequestCategory =
  | "fees"
  | "upkeep"
  | "pocketmoney"
  | "fare"
  | "equipment"
  | "medical"
  | "exam";

export const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export const eduLevelLabel = (k: EduLevelKey) =>
  ((
    {
      preprimary: "Pre-Primary",
      primary: "Primary",
      junior: "Junior School",
      senior: "Senior School",
      tvet: "TVET / Polytechnic",
      college: "College",
      university: "University",
      special: "Special Needs",
      international: "International",
    } as Record<EduLevelKey, string>
  )[k]);

export const catLabel = (c: RequestCategory) =>
  ((
    {
      fees: "School fees",
      upkeep: "Upkeep",
      pocketmoney: "Pocket money",
      fare: "Fare",
      equipment: "Equipment",
      medical: "Medical",
      exam: "Exam registration",
    } as Record<RequestCategory, string>
  )[c]);

export const eduLevelColor = (key: EduLevelKey) => `var(--edu-${key})`;

/* ------------------------------------------------------------------ */
/* Canonical education-level reference (learnlyMO.md §3 + H-2)         */
/* ------------------------------------------------------------------ */
export interface LevelCategory {
  category: RequestCategory;
  label?: string;
}

export type LevelTrack = "cbc" | "tertiary" | "other";

export interface EduLevel {
  key: EduLevelKey;
  label: string;
  short: string;
  grades: string;
  gradeList: string[];
  ageRange: string;
  exam: string;
  examPoints: string[];
  feesRange: string;
  ids: string;
  sampleSchools: string[];
  categories: LevelCategory[];
  track: LevelTrack;
}

export const EDU_LEVELS: EduLevel[] = [
  {
    key: "preprimary",
    label: "Pre-Primary (ECDE)",
    short: "PP1–PP2",
    grades: "Play Group · PP1 · PP2",
    gradeList: ["Play Group (age ~3)", "Pre-Primary 1 — PP1 (age ~4)", "Pre-Primary 2 — PP2 (age ~5)"],
    ageRange: "3–5 years",
    exam: "School-based readiness checks; no national examination",
    examPoints: ["Continuous ECDE portfolio and school-based readiness checks", "No KNEC summative examination at this level"],
    feesRange: "KES 8,000 – 45,000 / term",
    ids: "Birth certificate · NEMIS UPI",
    sampleSchools: ["Kilimani ECDE Centre", "Olympic Primary (PP wing)", "Mbagathi Primary (ECDE unit)"],
    categories: [
      { category: "fees" },
      { category: "equipment", label: "Uniform & learning materials" },
      { category: "fare" },
      { category: "medical" },
    ],
    track: "cbc",
  },
  {
    key: "primary",
    label: "Primary (CBC)",
    short: "Grade 1–6",
    grades: "Grade 1 → Grade 6",
    gradeList: ["Grade 1 (age ~6)", "Grade 2 (age ~7)", "Grade 3 (age ~8) — first SBA", "Grade 4 (age ~9)", "Grade 5 (age ~10)", "Grade 6 (age ~11) — KPSEA"],
    ageRange: "6–11 years",
    exam: "SBA at Grade 3/4/5 · KPSEA at Grade 6",
    examPoints: ["SBA — School-Based Assessment at Grades 3, 4 and 5", "KPSEA — Kenya Primary School Education Assessment at Grade 6 (Oct/Nov)"],
    feesRange: "KES 15,000 – 90,000 / term",
    ids: "Birth certificate · NEMIS UPI · KPSEA index",
    sampleSchools: ["Mbagathi Primary", "Milimani Primary", "Olympic Primary", "Kilimani Primary"],
    categories: [
      { category: "fees" },
      { category: "equipment", label: "Uniform, books & learning materials" },
      { category: "fare" },
      { category: "exam", label: "KPSEA registration" },
      { category: "medical" },
    ],
    track: "cbc",
  },
  {
    key: "junior",
    label: "Junior School (CBC)",
    short: "Grade 7–9",
    grades: "Grade 7 → Grade 9",
    gradeList: ["Grade 7 (age ~12)", "Grade 8 (age ~13)", "Grade 9 (age ~14) — KJSEA"],
    ageRange: "12–14 years",
    exam: "SBA at Grade 7/8 · KJSEA at Grade 9",
    examPoints: ["SBA — School-Based Assessment at Grades 7 and 8", "KJSEA — Kenya Junior School Education Assessment at Grade 9 (Oct/Nov)"],
    feesRange: "KES 20,000 – 110,000 / term",
    ids: "Birth certificate · NEMIS UPI · KJSEA index",
    sampleSchools: ["Mbagathi Junior School", "Moi Forces Academy (Junior)", "Olympic Junior School"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "equipment", label: "Books, uniform & practical materials" },
      { category: "fare" },
      { category: "exam", label: "KJSEA registration" },
      { category: "medical" },
    ],
    track: "cbc",
  },
  {
    key: "senior",
    label: "Senior School / Legacy 8-4-4",
    short: "Grade 10–12 · Form 1–4",
    grades: "Grade 10–12 pathways · legacy Form 1–4",
    gradeList: ["Grade 10 (age ~15) — select STEM, Arts & Sports Science or Social Sciences", "Grade 11 (age ~16)", "Grade 12 (age ~17) — KSSEA", "Legacy: Form 1 → Form 4, with KCSE at Form 4"],
    ageRange: "15–18 years",
    exam: "KSSEA at Grade 12 · KCSE at Form 4",
    examPoints: ["KSSEA — Kenya Senior School Education Assessment at Grade 12 (Oct/Nov)", "KCSE — Kenya Certificate of Secondary Education for legacy Form 4 records", "KCPE index retained for historical 8-4-4 records"],
    feesRange: "KES 22,000 – 250,000 / term",
    ids: "NEMIS UPI · KCPE index · KCSE index",
    sampleSchools: ["Alliance High School", "Kenya High School", "Mang'u High School", "Starehe Boys' Centre", "Precious Blood Riruta"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "pocketmoney" },
      { category: "fare" },
      { category: "equipment", label: "Books, uniform & pathway equipment" },
      { category: "medical" },
      { category: "exam", label: "KSSEA / KCSE registration" },
    ],
    track: "cbc",
  },
  {
    key: "special",
    label: "Special Needs Education (SNE)",
    short: "SNE · Inclusive",
    grades: "Specialised schools and inclusive mainstream units",
    gradeList: ["Schools for the Deaf", "Schools for the Blind", "Schools for the Physically Challenged", "Schools for the Intellectually Challenged", "Integrated / inclusive units in mainstream schools"],
    ageRange: "3–25 years, by programme",
    exam: "Adapted KNEC assessments and individual learning plans",
    examPoints: ["Adapted KPSEA, KJSEA, KSSEA or KCSE where applicable", "Individualised Education Plan (IEP) progress reviews", "Functional and vocational assessments for transition programmes"],
    feesRange: "KES 10,000 – 80,000 / term",
    ids: "Birth certificate or National ID · NEMIS UPI · NCPWD card where applicable",
    sampleSchools: ["Thika School for the Blind", "Kambui School for the Deaf", "Jacaranda School for the Intellectually Challenged", "Nairobi Primary inclusive unit"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "equipment", label: "Assistive devices & learning materials" },
      { category: "medical", label: "Therapy, assessment & medical support" },
      { category: "fare" },
      { category: "exam", label: "Adapted KNEC registration" },
    ],
    track: "other",
  },
  {
    key: "international",
    label: "International Curricula",
    short: "IGCSE · IB · A-Level",
    grades: "Cambridge Year 1–13 · IB PYP/MYP/DP · American K-12",
    gradeList: ["IGCSE (Cambridge): Year 1 → Year 11", "International Baccalaureate: PYP, MYP and Diploma Programme", "A-Levels: AS (Year 12) and A2 (Year 13)", "American Curriculum: K-12 with AP examinations"],
    ageRange: "3–18 years",
    exam: "IGCSE · AS/A2 · IB Diploma · AP",
    examPoints: ["Cambridge IGCSE examinations at Year 11", "AS and A2 examinations at Years 12 and 13", "IB Diploma Programme assessments", "Advanced Placement (AP) examinations for American-curriculum schools"],
    feesRange: "KES 150,000 – 900,000 / term",
    ids: "Passport or birth certificate · NEMIS UPI where issued",
    sampleSchools: ["Braeburn School", "Brookhouse School", "International School of Kenya", "Peponi School"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "equipment", label: "Books, devices & curriculum materials" },
      { category: "fare" },
      { category: "exam", label: "IGCSE / IB / A-Level / AP entry" },
      { category: "medical" },
    ],
    track: "other",
  },
  {
    key: "tvet",
    label: "TVET & National Polytechnics",
    short: "Level 1–7",
    grades: "Artisan L1–3 · Craft L4–5 · Diploma L6 · Higher Diploma L7",
    gradeList: ["Vocational Training Centres — artisan Level 1–3", "Technical Training Institutes — craft Level 4–5 and diploma Level 6", "Technical & Vocational Colleges — diploma and higher diploma", "National Polytechnics — Level 5–7"],
    ageRange: "Usually 16+ years",
    exam: "KNEC TVET · CDACC · NITA trade tests · ICDL",
    examPoints: ["KNEC TVET July/August and November/December series", "CDACC competency-based assessments", "NITA trade tests, City & Guilds and ICDL where offered"],
    feesRange: "KES 25,000 – 70,000 / term",
    ids: "National ID · KCSE index · institution admission number",
    sampleSchools: ["Eldoret National Polytechnic", "Kisumu National Polytechnic", "Nyeri National Polytechnic", "Kabete National Polytechnic", "Nairobi Technical Training Institute"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "equipment", label: "Tools, workshop materials & devices" },
      { category: "fare" },
      { category: "exam", label: "KNEC TVET / CDACC / NITA assessment" },
      { category: "medical" },
    ],
    track: "tertiary",
  },
  {
    key: "college",
    label: "Professional & Medical Colleges",
    short: "Cert · Diploma · Higher Dip.",
    grades: "Certificate · Diploma · Higher Diploma · professional programmes",
    gradeList: ["KMTC — certificate, diploma and higher diploma", "Kenya School of Law — Advocates Training Programme", "Kenya Utalii College — tourism and hospitality", "Bandari Maritime Academy, KWSTI and other professional colleges"],
    ageRange: "Usually 18+ years",
    exam: "Institutional and professional-body examinations",
    examPoints: ["KMTC institutional and professional licensing assessments", "Kenya School of Law ATP examinations and Council of Legal Education requirements", "Institution-specific end-of-semester and certification examinations"],
    feesRange: "KES 30,000 – 120,000 / semester",
    ids: "National ID · KRA PIN where applicable · KCSE index",
    sampleSchools: ["KMTC Nairobi", "Kenya Utalii College", "Kenya School of Law", "Bandari Maritime Academy", "KWSTI Naivasha"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "equipment", label: "Clinical, hospitality or course equipment" },
      { category: "fare" },
      { category: "exam", label: "Professional examination entry" },
      { category: "medical" },
    ],
    track: "tertiary",
  },
  {
    key: "university",
    label: "University",
    short: "Bachelor's → PhD",
    grades: "Bachelor's · PGD · Master's · Doctorate",
    gradeList: ["Certificate and Diploma (post-secondary)", "Bachelor's Degree — BA, BSc, BEd, BCom, LLB, MBChB, BEng and others", "Postgraduate Diploma (PGD)", "Master's Degree — MA, MSc, MBA, MEd, MPhil and others", "Doctorate — PhD, DPhil, DBA, EdD and professional doctorates"],
    ageRange: "Usually 18+ years",
    exam: "Per-semester university examinations",
    examPoints: ["University-set end-of-semester examinations, typically Dec/Jan and May/Jun", "Thesis, dissertation and research milestones for postgraduate learners", "KUCCPS placement verification where applicable"],
    feesRange: "KES 40,000 – 300,000 / semester",
    ids: "National ID · KRA PIN · KUCCPS placement · KCSE index",
    sampleSchools: ["University of Nairobi", "JKUAT", "Kenyatta University", "Strathmore University", "Moi University"],
    categories: [
      { category: "fees" },
      { category: "upkeep" },
      { category: "pocketmoney" },
      { category: "equipment", label: "Laptop, books & research equipment" },
      { category: "medical" },
    ],
    track: "tertiary",
  },
];

/* Hero pathway ribbons (PP1 → Grade 12 → TVET → University) */
export const HERO_PATHWAY = [
  { level: "preprimary" as EduLevelKey, badge: "PP1", name: "Amani Wanjiku Kamau", meta: "Olympic Primary · Term 2 fees", kes: 12500 },
  { level: "junior" as EduLevelKey, badge: "G8", name: "Brian Otieno Ochieng", meta: "Mbagathi Junior · upkeep → M-Pesa", kes: 6000 },
  { level: "senior" as EduLevelKey, badge: "G11", name: "Faith Chebet Kiprop", meta: "Kenya High · STEM · fees → KCB 522522", kes: 53400 },
  { level: "tvet" as EduLevelKey, badge: "L6", name: "Hamza Hassan Mohamed", meta: "Eldoret Nat. Polytechnic · Diploma", kes: 28000 },
  { level: "university" as EduLevelKey, badge: "BSc", name: "Zawadi Mutua Mwende", meta: "UoN · Semester 1 · pocket → card", kes: 3000 },
];

export const PLATFORM_STATS = {
  studentsSponsored: 1200,
  disbursedKes: 184_300_000,
  partnerSchools: 312,
  counties: 47,
};

/* ------------------------------------------------------------------ */
/* Dashboard helpers (dates are relative so the workspace stays live)  */
/* ------------------------------------------------------------------ */
const DAY_MS = 86_400_000;
export const daysAgo = (n: number, hour = 10): string => {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hour, (Math.abs(n) * 7) % 60, 0, 0);
  return d.toISOString();
};
export const daysFromNow = (n: number): string => daysAgo(-n, 8);
export const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (iso: string): string =>
  `${fmtDate(iso)} · ${new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`;
export const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};
export const maskPhone = (p: string): string => `+254 ••• ••• ${p.slice(-3)}`;
export const maskAccount = (a: string): string => `•••• ${a.slice(-4)}`;
export const fmtPercent = (n: number): string => `${Math.round(n)}%`;

export const ACADEMIC_YEAR = new Date().getFullYear();
const termIndex = () => {
  const m = new Date().getMonth();
  return ACADEMIC_YEAR * 3 + (m < 4 ? 0 : m < 8 ? 1 : 2);
};
/** "Term 2, 2026" — offset −1 is the previous term, +1 the next. */
export const termLabel = (offset = 0): string => {
  const idx = termIndex() + offset;
  return `Term ${(idx % 3) + 1}, ${Math.floor(idx / 3)}`;
};
export const TERM_NOW = termLabel(0);
export const TERM_PREV = termLabel(-1);
export const TERM_NEXT = termLabel(1);

/* ------------------------------------------------------------------ */
/* The signed-in learner (S-pages)                                     */
/* ------------------------------------------------------------------ */
export interface Student {
  id: string;
  fullName: string;
  firstName: string;
  initials: string;
  eduLevel: EduLevelKey;
  grade: string;
  pathway: string;
  stream: string;
  school: string;
  schoolCounty: string;
  admissionNo: string;
  boarding: string;
  dob: string;
  sex: string;
  nationality: string;
  languages: string[];
  nemisUpi: string;
  birthCertNo: string;
  kjseaIndex: string;
  phone: string;
  email: string;
  county: string;
  subCounty: string;
  ward: string;
  estate: string;
  distanceKm: number;
  travelMode: string;
  sponsor: string;
  budgetLine: string;
  budgetLineRemainingKes: number;
  consentExpiresAt: string;
  joinedAt: string;
}

export const CURRENT_STUDENT: Student = {
  id: "stu-0001",
  fullName: "Amani Wanjiku Kamau",
  firstName: "Amani",
  initials: "AK",
  eduLevel: "senior",
  grade: "Grade 10",
  pathway: "STEM pathway",
  stream: "10 East",
  school: "Kenya High School",
  schoolCounty: "Nairobi",
  admissionNo: `KHS/${ACADEMIC_YEAR}/1187`,
  boarding: "Boarding",
  dob: `${ACADEMIC_YEAR - 15}-03-14`,
  sex: "Female",
  nationality: "Kenyan",
  languages: ["English", "Kiswahili", "Gĩkũyũ"],
  nemisUpi: "20418837165",
  birthCertNo: "4418903",
  kjseaIndex: `20401118042/${ACADEMIC_YEAR - 1}`,
  phone: "+254758204418",
  email: "amani.kamau@student.learnly.co.ke",
  county: "Nyeri",
  subCounty: "Mathira East",
  ward: "Karatina Town",
  estate: "Ragati Estate, near Karatina Market",
  distanceKm: 128,
  travelMode: "Matatu (2NK Sacco)",
  sponsor: "Nyeri County Girls STEM Fund",
  budgetLine: `BL-${ACADEMIC_YEAR}-NYR-STEM-04`,
  budgetLineRemainingKes: 148_600,
  consentExpiresAt: daysFromNow(21),
  joinedAt: daysAgo(214),
};
