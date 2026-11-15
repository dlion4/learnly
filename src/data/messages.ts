import { requestRef, payoutRef } from "./requests";
import { daysAgo } from "./students";

export interface ThreadMessage {
  id: string;
  from: "me" | "them";
  author: string;
  body: string;
  at: string;
}

export interface MessageThread {
  id: string;
  subject: string;
  with: string;
  withRole: string;
  relatedId?: string;
  unread: number;
  messages: ThreadMessage[];
}

const m = (id: string, from: "me" | "them", author: string, body: string, d: number, hour: number): ThreadMessage => ({ id, from, author, body, at: daysAgo(d, hour) });

export const MESSAGE_THREADS: MessageThread[] = [
  {
    id: "th-01", subject: `Laptop proforma for ${requestRef(183)}`, with: "Esther Wambui Kariuki", withRole: "Academic Verifier", relatedId: requestRef(183), unread: 1,
    messages: [
      m("m-011", "me", "Amani", "Good morning. I've submitted the laptop request with the quotation from Savanis Book Centre.", 3, 9),
      m("m-012", "them", "Esther Wambui Kariuki", "Thanks Amani. The proforma is unsigned and has no stamp, so I can't verify it. Please upload a stamped copy, or a signed letter from Dr. Rono (HOD STEM) confirming the requirement.", 2, 11),
      m("m-013", "them", "Esther Wambui Kariuki", "Once it's in, I'll move the request straight back to review — no need to submit a new one.", 2, 12),
    ],
  },
  {
    id: "th-02", subject: `Failed medical payout ${payoutRef(731)}`, with: "David Kimani Njoroge", withRole: "Finance Officer", relatedId: payoutRef(731), unread: 1,
    messages: [
      m("m-021", "them", "David Kimani Njoroge", "Hi Amani — the KES 3,200 optician payout to your mum's M-Pesa timed out three times. Could you confirm her line is switched on and can receive money?", 9, 15),
      m("m-022", "me", "Amani", "She was upcountry with poor network. She's back in Karatina now and the line is working.", 8, 8),
      m("m-023", "them", "David Kimani Njoroge", "Noted. I'll re-queue it in the next batch — you'll get a notification when it settles.", 1, 16),
    ],
  },
  {
    id: "th-03", subject: "Fee structure for this term", with: "Mr. Peter Mutuku Musyoka", withRole: "Bursar · Kenya High School", unread: 0,
    messages: [
      m("m-031", "me", "Amani", "Good afternoon sir. May I have the official fee structure for this term to attach to my sponsor request?", 7, 14),
      m("m-032", "them", "Mr. Peter Mutuku Musyoka", "Sent to your class teacher this morning — total payable is KES 53,400. Collect the stamped copy from the accounts office.", 6, 10),
      m("m-033", "me", "Amani", "Received and uploaded. Thank you.", 5, 12),
    ],
  },
  {
    id: "th-04", subject: "Welcome to the Nyeri County Girls STEM Fund", with: "Samuel Korir Kiprotich", withRole: "Sponsor programme officer", unread: 0,
    messages: [
      m("m-041", "them", "Samuel Korir Kiprotich", "Karibu Amani! Your profile is active. Fees go straight to the school paybill; upkeep and fare go to your mum's M-Pesa. Message me here if anything is unclear.", 210, 9),
      m("m-042", "me", "Amani", "Asante sana. I will upload my result slip every term as required.", 209, 17),
    ],
  },
];

export type NotificationCategory = "APPROVAL" | "PAYOUT" | "DOCUMENT" | "MESSAGE" | "TERM_REMINDER" | "SYSTEM";

export interface NotificationLink {
  kind: "request" | "payout" | "docPreview" | "messages" | "termCalendar" | "settings" | "account";
  id?: string;
}

export interface StudentNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link: NotificationLink;
}

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  APPROVAL: "Approvals",
  PAYOUT: "Payouts",
  DOCUMENT: "Documents",
  MESSAGE: "Messages",
  TERM_REMINDER: "Reminders",
  SYSTEM: "System",
};

const n = (id: string, category: NotificationCategory, title: string, body: string, d: number, hour: number, read: boolean, link: NotificationLink): StudentNotification => ({ id, category, title, body, at: daysAgo(d, hour), read, link });

export const STUDENT_NOTIFICATIONS: StudentNotification[] = [
  n("nt-12", "MESSAGE", "New message from David Kimani Njoroge", "Your failed medical payout will be re-queued in the next batch.", 1, 16, false, { kind: "messages", id: "th-02" }),
  n("nt-11", "APPROVAL", `More proof needed for ${requestRef(183)}`, "The laptop proforma is unsigned. Upload a stamped copy or HOD letter.", 2, 11, false, { kind: "request", id: requestRef(183) }),
  n("nt-10", "DOCUMENT", "Laptop proforma rejected", "Verifier note: unsigned and unstamped.", 2, 11, false, { kind: "docPreview", id: "doc-111" }),
  n("nt-09", "APPROVAL", `${requestRef(178)} is under review`, "Your fees request moved to review. Fee structure verification is in progress.", 4, 9, true, { kind: "request", id: requestRef(178) }),
  n("nt-08", "TERM_REMINDER", "Fee payment deadline in 4 days", "The bursar's deadline is approaching. Your fees request is already in review.", 3, 8, true, { kind: "termCalendar" }),
  n("nt-07", "PAYOUT", `Payout ${payoutRef(731)} failed`, "KES 3,200 to Mum's M-Pesa timed out after 3 retries.", 10, 14, true, { kind: "payout", id: payoutRef(731) }),
  n("nt-06", "SYSTEM", "Your M-Pesa line needs verification", "Enter the OTP sent to +254 ••• ••• 418 to use it for pocket money.", 6, 10, true, { kind: "account" }),
  n("nt-05", "PAYOUT", "KES 2,500 pocket money settled", `Pocket Card top-up settled · ${payoutRef(698)}.`, 22, 14, true, { kind: "payout", id: payoutRef(698) }),
  n("nt-04", "SYSTEM", "Consent renewal due in 21 days", "Your guardian's DPA 2019 consent must be renewed to keep requests open.", 5, 9, true, { kind: "settings" }),
  n("nt-03", "PAYOUT", "KES 1,200 fare settled", `Airtel Money to Dad settled · ${payoutRef(655)}.`, 38, 14, true, { kind: "payout", id: payoutRef(655) }),
  n("nt-02", "DOCUMENT", "Previous term report verified", "Your report form is verified and unlocks this term's fees and upkeep.", 35, 15, true, { kind: "docPreview", id: "doc-109" }),
  n("nt-01", "APPROVAL", `${requestRef(157)} was rejected`, "A smartphone is not on the Grade 10 STEM requirements list.", 48, 12, true, { kind: "request", id: requestRef(157) }),
];
