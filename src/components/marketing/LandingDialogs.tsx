import { useState } from "react";
import { Dialog, Stepper, useToast } from "../ui/primitives";
import { EDU_LEVELS, eduLevelLabel, kes, type EduLevel, type EduLevelKey } from "../../data/students";

export type SignupMode = "student" | "admin";

/* ------------------------------------------------------------------ */
/* Sign-up chooser → mini account step (A-1 preview)                   */
/* ------------------------------------------------------------------ */
export function SignUpDialog({
  open,
  onClose,
  initialMode,
  initialLevel = null,
}: {
  open: boolean;
  onClose: () => void;
  initialMode: SignupMode | null;
  initialLevel?: EduLevelKey | null;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<SignupMode | null>(initialMode);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [level, setLevel] = useState<EduLevelKey | null>(initialLevel);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // keep CTA context in sync when the dialog is reopened
  const [lastInitial, setLastInitial] = useState(initialMode);
  if (initialMode !== lastInitial) {
    setLastInitial(initialMode);
    setMode(initialMode);
  }
  const [lastInitialLevel, setLastInitialLevel] = useState(initialLevel);
  if (initialLevel !== lastInitialLevel) {
    setLastInitialLevel(initialLevel);
    setLevel(initialLevel);
  }

  const reset = () => {
    setMode(initialMode);
    setLevel(initialLevel);
    setPhone("");
    setName("");
    setEmail("");
    setConsent(false);
    setErrors({});
    setBusy(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().split(/\s+/).length < 2) e.name = "Enter at least two names (e.g. Amani Wanjiku).";
    if (!/^(7|1)\d{8}$/.test(phone)) e.phone = "Enter a valid Kenyan number, e.g. 712 345 678.";
    if (mode === "admin" && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid work email.";
    if (!consent) e.consent = "DPA 2019 consent is required to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      toast(
        mode === "student"
          ? `Phone validated for +254 ••• ${phone.slice(-3)}. Continue to A-1 signup to verify preview OTP 123456${level ? ` for ${eduLevelLabel(level)}` : ""}.`
          : `Admin details validated for ${email}. Continue to A-1 signup with your bootstrap token.`,
      );
      close();
    }, 800);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      eyebrow={mode ? (mode === "student" ? "Apply as student" : "Admin console") : "Get started"}
      title={mode ? (mode === "student" ? "Create your Learnly account" : "Request admin access") : "How would you like to start?"}
      footer={
        mode ? (
          <>
            <button className="ly-btn ly-btn-ghost" onClick={() => setMode(null)} disabled={busy}>
              Back
            </button>
            <button className="ly-btn ly-btn-primary" onClick={submit} disabled={busy}>
              {busy ? (
                <>
                  <SpinnerIcon /> Sending OTP…
                </>
              ) : mode === "student" ? (
                "Send OTP & continue →"
              ) : (
                "Request access →"
              )}
            </button>
          </>
        ) : undefined
      }
    >
      {!mode ? (
        <div className="grid gap-3">
          <ChoiceCard
            icon="🎓"
            title="I'm a student (or parent / guardian)"
            desc="Self-onboard in 7 steps: Account · Personal · Family · Home · School · Documents · Review. Drafts are saved as you go."
            onClick={() => setMode("student")}
          />
          <ChoiceCard
            icon="📋"
            title="I'm a sponsor or school administrator"
            desc="Open the admin console to onboard students in bulk, review proof-gated requests, approve and disburse via M-Pesa, Airtel or bank."
            onClick={() => setMode("admin")}
          />
          <p className="ly-hint mt-1">
            Already have an account? Close this and tap <strong>Login</strong>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <Stepper
            steps={mode === "student" ? ["Account", "Personal", "Family", "Home", "School", "Documents", "Review"] : ["Account", "Organisation", "Verify"]}
            active={0}
          />
          {mode === "student" && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="su-level">
                Current education level
              </label>
              <select
                id="su-level"
                className="ly-select"
                value={level ?? ""}
                onChange={(e) => setLevel((e.target.value || null) as EduLevelKey | null)}
              >
                <option value="">I'll choose during onboarding</option>
                {EDU_LEVELS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label} — {item.short}
                  </option>
                ))}
              </select>
              <span className="ly-hint">You can change this later; historical levels remain on the student record.</span>
            </div>
          )}
          <div className="ly-field">
            <label className="ly-label" htmlFor="su-name">
              Full name (as on ID / birth certificate)
            </label>
            <input
              id="su-name"
              className={`ly-input ${errors.name ? "is-invalid" : ""}`}
              placeholder="Amani Wanjiku Kamau"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <span className="ly-error">{errors.name}</span>}
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="su-phone">
              Mobile number (Safaricom / Airtel / Telkom)
            </label>
            <div className="ly-phone-input">
              <span className="prefix">🇰🇪 +254</span>
              <input
                id="su-phone"
                inputMode="numeric"
                placeholder="712 345 678"
                value={phone}
                maxLength={9}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {errors.phone ? <span className="ly-error">{errors.phone}</span> : <span className="ly-hint">We'll send a 6-digit OTP via Africa's Talking.</span>}
          </div>
          {mode === "admin" && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="su-email">
                Work email
              </label>
              <input
                id="su-email"
                type="email"
                className={`ly-input ${errors.email ? "is-invalid" : ""}`}
                placeholder="bursar@alliancehigh.ac.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <span className="ly-error">{errors.email}</span>}
            </div>
          )}
          <label className="flex items-start gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I consent to Learnly processing my personal data to administer sponsorship under the{" "}
              <strong>Data Protection Act 2019</strong>. Data stays in the Kenya / East-Africa region.
            </span>
          </label>
          {errors.consent && <span className="ly-error -mt-2">{errors.consent}</span>}
        </div>
      )}
    </Dialog>
  );
}

function ChoiceCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ly-card hover-lift flex w-full items-start gap-4 p-4 text-left"
      style={{ cursor: "pointer", font: "inherit", color: "inherit" }}
    >
      <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm" style={{ color: "var(--text-secondary)" }}>
          {desc}
        </span>
      </span>
      <span className="ml-auto self-center" style={{ color: "var(--brand-primary)" }}>
        →
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sign-in (A-2 preview)                                               */
/* ------------------------------------------------------------------ */
export function SignInDialog({ open, onClose, onForgot }: { open: boolean; onClose: () => void; onForgot: () => void }) {
  const { toast } = useToast();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!id.trim() || pw.length < 6) {
      setErr("Enter your phone/email and a password of at least 6 characters.");
      return;
    }
    setErr("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      toast(`Sign-in preview validated. No real authentication or OTP was sent.`);
      onClose();
    }, 800);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Sign in"
      title="Welcome back to Learnly"
      footer={
        <>
          <button className="ly-btn ly-btn-ghost" onClick={onForgot}>
            Forgot password?
          </button>
          <button className="ly-btn ly-btn-primary" onClick={submit} disabled={busy}>
            {busy ? (
              <>
                <SpinnerIcon /> Signing in…
              </>
            ) : (
              "Sign in →"
            )}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="ly-field">
          <label className="ly-label" htmlFor="si-id">
            Phone number or email
          </label>
          <input id="si-id" className="ly-input" placeholder="0712 345 678 or you@school.ac.ke" value={id} onChange={(e) => setId(e.target.value)} />
        </div>
        <div className="ly-field">
          <label className="ly-label" htmlFor="si-pw">
            Password
          </label>
          <input id="si-pw" type="password" className="ly-input" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {err && <span className="ly-error">{err}</span>}
        <p className="ly-hint">Preview only — no credentials are sent or authenticated. Staff 2FA is enforced in production.</p>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot password (A-5 preview)                                       */
/* ------------------------------------------------------------------ */
export function ForgotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [id, setId] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Account recovery"
      title="Reset your password"
      footer={
        <button
          className="ly-btn ly-btn-primary"
          onClick={() => {
            if (!id.trim()) return;
            toast("Reset preview requested. No SMS or email is sent in this demo.");
            onClose();
          }}
        >
          Send reset OTP →
        </button>
      }
    >
      <div className="ly-field">
        <label className="ly-label" htmlFor="fp-id">
          Phone number or email on your account
        </label>
        <input id="fp-id" className="ly-input" value={id} onChange={(e) => setId(e.target.value)} placeholder="0712 345 678" />
        <span className="ly-hint">For security, we send the OTP to the number on file, never to a new one.</span>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Feature "Learn more" dialogs                                        */
/* ------------------------------------------------------------------ */
export type FeatureKey = "payouts" | "approvals" | "map";

export function FeatureDialog({ feature, onClose, onLevels }: { feature: FeatureKey | null; onClose: () => void; onLevels: () => void }) {
  const content: Record<FeatureKey, { eyebrow: string; title: string; body: React.ReactNode }> = {
    payouts: {
      eyebrow: "Multi-channel payouts",
      title: "Every shilling lands where it should",
      body: (
        <div className="grid gap-3">
          <p className="ly-lead" style={{ fontSize: "1rem" }}>
            Each request category is matched to allowed payout channels — so fees can't be sent to a personal wallet, and pocket money never hits a school account.
          </p>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-tertiary)", fontSize: "var(--fs-label)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th className="py-2 text-left font-semibold">Category</th>
                <th className="py-2 text-left font-semibold">Allowed destinations</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["fees", "School fees", "School bank account (KCB 522522, Equity 247247, Co-op 400200) · school paybill"],
                ["upkeep", "Upkeep", "M-Pesa B2C · Airtel Money (student or guardian line on file)"],
                ["pocketmoney", "Pocket money", "School pocket-card top-up (Pesapal / Cellulant) · student M-Pesa"],
                ["fare", "Fare", "M-Pesa B2C · Airtel Money"],
                ["equipment", "Equipment", "Supplier paybill · M-Pesa · bank EFT"],
                ["medical", "Medical", "Hospital paybill · M-Pesa"],
                ["exam", "Exam registration", "School paybill only (KNEC invoice)"],
              ].map(([k, c, d]) => (
                <tr key={k} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className={`ly-cat-dot ly-cat-dot-${k} mr-2`} />
                    {c}
                  </td>
                  <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                    {d}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ly-hint">
            Receipts are generated on settlement (e.g. M-Pesa ref <span className="font-mono">RKX7H8KP2</span>) and reconciled nightly against processor statements.
          </p>
        </div>
      ),
    },
    approvals: {
      eyebrow: "Proof-gated approvals",
      title: "No proof, no payout",
      body: (
        <div className="grid gap-3">
          <p className="ly-lead" style={{ fontSize: "1rem" }}>
            Requests move through a strict state machine — Draft → Submitted → Under Review → Approved → Disbursed — and each category defines the documents that must be attached before submission is even allowed.
          </p>
          <ul className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)", paddingLeft: 0, listStyle: "none" }}>
            {[
              ["Fees", "Fee structure + previous term result slip"],
              ["Upkeep", "Previous term result slip"],
              ["Equipment", "Proforma invoice or school letter"],
              ["Medical", "Hospital letter / invoice / receipt"],
              ["Exam registration", "School KNEC invoice"],
              ["Pocket money & Fare", "No proof — but capped per week / per trip"],
            ].map(([c, d]) => (
              <li key={c} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                <span style={{ color: "var(--brand-success)" }}>✓</span>
                <span>
                  <strong style={{ color: "var(--text-primary)" }}>{c}</strong> — {d}
                </span>
              </li>
            ))}
          </ul>
          <p className="ly-hint">
            Admins may only adjust amounts <em>down</em>; any change greater than 10% requires a written reason and is written to the immutable audit trail.
          </p>
        </div>
      ),
    },
    map: {
      eyebrow: "Full Kenyan education map",
      title: "From Play Group to Doctorate",
      body: (
        <div className="grid gap-3">
          <p className="ly-lead" style={{ fontSize: "1rem" }}>
            Learnly's taxonomy mirrors the Kenyan system — CBC and legacy 8-4-4, TVET levels, professional colleges, universities, SNE and international curricula. It drives every badge, cap, validation rule and report filter.
          </p>
          <div className="flex flex-wrap gap-2">
            {EDU_LEVELS.map((l) => (
              <span key={l.key} className={`ly-edu-badge ly-edu-badge-${l.key}`}>
                {l.short}
              </span>
            ))}
          </div>
          <p className="ly-hint">Exam touch-points tracked: KPSEA (Grade 6), KJSEA (Grade 9), KSSEA (Grade 12), KCPE/KCSE (legacy), KNEC TVET, CDACC, NITA, ICDL.</p>
        </div>
      ),
    },
  };
  const c = feature ? content[feature] : null;
  return (
    <Dialog
      open={!!feature}
      onClose={onClose}
      eyebrow={c?.eyebrow}
      title={c?.title ?? ""}
      maxWidth={640}
      footer={
        feature === "map" ? (
          <button className="ly-btn ly-btn-primary" onClick={onLevels}>
            See the education map ↓
          </button>
        ) : (
          <button className="ly-btn ly-btn-primary" onClick={onClose}>
            Got it
          </button>
        )
      }
    >
      {c?.body}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Education-level detail                                              */
/* ------------------------------------------------------------------ */
export function LevelDialog({ level, onClose, onApply }: { level: EduLevel | null; onClose: () => void; onApply: () => void }) {
  return (
    <Dialog
      open={!!level}
      onClose={onClose}
      eyebrow={level ? level.short : undefined}
      title={level?.label ?? ""}
      footer={
        <button className="ly-btn ly-btn-primary" onClick={onApply}>
          Apply for this level →
        </button>
      }
    >
      {level && (
        <dl className="grid gap-3 text-sm" style={{ margin: 0 }}>
          <Row k="Grades / levels" v={level.grades} />
          <Row k="KNEC / assessment" v={level.exam} />
          <Row k="Typical fees" v={<span className="font-display" style={{ color: "var(--brand-primary)", fontSize: "1rem" }}>{level.feesRange}</span>} />
          <Row k="Identifiers required" v={level.ids} />
          <Row k="Example institutions" v={level.sampleSchools.join(" · ")} />
        </dl>
      )}
    </Dialog>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
      <dt className="ly-eyebrow" style={{ color: "var(--text-tertiary)" }}>
        {k}
      </dt>
      <dd style={{ margin: 0, color: "var(--text-primary)" }}>{v}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legal dialogs                                                       */
/* ------------------------------------------------------------------ */
export type LegalKey = "privacy" | "terms" | "dpa";
export function LegalDialog({ which, onClose }: { which: LegalKey | null; onClose: () => void }) {
  const map: Record<LegalKey, { title: string; body: string[] }> = {
    privacy: {
      title: "Privacy Policy",
      body: [
        "Learnly collects only the data needed to administer academic sponsorship: identity (birth certificate, national ID, NEMIS UPI), academic records (result slips, KNEC indices), household and school information, and payout destinations.",
        "Phone numbers, bank accounts and card numbers are masked in the interface (•••• last 4). Every 'Reveal' action is itself written to the audit trail.",
        "We never sell personal data. Schools only see the students allocated to them; sponsors only see their own budget lines.",
      ],
    },
    terms: {
      title: "Terms of Service",
      body: [
        "Sponsorship funds are disbursed only for approved requests, to destinations permitted for that category (e.g. fees → school bank or paybill).",
        "Approved amounts may be adjusted downward by an administrator with a logged reason, but never above the requested amount or the applicable cap.",
        "M-Pesa B2C reversals are supported within 24 hours of settlement; bank reversals follow the bank's offline process.",
      ],
    },
    dpa: {
      title: "Data Protection Act 2019 Notice",
      body: [
        "Learnly is a data controller registered with the Office of the Data Protection Commissioner (ODPC). All data is stored in the Kenya / East-Africa region.",
        "Consent is captured per purpose (sponsorship processing, special-category data, sharing with school, transactional comms, marketing) with hash, IP, user-agent and timestamp, and must be renewed every 12 months.",
        "You may download your data (delivered as a ZIP within ~10 minutes) or request deletion. Deletion enters a 30-day grace period, after which records are hard-deleted unless an open payout or audit obligation requires a legal hold.",
      ],
    },
  };
  const c = which ? map[which] : null;
  return (
    <Dialog open={!!which} onClose={onClose} eyebrow="Legal" title={c?.title ?? ""} footer={<button className="ly-btn ly-btn-primary" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {c?.body.map((p, i) => (
          <p key={i} style={{ margin: 0 }}>
            {p}
          </p>
        ))}
        <p className="ly-quote" style={{ fontSize: "0.95rem" }}>
          "Sponsorship with proof, approvals and payouts — not promises." — Learnly, Nairobi
        </p>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export function SpinnerIcon() {
  return (
    <svg className="icon-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </svg>
  );
}

export const sampleAmount = kes(53400);
