import { daysAgo, type RequestCategory } from "./students";

export type MethodChannel =
  | "MPESA"
  | "AIRTEL"
  | "SCHOOL_PAYBILL"
  | "SCHOOL_BANK"
  | "CARD"
  | "SUPPLIER_PAYBILL"
  | "HOSPITAL_PAYBILL";

export type MethodStatus = "VERIFIED" | "PENDING" | "REJECTED";

export interface PayoutMethod {
  id: string;
  channel: MethodChannel;
  label: string;
  owner: string;
  relationship: string;
  identifier: string;
  masked: string;
  status: MethodStatus;
  defaultFor: RequestCategory[];
  addedAt: string;
  lastUsedAt?: string;
}

export const CHANNEL_META: Record<MethodChannel, { label: string; icon: string; blurb: string }> = {
  MPESA: { label: "M-Pesa B2C", icon: "phone", blurb: "Safaricom line of the learner or a registered guardian" },
  AIRTEL: { label: "Airtel Money", icon: "phone", blurb: "Airtel line of the learner or a registered guardian" },
  SCHOOL_PAYBILL: { label: "School Paybill", icon: "bank", blurb: "Verified institution paybill with admission number" },
  SCHOOL_BANK: { label: "School Bank (EFT)", icon: "bank", blurb: "Institution fees collection account" },
  CARD: { label: "Pocket Card", icon: "card", blurb: "School-issued pocket-money card (Pesapal / Cellulant)" },
  SUPPLIER_PAYBILL: { label: "Supplier Paybill", icon: "receipt", blurb: "Bookshop or equipment supplier paybill" },
  HOSPITAL_PAYBILL: { label: "Hospital Paybill", icon: "shield", blurb: "Clinic or hospital paybill for medical bills" },
};

/** Category → allowed payout channels (learnlyMO.md S-6 §S2). */
export const CATEGORY_CHANNELS: Record<RequestCategory, MethodChannel[]> = {
  fees: ["SCHOOL_BANK", "SCHOOL_PAYBILL"],
  upkeep: ["MPESA", "AIRTEL"],
  pocketmoney: ["CARD", "MPESA"],
  fare: ["MPESA", "AIRTEL"],
  equipment: ["SUPPLIER_PAYBILL", "MPESA"],
  medical: ["MPESA", "HOSPITAL_PAYBILL"],
  exam: ["SCHOOL_PAYBILL"],
};

export const KENYAN_BANKS = [
  { name: "KCB Bank", paybill: "522522" },
  { name: "Equity Bank", paybill: "247247" },
  { name: "Co-operative Bank", paybill: "400200" },
  { name: "NCBA Bank", paybill: "885100" },
  { name: "ABSA Bank Kenya", paybill: "303030" },
  { name: "Stanbic Bank", paybill: "600100" },
  { name: "Family Bank", paybill: "222111" },
];

export const PAYOUT_METHODS: PayoutMethod[] = [
  { id: "pm-paybill", channel: "SCHOOL_PAYBILL", label: "Kenya High School — Fees Paybill", owner: "Kenya High School", relationship: "Institution", identifier: "247247 · KHS1187", masked: "Equity 247247 · Acc •••• 1187", status: "VERIFIED", defaultFor: ["fees", "exam"], addedAt: daysAgo(210), lastUsedAt: daysAgo(102) },
  { id: "pm-bank", channel: "SCHOOL_BANK", label: "Kenya High School — KCB Fees A/C", owner: "Kenya High School", relationship: "Institution", identifier: "1104478204471", masked: "KCB •••• 4471", status: "VERIFIED", defaultFor: [], addedAt: daysAgo(210) },
  { id: "pm-mpesa-mum", channel: "MPESA", label: "Mum's M-Pesa", owner: "Esther Njeri Kamau", relationship: "Mother", identifier: "+254722614418", masked: "+254 ••• ••• 418", status: "VERIFIED", defaultFor: ["upkeep", "fare", "medical"], addedAt: daysAgo(208), lastUsedAt: daysAgo(83) },
  { id: "pm-airtel-dad", channel: "AIRTEL", label: "Dad's Airtel Money", owner: "Peter Kamau Mwangi", relationship: "Father", identifier: "+254733209871", masked: "+254 ••• ••• 871", status: "VERIFIED", defaultFor: [], addedAt: daysAgo(190), lastUsedAt: daysAgo(39) },
  { id: "pm-card", channel: "CARD", label: "Kenya High Pocket Card", owner: "Amani Wanjiku Kamau", relationship: "Learner", identifier: "5399 2204 1187 6094", masked: "Pesapal **** 6094", status: "VERIFIED", defaultFor: ["pocketmoney"], addedAt: daysAgo(200), lastUsedAt: daysAgo(23) },
  { id: "pm-supplier", channel: "SUPPLIER_PAYBILL", label: "Savanis Book Centre — Paybill", owner: "Savanis Book Centre Ltd", relationship: "Approved supplier", identifier: "522522 · 11901190", masked: "KCB 522522 · Acc •••• 1190", status: "VERIFIED", defaultFor: ["equipment"], addedAt: daysAgo(74), lastUsedAt: daysAgo(68) },
  { id: "pm-mpesa-self", channel: "MPESA", label: "My M-Pesa line", owner: "Amani Wanjiku Kamau", relationship: "Learner", identifier: "+254758204418", masked: "+254 ••• ••• 418", status: "PENDING", defaultFor: [], addedAt: daysAgo(6) },
];
