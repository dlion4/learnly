import { ACADEMIC_YEAR, daysFromNow } from "./students";

export interface AcademicTenure {
  id: string;
  school: string;
  level: string;
  county: string;
  from: string;
  to: string;
  origin: boolean;
  note: string;
}

export interface TermRecord {
  id: string;
  grade: string;
  term: string;
  year: number;
  school: string;
  meanScore: number;
  level: "EE" | "ME" | "AE" | "BE";
  position: string;
  verified: boolean;
}

export interface ExamResult {
  id: string;
  exam: string;
  year: number;
  index: string;
  outcome: string;
}

const Y = ACADEMIC_YEAR;

export const ACADEMIC_TENURES: AcademicTenure[] = [
  { id: "ten-3", school: "Kenya High School", level: "Senior School · Grade 10 (STEM)", county: "Nairobi", from: `Jan ${Y}`, to: "Present", origin: false, note: "National school placement after KJSEA. Boarder, stream 10 East." },
  { id: "ten-2", school: "Mbagathi Junior School", level: "Junior School · Grade 7–9", county: "Nairobi", from: `Jan ${Y - 3}`, to: `Nov ${Y - 1}`, origin: false, note: "Completed junior school; sat KJSEA at Grade 9." },
  { id: "ten-1", school: "Mbagathi Primary School", level: "Primary · PP1–Grade 6", county: "Nairobi", from: `Jan ${Y - 11}`, to: `Nov ${Y - 4}`, origin: true, note: "Origin school on the Learnly record; sat KPSEA at Grade 6." },
];

const t = (id: string, grade: string, term: number, year: number, school: string, meanScore: number, position: string, verified = true): TermRecord => ({
  id, grade, term: `Term ${term}`, year, school, meanScore,
  level: meanScore >= 80 ? "EE" : meanScore >= 60 ? "ME" : meanScore >= 40 ? "AE" : "BE",
  position, verified,
});

export const TERM_RECORDS: TermRecord[] = [
  t("tr-10", "Grade 10", 1, Y, "Kenya High School", 68.9, "44 of 212"),
  t("tr-09", "Grade 9", 3, Y - 1, "Mbagathi Junior School", 74.2, "6 of 148"),
  t("tr-08", "Grade 9", 2, Y - 1, "Mbagathi Junior School", 72.8, "8 of 148"),
  t("tr-07", "Grade 9", 1, Y - 1, "Mbagathi Junior School", 70.1, "11 of 148"),
  t("tr-06", "Grade 8", 3, Y - 2, "Mbagathi Junior School", 69.4, "12 of 151"),
  t("tr-05", "Grade 8", 2, Y - 2, "Mbagathi Junior School", 66.0, "17 of 151"),
  t("tr-04", "Grade 8", 1, Y - 2, "Mbagathi Junior School", 64.7, "19 of 151"),
  t("tr-03", "Grade 7", 3, Y - 3, "Mbagathi Junior School", 63.2, "21 of 154"),
  t("tr-02", "Grade 7", 2, Y - 3, "Mbagathi Junior School", 60.5, "26 of 154"),
  t("tr-01", "Grade 7", 1, Y - 3, "Mbagathi Junior School", 58.3, "31 of 154"),
];

export const EXAM_RESULTS: ExamResult[] = [
  { id: "ex-2", exam: "KJSEA — Kenya Junior School Education Assessment", year: Y - 1, index: `20401118042/${Y - 1}`, outcome: "Meeting Expectation · 74.2% · placed to STEM pathway" },
  { id: "ex-1", exam: "KPSEA — Kenya Primary School Education Assessment", year: Y - 4, index: `20401118017/${Y - 4}`, outcome: "Meeting Expectation · 71.0%" },
];

export type TermDateKind = "ACADEMIC" | "FEES" | "EXAM" | "RECORDS";

export interface TermDate {
  id: string;
  title: string;
  kind: TermDateKind;
  at: string;
  detail: string;
}

export const TERM_DATE_KIND_LABEL: Record<TermDateKind, string> = {
  ACADEMIC: "Academic",
  FEES: "Fees",
  EXAM: "Exams",
  RECORDS: "Records",
};

/** Upcoming calendar — drives reminders and the "results expected" flag. */
export const TERM_DATES: TermDate[] = [
  { id: "td-01", title: "Fee payment deadline", kind: "FEES", at: daysFromNow(4), detail: "Bursar's deadline for current-term balances. Your fees request is in review." },
  { id: "td-02", title: "Mid-term break begins", kind: "ACADEMIC", at: daysFromNow(12), detail: "Boarders released at 10:00. Fare requests are open for this trip." },
  { id: "td-03", title: "Mid-term break ends", kind: "ACADEMIC", at: daysFromNow(17), detail: "Report back to school by 16:00." },
  { id: "td-04", title: "KNEC assessment registration window opens", kind: "EXAM", at: daysFromNow(24), detail: "School-based assessment portal opens for Grade 10. Exam registration requests unlock." },
  { id: "td-05", title: "End-of-term assessments", kind: "EXAM", at: daysFromNow(46), detail: "Two-week assessment block for all pathways." },
  { id: "td-06", title: "Term closes", kind: "ACADEMIC", at: daysFromNow(61), detail: "Closing day and parents' collection of report forms." },
  { id: "td-07", title: "Results upload window opens", kind: "RECORDS", at: daysFromNow(63), detail: "Upload this term's report form to unlock next term's fees and upkeep requests." },
  { id: "td-08", title: "Next term starts", kind: "ACADEMIC", at: daysFromNow(89), detail: "Opening day for boarders — reporting by 16:00." },
  { id: "td-09", title: "Next term fee structure published", kind: "FEES", at: daysFromNow(75), detail: "Bursar issues the official fee structure; upload it with your fees request." },
  { id: "td-10", title: "Results upload window closes", kind: "RECORDS", at: daysFromNow(96), detail: "Late uploads delay verification and next-term disbursement." },
];
