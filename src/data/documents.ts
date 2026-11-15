import { TERM_NOW, TERM_PREV, daysAgo } from "./students";

export type DocCategory = "IDENTITY" | "ACADEMIC" | "FINANCIAL" | "MEDICAL" | "CONSENT" | "RESIDENCE";
export type DocStatus = "VERIFIED" | "PENDING" | "REJECTED";

export interface StudentDocument {
  id: string;
  typeKey: string;
  category: DocCategory;
  title: string;
  fileName: string;
  status: DocStatus;
  uploadedAt: string;
  sizeKb: number;
  pages: number;
  term?: string;
  ocr?: Record<string, string>;
  note?: string;
  verifiedBy?: string;
}

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  IDENTITY: "Identity",
  ACADEMIC: "Academic",
  FINANCIAL: "Financial",
  MEDICAL: "Medical",
  CONSENT: "Consent",
  RESIDENCE: "Residence",
};

export interface DocType {
  key: string;
  label: string;
  category: DocCategory;
  termly: boolean;
  ocr?: Record<string, string>;
}

/** Upload types offered in the document wizard (with the fields OCR pre-extracts). */
export const DOC_TYPES: DocType[] = [
  { key: "RESULT_SLIP", label: "Term result slip / report form", category: "ACADEMIC", termly: true, ocr: { Term: TERM_NOW, "Mean score": "71.4%", "Performance level": "Meeting Expectation (ME)", "Class position": "38 of 212" } },
  { key: "FEE_STRUCTURE", label: "Official fee structure", category: "FINANCIAL", termly: true, ocr: { Term: TERM_NOW, "Tuition & boarding": "KES 48,900", "Activity & medical": "KES 4,500", "Total payable": "KES 53,400" } },
  { key: "PROFORMA_INVOICE", label: "Proforma invoice / school letter", category: "FINANCIAL", termly: false, ocr: { Supplier: "Savanis Book Centre Ltd", "Line items": "1", "Invoice total": "KES 32,000", Stamped: "Yes" } },
  { key: "HOSPITAL_LETTER", label: "Hospital letter / medical invoice", category: "MEDICAL", termly: false },
  { key: "PROFILE_PHOTO", label: "Passport-size profile photo", category: "IDENTITY", termly: false },
  { key: "BIRTH_CERT", label: "Birth certificate", category: "IDENTITY", termly: false },
  { key: "CHIEF_LETTER", label: "Chief's letter / tenancy proof", category: "RESIDENCE", termly: false },
];

const d = (
  id: string, typeKey: string, category: DocCategory, title: string, fileName: string, status: DocStatus,
  days: number, sizeKb: number, pages: number, extra: Partial<StudentDocument> = {},
): StudentDocument => ({ id, typeKey, category, title, fileName, status, uploadedAt: daysAgo(days, 11), sizeKb, pages, ...extra });

const VERIFIER = "Esther Wambui Kariuki";

export const STUDENT_DOCUMENTS: StudentDocument[] = [
  d("doc-112", "FEE_STRUCTURE", "FINANCIAL", `Fee structure — ${TERM_NOW}`, "KenyaHigh_FeeStructure_Current.pdf", "PENDING", 5, 412, 2, { term: TERM_NOW, ocr: { "Tuition & boarding": "KES 48,900", "Activity & medical": "KES 4,500", "Total payable": "KES 53,400" }, note: "In the verifier queue — usually cleared within 2 working days." }),
  d("doc-111", "PROFORMA_INVOICE", "FINANCIAL", "Laptop proforma invoice", "Laptop_Proforma_Savanis.pdf", "REJECTED", 3, 288, 1, { ocr: { Supplier: "Savanis Book Centre Ltd", "Invoice total": "KES 32,000", Stamped: "No" }, note: "Unsigned and unstamped — upload a stamped copy or a signed HOD letter." }),
  d("doc-110", "HOSPITAL_LETTER", "MEDICAL", "Karatina Hospital optician invoice", "Karatina_Hospital_Invoice.pdf", "VERIFIED", 12, 196, 1, { verifiedBy: VERIFIER, ocr: { Facility: "Karatina Sub-County Hospital", "Invoice total": "KES 3,200" } }),
  d("doc-109", "RESULT_SLIP", "ACADEMIC", `Grade 10 report — ${TERM_PREV}`, "Grade10_PrevTerm_Report.pdf", "VERIFIED", 36, 524, 2, { term: TERM_PREV, verifiedBy: VERIFIER, ocr: { "Mean score": "68.9%", "Performance level": "Meeting Expectation (ME)", "Class position": "44 of 212" } }),
  d("doc-108", "PROFORMA_INVOICE", "FINANCIAL", "STEM requirements proforma", "STEM_Requirements_Proforma.pdf", "VERIFIED", 70, 240, 1, { verifiedBy: VERIFIER }),
  d("doc-107", "FEE_STRUCTURE", "FINANCIAL", `Fee structure — ${TERM_PREV}`, "KenyaHigh_FeeStructure_Admission.pdf", "VERIFIED", 128, 398, 2, { term: TERM_PREV, verifiedBy: VERIFIER, ocr: { "Total payable": "KES 53,400" } }),
  d("doc-106", "ADMISSION_LETTER", "ACADEMIC", "Kenya High admission letter", "KHS_Admission_Letter.pdf", "VERIFIED", 205, 310, 1, { verifiedBy: VERIFIER }),
  d("doc-105", "RESULT_SLIP", "ACADEMIC", "KJSEA result slip (Grade 9)", "KJSEA_ResultSlip.pdf", "VERIFIED", 208, 188, 1, { verifiedBy: VERIFIER, ocr: { Assessment: "KJSEA", "Mean score": "74.2%", "Performance level": "Meeting Expectation (ME)" } }),
  d("doc-104", "BIRTH_CERT", "IDENTITY", "Birth certificate", "Birth_Certificate_4418903.pdf", "VERIFIED", 212, 640, 1, { verifiedBy: VERIFIER }),
  d("doc-103", "NEMIS", "IDENTITY", "NEMIS UPI printout", "NEMIS_UPI_Printout.pdf", "VERIFIED", 212, 122, 1, { verifiedBy: VERIFIER }),
  d("doc-102", "CHIEF_LETTER", "RESIDENCE", "Chief's letter — Karatina Town", "Chief_Letter_Karatina.jpg", "VERIFIED", 211, 870, 1, { verifiedBy: VERIFIER }),
  d("doc-101", "CONSENT_FORM", "CONSENT", "DPA 2019 guardian consent form", "Guardian_Consent_DPA.pdf", "VERIFIED", 214, 156, 2, { verifiedBy: VERIFIER }),
];
