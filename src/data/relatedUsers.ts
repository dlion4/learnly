export type RelatedGroup = "FAMILY" | "SCHOOL" | "SPONSOR";

export interface RelatedUser {
  id: string;
  name: string;
  initials: string;
  role: string;
  group: RelatedGroup;
  phone: string;
  email?: string;
  organisation: string;
  primaryContact: boolean;
  nextOfKin: boolean;
  consentToContact: boolean;
  note: string;
}

export const RELATED_GROUP_LABEL: Record<RelatedGroup, string> = {
  FAMILY: "Family",
  SCHOOL: "School",
  SPONSOR: "Sponsor",
};

export const RELATED_USERS: RelatedUser[] = [
  { id: "ru-01", name: "Esther Njeri Kamau", initials: "EK", role: "Mother", group: "FAMILY", phone: "+254722614418", email: "esther.kamau@gmail.com", organisation: "Karatina Market — greengrocer", primaryContact: true, nextOfKin: true, consentToContact: true, note: "Receives upkeep, fare and medical payouts on M-Pesa." },
  { id: "ru-02", name: "Peter Kamau Mwangi", initials: "PM", role: "Father", group: "FAMILY", phone: "+254733209871", organisation: "2NK Sacco — matatu driver", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Backup payout line on Airtel Money." },
  { id: "ru-03", name: "Mary Wairimu Mwangi", initials: "MM", role: "Aunt / Guardian in Nairobi", group: "FAMILY", phone: "+254711840226", email: "mary.wairimu@yahoo.com", organisation: "Kenyatta National Hospital — nurse", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Local guardian for visiting days and mid-term pick-up." },
  { id: "ru-04", name: "James Gitau Kamau", initials: "JK", role: "Uncle / Emergency contact", group: "FAMILY", phone: "+254720118734", organisation: "Self-employed — hardware shop, Karatina", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Emergency contact if parents are unreachable." },
  { id: "ru-05", name: "Brian Mwangi Kamau", initials: "BK", role: "Brother (also on Learnly)", group: "FAMILY", phone: "+254758331209", organisation: "Mbagathi Junior School — Grade 8", primaryContact: false, nextOfKin: false, consentToContact: false, note: "Sibling sponsored under the same Nyeri County fund." },
  { id: "ru-06", name: "Mrs. Lucy Achieng Otieno", initials: "LO", role: "Class teacher — 10 East", group: "SCHOOL", phone: "+254724556310", email: "l.otieno@kenyahigh.ac.ke", organisation: "Kenya High School", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Teaches Mathematics; signs term report forms." },
  { id: "ru-07", name: "Dr. Naomi Chepkoech Rono", initials: "NR", role: "HOD — STEM pathway", group: "SCHOOL", phone: "+254721907745", email: "n.rono@kenyahigh.ac.ke", organisation: "Kenya High School", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Signs equipment requirement letters for STEM practicals." },
  { id: "ru-08", name: "Ms. Halima Abdi Noor", initials: "HN", role: "Boarding matron — Kilimanjaro House", group: "SCHOOL", phone: "+254712664820", organisation: "Kenya High School", primaryContact: false, nextOfKin: false, consentToContact: true, note: "First contact for welfare and medical referrals." },
  { id: "ru-09", name: "Mr. Peter Mutuku Musyoka", initials: "PM", role: "Bursar / School liaison", group: "SCHOOL", phone: "+254759334108", email: "bursar@kenyahigh.ac.ke", organisation: "Kenya High School", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Confirms fee receipts and issues fee structures." },
  { id: "ru-10", name: "Samuel Korir Kiprotich", initials: "SK", role: "Sponsor programme officer", group: "SPONSOR", phone: "+254723619044", email: "samuel.korir@learnly.co.ke", organisation: "Nyeri County Girls STEM Fund", primaryContact: false, nextOfKin: false, consentToContact: true, note: "Your assigned Learnly admin for approvals and queries." },
];
