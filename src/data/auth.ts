import type { EduLevelKey } from "./students";

/** Auth/onboarding nav config — unbuilt routes are gated, never 404 links. */
export const AUTH_NAV = [
  { id: "signup", label: "Create account", route: "/auth/signup", ready: true },
  { id: "signin", label: "Sign in", route: "/auth/signin", ready: true },
  { id: "forgot", label: "Forgot password", route: "/auth/forgot-password", ready: false },
] as const;

export type SignupRole = "student" | "admin";

export type StaffRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "FINANCE_OFFICER"
  | "VERIFIER"
  | "SCHOOL_LIAISON"
  | "READ_ONLY_AUDITOR";

export interface SignupFormValues {
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
  dpa: boolean;
  bootstrapToken: string;
}

export const ROLE_OPTIONS = [
  {
    id: "student" as const,
    icon: "student",
    title: "Student / Parent",
    description: "I'm onboarding myself or my child",
    detail: "For learners, parents and guardians. Verify your phone, then complete the 7-step student profile.",
  },
  {
    id: "admin" as const,
    icon: "admin",
    title: "Admin / Sponsor",
    description: "I'm a sponsor or school administrator",
    detail: "For operators and school staff. A one-time deployment bootstrap token is required to create the first admin account.",
  },
];

/** Realistic Kenyan preview accounts for role-aware sign-in + TOTP 2FA (A-2). */
export interface SignInPreviewAccount {
  id: string;
  fullName: string;
  role: SignupRole;
  phone: string; // +254 format
  email: string;
  totpEnabled: boolean;
  // Student metadata
  eduLevel?: EduLevelKey;
  school?: string;
  gradeLabel?: string;
  // Admin metadata
  staffRole?: StaffRole;
  staffRoleLabel?: string;
  dataScope?: string;
  permissionSummary?: string;
  targetRoute: "/student" | "/admin";
  targetPageName: string;
}

export const SIGNIN_PREVIEW_ACCOUNTS: SignInPreviewAccount[] = [
  {
    id: "acc-stu-01",
    fullName: "Amani Wanjiku Kamau",
    role: "student",
    phone: "+254712345678",
    email: "amani.kamau@student.learnly.co.ke",
    totpEnabled: false,
    eduLevel: "senior",
    school: "Kenya High School",
    gradeLabel: "Grade 11 · STEM pathway",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  },
  {
    id: "acc-stu-02",
    fullName: "Brian Otieno Ochieng",
    role: "student",
    phone: "+254722114509",
    email: "brian.ochieng@student.learnly.co.ke",
    totpEnabled: false,
    eduLevel: "junior",
    school: "Mbagathi Junior School",
    gradeLabel: "Grade 8 · CBC",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  },
  {
    id: "acc-stu-03",
    fullName: "Zawadi Mutua Mwende",
    role: "student",
    phone: "+254758204112",
    email: "zawadi.mwende@uonbi.ac.ke",
    totpEnabled: true,
    eduLevel: "university",
    school: "University of Nairobi",
    gradeLabel: "BSc Computer Science · Year 2",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  },
  {
    id: "acc-stu-04",
    fullName: "Hamza Hassan Mohamed",
    role: "student",
    phone: "+254719883420",
    email: "hamza.mohamed@eldoretpoly.ac.ke",
    totpEnabled: false,
    eduLevel: "tvet",
    school: "Eldoret National Polytechnic",
    gradeLabel: "Diploma Level 6 · Electrical Eng.",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  },
  {
    id: "acc-stu-05",
    fullName: "Faith Chebet Kiprop",
    role: "student",
    phone: "+254728551034",
    email: "faith.kiprop@student.learnly.co.ke",
    totpEnabled: false,
    eduLevel: "senior",
    school: "Alliance Girls High School",
    gradeLabel: "Grade 12 · KSSEA cohort",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  },
  {
    id: "acc-stu-06",
    fullName: "Kevin Kipchoge Bett",
    role: "student",
    phone: "+254711902341",
    email: "kevin.bett@kmtc.ac.ke",
    totpEnabled: false,
    eduLevel: "college",
    school: "KMTC Nairobi",
    gradeLabel: "Diploma · Clinical Medicine",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  },
  {
    id: "acc-adm-01",
    fullName: "Grace Nyambura Mwangi",
    role: "admin",
    phone: "+254720445819",
    email: "grace.mwangi@learnly.co.ke",
    totpEnabled: true,
    staffRole: "SUPER_ADMIN",
    staffRoleLabel: "Super Admin",
    dataScope: "ALL · 47 counties",
    permissionSummary: "Full platform control · RBAC · 4-eyes banking · DPA pruning",
    targetRoute: "/admin",
    targetPageName: "AD-1 Admin Command Center",
  },
  {
    id: "acc-adm-02",
    fullName: "David Kimani Njoroge",
    role: "admin",
    phone: "+254715308712",
    email: "david.kimani@learnly.co.ke",
    totpEnabled: true,
    staffRole: "FINANCE_OFFICER",
    staffRoleLabel: "Finance Officer",
    dataScope: "ALL · Active budgets",
    permissionSummary: "Approve requests · Run Daraja/EFT batches · Reconcile payouts",
    targetRoute: "/admin",
    targetPageName: "AD-1 Admin Command Center",
  },
  {
    id: "acc-adm-03",
    fullName: "Samuel Korir Kiprotich",
    role: "admin",
    phone: "+254723619044",
    email: "samuel.korir@learnly.co.ke",
    totpEnabled: true,
    staffRole: "ADMIN",
    staffRoleLabel: "Admin",
    dataScope: "BY_COUNTY · Nairobi, Kiambu",
    permissionSummary: "Onboard students · Verify records · Scoped approvals",
    targetRoute: "/admin",
    targetPageName: "AD-1 Admin Command Center",
  },
  {
    id: "acc-adm-04",
    fullName: "Esther Wambui Kariuki",
    role: "admin",
    phone: "+254704129873",
    email: "esther.kariuki@learnly.co.ke",
    totpEnabled: false,
    staffRole: "VERIFIER",
    staffRoleLabel: "Academic Verifier",
    dataScope: "BY_SCHOOL · Alliance High, Kenya High",
    permissionSummary: "Verify result slips & fee structures · Flag OCR mismatches",
    targetRoute: "/admin",
    targetPageName: "AD-1 Admin Command Center",
  },
  {
    id: "acc-adm-05",
    fullName: "Peter Mutuku Musyoka",
    role: "admin",
    phone: "+254759334108",
    email: "peter.musyoka@alliancehigh.ac.ke",
    totpEnabled: false,
    staffRole: "SCHOOL_LIAISON",
    staffRoleLabel: "School Liaison",
    dataScope: "BY_SCHOOL · Alliance High School",
    permissionSummary: "Confirm fee receipts · Upload term structures · Message learners",
    targetRoute: "/admin",
    targetPageName: "AD-1 Admin Command Center",
  },
  {
    id: "acc-adm-06",
    fullName: "Miriam Adhiambo Oloo",
    role: "admin",
    phone: "+254721990415",
    email: "miriam.oloo@audit.learnly.co.ke",
    totpEnabled: true,
    staffRole: "READ_ONLY_AUDITOR",
    staffRoleLabel: "Read-Only Auditor",
    dataScope: "ALL · Immutable audit view",
    permissionSummary: "View-only ledger, approvals & DPA audit trail export",
    targetRoute: "/admin",
    targetPageName: "AD-1 Admin Command Center",
  },
];

/** Quick-fill showcase presets surfaced in the A-2 preview panel. */
export const SIGNIN_QUICK_PRESETS = [
  SIGNIN_PREVIEW_ACCOUNTS[0], // Student without 2FA
  SIGNIN_PREVIEW_ACCOUNTS[2], // University student with 2FA
  SIGNIN_PREVIEW_ACCOUNTS[6], // Super Admin with 2FA
  SIGNIN_PREVIEW_ACCOUNTS[7], // Finance Officer with 2FA
];

/** Normalize Kenyan phone inputs (07XX / 7XX / +2547XX) to +254XXXXXXXXX. */
export function normalizeKenyanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s()-]/g, "");
  if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned;
  if (/^254[17]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0[17]\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  if (/^[17]\d{8}$/.test(cleaned)) return `+254${cleaned}`;
  return null;
}

/** Public demonstration tokens & preview codes — NOT production secrets. */
export const DEMO_BOOTSTRAP_TOKEN = "LEARNLY-DEMO-2025";
export const OTP_PREVIEW_CODE = "123456";
export const TOTP_PREVIEW_CODE = "246810";
export const TOTP_RECOVERY_PREVIEW_CODE = "LY-8492-K9";
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const TOTP_WINDOW_SECONDS = 30;

export const configuredBootstrapToken = (): string =>
  import.meta.env.VITE_LEARNLY_BOOTSTRAP_TOKEN?.trim() ?? "";
