import { ACADEMIC_YEAR, CURRENT_STUDENT, daysAgo } from "./students";

/* ------------------------------------------------------------------ */
/* Verification & vocab (learnlyMO.md §3, S-2)                          */
/* ------------------------------------------------------------------ */
export type Verification = "VERIFIED" | "PENDING" | "UNVERIFIED" | "NOT_APPLICABLE";
export const VERIFICATION_LABEL: Record<Verification, string> = {
  VERIFIED: "Verified",
  PENDING: "Pending check",
  UNVERIFIED: "Unverified",
  NOT_APPLICABLE: "Not applicable",
};

export type IncomeBand = "None" | "<10k" | "10-30k" | "30-60k" | "60-100k" | "100-200k" | "200k+";
export const INCOME_BANDS: IncomeBand[] = ["None", "<10k", "10-30k", "30-60k", "60-100k", "100-200k", "200k+"];
/** The student only ever sees the bucket; admins see the full band. */
export const incomeBucket = (b: IncomeBand): string => {
  if (b === "None") return "Not stated";
  if (b === "<10k" || b === "10-30k") return "Low";
  if (b === "30-60k" || b === "60-100k") return "Mid";
  return "High";
};

export const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Aunt", "Uncle", "Grandparent", "Sibling", "Other"];
export const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "Unknown"];
export const RELIGIONS = ["Christian/Catholic", "Christian/Protestant", "Muslim", "Hindu", "Sikh", "Buddhist", "Other", "None"];
export const MARITAL = ["Single", "Married", "Widowed", "Separated"];
export const NATIONALITIES = ["Kenyan", "Ugandan", "Tanzanian", "Somali", "South Sudanese", "Ethiopian", "Other"];
export const LANGUAGE_OPTIONS = ["English", "Kiswahili", "Gĩkũyũ", "Dholuo", "Luluhya", "Kalenjin", "Kikamba", "Kisii", "Meru", "Somali", "Arabic", "French"];
export const BUILDING_TYPES = ["Permanent", "Semi-permanent", "Temporary", "Apartment", "Hostel", "Rental"];
export const OWNERSHIP = ["Owned", "Rented", "Employer-provided", "Family", "Other"];
export const TRAVEL_MODES = ["Walk", "Matatu", "Boda", "Bicycle", "Car", "School bus"];
export const COUNTIES = ["Nairobi", "Kiambu", "Nyeri", "Nakuru", "Kisumu", "Mombasa", "Machakos", "Uasin Gishu"];
export const DISABILITY_TYPES = ["None", "Physical", "Visual", "Hearing", "Intellectual", "Multiple"];
/** Rough bounding box for Kenya — used to reject GPS fixes that are clearly wrong. */
export const KENYA_BOUNDS = { latMin: -4.8, latMax: 5.0, lngMin: 33.9, lngMax: 41.9 };

/* ------------------------------------------------------------------ */
/* Record shapes                                                       */
/* ------------------------------------------------------------------ */
export interface Guardian {
  id: string;
  relationship: string;
  name: string;
  initials: string;
  phone: string;
  altPhone?: string;
  email?: string;
  occupation: string;
  employer: string;
  incomeBand: IncomeBand;
  primary: boolean;
  nextOfKin: boolean;
  consentToContact: boolean;
  addedAt: string;
  note: string;
}

export interface PersonalState {
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  dob: string;
  sex: string;
  bloodGroup: string;
  nationality: string;
  religion: string;
  languages: string[];
  maritalStatus: string;
  disability: { type: string; cardNo: string; docName: string } | null;
}

export interface HomeState {
  county: string;
  subCounty: string;
  ward: string;
  constituency: string;
  town: string;
  estate: string;
  street: string;
  landmark: string;
  buildingType: string;
  ownership: string;
  rentKes: number;
  distanceKm: number;
  travelMode: string;
  lat: number;
  lng: number;
  /** Metres; 0 means the pin was placed by hand. */
  accuracyM: number;
  gpsCapturedAt: string | null;
}

export interface SchoolState {
  name: string;
  moeCode: string;
  schoolType: string;
  county: string;
  boarding: string;
  grade: string;
  stream: string;
  pathway: string;
  admissionNo: string;
  enrolmentDate: string;
  expectedCompletion: string;
  crest: string;
}

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}
export interface AuditEntry extends AuditChange {
  id: string;
  at: string;
  actor: string;
  reason?: string;
}

export interface Correction {
  id: string;
  field: string;
  requested: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  at: string;
  evidence: string;
}

export interface TransferRequest {
  id: string;
  toSchool: string;
  effective: string;
  reason: string;
  status: "PENDING";
  at: string;
}

export interface ProfileState {
  personal: PersonalState;
  home: HomeState;
  school: SchoolState;
  guardians: Guardian[];
  audit: AuditEntry[];
  corrections: Correction[];
  transfers: TransferRequest[];
  photoUploaded: boolean;
  photoVersion: number;
}

export interface Identifier {
  key: string;
  label: string;
  value: string;
  verification: Verification;
  note: string;
  kind: "ID" | "INDEX" | "OTHER";
}

export interface Teacher {
  id: string;
  title: string;
  name: string;
  initials: string;
  role: string;
  subjects: string[];
  phone: string;
  email?: string;
  consentToContact: boolean;
  note: string;
}

export interface ConsentEntry {
  id: string;
  purposeKey: string;
  granted: boolean;
  at: string;
  channel: string;
  by: string;
  ip: string;
  hash: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export const ageOn = (dob: string, on: Date = new Date()): number => {
  const b = new Date(dob);
  let age = on.getFullYear() - b.getFullYear();
  const m = on.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < b.getDate())) age -= 1;
  return age;
};

export const nationalIdDue = (dob: string): string => {
  const b = new Date(dob);
  return new Date(b.getFullYear() + 18, b.getMonth(), b.getDate()).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* ------------------------------------------------------------------ */
/* Identifiers (S5 — identity sub-block)                               */
/* ------------------------------------------------------------------ */
export const IDENTIFIERS: Identifier[] = [
  { key: "Birth certificate number", label: "Birth certificate number", value: "4418903", verification: "VERIFIED", note: "Checked against the civil registry copy in your vault.", kind: "ID" },
  { key: "NEMIS UPI", label: "NEMIS UPI", value: "20418837165", verification: "VERIFIED", note: "Matched to the school's NEMIS return for this term.", kind: "ID" },
  { key: "KJSEA index", label: "KJSEA index (Grade 9)", value: `20401118042/${ACADEMIC_YEAR - 1}`, verification: "VERIFIED", note: "Result slip verified by Esther Wambui Kariuki.", kind: "INDEX" },
  { key: "KPSEA index", label: "KPSEA index (Grade 6)", value: `20401118017/${ACADEMIC_YEAR - 4}`, verification: "PENDING", note: "Waiting for KNEC to confirm the index number.", kind: "INDEX" },
  { key: "KCPE index", label: "KCPE index (8-4-4, historical)", value: "", verification: "NOT_APPLICABLE", note: "Not applicable — this learner followed the CBC pathway.", kind: "INDEX" },
  { key: "National ID", label: "National ID", value: "", verification: "NOT_APPLICABLE", note: "Required from age 18. Verified through IPRS once issued.", kind: "ID" },
  { key: "KRA PIN", label: "KRA PIN", value: "", verification: "NOT_APPLICABLE", note: "Only needed at university if a taxable stipend is received.", kind: "OTHER" },
  { key: "Passport", label: "Passport", value: "", verification: "NOT_APPLICABLE", note: "Only for international students studying in Kenya.", kind: "OTHER" },
];

/* ------------------------------------------------------------------ */
/* Consent (S5 — read here, changed in Settings S-10)                   */
/* ------------------------------------------------------------------ */
export const CONSENT_PURPOSES = [
  { key: "sponsorship", short: "Sponsorship", label: "Process personal data for sponsorship", settingsKey: "sponsorship" },
  { key: "special", short: "Special data", label: "Process special-category data (medical, disability, ID)", settingsKey: "special" },
  { key: "school", short: "School sharing", label: "Share data with my school for verification", settingsKey: "school" },
  { key: "comms", short: "Comms", label: "Transactional SMS & email (OTP, approvals, receipts)", settingsKey: "comms" },
  { key: "marketing", short: "Marketing", label: "News and programme updates", settingsKey: "marketing" },
];

const HASHES = ["b7e2…41fa", "9c1f…a27e", "e41b…9d2a", "03cd…7b18", "f5a9…c04e", "6d28…e1b3"];
const GUARDIAN_BY = "Esther Njeri Kamau (guardian)";
const consent = (n: number, purposeKey: string, granted: boolean, days: number, channel: string, by = GUARDIAN_BY): ConsentEntry => ({
  id: `cl-${n}`,
  purposeKey,
  granted,
  at: daysAgo(days, 10),
  channel,
  by,
  ip: "41.90.•••.•••",
  hash: HASHES[n % HASHES.length],
});

export const CONSENT_LOG: ConsentEntry[] = [
  consent(1, "sponsorship", true, 214, "Self-onboarding (web)"),
  consent(2, "special", true, 214, "Self-onboarding (web)"),
  consent(3, "school", true, 214, "Self-onboarding (web)"),
  consent(4, "comms", true, 214, "Self-onboarding (web)"),
  consent(5, "marketing", false, 214, "Self-onboarding (web)"),
  consent(6, "comms", true, 150, "Renewal (SMS OTP)"),
  consent(7, "marketing", true, 120, "Settings change"),
  consent(8, "marketing", false, 40, "Settings change"),
  consent(9, "sponsorship", true, 60, "Renewal (SMS OTP)"),
  consent(10, "special", true, 60, "Renewal (SMS OTP)"),
  consent(11, "school", true, 60, "Renewal (SMS OTP)"),
  consent(12, "comms", true, 5, "Settings change", `${CURRENT_STUDENT.fullName} (learner)`),
];

/* ------------------------------------------------------------------ */
/* Class teacher & academic contacts (S4)                              */
/* ------------------------------------------------------------------ */
export const TEACHERS: Teacher[] = [
  { id: "ru-06", title: "Mrs.", name: "Lucy Achieng Otieno", initials: "LO", role: "Class teacher · 10 East", subjects: ["Mathematics", "Physics"], phone: "+254724556310", email: "l.otieno@kenyahigh.ac.ke", consentToContact: true, note: "Signs your term report form and approves class-level requests." },
  { id: "ru-07", title: "Dr.", name: "Naomi Chepkoech Rono", initials: "NR", role: "HOD · STEM pathway", subjects: ["Chemistry", "Biology"], phone: "+254721907745", email: "n.rono@kenyahigh.ac.ke", consentToContact: true, note: "Signs equipment requirement letters for STEM practicals." },
  { id: "ru-08", title: "Ms.", name: "Halima Abdi Noor", initials: "HN", role: "Boarding matron · Kilimanjaro House", subjects: [], phone: "+254712664820", consentToContact: true, note: "First contact for welfare, medical referrals and boarding routines." },
];

/* ------------------------------------------------------------------ */
/* Initial profile                                                     */
/* ------------------------------------------------------------------ */
const auditSeed = (n: number, field: string, before: string, after: string, reason?: string): AuditEntry => ({
  id: `au-seed-${n}`,
  field,
  before,
  after,
  actor: CURRENT_STUDENT.fullName,
  at: daysAgo(n, 9),
  reason,
});

export const INITIAL_PROFILE: ProfileState = {
  personal: {
    firstName: "Amani",
    middleName: "Wanjiku",
    lastName: "Kamau",
    preferredName: "Amani",
    dob: CURRENT_STUDENT.dob,
    sex: "Female",
    bloodGroup: "O+",
    nationality: "Kenyan",
    religion: "Christian/Protestant",
    languages: [...CURRENT_STUDENT.languages],
    maritalStatus: "Single",
    disability: null,
  },
  home: {
    county: "Nyeri",
    subCounty: "Mathira East",
    ward: "Karatina Town",
    constituency: "Mathira",
    town: "Karatina",
    estate: "Ragati Estate",
    street: "Plot 14, Ragati Road",
    landmark: "Opposite Karatina Market matatu stage",
    buildingType: "Permanent",
    ownership: "Family",
    rentKes: 0,
    distanceKm: CURRENT_STUDENT.distanceKm,
    travelMode: "Matatu",
    lat: -0.4762,
    lng: 37.1186,
    accuracyM: 18,
    gpsCapturedAt: daysAgo(96, 11),
  },
  school: {
    name: CURRENT_STUDENT.school,
    moeCode: "MOE 2100113",
    schoolType: "National · Public",
    county: CURRENT_STUDENT.schoolCounty,
    boarding: "Boarding",
    grade: "Grade 10",
    stream: "10 East",
    pathway: "STEM pathway",
    admissionNo: CURRENT_STUDENT.admissionNo,
    enrolmentDate: `${ACADEMIC_YEAR}-01-20`,
    expectedCompletion: `${ACADEMIC_YEAR + 2}-11-28`,
    crest: "KHS",
  },
  guardians: [
    { id: "g-esther", relationship: "Mother", name: "Esther Njeri Kamau", initials: "EK", phone: "+254722614418", email: "esther.kamau@gmail.com", occupation: "Greengrocer (market trader)", employer: "Karatina Market", incomeBand: "10-30k", primary: true, nextOfKin: true, consentToContact: true, addedAt: daysAgo(214, 10), note: "Receives upkeep, fare and medical payouts." },
    { id: "g-peter", relationship: "Father", name: "Peter Kamau Mwangi", initials: "PM", phone: "+254733209871", occupation: "Matatu driver", employer: "2NK Sacco", incomeBand: "30-60k", primary: false, nextOfKin: false, consentToContact: true, addedAt: daysAgo(214, 10), note: "Backup Airtel Money line for fare." },
    { id: "g-mary", relationship: "Aunt", name: "Mary Wairimu Mwangi", initials: "MW", phone: "+254711840226", email: "mary.wairimu@yahoo.com", occupation: "Nurse", employer: "Kenyatta National Hospital", incomeBand: "60-100k", primary: false, nextOfKin: false, consentToContact: true, addedAt: daysAgo(190, 10), note: "Local guardian for visiting days and mid-term pick-up." },
  ],
  audit: [
    auditSeed(214, "Guardian added", "—", "Esther Njeri Kamau (Mother) added"),
    auditSeed(214, "Guardian added", "—", "Peter Kamau Mwangi (Father) added"),
    auditSeed(190, "Guardian added", "—", "Mary Wairimu Mwangi (Aunt) added"),
    auditSeed(190, "Primary contact", "Peter Kamau Mwangi", "Esther Njeri Kamau", "Mother confirmed as primary contact"),
    auditSeed(160, "Languages", "English · Kiswahili", "English · Kiswahili · Gĩkũyũ"),
    auditSeed(128, "Ward", "Karatina", "Karatina Town", "Ward corrected to match the chief's letter"),
    auditSeed(96, "GPS position", "—", "-0.47620, 37.11860 (±18 m)"),
    auditSeed(70, "Blood group", "Unknown", "O+", "Confirmed from the health card"),
    auditSeed(14, "Landmark", "Near the market", "Opposite Karatina Market matatu stage"),
    auditSeed(3, "Consent: news & updates", "Granted", "Withdrawn"),
  ],
  corrections: [
    { id: "cor-seed-1", field: "Birth certificate number", requested: "4418930", reason: "Second digit transcribed wrongly on the 2025 form", status: "PENDING", at: daysAgo(4, 10), evidence: "Birth_Certificate_4418903.pdf" },
  ],
  transfers: [],
  photoUploaded: false,
  photoVersion: 0,
};
