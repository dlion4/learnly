import type { EduLevelKey } from "./students";

export interface School {
  id: string;
  name: string;
  level: EduLevelKey;
  county: string;
  type: "Public" | "Private" | "Mission" | "National";
  paybill?: string;
  bank?: string;
}

/** Partner schools surfaced on the landing-page marquee strip. */
export const PARTNER_SCHOOLS: School[] = [
  { id: "sch-001", name: "Alliance High School", level: "senior", county: "Kiambu", type: "National", paybill: "522522", bank: "KCB" },
  { id: "sch-002", name: "Kenya High School", level: "senior", county: "Nairobi", type: "National", paybill: "247247", bank: "Equity" },
  { id: "sch-003", name: "Mang'u High School", level: "senior", county: "Kiambu", type: "National", paybill: "400200", bank: "Co-operative" },
  { id: "sch-004", name: "Starehe Boys' Centre", level: "senior", county: "Nairobi", type: "National", paybill: "522522", bank: "KCB" },
  { id: "sch-005", name: "Moi Forces Academy", level: "senior", county: "Nairobi", type: "Public" },
  { id: "sch-006", name: "Precious Blood Riruta", level: "senior", county: "Nairobi", type: "Mission" },
  { id: "sch-007", name: "Bahati Girls", level: "senior", county: "Nakuru", type: "Public" },
  { id: "sch-008", name: "Mbagathi Primary", level: "primary", county: "Nairobi", type: "Public" },
  { id: "sch-009", name: "Olympic Primary", level: "primary", county: "Nairobi", type: "Public" },
  { id: "sch-010", name: "Milimani Primary", level: "primary", county: "Kisumu", type: "Public" },
  { id: "sch-011", name: "Eldoret National Polytechnic", level: "tvet", county: "Uasin Gishu", type: "Public" },
  { id: "sch-012", name: "Kisumu National Polytechnic", level: "tvet", county: "Kisumu", type: "Public" },
  { id: "sch-013", name: "Nyeri National Polytechnic", level: "tvet", county: "Nyeri", type: "Public" },
  { id: "sch-014", name: "Kabete National Polytechnic", level: "tvet", county: "Kiambu", type: "Public" },
  { id: "sch-015", name: "KMTC Nairobi", level: "college", county: "Nairobi", type: "Public" },
  { id: "sch-016", name: "Kenya Utalii College", level: "college", county: "Nairobi", type: "Public" },
  { id: "sch-017", name: "Kenya School of Law", level: "college", county: "Nairobi", type: "Public" },
  { id: "sch-018", name: "University of Nairobi", level: "university", county: "Nairobi", type: "Public" },
  { id: "sch-019", name: "Kenyatta University", level: "university", county: "Kiambu", type: "Public" },
  { id: "sch-020", name: "JKUAT", level: "university", county: "Kiambu", type: "Public" },
  { id: "sch-021", name: "Moi University", level: "university", county: "Uasin Gishu", type: "Public" },
  { id: "sch-022", name: "Strathmore University", level: "university", county: "Nairobi", type: "Private" },
  { id: "sch-023", name: "USIU-Africa", level: "university", county: "Nairobi", type: "Private" },
  { id: "sch-024", name: "Egerton University", level: "university", county: "Nakuru", type: "Public" },
];
