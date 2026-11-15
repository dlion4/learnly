import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadSessionPreview } from "../../lib/auth-preview";
import { navigate } from "../../lib/navigation";
import {
  INITIAL_PROFILE, type AuditChange, type AuditEntry, type Correction, type Guardian, type ProfileState, type TransferRequest,
} from "../../data/profile";
import { CURRENT_STUDENT, TERM_NOW, type RequestCategory, type Student } from "../../data/students";
import {
  ANNUAL_CAPS, STUDENT_REQUESTS, categoryRule, countsTowardCap, payoutRef, requestRef,
  type RequestProof, type StudentRequest,
} from "../../data/requests";
import { STUDENT_PAYOUTS, type Payout } from "../../data/payouts";
import { PAYOUT_METHODS, type MethodChannel, type MethodStatus, type PayoutMethod } from "../../data/payoutMethods";
import { STUDENT_DOCUMENTS, type DocCategory, type StudentDocument } from "../../data/documents";
import {
  MESSAGE_THREADS, STUDENT_NOTIFICATIONS,
  type MessageThread, type NotificationCategory, type NotificationLink, type StudentNotification,
} from "../../data/messages";

export type PanelKey = "profile" | "financial" | "academic" | "related" | "account" | "documents" | "messages" | "notifications" | "settings";
export type OverlayKey =
  | PanelKey
  | "request" | "payout" | "newRequest" | "withdraw" | "addProof" | "receipt" | "reportIssue" | "completeness"
  | "addMethod" | "removeMethod" | "uploadDoc" | "docPreview" | "termCalendar" | "chart" | "caps" | "export"
  | "eduLevel" | "relatedUser" | "dataExport" | "help" | "signOut";
export type FlashKind = "approved" | "rejected" | "disbursed";

export interface RequestInput {
  category: RequestCategory;
  amountKes: number;
  methodId: string;
  justification: string;
  proofs: RequestProof[];
}

export interface MethodInput {
  channel: MethodChannel;
  label: string;
  owner: string;
  relationship: string;
  identifier: string;
  masked: string;
  status: MethodStatus;
}

export interface DocumentInput {
  typeKey: string;
  category: DocCategory;
  title: string;
  fileName: string;
  sizeKb: number;
  term?: string;
  ocr?: Record<string, string>;
}

export interface Settings {
  language: "en" | "sw";
  prefs: Record<string, boolean>;
  consents: Record<string, boolean>;
}

export interface ChecklistItem {
  key: string;
  section: string;
  label: string;
  done: boolean;
  overlay?: OverlayKey;
  payload?: string;
}

export interface CapInfo {
  perTerm: number;
  annualCap: number;
  used: number;
  annualLeft: number;
  budgetLeft: number;
  max: number;
  binding: string;
}

const DICT: Record<string, [string, string]> = {
  hello: ["Hello", "Habari"],
  overview: ["Overview", "Muhtasari"],
  profile: ["My profile", "Wasifu wangu"],
  financial: ["Financial assistance", "Msaada wa kifedha"],
  academic: ["Academic records", "Rekodi za masomo"],
  related: ["Related users", "Watu wa karibu"],
  account: ["Account & payouts", "Akaunti na malipo"],
  documents: ["Documents", "Nyaraka"],
  messages: ["Messages", "Ujumbe"],
  notifications: ["Notifications", "Arifa"],
  settings: ["Settings", "Mipangilio"],
  activeRequests: ["Active requests", "Maombi hai"],
  pendingApprovals: ["Pending approvals", "Yanayosubiri idhini"],
  totalDisbursed: ["Total disbursed", "Jumla iliyolipwa"],
  nextTermDate: ["Next term date", "Tarehe ijayo ya muhula"],
  newRequest: ["New request", "Ombi jipya"],
  help: ["Help & support", "Msaada"],
  signOut: ["Sign out", "Ondoka"],
};

interface Store {
  student: Student;
  requests: StudentRequest[];
  payouts: Payout[];
  methods: PayoutMethod[];
  documents: StudentDocument[];
  notifications: StudentNotification[];
  threads: MessageThread[];
  reminders: string[];
  settings: Settings;
  overlays: Partial<Record<OverlayKey, string | true>>;
  flash: Record<string, FlashKind>;
  confetti: boolean;
  checklist: ChecklistItem[];
  completeness: number;
  unreadNotifications: number;
  unreadMessages: number;
  t: (key: string) => string;
  open: (key: OverlayKey, payload?: string) => void;
  close: (key: OverlayKey) => void;
  openLink: (link: NotificationLink) => void;
  capInfo: (category: RequestCategory) => CapInfo;
  termBlocker: (category: RequestCategory) => StudentRequest | undefined;
  submitRequest: (input: RequestInput, draftId?: string) => string;
  saveDraft: (input: RequestInput, draftId?: string) => string;
  withdrawRequest: (id: string, reason: string) => void;
  addProof: (id: string, fileNames: string[]) => void;
  addMethod: (input: MethodInput) => string;
  verifyMethod: (id: string) => void;
  removeMethod: (id: string) => void;
  setDefaultMethod: (id: string, category: RequestCategory) => void;
  addDocument: (input: DocumentInput) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearReadNotifications: () => void;
  readThread: (id: string) => void;
  sendMessage: (threadId: string, body: string) => void;
  createThread: (subject: string, withName: string, withRole: string, body: string, relatedId?: string) => string;
  toggleReminder: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  profile: ProfileState;
  saveSection: (changes: AuditChange[], patch: Partial<ProfileState>, reason?: string) => void;
  upsertGuardian: (g: Guardian, changes: AuditChange[], reason?: string) => void;
  removeGuardian: (id: string, reason: string) => void;
  setGuardianFlag: (id: string, flag: "primary" | "nextOfKin") => void;
  setPhoto: () => void;
  addCorrection: (c: Correction) => void;
  withdrawCorrection: (id: string) => void;
  addTransfer: (t: TransferRequest) => void;
  closeAll: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Overlays that live on their own route. Opening them navigates instead of stacking a drawer. */
const ROUTED: Partial<Record<OverlayKey, string>> = { profile: "/student/profile", financial: "/student/financial-assistance", academic: "/student/academic-records", settings: "/student/settings", help: "/student/help" };

/** Append audit entries for each changed field, newest first. */
const withAudit = (existing: AuditEntry[], changes: AuditChange[], actor: string, reason?: string): AuditEntry[] => {
  const at = new Date().toISOString();
  const fresh = changes.map((c, i) => ({ ...c, id: `au-${Date.now().toString(36)}-${i}`, at, actor, reason }));
  return [...fresh, ...existing];
};

export function useStudent(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStudent must be used inside <StudentProvider>");
  return store;
}

const DRAFT_KEY = "learnly.request-drafts.v1";
const CONFETTI_KEY = "learnly.first-approval-seen.v1";
const FINANCE = "David Kimani Njoroge (Finance Officer)";

function loadDrafts(): StudentRequest[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StudentRequest[]).filter((r) => r && r.status === "DRAFT" && typeof r.id === "string") : [];
  } catch {
    return [];
  }
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const student = useMemo<Student>(() => {
    const session = loadSessionPreview();
    if (session?.role !== "student") return CURRENT_STUDENT;
    const parts = session.fullName.trim().split(/\s+/);
    return { ...CURRENT_STUDENT, fullName: session.fullName, firstName: parts[0], initials: `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() };
  }, []);

  const [requests, setRequests] = useState<StudentRequest[]>(() => {
    const drafts = loadDrafts();
    const ids = new Set(drafts.map((d) => d.id));
    return [...drafts, ...STUDENT_REQUESTS.filter((r) => !ids.has(r.id))];
  });
  const [payouts, setPayouts] = useState<Payout[]>(STUDENT_PAYOUTS);
  const [methods, setMethods] = useState<PayoutMethod[]>(PAYOUT_METHODS);
  const [documents, setDocuments] = useState<StudentDocument[]>(STUDENT_DOCUMENTS);
  const [notifications, setNotifications] = useState<StudentNotification[]>(STUDENT_NOTIFICATIONS);
  const [threads, setThreads] = useState<MessageThread[]>(MESSAGE_THREADS);
  const [reminders, setReminders] = useState<string[]>(["td-01", "td-07"]);
  const [settings, setSettings] = useState<Settings>(() => {
    const defaults: Settings = {
    language: "en",
    prefs: { "APPROVAL:sms": true, "APPROVAL:email": true, "PAYOUT:sms": true, "PAYOUT:email": true, "DOCUMENT:email": true, "MESSAGE:push": true, "TERM_REMINDER:email": true, "TERM_REMINDER:sms": false },
    consents: { sponsorship: true, special: true, school: true, comms: true, marketing: false },
    };
    try { const saved = JSON.parse(localStorage.getItem("learnly.settings.v1") || "null"); return saved && typeof saved === "object" ? { ...defaults, ...saved, prefs: { ...defaults.prefs, ...saved.prefs }, consents: { ...defaults.consents, ...saved.consents } } : defaults; } catch { return defaults; }
  });
  useEffect(() => { try { localStorage.setItem("learnly.settings.v1", JSON.stringify(settings)); } catch { /* in-memory fallback */ } }, [settings]);
  const [overlays, setOverlays] = useState<Partial<Record<OverlayKey, string | true>>>({});
  const [flash, setFlash] = useState<Record<string, FlashKind>>({});
  const [confetti, setConfetti] = useState(false);
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);

  const nextRef = useRef(190);
  const nextId = useRef(1);
  const requestsRef = useRef(requests);
  requestsRef.current = requests;
  const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${nextId.current++}`;

  /* Drafts survive a reload (DRAFT is a real lifecycle state). */
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(requests.filter((r) => r.status === "DRAFT")));
    } catch {
      /* storage unavailable — drafts stay in memory */
    }
  }, [requests]);

  const open = useCallback((key: OverlayKey, payload?: string) => {
    const route = ROUTED[key];
    if (route) {
      navigate(payload ? `${route}#${payload}` : route);
      return;
    }
    setOverlays((o) => ({ ...o, [key]: payload ?? true }));
  }, []);
  const close = useCallback((key: OverlayKey) => setOverlays((o) => {
    const next = { ...o };
    delete next[key];
    return next;
  }), []);

  const flashRow = useCallback((id: string, kind: FlashKind) => {
    setFlash((f) => ({ ...f, [id]: kind }));
    window.setTimeout(() => setFlash((f) => {
      const next = { ...f };
      delete next[id];
      return next;
    }), 1600);
  }, []);

  const notify = useCallback((category: NotificationCategory, title: string, body: string, link: NotificationLink) => {
    setNotifications((list) => [{ id: `nt-${Date.now().toString(36)}${list.length}`, category, title, body, at: new Date().toISOString(), read: false, link }, ...list]);
  }, []);

  const openLink = useCallback((link: NotificationLink) => {
    if (link.kind === "settings") open("settings", "privacy");
    else open(link.kind, link.id);
  }, [open]);

  const capInfo = useCallback((category: RequestCategory): CapInfo => {
    const perTerm = categoryRule(category).defaultCapKes;
    const annualCap = ANNUAL_CAPS[category];
    const used = requests.filter((r) => r.category === category && countsTowardCap(r)).reduce((sum, r) => sum + (r.approvedKes ?? r.amountKes), 0);
    const annualLeft = Math.max(0, annualCap - used);
    const budgetLeft = student.budgetLineRemainingKes;
    const max = Math.min(perTerm, annualLeft, budgetLeft);
    const binding = max === perTerm ? "category cap per request" : max === annualLeft ? "your annual sponsor cap" : "the budget line balance";
    return { perTerm, annualCap, used, annualLeft, budgetLeft, max, binding };
  }, [requests, student.budgetLineRemainingKes]);

  const termBlocker = useCallback((category: RequestCategory) => {
    const freq = categoryRule(category).frequency;
    if (freq !== "Per term" && freq !== "Per exam window") return undefined;
    return requests.find((r) => r.category === category && r.term === TERM_NOW && ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF", "APPROVED", "DISBURSED"].includes(r.status));
  }, [requests]);

  const submitRequest = useCallback((input: RequestInput, draftId?: string) => {
    const now = new Date().toISOString();
    const id = draftId ?? requestRef(nextRef.current++);
    const row: StudentRequest = {
      id, category: input.category, amountKes: input.amountKes, status: "SUBMITTED", term: TERM_NOW, submittedAt: now, updatedAt: now,
      methodId: input.methodId, justification: input.justification, proofs: input.proofs,
      timeline: [{ state: "Submitted", at: now, actor: student.fullName, note: input.proofs.length ? `${input.proofs.length} proof document(s) attached.` : "No proof required for this category." }],
    };
    setRequests((prev) => (prev.some((r) => r.id === id) ? prev.map((r) => (r.id === id ? row : r)) : [row, ...prev]));
    flashRow(id, "disbursed");
    notify("APPROVAL", `${id} received`, "Your request is in the verifier queue. Average approval time is 2.3 days.", { kind: "request", id });
    return id;
  }, [flashRow, notify, student.fullName]);

  const saveDraft = useCallback((input: RequestInput, draftId?: string) => {
    const now = new Date().toISOString();
    const id = draftId ?? requestRef(nextRef.current++);
    const row: StudentRequest = {
      id, category: input.category, amountKes: input.amountKes, status: "DRAFT", term: TERM_NOW, submittedAt: now, updatedAt: now,
      methodId: input.methodId, justification: input.justification, proofs: [],
      timeline: [{ state: "Drafted", at: now, actor: student.fullName, note: "Saved without submitting — resume any time." }],
    };
    setRequests((prev) => (prev.some((r) => r.id === id) ? prev.map((r) => (r.id === id ? row : r)) : [row, ...prev]));
    flashRow(id, "disbursed");
    return id;
  }, [flashRow, student.fullName]);

  const withdrawRequest = useCallback((id: string, reason: string) => {
    const now = new Date().toISOString();
    setRequests((prev) => prev.map((r) => (r.id === id
      ? { ...r, status: "WITHDRAWN", reason, updatedAt: now, timeline: [...r.timeline, { state: "Withdrawn", at: now, actor: student.fullName, note: reason }] }
      : r)));
    flashRow(id, "rejected");
  }, [flashRow, student.fullName]);

  const addProof = useCallback((id: string, fileNames: string[]) => {
    const now = new Date().toISOString();
    setRequests((prev) => prev.map((r) => (r.id === id
      ? {
          ...r,
          status: r.status === "AWAITING_PROOF" ? "SUBMITTED" : r.status,
          updatedAt: now,
          proofs: [...r.proofs, ...fileNames.map((name): RequestProof => ({ name, purpose: "Additional proof", status: "PENDING" }))],
          timeline: [...r.timeline, { state: "Proof re-submitted", at: now, actor: student.fullName, note: `${fileNames.length} new document(s) sent for re-review.` }],
        }
      : r)));
    flashRow(id, "disbursed");
  }, [flashRow, student.fullName]);

  const addMethod = useCallback((input: MethodInput) => {
    const id = uid("pm");
    setMethods((prev) => [...prev, { ...input, id, defaultFor: [], addedAt: new Date().toISOString() }]);
    return id;
  }, []);
  const verifyMethod = useCallback((id: string) => setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, status: "VERIFIED" } : m))), []);
  const removeMethod = useCallback((id: string) => setMethods((prev) => prev.filter((m) => m.id !== id)), []);
  const setDefaultMethod = useCallback((id: string, category: RequestCategory) => setMethods((prev) => prev.map((m) => ({
    ...m,
    defaultFor: m.id === id ? [...new Set([...m.defaultFor, category])] : m.defaultFor.filter((c) => c !== category),
  }))), []);

  const addDocument = useCallback((input: DocumentInput) => {
    const id = uid("doc");
    const isPhoto = input.typeKey === "PROFILE_PHOTO";
    setDocuments((prev) => [{
      id, typeKey: input.typeKey, category: input.category, title: input.title, fileName: input.fileName, sizeKb: input.sizeKb, pages: 1,
      term: input.term, ocr: input.ocr, status: isPhoto ? "VERIFIED" : "PENDING", uploadedAt: new Date().toISOString(),
      note: isPhoto ? undefined : "In the verifier queue — usually cleared within 2 working days.",
    }, ...prev]);
    return id;
  }, []);

  const markRead = useCallback((id: string) => setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const markAllRead = useCallback(() => setNotifications((list) => list.map((n) => ({ ...n, read: true }))), []);
  const deleteNotification = useCallback((id: string) => setNotifications(list => list.filter(n => n.id !== id)), []);
  const clearReadNotifications = useCallback(() => setNotifications(list => list.filter(n => !n.read)), []);
  const readThread = useCallback((id: string) => setThreads((list) => list.map((t) => (t.id === id && t.unread ? { ...t, unread: 0 } : t))), []);
  const sendMessage = useCallback((threadId: string, body: string) => {
    setThreads((list) => list.map((t) => (t.id === threadId
      ? { ...t, messages: [...t.messages, { id: uid("m"), from: "me", author: student.firstName, body, at: new Date().toISOString() }] }
      : t)));
  }, [student.firstName]);
  const createThread = useCallback((subject: string, withName: string, withRole: string, body: string, relatedId?: string) => {
    const id = uid("th");
    setThreads((list) => [{ id, subject, with: withName, withRole, relatedId, unread: 0, messages: [{ id: uid("m"), from: "me", author: student.firstName, body, at: new Date().toISOString() }] }, ...list]);
    return id;
  }, [student.firstName]);

  const toggleReminder = useCallback((id: string) => setReminders((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id])), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const t = useCallback((key: string) => DICT[key]?.[settings.language === "sw" ? 1 : 0] ?? key, [settings.language]);

  /* ---- Simulated live push: fees request is approved, then disbursed ---- */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("live") === "off") return;
    const target = requestRef(178);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => {
      if (requestsRef.current.find((r) => r.id === target)?.status !== "UNDER_REVIEW") return;
      const now = new Date().toISOString();
      setRequests((prev) => prev.map((r) => (r.id === target && r.status === "UNDER_REVIEW"
        ? { ...r, status: "APPROVED", approvedKes: r.amountKes, updatedAt: now, proofs: r.proofs.map((p) => ({ ...p, status: "VERIFIED" })), timeline: [...r.timeline, { state: "Approved", at: now, actor: FINANCE, note: "Approved in full — queued for school paybill disbursement." }] }
        : r)));
      setDocuments((prev) => prev.map((d) => (d.id === "doc-112" ? { ...d, status: "VERIFIED", verifiedBy: "Esther Wambui Kariuki", note: undefined } : d)));
      flashRow(target, "approved");
      notify("APPROVAL", `${target} approved`, "Your fees request was approved in full and queued for disbursement to the school paybill.", { kind: "request", id: target });
      try {
        if (!localStorage.getItem(CONFETTI_KEY)) {
          localStorage.setItem(CONFETTI_KEY, "1");
          setConfetti(true);
          timers.push(window.setTimeout(() => setConfetti(false), 1900));
        }
      } catch {
        /* storage unavailable — skip the one-shot celebration */
      }
      timers.push(window.setTimeout(() => {
        if (requestsRef.current.find((r) => r.id === target)?.status !== "APPROVED") return;
        const at = new Date().toISOString();
        const poId = payoutRef(764);
        setRequests((prev) => prev.map((r) => (r.id === target
          ? { ...r, status: "DISBURSED", payoutId: poId, updatedAt: at, timeline: [...r.timeline, { state: "Disbursed", at, actor: "Payout engine", note: `Settled · ${poId}` }] }
          : r)));
        setPayouts((prev) => [{ id: poId, requestId: target, category: "fees", amountKes: 53_400, feeKes: 108, channel: "SCHOOL_PAYBILL", methodId: "pm-paybill", destination: "Kenya High School · Equity 247247 · Acc •••• 1187", status: "SETTLED", processorRef: "RNT4W9C6HB", at }, ...prev]);
        flashRow(target, "disbursed");
        flashRow(poId, "disbursed");
        notify("PAYOUT", "KES 53,400 fees settled", `Paid to Kenya High School paybill · ${poId}. Receipt is ready.`, { kind: "payout", id: poId });
      }, 12_000));
    }, 16_000));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [flashRow, notify]);

  /* ---- Profile (S-2) ---- */
  const saveSection = useCallback((changes: AuditChange[], patch: Partial<ProfileState>, reason?: string) => {
    setProfile((p) => ({ ...p, ...patch, audit: withAudit(p.audit, changes, student.fullName, reason) }));
  }, [student.fullName]);

  const upsertGuardian = useCallback((g: Guardian, changes: AuditChange[], reason?: string) => {
    setProfile((p) => {
      const exists = p.guardians.some((x) => x.id === g.id);
      let guardians = exists ? p.guardians.map((x) => (x.id === g.id ? g : x)) : [...p.guardians, g];
      if (g.primary) guardians = guardians.map((x) => (x.id === g.id ? x : { ...x, primary: false }));
      if (g.nextOfKin) guardians = guardians.map((x) => (x.id === g.id ? x : { ...x, nextOfKin: false }));
      const log: AuditChange[] = exists
        ? changes
        : [{ field: "Guardian added", before: "—", after: `${g.name} (${g.relationship})` }];
      return { ...p, guardians, audit: withAudit(p.audit, log, student.fullName, reason) };
    });
  }, [student.fullName]);

  const removeGuardian = useCallback((id: string, reason: string) => {
    setProfile((p) => {
      const target = p.guardians.find((x) => x.id === id);
      if (!target) return p;
      const rest = p.guardians.filter((x) => x.id !== id);
      // The learner must always keep one primary contact.
      if (target.primary && !rest.some((x) => x.primary)) return p;
      return {
        ...p,
        guardians: rest,
        audit: withAudit(p.audit, [{ field: "Guardian removed", before: `${target.name} (${target.relationship})`, after: "Removed — pending admin audit" }], student.fullName, reason),
      };
    });
  }, [student.fullName]);

  const setGuardianFlag = useCallback((id: string, flag: "primary" | "nextOfKin") => {
    setProfile((p) => {
      const target = p.guardians.find((x) => x.id === id);
      if (!target) return p;
      const previous = p.guardians.find((x) => (flag === "primary" ? x.primary : x.nextOfKin));
      if (previous?.id === id) return p;
      const guardians = p.guardians.map((x) => (flag === "primary" ? { ...x, primary: x.id === id } : { ...x, nextOfKin: x.id === id }));
      return {
        ...p,
        guardians,
        audit: withAudit(p.audit, [{ field: flag === "primary" ? "Primary contact" : "Next of kin", before: previous?.name ?? "—", after: target.name }], student.fullName),
      };
    });
  }, [student.fullName]);

  const setPhoto = useCallback(() => {
    setProfile((p) => ({
      ...p,
      photoUploaded: true,
      photoVersion: p.photoVersion + 1,
      audit: withAudit(p.audit, [{ field: "Profile photo", before: p.photoVersion ? `v${p.photoVersion}` : "None", after: `v${p.photoVersion + 1}` }], student.fullName),
    }));
  }, [student.fullName]);

  const addCorrection = useCallback((c: Correction) => {
    setProfile((p) => ({
      ...p,
      corrections: [c, ...p.corrections],
      audit: withAudit(p.audit, [{ field: `Correction requested: ${c.field}`, before: "—", after: c.requested }], student.fullName, c.reason),
    }));
  }, [student.fullName]);

  const withdrawCorrection = useCallback((id: string) => {
    setProfile((p) => {
      const c = p.corrections.find((x) => x.id === id);
      if (!c) return p;
      return {
        ...p,
        corrections: p.corrections.filter((x) => x.id !== id),
        audit: withAudit(p.audit, [{ field: `Correction withdrawn: ${c.field}`, before: c.requested, after: "—" }], student.fullName),
      };
    });
  }, [student.fullName]);

  const addTransfer = useCallback((t: TransferRequest) => {
    setProfile((p) => ({
      ...p,
      transfers: [t, ...p.transfers],
      audit: withAudit(p.audit, [{ field: "School transfer", before: p.school.name, after: `${t.toSchool} (pending approval)` }], student.fullName, t.reason),
    }));
  }, [student.fullName]);

  const closeAll = useCallback(() => setOverlays({}), []);

  const checklist = useMemo<ChecklistItem[]>(() => [
    { key: "personal", section: "Personal", label: "Names, date of birth & nationality", done: true, overlay: "profile" },
    { key: "photo", section: "Personal", label: "Passport-size profile photo", done: documents.some((d) => d.typeKey === "PROFILE_PHOTO"), overlay: "uploadDoc", payload: "PROFILE_PHOTO" },
    { key: "guardians", section: "Family", label: "Parents & guardians on record", done: true, overlay: "related" },
    { key: "kin", section: "Family", label: "Primary contact & next of kin chosen", done: true, overlay: "related" },
    { key: "home", section: "Home", label: "County, ward & address proof", done: true, overlay: "profile" },
    { key: "school", section: "School", label: "School, class teacher & admission number", done: true, overlay: "profile" },
    { key: "identity", section: "Documents", label: "Birth certificate & NEMIS UPI verified", done: true, overlay: "documents" },
    { key: "consent", section: "Documents", label: "DPA 2019 guardian consent on file", done: true, overlay: "documents" },
    { key: "line", section: "Payouts", label: "Your own M-Pesa line verified", done: methods.some((m) => m.channel === "MPESA" && m.relationship === "Learner" && m.status === "VERIFIED"), overlay: "account" },
  ], [documents, methods]);
  const completeness = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const store: Store = {
    student, requests, payouts, methods, documents, notifications, threads, reminders, settings, overlays, flash, confetti,
    checklist, completeness,
    unreadNotifications: notifications.filter((n) => !n.read).length,
    unreadMessages: threads.reduce((sum, th) => sum + th.unread, 0),
    t, open, close, openLink, capInfo, termBlocker, submitRequest, saveDraft, withdrawRequest, addProof,
    addMethod, verifyMethod, removeMethod, setDefaultMethod, addDocument, markRead, markAllRead, deleteNotification, clearReadNotifications, readThread,
    sendMessage, createThread, toggleReminder, updateSettings,
    profile, saveSection, upsertGuardian, removeGuardian, setGuardianFlag, setPhoto, addCorrection, withdrawCorrection, addTransfer, closeAll,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
