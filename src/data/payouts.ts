import { payoutRef, requestRef } from "./requests";
import type { MethodChannel } from "./payoutMethods";
import { daysAgo, type RequestCategory } from "./students";

export type PayoutStatus = "QUEUED" | "SETTLED" | "FAILED" | "REVERSED";

export interface Payout {
  id: string;
  requestId: string;
  category: RequestCategory;
  amountKes: number;
  feeKes: number;
  channel: MethodChannel;
  methodId: string;
  destination: string;
  status: PayoutStatus;
  processorRef: string;
  at: string;
  failure?: string;
  note?: string;
}

const p = (
  n: number, req: number, category: RequestCategory, amountKes: number, feeKes: number, channel: MethodChannel,
  methodId: string, destination: string, status: PayoutStatus, processorRef: string, d: number, extra: Partial<Payout> = {},
): Payout => ({ id: payoutRef(n), requestId: requestRef(req), category, amountKes, feeKes, channel, methodId, destination, status, processorRef, at: daysAgo(d, 14), ...extra });

const KHS = "Kenya High School · Equity 247247 · Acc •••• 1187";
const MUM = "Esther Njeri Kamau · +254 ••• ••• 418";
const CARD = "Pocket Card · Pesapal **** 6094";

export const STUDENT_PAYOUTS: Payout[] = [
  p(731, 171, "medical", 3_200, 23, "MPESA", "pm-mpesa-mum", MUM, "FAILED", "—", 10, { failure: "ResultCode 1037 — DS timeout: subscriber could not be reached. 3 automatic retries (1 min · 5 min · 15 min) exhausted." }),
  p(698, 166, "pocketmoney", 2_500, 15, "CARD", "pm-card", CARD, "SETTLED", "PSP-915588", 22),
  p(655, 160, "fare", 1_200, 13, "AIRTEL", "pm-airtel-dad", "Peter Kamau Mwangi · +254 ••• ••• 871", "SETTLED", "AIR-77193K", 38),
  p(602, 152, "pocketmoney", 2_500, 15, "CARD", "pm-card", CARD, "SETTLED", "PSP-902761", 56),
  p(571, 147, "equipment", 6_500, 34, "SUPPLIER_PAYBILL", "pm-supplier", "Savanis Book Centre · KCB 522522 · Acc •••• 1190", "SETTLED", "RMJ5P2X8KA", 68),
  p(533, 139, "fare", 1_400, 13, "MPESA", "pm-mpesa-mum", MUM, "SETTLED", "RMC8T3Q1ZD", 82),
  p(490, 131, "pocketmoney", 2_500, 0, "CARD", "pm-card", CARD, "REVERSED", "PSP-884130", 94, { note: "Duplicate card push detected in nightly reconciliation and reversed by Finance within 24 hours." }),
  p(489, 131, "pocketmoney", 2_500, 15, "CARD", "pm-card", CARD, "SETTLED", "PSP-884129", 94),
  p(467, 126, "exam", 2_500, 23, "SCHOOL_PAYBILL", "pm-paybill", KHS, "SETTLED", "RLM2K7V5LP", 102),
  p(431, 121, "upkeep", 12_000, 57, "MPESA", "pm-mpesa-mum", MUM, "SETTLED", "RLB4N9W2TX", 118),
  p(412, 118, "fees", 53_400, 108, "SCHOOL_PAYBILL", "pm-paybill", KHS, "SETTLED", "RKX7H8KP2", 126),
];

export interface MonthBucket {
  key: string;
  label: string;
  total: number;
  count: number;
}

/** Settled payouts grouped by calendar month for the last `months` months. */
export function monthlyDisbursed(payouts: Payout[], months: number): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-KE", { month: "short" }), total: 0, count: 0 });
  }
  for (const po of payouts) {
    if (po.status !== "SETTLED") continue;
    const d = new Date(po.at);
    const bucket = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) {
      bucket.total += po.amountKes;
      bucket.count += 1;
    }
  }
  return buckets;
}
