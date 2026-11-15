import { useEffect, useState } from "react";
import { Dialog, useToast } from "../ui/primitives";
import { Alert, FileDrop, KV, Masked, MiniTabs, ProgressBar, StatusChip, Toggle, WizardSteps, type UploadFile } from "../ui/overlays";
import { Icon } from "../ui/Icon";
import { SpinnerIcon } from "../marketing/LandingDialogs";
import { useStudent } from "./StudentStore";
import { DOC_CATEGORY_LABEL, DOC_TYPES } from "../../data/documents";
import { TERM_DATES, TERM_DATE_KIND_LABEL, type TermDateKind } from "../../data/academicRecords";
import { RELATED_GROUP_LABEL, RELATED_USERS } from "../../data/relatedUsers";
import { EDU_LEVELS, TERM_NOW, catLabel, daysUntil, eduLevelColor, fmtDate, fmtDateTime, maskPhone } from "../../data/students";
import { clearSessionPreview } from "../../lib/auth-preview";
import { downloadText } from "../../lib/download";
import { navigate } from "../../lib/navigation";

/* ================================================================== */
/* 13. Upload document wizard (type → file → OCR confirm)              */
/* ================================================================== */
export function UploadDocumentModal() {
  const s = useStudent();
  const seed = s.overlays.uploadDoc;
  if (!seed) return null;
  return <UploadInner key={String(seed)} seed={typeof seed === "string" ? seed : ""} />;
}

function UploadInner({ seed }: { seed: string }) {
  const s = useStudent();
  const { toast } = useToast();
  const seeded = DOC_TYPES.find((t) => t.key === seed);
  const [step, setStep] = useState(seeded ? 1 : 0);
  const [typeKey, setTypeKey] = useState(seeded?.key ?? "");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const type = DOC_TYPES.find((t) => t.key === typeKey);
  const close = () => !busy && s.close("uploadDoc");

  useEffect(() => {
    if (step !== 2 || !type?.ocr) return;
    setReading(true);
    const timer = window.setTimeout(() => setReading(false), 900);
    return () => window.clearTimeout(timer);
  }, [step, type?.ocr]);

  const upload = () => {
    if (!type || !files[0]) return;
    setBusy(true);
    window.setTimeout(() => {
      s.addDocument({ typeKey: type.key, category: type.category, title: type.termly ? `${type.label} — ${TERM_NOW}` : type.label, fileName: files[0].name, sizeKb: files[0].sizeKb, term: type.termly ? TERM_NOW : undefined, ocr: type.ocr });
      setBusy(false);
      s.close("uploadDoc");
      toast(`${type.label} uploaded${type.key === "PROFILE_PHOTO" ? "." : " — sent to the verifier queue."}`);
    }, 800);
  };

  return (
    <Dialog open onClose={close} eyebrow="Documents vault" title="Upload a document" maxWidth={620} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" disabled={busy} onClick={() => (step === 0 || (step === 1 && seeded) ? close() : setStep(step - 1))}>
          {step === 0 || (step === 1 && seeded) ? "Cancel" : "Back"}
        </button>
        {step < 2 ? (
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => {
            if (step === 0 && !type) return setError("Choose a document type.");
            if (step === 1 && files.length === 0) return setError("Attach the document to continue.");
            setError("");
            setStep(step + 1);
          }}>Continue <Icon name="arrowRight" size={16} /></button>
        ) : (
          <button type="button" className="ly-btn ly-btn-primary" disabled={busy || reading} onClick={upload}>
            {busy ? <><SpinnerIcon /> Uploading…</> : "Upload document"}
          </button>
        )}
      </>
    }>
      <WizardSteps steps={["Type", "File", "Confirm"]} active={step} />
      {step === 0 && (
        <div className="grid gap-2">
          {DOC_TYPES.map((t) => (
            <button key={t.key} type="button" className={`ly-choice ${typeKey === t.key ? "is-selected" : ""}`} aria-pressed={typeKey === t.key} onClick={() => { setTypeKey(t.key); setError(""); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <span className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>{t.label}</span>
              <span className="ly-hint">{DOC_CATEGORY_LABEL[t.category]}{t.termly ? " · every term" : ""}</span>
            </button>
          ))}
        </div>
      )}
      {step === 1 && type && (
        <div className="grid gap-3">
          <Alert tone="info" title={type.label}>
            {type.ocr ? "We'll read key fields with OCR so the verifier can check them faster." : "This document is checked manually by a verifier."}
          </Alert>
          <FileDrop files={files} onChange={(f) => { setFiles(f.slice(-1)); setError(""); }} max={1} sampleName={`${type.key.toLowerCase()}_scan.pdf`} inputId="ud-file" />
        </div>
      )}
      {step === 2 && type && files[0] && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <KV k="Type">{type.label}</KV>
            <KV k="Vault category">{DOC_CATEGORY_LABEL[type.category]}</KV>
            <KV k="File">{files[0].name} · {files[0].sizeKb} KB</KV>
            {type.termly && <KV k="Term">{TERM_NOW}</KV>}
          </div>
          {type.ocr && (
            reading ? (
              <div className="ly-panel ly-panel-soft flex items-center gap-3" role="status"><SpinnerIcon /> Reading document with OCR…</div>
            ) : (
              <div className="ly-panel ly-panel-soft">
                <div className="ly-eyebrow mb-2">OCR extracted — the verifier confirms or corrects</div>
                {Object.entries(type.ocr).map(([k, v]) => <KV key={k} k={k}>{v}</KV>)}
              </div>
            )
          )}
        </div>
      )}
      {error && <div className="ly-error mt-3" role="alert">{error}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* 14. Document preview                                                */
/* ================================================================== */
export function DocPreviewDialog() {
  const s = useStudent();
  const id = s.overlays.docPreview;
  const doc = typeof id === "string" ? s.documents.find((d) => d.id === id) : undefined;
  if (!doc) return null;
  const close = () => s.close("docPreview");
  const replaceable = DOC_TYPES.some((t) => t.key === doc.typeKey);
  return (
    <Dialog open onClose={close} eyebrow={`${DOC_CATEGORY_LABEL[doc.category]} · ${doc.fileName}`} title={doc.title} maxWidth={620} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Close</button>
        {doc.status !== "VERIFIED" && replaceable && (
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => { close(); s.open("uploadDoc", doc.typeKey); }}><Icon name="upload" size={16} /> Upload a new version</button>
        )}
      </>
    }>
      <div className="grid gap-4">
        {doc.status === "REJECTED" && <Alert tone="danger" title="Rejected by the verifier">{doc.note}</Alert>}
        {doc.status === "PENDING" && <Alert tone="warning" title="Awaiting verification">{doc.note}</Alert>}
        <div className="doc-sheet" aria-hidden>
          <div className="doc-sheet-head"><span>{doc.title}</span><StatusChip status={doc.status} /></div>
          <i style={{ width: "86%" }} /><i style={{ width: "72%" }} /><i style={{ width: "91%" }} /><i style={{ width: "64%" }} /><i style={{ width: "78%" }} />
        </div>
        <div className="ly-panel">
          <KV k="Status"><StatusChip status={doc.status} /></KV>
          <KV k="Uploaded">{fmtDateTime(doc.uploadedAt)}</KV>
          <KV k="Size">{doc.sizeKb} KB · {doc.pages} page{doc.pages === 1 ? "" : "s"}</KV>
          {doc.term && <KV k="Term">{doc.term}</KV>}
          {doc.verifiedBy && <KV k="Verified by">{doc.verifiedBy}</KV>}
        </div>
        {doc.ocr && (
          <div className="ly-panel ly-panel-soft">
            <div className="ly-eyebrow mb-2">OCR extracted fields</div>
            {Object.entries(doc.ocr).map(([k, v]) => <KV key={k} k={k}>{v}</KV>)}
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 15. Term calendar (reminders + real .ics export)                    */
/* ================================================================== */
type KindFilter = "ALL" | TermDateKind;

export function TermCalendarModal() {
  const s = useStudent();
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [saved, setSaved] = useState("");
  if (!s.overlays.termCalendar) return null;
  const close = () => { setSaved(""); s.close("termCalendar"); };
  const dates = [...TERM_DATES].sort((a, b) => a.at.localeCompare(b.at)).filter((d) => kind === "ALL" || d.kind === kind);

  const exportIcs = () => {
    const chosen = TERM_DATES.filter((d) => s.reminders.includes(d.id));
    const list = chosen.length ? chosen : TERM_DATES;
    const body = list.map((d) => ["BEGIN:VEVENT", `UID:${d.id}@learnly.co.ke`, `DTSTART;VALUE=DATE:${d.at.slice(0, 10).replace(/-/g, "")}`, `SUMMARY:${d.title}`, `DESCRIPTION:${d.detail}`, "END:VEVENT"].join("\r\n")).join("\r\n");
    downloadText("learnly-term-dates.ics", `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Learnly//Term Dates//EN\r\n${body}\r\nEND:VCALENDAR`, "text/calendar");
    setSaved(`learnly-term-dates.ics downloaded with ${list.length} date${list.length === 1 ? "" : "s"}.`);
  };

  return (
    <Dialog open onClose={close} eyebrow={`${s.student.school} · ${TERM_NOW}`} title="Term dates & reminders" maxWidth={680} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={exportIcs}><Icon name="calendar" size={16} /> Add to calendar (.ics)</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Close</button>
      </>
    }>
      <div className="grid gap-4">
        <MiniTabs label="Date type" value={kind} onChange={setKind} tabs={[{ key: "ALL", label: "All", count: TERM_DATES.length }, ...(Object.keys(TERM_DATE_KIND_LABEL) as TermDateKind[]).map((k) => ({ key: k as KindFilter, label: TERM_DATE_KIND_LABEL[k] }))]} />
        {saved && <Alert tone="success" title="Calendar file ready">{saved}</Alert>}
        <ul className="m-0 grid list-none gap-2 p-0">
          {dates.map((d) => {
            const on = s.reminders.includes(d.id);
            const left = daysUntil(d.at);
            return (
              <li key={d.id} className="ly-panel flex items-start gap-3">
                <div className="date-block"><span>{new Date(d.at).toLocaleDateString("en-KE", { month: "short" })}</span><strong>{new Date(d.at).getDate()}</strong></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{d.title}</span>
                    <span className="ly-chip ly-status-chip ly-status-neutral">{TERM_DATE_KIND_LABEL[d.kind]}</span>
                  </div>
                  <div className="ly-hint" style={{ fontSize: 12 }}>{d.detail}</div>
                  <div className="ly-hint mt-1">{fmtDate(d.at)} · in {left} day{left === 1 ? "" : "s"}</div>
                </div>
                <div className="grid justify-items-center gap-1">
                  <Toggle checked={on} onChange={() => s.toggleReminder(d.id)} label={`Remind me about ${d.title}`} />
                  <span className="ly-hint">{on ? "Reminder on" : "Remind me"}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <span className="ly-hint">Reminders arrive in-app and by SMS to your primary contact 3 days before each date.</span>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 16. Profile completeness                                            */
/* ================================================================== */
export function CompletenessModal() {
  const s = useStudent();
  if (!s.overlays.completeness) return null;
  const close = () => s.close("completeness");
  const sections = [...new Set(s.checklist.map((c) => c.section))];

  const act = (key: string, overlay?: string, payload?: string) => {
    close();
    if (key === "line") {
      const pending = s.methods.find((m) => m.channel === "MPESA" && m.relationship === "Learner" && m.status !== "VERIFIED");
      s.open("addMethod", pending ? `verify:${pending.id}` : "MPESA");
    } else if (overlay) s.open(overlay as Parameters<typeof s.open>[0], payload);
  };

  return (
    <Dialog open onClose={close} eyebrow="Profile completeness" title={s.completeness === 100 ? "Your profile is complete" : `${s.completeness}% complete — finish your profile`} maxWidth={620} footer={<button type="button" className="ly-btn ly-btn-primary" onClick={close}>Close</button>}>
      <div className="grid gap-4">
        <ProgressBar value={s.completeness} label="Profile completeness" />
        <div className="flex flex-wrap gap-2">
          {sections.map((sec) => {
            const items = s.checklist.filter((c) => c.section === sec);
            const pct = Math.round((items.filter((c) => c.done).length / items.length) * 100);
            return <span key={sec} className={`ly-chip ly-status-chip ${pct === 100 ? "ly-status-approved" : "ly-status-warn"}`}>{sec} {pct}%</span>;
          })}
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {s.checklist.map((c) => (
            <li key={c.key} className="ly-file-row">
              <span style={{ color: c.done ? "var(--brand-success)" : "var(--text-tertiary)" }}><Icon name={c.done ? "check" : "clock"} size={16} strokeWidth={c.done ? 2.6 : 1.8} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.label}</span>
                <span className="ly-hint">{c.section}</span>
              </span>
              <button type="button" className="ly-link-btn" onClick={() => act(c.key, c.overlay, c.payload)}>{c.done ? "View" : "Complete"} <Icon name="arrowRight" size={14} /></button>
            </li>
          ))}
        </ul>
        {s.completeness < 100 && <span className="ly-hint">A complete profile speeds up verification and unlocks every payout channel.</span>}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 17. Education level                                                 */
/* ================================================================== */
export function EduLevelModal() {
  const s = useStudent();
  if (!s.overlays.eduLevel) return null;
  const close = () => s.close("eduLevel");
  const level = EDU_LEVELS.find((l) => l.key === s.student.eduLevel) ?? EDU_LEVELS[0];
  return (
    <Dialog open onClose={close} eyebrow={`${s.student.grade} · ${s.student.pathway}`} title={level.label} maxWidth={620} footer={
      <>
        <a href={`/levels#level-${level.key}`} className="ly-btn ly-btn-ghost" onClick={(e) => { e.preventDefault(); close(); navigate(`/levels#level-${level.key}`); }}>Full levels reference</a>
        <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Close</button>
      </>
    }>
      <div className="grid gap-4">
        <div className="ly-panel" style={{ borderTop: `4px solid ${eduLevelColor(level.key)}` }}>
          <KV k="School">{s.student.school} · {s.student.stream}</KV>
          <KV k="Age range">{level.ageRange}</KV>
          <KV k="Typical fees">{level.feesRange}</KV>
          <KV k="Identifiers on file">{level.ids}</KV>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ly-panel ly-panel-soft">
            <div className="ly-eyebrow mb-2">Grades at this level</div>
            <ul className="m-0 grid gap-1 pl-4" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{level.gradeList.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
          <div className="ly-panel ly-panel-soft">
            <div className="ly-eyebrow mb-2">Assessment touch-points</div>
            <ul className="m-0 grid gap-1 pl-4" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{level.examPoints.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </div>
        <div>
          <div className="ly-eyebrow mb-2">Request categories enabled for your level</div>
          <div className="flex flex-wrap gap-2">
            {level.categories.map((c) => (
              <button key={c.category} type="button" className="ly-chip" style={{ cursor: "pointer" }} onClick={() => { close(); s.open("newRequest", c.category); }}>
                <span className={`ly-cat-dot ly-cat-dot-${c.category}`} /> {c.label ?? catLabel(c.category)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 18. Related user                                                    */
/* ================================================================== */
export function RelatedUserDialog() {
  const s = useStudent();
  const id = s.overlays.relatedUser;
  const user = typeof id === "string" ? RELATED_USERS.find((u) => u.id === id) : undefined;
  if (!user) return null;
  const close = () => s.close("relatedUser");
  const canMessage = user.group !== "FAMILY";
  return (
    <Dialog open onClose={close} eyebrow={RELATED_GROUP_LABEL[user.group]} title={user.name} footer={
      <>
        <a className="ly-btn ly-btn-ghost" href={`tel:${user.phone}`}><Icon name="phone" size={16} /> Call</a>
        {canMessage ? (
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => { close(); s.close("related"); s.close("profile"); s.open("messages", `to:${user.id}`); }}><Icon name="chat" size={16} /> Message</button>
        ) : (
          <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Close</button>
        )}
      </>
    }>
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <span className="ly-avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{user.initials}</span>
          <div>
            <div className="font-semibold">{user.role}</div>
            <div className="ly-hint" style={{ fontSize: 12 }}>{user.organisation}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.primaryContact && <span className="ly-chip ly-status-chip ly-status-approved">Primary contact</span>}
          {user.nextOfKin && <span className="ly-chip ly-status-chip ly-status-disbursed">Next of kin</span>}
          <span className={`ly-chip ly-status-chip ${user.consentToContact ? "ly-status-verified" : "ly-status-neutral"}`}>{user.consentToContact ? "Consented to contact" : "No contact consent"}</span>
        </div>
        <div className="ly-panel">
          <KV k="Phone"><Masked masked={maskPhone(user.phone)} full={user.phone} label={`${user.name}'s phone number`} /></KV>
          <KV k="Email">{user.email ?? "Not provided"}</KV>
          <KV k="Organisation">{user.organisation}</KV>
        </div>
        <Alert tone="info">{user.note}</Alert>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 19. DPA 2019 data export (real JSON download)                       */
/* ================================================================== */
export function DataExportDialog() {
  const s = useStudent();
  const [saved, setSaved] = useState("");
  if (!s.overlays.dataExport) return null;
  const close = () => { setSaved(""); s.close("dataExport"); };
  return (
    <Dialog open onClose={close} eyebrow="Data Protection Act 2019" title="Download my data" footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Close</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={() => {
          const payload = {
            exportedAt: new Date().toISOString(),
            profile: { ...s.student, phone: maskPhone(s.student.phone), nemisUpi: `•••••••${s.student.nemisUpi.slice(-4)}`, birthCertNo: `•••${s.student.birthCertNo.slice(-3)}` },
            requests: s.requests,
            payouts: s.payouts,
            payoutMethods: s.methods.map((m) => ({ ...m, identifier: m.masked })),
            documents: s.documents,
            consents: s.settings.consents,
          };
          downloadText("learnly-my-data.json", JSON.stringify(payload, null, 2), "application/json");
          setSaved("learnly-my-data.json was saved to your device.");
        }}><Icon name="download" size={16} /> Download archive</button>
      </>
    }>
      <div className="grid gap-3" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
        <p className="m-0">You have the right to a copy of everything Learnly holds about you. The archive includes:</p>
        <div className="ly-panel">
          <KV k="Profile & identifiers">masked</KV>
          <KV k="Requests">{s.requests.length} records</KV>
          <KV k="Payouts">{s.payouts.length} records</KV>
          <KV k="Payout methods">{s.methods.length} (masked)</KV>
          <KV k="Document metadata">{s.documents.length} files</KV>
          <KV k="Consent log">5 purposes</KV>
        </div>
        {saved ? <Alert tone="success" title="Archive downloaded">{saved} This download is recorded in your audit trail.</Alert> : <span className="ly-hint">In production the full ZIP (including document files) is prepared asynchronously in about 10 minutes.</span>}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 20. Help & support + 21. Sign out                                   */
/* ================================================================== */
const FAQ: [string, string][] = [
  ["Why can't I request fees again this term?", "Fees and upkeep are limited to one approved request per term. If something changed, message your programme officer to ask for an override."],
  ["What proof do I need?", "Fees: fee structure + previous term result slip. Upkeep: previous term result slip. Equipment: proforma or school letter. Medical: hospital invoice. Exam registration: school KNEC invoice. Pocket money and fare need no proof."],
  ["Where does the money go?", "Fees and exam registration go to the school paybill or bank account. Upkeep, fare and medical go to a verified M-Pesa or Airtel line. Pocket money goes to your school pocket card."],
  ["A payout failed — what now?", "Failed payouts are retried three times automatically, then reviewed by Finance. Open the payout and choose “Report an issue” or “Message Finance”."],
];

export function HelpDialog() {
  const s = useStudent();
  if (!s.overlays.help) return null;
  const close = () => s.close("help");
  return (
    <Dialog open onClose={close} eyebrow="Help & support" title="How can we help?" maxWidth={600} footer={
      <>
        <a href="/how-it-works" className="ly-btn ly-btn-ghost" onClick={(e) => { e.preventDefault(); close(); navigate("/how-it-works"); }}>How Learnly works</a>
        <button type="button" className="ly-btn ly-btn-primary" onClick={() => { close(); s.open("messages", "to:ru-10"); }}><Icon name="chat" size={16} /> Message my programme officer</button>
      </>
    }>
      <div className="grid gap-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="ly-panel help-faq">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
        <span className="ly-hint mt-2">Prefer email? Write to <a className="ly-link-btn" href="mailto:hello@learnly.co.ke">hello@learnly.co.ke</a> — replies within one working day.</span>
      </div>
    </Dialog>
  );
}

export function SignOutDialog() {
  const s = useStudent();
  if (!s.overlays.signOut) return null;
  const close = () => s.close("signOut");
  const drafts = s.requests.filter((r) => r.status === "DRAFT").length;
  return (
    <Dialog open onClose={close} eyebrow={s.student.fullName} title="Sign out of Learnly?" footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Stay signed in</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={() => { clearSessionPreview(); close(); navigate("/auth/signin"); }}><Icon name="logout" size={16} /> Sign out</button>
      </>
    }>
      <p className="m-0" style={{ color: "var(--text-secondary)" }}>
        {drafts ? `Your ${drafts} draft request${drafts === 1 ? " is" : "s are"} saved on this device and will be here when you return.` : "You have no unsaved work."} You'll need your password or an SMS code to sign back in.
      </p>
    </Dialog>
  );
}
