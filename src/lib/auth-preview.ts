import type { SignupRole, StaffRole } from "../data/auth";
import type { EduLevelKey } from "../data/students";

export interface AccountPreview {
  fullName: string;
  role: SignupRole;
  phoneLast4: string;
  identityLast4: string;
  email?: string;
  createdAt: string;
  consentAt: string;
  activation: "self-service" | "pending-admin";
}

export interface SessionPreview {
  fullName: string;
  role: SignupRole;
  identifierMasked: string;
  authMethod: "password" | "otp";
  verified2fa: boolean;
  remember30d: boolean;
  targetRoute: "/student" | "/admin";
  targetPageName: string;
  eduLevel?: EduLevelKey;
  school?: string;
  gradeLabel?: string;
  staffRole?: StaffRole;
  staffRoleLabel?: string;
  dataScope?: string;
  permissionSummary?: string;
  signedInAt: string;
}

const STORAGE_KEY = "learnly.signup-preview.v1";
const SESSION_STORAGE_KEY = "learnly.session-preview.v1";

/** Persist ONLY a minimal preview. Never passwords, OTPs or full identity numbers. */
export function saveAccountPreview(preview: AccountPreview): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preview));
    return true;
  } catch {
    return false;
  }
}

export function loadAccountPreview(): AccountPreview | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountPreview>;
    if (
      typeof parsed.fullName !== "string" ||
      (parsed.role !== "student" && parsed.role !== "admin") ||
      typeof parsed.phoneLast4 !== "string" ||
      typeof parsed.identityLast4 !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.consentAt !== "string"
    ) {
      return null;
    }
    return parsed as AccountPreview;
  } catch {
    return null;
  }
}

/** Persist ONLY non-sensitive session metadata. Never passwords, OTPs, or TOTP secrets. */
export function saveSessionPreview(session: SessionPreview): boolean {
  try {
    const target = session.remember30d ? localStorage : sessionStorage;
    const other = session.remember30d ? sessionStorage : localStorage;
    other.removeItem(SESSION_STORAGE_KEY);
    target.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function loadSessionPreview(): SessionPreview | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SESSION_STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<SessionPreview>;
      if (
        typeof parsed.fullName === "string" &&
        (parsed.role === "student" || parsed.role === "admin") &&
        typeof parsed.identifierMasked === "string" &&
        (parsed.authMethod === "password" || parsed.authMethod === "otp") &&
        typeof parsed.targetRoute === "string" &&
        typeof parsed.signedInAt === "string"
      ) {
        return parsed as SessionPreview;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function clearSessionPreview(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export const maskPhone = (phone: string) => `+254 ••• ••• ${phone.slice(-3)}`;

export function maskIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    const [local, domain] = trimmed.split("@");
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}•••@${domain}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  return `+254 ••• ••• ${digits.slice(-4)}`;
}
