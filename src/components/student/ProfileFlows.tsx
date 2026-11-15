import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Dialog, useToast } from "../ui/primitives";
import { Alert, Drawer, EmptyState, FileDrop, KV, Masked, MiniTabs, Pagination, Tabs, WizardSteps, type UploadFile } from "../ui/overlays";
import { Icon } from "../ui/Icon";
import { SpinnerIcon } from "../marketing/LandingDialogs";
import { useStudent } from "./StudentStore";
import {
  BLOOD_GROUPS, BUILDING_TYPES, COUNTIES, CONSENT_LOG, CONSENT_PURPOSES, DISABILITY_TYPES, IDENTIFIERS, INCOME_BANDS,
  KENYA_BOUNDS, LANGUAGE_OPTIONS, OWNERSHIP, RELATIONSHIPS, RELIGIONS, TRAVEL_MODES,
  VERIFICATION_LABEL, incomeBucket, type AuditChange, type Guardian, type Identifier, type IncomeBand, type Teacher,
} from "../../data/profile";
import { ACADEMIC_TENURES } from "../../data/academicRecords";
import { PARTNER_SCHOOLS } from "../../data/schools";
import { OTP_PREVIEW_CODE } from "../../data/auth";
import { fmtDate, fmtDateTime, maskPhone, relativeTime } from "../../data/students";
import { downloadText, toCsv } from "../../lib/download";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */
export const diffOf = (rows: [string, string, string][]): AuditChange[] =>
  rows.filter(([, before, after]) => before !== after).map(([field, before, after]) => ({ field, before, after }));

export const initialsOf = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const savedToast = (n: number): string =>
  `Profile saved — ${n} change${n === 1 ? "" : "s"} written to the audit trail.`;

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const inKenya = (lat: number, lng: number) =>
  lat >= KENYA_BOUNDS.latMin && lat <= KENYA_BOUNDS.latMax && lng >= KENYA_BOUNDS.lngMin && lng <= KENYA_BOUNDS.lngMax;

export function AuditDiff({ changes }: { changes: AuditChange[] }) {
  if (changes.length === 0) {
    return <Alert tone="info" title="No changes yet">Change a value to see the before and after preview.</Alert>;
  }
  return (
    <div className="ly-table-wrap is-card-stack">
      <table className="ly-table responsive-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.field}>
              <td data-label="Field"><strong>{c.field}</strong></td>
              <td data-label="Before"><span className="diff-old">{c.before || "—"}</span></td>
              <td data-label="After"><span className="diff-new">{c.after || "—"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/* Single field edit (two steps: edit → audit preview)                 */
/* ================================================================== */
export function FieldEditDialog({ label, current, options, hint, onSave, onClose }: {
  label: string; current: string; options?: string[]; hint?: string; onSave: (value: string) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(current);
  const [review, setReview] = useState(false);
  const next = value.trim();
  const valid = options ? true : next.length >= 2;
  const changes = diffOf([[label, current, next]]);
  return (
    <Dialog open onClose={onClose} eyebrow="My profile · edit" title={`Edit ${label.toLowerCase()}`} maxWidth={520} footer={
      review ? (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => setReview(false)}>Back</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => onSave(next)}>Save change</button>
        </>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ly-btn ly-btn-primary" disabled={!valid || changes.length === 0} onClick={() => setReview(true)}>
            Review change <Icon name="arrowRight" size={16} />
          </button>
        </>
      )
    }>
      {review ? (
        <div className="grid gap-3">
          <Alert tone="info" title="Audit preview">The change is saved with the time and your account. Admins can see the before and after values.</Alert>
          <AuditDiff changes={changes} />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="ly-field">
            <label className="ly-label" htmlFor="pf-edit-value">{label}</label>
            {options ? (
              <select id="pf-edit-value" className="ly-select" value={value} onChange={(e) => setValue(e.target.value)}>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id="pf-edit-value" className="ly-input" value={value} maxLength={40} onChange={(e) => setValue(e.target.value)} />
            )}
            {hint && <span className="ly-hint">{hint}</span>}
            {!valid && <span className="ly-error" role="alert">Enter at least two characters.</span>}
          </div>
          {changes.length === 0 && <span className="ly-hint">Change the value to review it.</span>}
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* Languages (multi-select, at least one required)                     */
/* ================================================================== */
export function LanguagesDialog({ current, onSave, onClose }: { current: string[]; onSave: (langs: string[]) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<string[]>(current);
  const [review, setReview] = useState(false);
  const ordered = LANGUAGE_OPTIONS.filter((l) => picked.includes(l));
  const changes = diffOf([["Languages spoken", current.join(" · "), ordered.join(" · ")]]);
  const toggle = (l: string) => setPicked((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  return (
    <Dialog open onClose={onClose} eyebrow="My profile · languages" title="Languages spoken" maxWidth={600} footer={
      review ? (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => setReview(false)}>Back</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => onSave(ordered)}>Save languages</button>
        </>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ly-btn ly-btn-primary" disabled={ordered.length === 0 || changes.length === 0} onClick={() => setReview(true)}>Review changes</button>
        </>
      )
    }>
      {review ? (
        <AuditDiff changes={changes} />
      ) : (
        <div className="grid gap-3">
          <fieldset className="m-0 border-0 p-0">
            <legend className="ly-label mb-2">Tap every language you speak well enough to follow a lesson</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <button key={l} type="button" className={`pf-lang-chip ${picked.includes(l) ? "is-on" : ""}`} aria-pressed={picked.includes(l)} onClick={() => toggle(l)}>
                  {picked.includes(l) && <Icon name="check" size={13} strokeWidth={2.6} />} {l}
                </button>
              ))}
            </div>
          </fieldset>
          <span className="ly-hint">{ordered.length} selected · at least one is required.</span>
          {ordered.length === 0 && <span className="ly-error" role="alert">Select at least one language.</span>}
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* Locked (verified) field → explain and offer a correction            */
/* ================================================================== */
export function VitalLockDialog({ field, value, onRequest, onClose }: { field: string; value: string; onRequest: () => void; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} eyebrow="Locked after verification" title={`${field} is locked`} maxWidth={560} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Not now</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={onRequest}>Request a correction <Icon name="arrowRight" size={16} /></button>
      </>
    }>
      <div className="grid gap-4">
        <div className="ly-panel ly-panel-soft flex items-center gap-3">
          <span className="ly-stat-icon"><Icon name="lock" size={17} /></span>
          <div>
            <div className="ly-hint">Current verified value</div>
            <div className="font-semibold">{value}</div>
          </div>
        </div>
        <Alert tone="info" title="Why it's locked">
          {field} was checked by a verifier against your civil registration documents. To protect the record it changes only through a Vital Records Correction: evidence, a verifier check, then an admin decision.
        </Alert>
        <ol className="ly-timeline">
          <li className="is-todo"><strong>You send evidence</strong><div className="ly-hint">Birth certificate or an official correction letter</div></li>
          <li className="is-todo"><strong>A verifier checks it</strong><div className="ly-hint">Usually within 2 working days</div></li>
          <li className="is-todo"><strong>An admin approves and the record updates</strong><div className="ly-hint">The change is logged with before and after values</div></li>
        </ol>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* Vital Records Correction wizard (4 steps incl. confirmation)        */
/* ================================================================== */
const CORRECTABLE = ["Full name", "Date of birth", "Sex", "Birth certificate number", "NEMIS UPI", "KJSEA index", "KPSEA index"];
const EVIDENCE_TYPES = ["Birth certificate", "NEMIS printout", "Court order", "Official letter from KNEC or the school"];

export function VitalCorrectionWizard({ initialField, onClose }: { initialField?: string; onClose: () => void }) {
  const s = useStudent();
  const p = s.profile.personal;
  const start = CORRECTABLE.includes(initialField ?? "") ? (initialField as string) : CORRECTABLE[0];
  const [step, setStep] = useState(0);
  const [field, setField] = useState(start);
  const [requested, setRequested] = useState("");
  const [evidenceType, setEvidenceType] = useState(EVIDENCE_TYPES[0]);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [declared, setDeclared] = useState(false);
  const [err, setErr] = useState("");
  const [ticket, setTicket] = useState("");

  const currentValue = (f: string): string => {
    if (f === "Full name") return [p.firstName, p.middleName, p.lastName].join(" ");
    if (f === "Date of birth") return p.dob;
    if (f === "Sex") return p.sex;
    return IDENTIFIERS.find((i) => i.key === f)?.value ?? "";
  };
  const current = currentValue(field);
  const isDob = field === "Date of birth";

  const next = () => {
    if (step === 0) {
      const v = requested.trim();
      if (!v) return setErr("Enter the correct value.");
      if (v === current) return setErr("The corrected value must differ from the current one.");
      if (isDob && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return setErr("Choose the correct date of birth.");
    }
    if (step === 1 && files.length === 0) return setErr("Attach at least one piece of evidence.");
    setErr("");
    setStep(step + 1);
  };

  const submit = () => {
    if (!declared) return setErr("Tick the declaration to submit.");
    const id = `COR-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    setTicket(id);
    s.addCorrection({ id, field, requested: requested.trim(), reason: evidenceType, status: "PENDING", at: new Date().toISOString(), evidence: files[0]?.name ?? "" });
    setStep(3);
  };

  return (
    <Dialog open onClose={onClose} eyebrow="Vital Records Correction" title={step === 3 ? "Correction request sent" : "Request a correction"} maxWidth={640} footer={
      step === 3 ? (
        <button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Done</button>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</button>
          {step < 2 ? (
            <button type="button" className="ly-btn ly-btn-primary" onClick={next}>Continue <Icon name="arrowRight" size={16} /></button>
          ) : (
            <button type="button" className="ly-btn ly-btn-primary" onClick={submit}>Submit for verification</button>
          )}
        </>
      )
    }>
      <WizardSteps steps={["Field", "Evidence", "Review", "Done"]} active={step} />

      {step === 0 && (
        <div className="grid gap-4">
          <div className="ly-field">
            <label className="ly-label" htmlFor="vc-field">Which field?</label>
            <select id="vc-field" className="ly-select" value={field} onChange={(e) => { setField(e.target.value); setRequested(""); setErr(""); }}>
              {CORRECTABLE.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="ly-panel ly-panel-soft"><KV k="Current verified value"><span className="font-mono">{current || "—"}</span></KV></div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="vc-value">Correct value</label>
            <input id="vc-value" className="ly-input" type={isDob ? "date" : "text"} value={requested} onChange={(e) => { setRequested(e.target.value); setErr(""); }} placeholder={isDob ? "" : "Type exactly as on the document"} />
            <span className="ly-hint">Type it exactly as it appears on the evidence you will attach next.</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <div className="ly-field">
            <label className="ly-label" htmlFor="vc-evidence">Evidence type</label>
            <select id="vc-evidence" className="ly-select" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
              {EVIDENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <FileDrop files={files} onChange={(f) => { setFiles(f); setErr(""); }} max={2} sampleName={`${field.replace(/\W+/g, "_")}_evidence.pdf`} inputId="vc-files" />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <KV k="Field">{field}</KV>
            <KV k="Current">{current || "—"}</KV>
            <KV k="Requested"><span className="diff-new">{requested.trim()}</span></KV>
            <KV k="Evidence">{evidenceType} · {files.length} file{files.length === 1 ? "" : "s"}</KV>
          </div>
          <Alert tone="warning" title="Nothing changes yet">The record stays as it is until a verifier and an admin approve the correction.</Alert>
          <label className="flex items-start gap-3" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
            <input type="checkbox" className="mt-1" checked={declared} onChange={(e) => { setDeclared(e.target.checked); setErr(""); }} />
            <span>I confirm the evidence is genuine and shows the correct value. Providing false evidence can lead to suspension of sponsorship.</span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <div className="ly-ref" style={{ fontSize: 15 }}>{ticket}</div>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>
            Tracked in <strong>Correction requests</strong> on this page. You can withdraw it there until a verifier picks it up.
          </p>
        </div>
      )}

      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* Profile photo                                                       */
/* ================================================================== */
export function PhotoDialog({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [zoom, setZoom] = useState(1.1);
  const [err, setErr] = useState("");
  const initials = s.profile.personal.firstName.slice(0, 1) + s.profile.personal.lastName.slice(0, 1);

  const save = () => {
    s.setPhoto();
    toast("Profile photo updated.");
    onClose();
  };

  return (
    <Dialog open onClose={onClose} eyebrow="Profile photo" title="Upload a profile photo" maxWidth={560} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(0))}>{step === 0 ? "Cancel" : "Back"}</button>
        {step === 0 ? (
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => { if (!files.length) return setErr("Choose a photo first."); setErr(""); setStep(1); }}>Continue <Icon name="arrowRight" size={16} /></button>
        ) : (
          <button type="button" className="ly-btn ly-btn-primary" onClick={save}>Save photo</button>
        )}
      </>
    }>
      <WizardSteps steps={["Choose", "Frame"]} active={step} />
      {step === 0 ? (
        <div className="grid gap-3">
          <FileDrop files={files} onChange={(f) => { setFiles(f.slice(-1)); setErr(""); }} max={1} sampleName="passport_photo.jpg" inputId="ph-files" />
          <span className="ly-hint">Square crop, face centred, plain background. JPG or PNG up to 5 MB.</span>
        </div>
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-2">
          <div className="grid justify-items-center gap-3">
            <div className="pf-crop" aria-label="Crop preview">
              <span className="pf-crop-face" style={{ transform: `scale(${zoom})` }}>{initials}</span>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="ly-field">
              <label className="ly-label" htmlFor="ph-zoom">Zoom ({zoom.toFixed(1)}×)</label>
              <input id="ph-zoom" type="range" min={1} max={2} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </div>
            <KV k="File">{files[0]?.name}</KV>
            <KV k="Size">{files[0]?.sizeKb} KB</KV>
            <Alert tone="info">The photo appears on your profile and on the verifier's review card.</Alert>
          </div>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* Full profile wizard: choose → edit → review → done                  */
/* ================================================================== */
type EditSection = "personal" | "home" | "school";

export function EditProfileWizard({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const p = s.profile;
  const h = p.home;
  const sc = p.school;
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<EditSection[]>(["personal"]);
  const [draft, setDraft] = useState({
    preferredName: p.personal.preferredName,
    bloodGroup: p.personal.bloodGroup,
    religion: p.personal.religion,
    landmark: h.landmark,
    buildingType: h.buildingType,
    ownership: h.ownership,
    travelMode: h.travelMode,
    boarding: sc.boarding,
    reason: "",
  });
  const [err, setErr] = useState("");
  const on = (k: EditSection) => picked.includes(k);
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const rows: [string, string, string][] = [];
  if (on("personal")) rows.push(["Preferred name", p.personal.preferredName, draft.preferredName.trim()], ["Blood group", p.personal.bloodGroup, draft.bloodGroup], ["Religion", p.personal.religion, draft.religion]);
  if (on("home")) rows.push(["Landmark", h.landmark, draft.landmark.trim()], ["Building type", h.buildingType, draft.buildingType], ["Ownership", h.ownership, draft.ownership], ["Travel mode", h.travelMode, draft.travelMode]);
  if (on("school")) rows.push(["Boarding status", sc.boarding, draft.boarding]);
  const changes = diffOf(rows);
  const boardingChanged = on("school") && draft.boarding !== sc.boarding;

  const next = () => {
    if (step === 0) {
      if (picked.length === 0) return setErr("Choose at least one section.");
    }
    if (step === 1) {
      if (on("personal") && draft.preferredName.trim().length < 2) return setErr("Preferred name needs at least two characters.");
      if (on("home") && draft.landmark.trim().length < 8) return setErr("Describe the landmark in at least 8 characters.");
    }
    if (step === 2) {
      if (changes.length === 0) return setErr("Nothing has changed yet — edit a field or go back and pick another section.");
      if (boardingChanged && draft.reason.trim().length < 15) return setErr("Boarding changes need a reason of at least 15 characters.");
      s.saveSection(
        changes,
        {
          personal: { ...p.personal, preferredName: draft.preferredName.trim(), bloodGroup: draft.bloodGroup, religion: draft.religion },
          home: { ...h, landmark: draft.landmark.trim(), buildingType: draft.buildingType, ownership: draft.ownership, travelMode: draft.travelMode },
          school: { ...sc, boarding: draft.boarding },
        },
        draft.reason.trim() || undefined,
      );
      toast(savedToast(changes.length));
      setErr("");
      setStep(3);
      return;
    }
    setErr("");
    setStep(step + 1);
  };

  return (
    <Dialog open onClose={onClose} eyebrow="My profile" title="Edit profile" maxWidth={680} footer={
      step === 3 ? (
        <button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Done</button>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={next}>
            {step === 2 ? "Save profile" : "Continue"} {step !== 2 && <Icon name="arrowRight" size={16} />}
          </button>
        </>
      )
    }>
      <WizardSteps steps={["Sections", "Edit", "Review", "Done"]} active={step} />

      {step === 0 && (
        <div className="grid gap-3">
          <p className="pf-steps-note">Choose what you want to change. Names, date of birth and sex are locked and change only through a correction request.</p>
          {([
            ["personal", "Personal details", "Preferred name, blood group, religion"],
            ["home", "Home & residence", "Landmark, building type, ownership, travel"],
            ["school", "Current school", "Boarding status (moving schools is a separate request)"],
          ] as [EditSection, string, string][]).map(([key, title, sub]) => (
            <label key={key} className={`ly-choice ${on(key) ? "is-selected" : ""}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <input type="checkbox" checked={on(key)} onChange={() => setPicked((x) => (x.includes(key) ? x.filter((k) => k !== key) : [...x, key]))} />
              <span className="min-w-0"><span className="block font-semibold">{title}</span><span className="ly-hint block">{sub}</span></span>
            </label>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {on("personal") && (
            <>
              <div className="ly-field">
                <label className="ly-label" htmlFor="ep-pref">Preferred name</label>
                <input id="ep-pref" className="ly-input" value={draft.preferredName} maxLength={30} onChange={(e) => set("preferredName", e.target.value)} />
              </div>
              <div className="ly-field">
                <label className="ly-label" htmlFor="ep-blood">Blood group</label>
                <select id="ep-blood" className="ly-select" value={draft.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
                  {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="ly-field sm:col-span-2">
                <label className="ly-label" htmlFor="ep-religion">Religion</label>
                <select id="ep-religion" className="ly-select" value={draft.religion} onChange={(e) => set("religion", e.target.value)}>
                  {RELIGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}
          {on("home") && (
            <>
              <div className="ly-field sm:col-span-2">
                <label className="ly-label" htmlFor="ep-landmark">Landmark</label>
                <input id="ep-landmark" className="ly-input" value={draft.landmark} maxLength={120} onChange={(e) => set("landmark", e.target.value)} />
                <span className="ly-hint">e.g. “opposite the market matatu stage”.</span>
              </div>
              <div className="ly-field">
                <label className="ly-label" htmlFor="ep-building">Building type</label>
                <select id="ep-building" className="ly-select" value={draft.buildingType} onChange={(e) => set("buildingType", e.target.value)}>
                  {BUILDING_TYPES.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="ly-field">
                <label className="ly-label" htmlFor="ep-ownership">Ownership</label>
                <select id="ep-ownership" className="ly-select" value={draft.ownership} onChange={(e) => set("ownership", e.target.value)}>
                  {OWNERSHIP.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="ly-field sm:col-span-2">
                <label className="ly-label" htmlFor="ep-travel">Travel mode to school</label>
                <select id="ep-travel" className="ly-select" value={draft.travelMode} onChange={(e) => set("travelMode", e.target.value)}>
                  {TRAVEL_MODES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}
          {on("school") && (
            <div className="ly-field sm:col-span-2">
              <label className="ly-label" htmlFor="ep-boarding">Boarding status</label>
              <select id="ep-boarding" className="ly-select" value={draft.boarding} onChange={(e) => set("boarding", e.target.value)}>
                {["Boarding", "Day scholar", "Half-boarding"].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <AuditDiff changes={changes} />
          {boardingChanged && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="ep-reason">Reason for the boarding change</label>
              <textarea id="ep-reason" className="ly-input ly-textarea" value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="e.g. Family relocated; learner now commutes daily." />
            </div>
          )}
          <span className="ly-hint">Saved changes are visible to your sponsor and school liaison, and logged to the audit trail.</span>
        </div>
      )}

      {step === 3 && (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>Your profile is updated. Change history records every field with its before and after value.</p>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* Guardian drawer (overview · contact · history)                      */
/* ================================================================== */
export function GuardianDrawer({ id, onClose, onEdit, onRemove, onFlag }: {
  id: string; onClose: () => void; onEdit: () => void; onRemove: () => void;
  onFlag: (flag: "primary" | "nextOfKin") => void;
}) {
  const s = useStudent();
  const [tab, setTab] = useState<"overview" | "contact" | "history">("overview");
  const [reveal, setReveal] = useState(false);
  const g = s.profile.guardians.find((x) => x.id === id);
  if (!g) return null;
  const history = s.profile.audit.filter((a) => a.before.includes(g.name) || a.after.includes(g.name));
  return (
    <Drawer open onClose={onClose} eyebrow={`${g.relationship} · guardian`} title={g.name} width={560}
      tabs={<Tabs label="Guardian sections" value={tab} onChange={setTab} tabs={[{ key: "overview", label: "Overview" }, { key: "contact", label: "Contact" }, { key: "history", label: "History", count: history.length }]} />}
      footer={
        <>
          <button type="button" className="ly-btn ly-btn-danger ly-btn-sm" onClick={onRemove}><Icon name="trash" size={15} /> Remove</button>
          <a className="ly-btn ly-btn-outline ly-btn-sm" href={`tel:${g.phone}`}><Icon name="phone" size={15} /> Call</a>
          <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={onEdit}><Icon name="edit" size={15} /> Edit</button>
        </>
      }>
      {tab === "overview" && (
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <span className="ly-avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{g.initials}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="ly-chip ly-status-chip ly-status-neutral">{g.relationship}</span>
                {g.primary && <span className="ly-chip ly-status-chip ly-status-warn"><Icon name="star" size={12} /> Primary contact</span>}
                {g.nextOfKin && <span className="ly-chip ly-status-chip ly-status-disbursed"><Icon name="shield" size={12} /> Next of kin</span>}
              </div>
            </div>
          </div>
          <div className="ly-panel">
            <KV k="Occupation">{g.occupation}</KV>
            <KV k="Employer">{g.employer}</KV>
            <KV k="Income band (as the learner sees it)">{incomeBucket(g.incomeBand)}</KV>
            <KV k="Added">{fmtDate(g.addedAt)}</KV>
            <KV k="Note">{g.note}</KV>
          </div>
          <Alert tone="info" title="Income is protected">Only the bucket is shown here. The full band is visible to admins and is stored encrypted.</Alert>
          <div className="flex flex-wrap gap-2">
            {!g.primary && <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => onFlag("primary")}><Icon name="star" size={15} /> Make primary contact</button>}
            {!g.nextOfKin && <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => onFlag("nextOfKin")}><Icon name="shield" size={15} /> Make next of kin</button>}
          </div>
        </div>
      )}
      {tab === "contact" && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <KV k="Phone">
              {reveal ? <span className="font-mono">{g.phone}</span> : <Masked masked={maskPhone(g.phone)} full={g.phone} label={`${g.name}'s phone`} />}
            </KV>
            {g.altPhone && <KV k="Alternative phone">{reveal ? g.altPhone : maskPhone(g.altPhone)}</KV>}
            <KV k="Email">{g.email ? <a className="ly-link-btn" href={`mailto:${g.email}`}>{g.email}</a> : "Not provided"}</KV>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="ly-btn ly-btn-outline ly-btn-sm" href={`tel:${g.phone}`}><Icon name="phone" size={15} /> Call</a>
            <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>
              <Icon name={reveal ? "eyeOff" : "eye"} size={15} /> {reveal ? "Hide numbers" : "Reveal numbers"}
            </button>
          </div>
          <span className="ly-hint">{g.consentToContact ? "This guardian agreed to be contacted about payouts and attendance." : "No contact consent recorded. Only transactional messages are sent."} Reveals are audit-logged.</span>
        </div>
      )}
      {tab === "history" && (
        history.length === 0 ? (
          <EmptyState icon="clock" title="No changes recorded yet">Edits to this guardian will appear here with their before and after values.</EmptyState>
        ) : (
          <ol className="ly-timeline">
            {history.map((a) => (
              <li key={a.id} className="is-done">
                <div className="flex flex-wrap justify-between gap-2"><strong>{a.field}</strong><span className="ly-hint">{fmtDateTime(a.at)}</span></div>
                <div className="ly-hint">{a.actor}</div>
                <div className="mt-1"><span className="diff-old">{a.before}</span> <span className="diff-new">{a.after}</span></div>
              </li>
            ))}
          </ol>
        )
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Add / edit guardian (3 steps + confirmation)                        */
/* ================================================================== */
export function GuardianWizard({ editing, onClose }: { editing?: Guardian; onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  // Read once on open: saving the fourth guardian must not swap the success step for the limit message.
  const [blocked] = useState(() => !editing && s.profile.guardians.length >= 4);
  const [step, setStep] = useState(0);
  const [rel, setRel] = useState(editing?.relationship ?? "Guardian");
  const [name, setName] = useState(editing?.name ?? "");
  const [occupation, setOccupation] = useState(editing?.occupation ?? "");
  const [employer, setEmployer] = useState(editing?.employer ?? "");
  const [phone, setPhone] = useState(editing ? editing.phone.slice(4) : "");
  const [alt, setAlt] = useState(editing?.altPhone ? editing.altPhone.slice(4) : "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [income, setIncome] = useState<IncomeBand>(editing?.incomeBand ?? "10-30k");
  const [consent, setConsent] = useState(editing?.consentToContact ?? true);
  const [primary, setPrimary] = useState(editing?.primary ?? false);
  const [nok, setNok] = useState(editing?.nextOfKin ?? false);
  const [err, setErr] = useState("");
  const currentPrimary = s.profile.guardians.find((g) => g.primary && g.id !== editing?.id);

  const built: Guardian = {
    id: editing?.id ?? `g-${Date.now().toString(36)}`,
    relationship: rel,
    name: name.trim(),
    initials: initialsOf(name),
    phone: `+254${phone}`,
    altPhone: alt ? `+254${alt}` : undefined,
    email: email.trim() || undefined,
    occupation: occupation.trim(),
    employer: employer.trim() || "—",
    incomeBand: income,
    primary,
    nextOfKin: nok,
    consentToContact: consent,
    addedAt: editing?.addedAt ?? new Date().toISOString(),
    note: editing?.note ?? "Added by learner",
  };
  const changes = editing
    ? diffOf([
        ["Relationship", editing.relationship, rel],
        ["Name", editing.name, name.trim()],
        ["Phone", editing.phone, built.phone],
        ["Email", editing.email ?? "", email.trim()],
        ["Occupation", editing.occupation, occupation.trim()],
        ["Employer", editing.employer, built.employer],
        ["Income band", editing.incomeBand, income],
        ["Primary contact", editing.primary ? "Yes" : "No", primary ? "Yes" : "No"],
        ["Next of kin", editing.nextOfKin ? "Yes" : "No", nok ? "Yes" : "No"],
        ["Consent to contact", editing.consentToContact ? "Yes" : "No", consent ? "Yes" : "No"],
      ])
    : [];

  const next = () => {
    if (step === 0) {
      if (name.trim().split(/\s+/).length < 2) return setErr("Enter the guardian's full name (at least two names).");
      if (occupation.trim().length < 3) return setErr("Enter an occupation, e.g. “Teacher” or “Matatu driver”.");
    }
    if (step === 1) {
      if (!/^[17]\d{8}$/.test(phone)) return setErr("Enter a Kenyan number without the leading 0, e.g. 722345678.");
      if (alt && !/^[17]\d{8}$/.test(alt)) return setErr("The alternative number must also be a Kenyan mobile.");
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address or leave it blank.");
    }
    if (step === 2) {
      s.upsertGuardian(built, changes);
      toast("Guardian saved.");
      setStep(3);
      setErr("");
      return;
    }
    setErr("");
    setStep(step + 1);
  };

  if (blocked) {
    return (
      <Dialog open onClose={onClose} eyebrow="Family & guardians" title="You've reached the limit" maxWidth={520} footer={<button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Got it</button>}>
        <Alert tone="warning" title="Four guardians is the maximum">Remove or edit an existing guardian first. Other relatives can still be linked from Related users.</Alert>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} eyebrow="Family & guardians" title={editing ? `Edit ${editing.name}` : "Add a guardian"} maxWidth={640} footer={
      step === 3 ? (
        <button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Done</button>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={next}>
            {step === 2 ? (editing ? "Save changes" : "Add guardian") : "Continue"} {step !== 2 && <Icon name="arrowRight" size={16} />}
          </button>
        </>
      )
    }>
      <WizardSteps steps={["Who", "Contact & income", "Review", "Done"]} active={step} />

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-rel">Relationship</label>
            <select id="gw-rel" className="ly-select" value={rel} onChange={(e) => setRel(e.target.value)}>
              {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-name">Full name</label>
            <input id="gw-name" className="ly-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grace Wambui Njoroge" />
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-occ">Occupation</label>
            <input id="gw-occ" className="ly-input" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Teacher" />
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-emp">Employer or business <span className="ly-hint">(optional)</span></label>
            <input id="gw-emp" className="ly-input" value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Karatina Market" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-phone">Mobile number</label>
            <div className="ly-phone-input">
              <span className="prefix">+254</span>
              <input id="gw-phone" inputMode="numeric" maxLength={9} value={phone} placeholder="722 345 678" onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-alt">Alternative number <span className="ly-hint">(optional)</span></label>
            <div className="ly-phone-input">
              <span className="prefix">+254</span>
              <input id="gw-alt" inputMode="numeric" maxLength={9} value={alt} placeholder="733 000 000" onChange={(e) => setAlt(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-email">Email <span className="ly-hint">(optional)</span></label>
            <input id="gw-email" type="email" className="ly-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gw-income">Monthly income band</label>
            <select id="gw-income" className="ly-select" value={income} onChange={(e) => setIncome(e.target.value as IncomeBand)}>
              {INCOME_BANDS.map((b) => <option key={b} value={b}>{b === "None" ? "Prefer not to say" : `KES ${b}`}</option>)}
            </select>
            <span className="ly-hint">Sensitive. Stored encrypted; the learner sees Low, Mid or High only.</span>
          </div>
          <div className="sm:col-span-2 grid gap-3">
            <label className="flex items-center gap-3" style={{ fontSize: "var(--fs-sm)" }}>
              <Toggle2 checked={primary} onChange={setPrimary} label="Primary contact" />
              <span>Primary contact {currentPrimary && primary && <span className="ly-hint">— replaces {currentPrimary.name}</span>}</span>
            </label>
            <label className="flex items-center gap-3" style={{ fontSize: "var(--fs-sm)" }}>
              <Toggle2 checked={nok} onChange={setNok} label="Next of kin" />
              <span>Next of kin <span className="ly-hint">— contacted first in an emergency</span></span>
            </label>
            <label className="flex items-start gap-3" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>This person agreed to be contacted about payouts, attendance and approvals.</span>
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        editing ? (
          <div className="grid gap-3">
            <AuditDiff changes={changes} />
            <span className="ly-hint">Every change is logged with before and after values.</span>
          </div>
        ) : (
          <div className="ly-panel">
            <KV k="Name">{name.trim()} ({rel})</KV>
            <KV k="Phone">+254 ••• ••• {phone.slice(-3)}</KV>
            <KV k="Occupation">{occupation.trim()} · {employer.trim() || "—"}</KV>
            <KV k="Income">{income === "None" ? "Prefer not to say" : incomeBucket(income)}</KV>
            <KV k="Primary contact">{primary ? "Yes" : "No"}</KV>
            <KV k="Next of kin">{nok ? "Yes" : "No"}</KV>
          </div>
        )
      )}

      {step === 3 && (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>{built.name} is saved on your profile and in the audit trail.</p>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/** Compact switch used inside wizards (keyboard-operable). */
function Toggle2({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`ly-toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

/* ================================================================== */
/* Remove guardian (blocked if sole primary; OTP + audit note)         */
/* ================================================================== */
export function GuardianRemoveDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStudent();
  const g = s.profile.guardians.find((x) => x.id === id);
  const [name] = useState(g?.name ?? "");
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [other, setOther] = useState("");
  const [done, setDone] = useState(false);
  if (!g && !done) return null;
  const target = g ?? s.profile.guardians[0];
  const soleIsPrimary = !!g && g.primary && s.profile.guardians.filter((x) => x.primary).length === 1;
  const others = s.profile.guardians.filter((x) => x.id !== id);

  if (done) {
    return (
      <Dialog open onClose={onClose} eyebrow="Removal recorded" title={`${name} removed`} maxWidth={520} footer={<button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Done</button>}>
        <Alert tone="success" title="Logged for admin audit">The removal is in change history with your note. Payout destinations linked to this person are untouched.</Alert>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} eyebrow="Family & guardians" title={`Remove ${target?.name ?? "guardian"}?`} maxWidth={560} footer={
      soleIsPrimary ? (
        <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Keep guardian</button>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Keep guardian</button>
          <button type="button" className="ly-btn ly-btn-danger" onClick={() => {
            if (reason.trim().length < 15) return setErr("Give an admin audit note of at least 15 characters.");
            if (otp !== OTP_PREVIEW_CODE) return setErr(`Enter the confirmation code (preview: ${OTP_PREVIEW_CODE}).`);
            s.removeGuardian(id, reason.trim());
            setDone(true);
          }}>Remove guardian</button>
        </>
      )
    }>
      {soleIsPrimary ? (
        <div className="grid gap-4">
          <Alert tone="danger" title="This is your only primary contact">A learner must always have one primary contact. Make another guardian primary first, then come back to remove this one.</Alert>
          {others.length > 0 ? (
            <div className="ly-field">
              <label className="ly-label" htmlFor="gr-other">New primary contact</label>
              <select id="gr-other" className="ly-select" value={other || others[0].id} onChange={(e) => setOther(e.target.value)}>
                {others.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.relationship}</option>)}
              </select>
              <button type="button" className="ly-btn ly-btn-outline ly-btn-sm justify-self-start" onClick={() => s.setGuardianFlag(other || others[0].id, "primary")}>
                <Icon name="star" size={15} /> Make primary and continue
              </button>
            </div>
          ) : (
            <Alert tone="info" title="Add another guardian first">Add a second guardian, make them primary, then remove this one.</Alert>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <Alert tone="warning">Removing a guardian is recorded for your admin. Their M-Pesa or Airtel lines stay on file unless you remove them separately.</Alert>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gr-reason">Admin audit note</label>
            <textarea id="gr-reason" className="ly-input ly-textarea" value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} placeholder="e.g. Parents separated; mother is now the only guardian on record." />
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="gr-otp">Confirmation code (preview: {OTP_PREVIEW_CODE})</label>
            <input id="gr-otp" inputMode="numeric" maxLength={6} className="ly-input font-mono" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="6-digit code" />
          </div>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* Confirm primary / next-of-kin change                                */
/* ================================================================== */
export function PrimaryConfirmDialog({ id, flag, onClose }: { id: string; flag: "primary" | "nextOfKin"; onClose: () => void }) {
  const s = useStudent();
  const target = s.profile.guardians.find((g) => g.id === id);
  const previous = s.profile.guardians.find((g) => (flag === "primary" ? g.primary : g.nextOfKin));
  if (!target) return null;
  const label = flag === "primary" ? "primary contact" : "next of kin";
  return (
    <Dialog open onClose={onClose} eyebrow="Confirm change" title={`Make ${target.name} your ${label}?`} maxWidth={500} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={() => { s.setGuardianFlag(id, flag); onClose(); }}>Confirm</button>
      </>
    }>
      <div className="ly-panel">
        <KV k="Currently">{previous?.name ?? "Nobody set"}</KV>
        <KV k="Becomes">{target.name}</KV>
      </div>
      <p className="ly-hint mt-3 mb-0">Logged in change history. {flag === "primary" ? "Verifiers and your school liaison will call this person first." : "This person is contacted first in an emergency."}</p>
    </Dialog>
  );
}

/* ================================================================== */
/* Home & residence wizard (4 steps)                                   */
/* ================================================================== */
export function HomeWizard({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const h = s.profile.home;
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [d, setD] = useState({
    county: h.county, subCounty: h.subCounty, ward: h.ward, constituency: h.constituency, town: h.town,
    estate: h.estate, street: h.street, landmark: h.landmark, buildingType: h.buildingType, ownership: h.ownership,
    rentKes: String(h.rentKes), distanceKm: String(h.distanceKm), travelMode: h.travelMode,
  });
  const set = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));
  const rent = d.ownership === "Rented" ? Number(d.rentKes) : 0;
  const changes = diffOf([
    ["County", h.county, d.county],
    ["Sub-county", h.subCounty, d.subCounty.trim()],
    ["Ward", h.ward, d.ward.trim()],
    ["Constituency", h.constituency, d.constituency.trim()],
    ["Town", h.town, d.town.trim()],
    ["Estate", h.estate, d.estate.trim()],
    ["Street / plot", h.street, d.street.trim()],
    ["Landmark", h.landmark, d.landmark.trim()],
    ["Building type", h.buildingType, d.buildingType],
    ["Ownership", h.ownership, d.ownership],
    ["Rent (KES / month)", String(h.rentKes), String(rent)],
    ["Distance to school (km)", String(h.distanceKm), d.distanceKm],
    ["Travel mode", h.travelMode, d.travelMode],
  ]);

  const next = () => {
    if (step === 0 && [d.subCounty, d.ward, d.constituency, d.town].some((v) => v.trim().length < 2)) return setErr("Fill in sub-county, ward, constituency and town.");
    if (step === 1 && (d.estate.trim().length < 2 || d.street.trim().length < 2 || d.landmark.trim().length < 8)) return setErr("Add the estate, street or plot, and a landmark of at least 8 characters.");
    if (step === 2) {
      const km = Number(d.distanceKm);
      if (!Number.isInteger(km) || km < 1 || km > 400) return setErr("Distance must be a whole number of kilometres between 1 and 400.");
      if (d.ownership === "Rented" && (!Number.isFinite(rent) || rent < 1000)) return setErr("Enter the monthly rent in KES (at least 1,000).");
    }
    if (step === 3) {
      if (changes.length === 0) return setErr("No changes to save yet.");
      s.saveSection(changes, {
        home: { ...h, county: d.county, subCounty: d.subCounty.trim(), ward: d.ward.trim(), constituency: d.constituency.trim(), town: d.town.trim(), estate: d.estate.trim(), street: d.street.trim(), landmark: d.landmark.trim(), buildingType: d.buildingType, ownership: d.ownership, rentKes: rent, distanceKm: Number(d.distanceKm), travelMode: d.travelMode },
      });
      toast(savedToast(changes.length));
      onClose();
      return;
    }
    setErr("");
    setStep(step + 1);
  };

  return (
    <Dialog open onClose={onClose} eyebrow="Home & residence" title="Edit address" maxWidth={680} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={next}>{step === 3 ? "Save address" : "Continue"} {step !== 3 && <Icon name="arrowRight" size={16} />}</button>
      </>
    }>
      <WizardSteps steps={["Location", "Locality", "Building & travel", "Review"]} active={step} />
      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ly-field">
            <label className="ly-label" htmlFor="hw-county">County</label>
            <select id="hw-county" className="ly-select" value={d.county} onChange={(e) => set("county", e.target.value)}>
              {COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="ly-hint">Other counties are chosen from the full 47-county list on the next update.</span>
          </div>
          {([["subCounty", "Sub-county"], ["ward", "Ward"], ["constituency", "Constituency"], ["town", "Nearest town / trading centre"]] as [keyof typeof d, string][]).map(([k, label]) => (
            <div className="ly-field" key={k}>
              <label className="ly-label" htmlFor={`hw-${k}`}>{label}</label>
              <input id={`hw-${k}`} className="ly-input" value={d[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4">
          {([["estate", "Estate / village / location"], ["street", "Street or plot number"]] as [keyof typeof d, string][]).map(([k, label]) => (
            <div className="ly-field" key={k}>
              <label className="ly-label" htmlFor={`hw-${k}`}>{label}</label>
              <input id={`hw-${k}`} className="ly-input" value={d[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div className="ly-field">
            <label className="ly-label" htmlFor="hw-landmark">Landmark</label>
            <textarea id="hw-landmark" className="ly-input ly-textarea" style={{ minHeight: 72 }} value={d.landmark} onChange={(e) => set("landmark", e.target.value)} />
            <span className="ly-hint">e.g. “near Karatina Market, opposite the matatu stage”.</span>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ly-field">
            <label className="ly-label" htmlFor="hw-building">Building type</label>
            <select id="hw-building" className="ly-select" value={d.buildingType} onChange={(e) => set("buildingType", e.target.value)}>
              {BUILDING_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="hw-ownership">Ownership</label>
            <select id="hw-ownership" className="ly-select" value={d.ownership} onChange={(e) => set("ownership", e.target.value)}>
              {OWNERSHIP.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          {d.ownership === "Rented" && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="hw-rent">Rent per month (KES)</label>
              <input id="hw-rent" inputMode="numeric" className="ly-input" value={d.rentKes} onChange={(e) => set("rentKes", e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          <div className="ly-field">
            <label className="ly-label" htmlFor="hw-distance">Distance to school (km)</label>
            <input id="hw-distance" inputMode="numeric" className="ly-input" value={d.distanceKm} onChange={(e) => set("distanceKm", e.target.value.replace(/\D/g, "").slice(0, 3))} />
          </div>
          <div className="ly-field sm:col-span-2">
            <label className="ly-label" htmlFor="hw-travel">Usual travel mode</label>
            <select id="hw-travel" className="ly-select" value={d.travelMode} onChange={(e) => set("travelMode", e.target.value)}>
              {TRAVEL_MODES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-3">
          <AuditDiff changes={changes} />
          <span className="ly-hint">Address changes are logged. Your GPS pin stays as it is until you update it from the map.</span>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* GPS capture (device fix → manual fallback)                          */
/* ================================================================== */
type GpsPhase = "idle" | "asking" | "got" | "failed" | "manual";

export function GpsDialog({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const h = s.profile.home;
  const [phase, setPhase] = useState<GpsPhase>("idle");
  const [fix, setFix] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState({ lat: h.lat.toFixed(5), lng: h.lng.toFixed(5) });

  const capture = () => {
    if (!navigator.geolocation) {
      setPhase("failed");
      setMessage("This browser cannot read device location. Enter the coordinates manually instead.");
      return;
    }
    setPhase("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) });
        setPhase("got");
        setMessage("");
      },
      (err) => {
        setPhase("failed");
        setMessage(err.code === 1
          ? "Location permission was denied. Allow it in your browser settings, or enter the coordinates manually."
          : "Your device could not get a fix right now. Try again outdoors, or enter the coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const mLat = Number(manual.lat);
  const mLng = Number(manual.lng);
  const manualOk = Number.isFinite(mLat) && Number.isFinite(mLng) && inKenya(mLat, mLng);
  const candidate = phase === "got" && fix ? fix : phase === "manual" && manualOk ? { lat: mLat, lng: mLng, acc: 0 } : null;
  const outside = phase === "got" && !!fix && !inKenya(fix.lat, fix.lng);

  const save = () => {
    if (!candidate) return;
    const before = `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`;
    const after = `${candidate.lat.toFixed(5)}, ${candidate.lng.toFixed(5)}`;
    s.saveSection(diffOf([["GPS position", before, after]]), {
      home: { ...h, lat: candidate.lat, lng: candidate.lng, accuracyM: candidate.acc, gpsCapturedAt: new Date().toISOString() },
    });
    toast(savedToast(1));
    onClose();
  };

  return (
    <Dialog open onClose={onClose} eyebrow="Home & residence" title="Capture GPS position" maxWidth={560} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Close</button>
        {phase === "idle" || phase === "failed" ? (
          <button type="button" className="ly-btn ly-btn-outline" onClick={() => { setPhase("manual"); setMessage(""); }}>Enter manually</button>
        ) : null}
        <button type="button" className="ly-btn ly-btn-primary" disabled={!candidate} onClick={save}>Save position</button>
      </>
    }>
      <div className="grid gap-4">
        <div className="ly-panel ly-panel-soft">
          <KV k="Saved position"><span className="font-mono">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span></KV>
          <KV k="Accuracy">{h.accuracyM ? `±${h.accuracyM} m` : "Placed by hand"}</KV>
          <KV k="Captured">{h.gpsCapturedAt ? relativeTime(h.gpsCapturedAt) : "Never"}</KV>
        </div>

        {phase === "idle" && (
          <div className="grid gap-3">
            <p className="m-0" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
              Stand where you usually leave for school. Your browser will ask for permission; the position is used only for your residence record.
            </p>
            <button type="button" className="ly-btn ly-btn-primary justify-self-start" onClick={capture}><Icon name="pin" size={16} /> Capture from this device</button>
          </div>
        )}
        {phase === "asking" && (
          <div className="ly-panel flex items-center gap-3" role="status"><SpinnerIcon /> Asking your browser for a location fix…</div>
        )}
        {phase === "got" && fix && (
          <div className="grid gap-3">
            <Alert tone={outside ? "warning" : "success"} title={outside ? "This fix is outside Kenya" : "Fix received"}>
              {outside ? "Check that location is allowed for this site, or enter the coordinates by hand." : `±${fix.acc} m accuracy at ${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}.`}
            </Alert>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={capture}><Icon name="refresh" size={15} /> Capture again</button>
              <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => setPhase("manual")}>Enter manually instead</button>
            </div>
          </div>
        )}
        {phase === "failed" && <Alert tone="danger" title="No device position">{message}</Alert>}
        {phase === "manual" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ly-field">
              <label className="ly-label" htmlFor="gps-lat">Latitude</label>
              <input id="gps-lat" inputMode="decimal" className="ly-input font-mono" value={manual.lat} onChange={(e) => setManual((m) => ({ ...m, lat: e.target.value }))} />
            </div>
            <div className="ly-field">
              <label className="ly-label" htmlFor="gps-lng">Longitude</label>
              <input id="gps-lng" inputMode="decimal" className="ly-input font-mono" value={manual.lng} onChange={(e) => setManual((m) => ({ ...m, lng: e.target.value }))} />
            </div>
            <span className={manualOk || manual.lat === "" ? "ly-hint sm:col-span-2" : "ly-error sm:col-span-2"} role={manualOk ? undefined : "alert"}>
              {manualOk ? "Coordinates are within Kenya." : "Kenya only: latitude −4.8 to 5.0, longitude 33.9 to 41.9."}
            </span>
          </div>
        )}
        {message && phase !== "failed" && <Alert tone="info">{message}</Alert>}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* Map editor — drag or use arrow keys to place the pin                */
/* ================================================================== */
const MAP_W = 600;
const MAP_H = 320;
const MAP_SPAN = 0.02;
const ROADS = [
  { d: `M0 ${MAP_H * 0.5} H${MAP_W}`, minor: false },
  { d: `M${MAP_W * 0.5} 0 V${MAP_H}`, minor: false },
  { d: `M90 0 L240 ${MAP_H}`, minor: true },
  { d: `M430 0 L560 ${MAP_H}`, minor: true },
  { d: `M0 90 H${MAP_W}`, minor: true },
];

export function MapDialog({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const h = s.profile.home;
  const [pt, setPt] = useState({ lat: h.lat, lng: h.lng });
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const west = h.lng - MAP_SPAN / 2;
  const north = h.lat + MAP_SPAN / 2;
  const xy = (lat: number, lng: number) => ({ x: ((lng - west) / MAP_SPAN) * MAP_W, y: ((north - lat) / MAP_SPAN) * MAP_H });
  const fromClient = (cx: number, cy: number) => {
    const r = svg.current!.getBoundingClientRect();
    const fx = (cx - r.left) / r.width;
    const fy = (cy - r.top) / r.height;
    return { lat: north - fy * MAP_SPAN, lng: west + fx * MAP_SPAN };
  };
  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    svg.current?.setPointerCapture(e.pointerId);
    setPt(fromClient(e.clientX, e.clientY));
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging.current) setPt(fromClient(e.clientX, e.clientY));
  };
  const stop = () => {
    dragging.current = false;
  };
  const onKey = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    const step = 0.00025;
    const map: Record<string, [number, number]> = { ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    setPt((p) => ({ lat: p.lat + d[0], lng: p.lng + d[1] }));
  };
  const marker = xy(pt.lat, pt.lng);
  const moved = Math.round(Math.hypot((pt.lat - h.lat) * 111_000, (pt.lng - h.lng) * 111_000 * Math.cos((h.lat * Math.PI) / 180)));
  const changed = moved > 0;

  return (
    <Dialog open onClose={onClose} eyebrow="Home & residence · map editor" title="Adjust your pin" maxWidth={720} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => setPt({ lat: h.lat, lng: h.lng })} disabled={!changed}>Reset to saved</button>
        <a className="ly-btn ly-btn-outline" href={`https://www.openstreetmap.org/?mlat=${pt.lat}&mlon=${pt.lng}#map=16/${pt.lat}/${pt.lng}`} target="_blank" rel="noopener noreferrer">Open in OpenStreetMap</a>
        <button type="button" className="ly-btn ly-btn-primary" disabled={!changed} onClick={() => {
          s.saveSection(diffOf([["GPS position", `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`, `${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`]]), {
            home: { ...h, lat: pt.lat, lng: pt.lng, accuracyM: 0, gpsCapturedAt: new Date().toISOString() },
          });
          toast(savedToast(1));
          onClose();
        }}>Save position</button>
      </>
    }>
      <div className="grid gap-3 pf-map-editor">
        <svg
          ref={svg}
          className="pf-map"
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          role="application"
          aria-label="Map. Drag the pin, or focus the map and use the arrow keys to nudge it."
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={stop}
          onPointerCancel={stop}
          onKeyDown={onKey}
        >
          <rect width={MAP_W} height={MAP_H} className="pf-map-bg" />
          {ROADS.map((r) => <path key={r.d} d={r.d} className={`pf-map-road ${r.minor ? "is-minor" : ""}`} />)}
          <text x={18} y={MAP_H - 16} className="pf-map-label">Ragati Road</text>
          <text x={MAP_W - 150} y={28} className="pf-map-label">Karatina Market</text>
          <circle cx={marker.x} cy={marker.y} r={16} className="pf-map-accuracy" />
          <circle cx={marker.x} cy={marker.y} r={9} className="pf-map-pin" />
          <circle cx={marker.x} cy={marker.y} r={3.5} className="pf-map-pin-core" />
        </svg>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="pf-coords">{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
          <span className="ly-hint">{changed ? `${moved} m from the saved pin` : "Matches the saved pin"}</span>
        </div>
        <span className="ly-hint">Drag the pin, click to place it, or focus the map and use the arrow keys (about 25 m per press).</span>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* Change school — 4 steps + confirmation                              */
/* ================================================================== */
export function SchoolWizard({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const current = s.profile.school.name;
  const origin = ACADEMIC_TENURES.find((t) => t.origin)?.school ?? "";
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState("");
  const [effective, setEffective] = useState(tomorrow);
  const [reason, setReason] = useState("Family relocated");
  const [detail, setDetail] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [err, setErr] = useState("");
  const [ticket, setTicket] = useState("");
  const q = query.trim().toLowerCase();
  const options = PARTNER_SCHOOLS.filter((x) => x.name !== current && (!q || `${x.name} ${x.county}`.toLowerCase().includes(q)));
  const chosen = PARTNER_SCHOOLS.find((x) => x.id === pick);

  const next = () => {
    if (step === 0 && !chosen) return setErr("Choose the school you are moving to.");
    if (step === 1) {
      if (effective < tomorrow()) return setErr("Pick a date from tomorrow onwards.");
      if (detail.trim().length < 20) return setErr("Explain the reason in at least 20 characters.");
    }
    if (step === 2 && files.length === 0) return setErr("Attach the transfer letter or family letter.");
    if (step === 3) {
      const id = `TR-${new Date().getFullYear()}-${String(s.profile.transfers.length + 1).padStart(3, "0")}`;
      setTicket(id);
      s.addTransfer({ id, toSchool: chosen?.name ?? "", effective, reason: `${reason}: ${detail.trim()}`, status: "PENDING", at: new Date().toISOString() });
      toast("Transfer request submitted for approval.");
      setStep(4);
      setErr("");
      return;
    }
    setErr("");
    setStep(step + 1);
  };

  return (
    <Dialog open onClose={onClose} eyebrow="Current school" title="Change school" maxWidth={680} footer={
      step === 4 ? (
        <button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Done</button>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={next}>{step === 3 ? "Submit transfer" : "Continue"} {step !== 3 && <Icon name="arrowRight" size={16} />}</button>
        </>
      )
    }>
      <WizardSteps steps={["School", "Dates & reason", "Letter", "Review", "Done"]} active={step} />

      {step === 0 && (
        <div className="grid gap-3">
          <div className="ly-search">
            <Icon name="search" size={16} />
            <input className="ly-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search schools or counties" aria-label="Search schools" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((x) => (
              <button key={x.id} type="button" className={`ly-choice ${pick === x.id ? "is-selected" : ""}`} aria-pressed={pick === x.id} onClick={() => { setPick(x.id); setErr(""); }}>
                <span className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>{x.name}</span>
                <span className="ly-hint">{x.county} · {x.type}</span>
              </button>
            ))}
          </div>
          {options.length === 0 && <EmptyState icon="search" title="No school matches">Try a county name, or check the spelling.</EmptyState>}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ly-field">
            <label className="ly-label" htmlFor="sw-date">Effective from</label>
            <input id="sw-date" type="date" min={tomorrow()} className="ly-input" value={effective} onChange={(e) => setEffective(e.target.value)} />
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="sw-reason">Main reason</label>
            <select id="sw-reason" className="ly-select" value={reason} onChange={(e) => setReason(e.target.value)}>
              {["Family relocated", "Closer to home", "Fees or sponsorship change", "Boarding to day scholar", "Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="ly-field sm:col-span-2">
            <label className="ly-label" htmlFor="sw-detail">Tell us more</label>
            <textarea id="sw-detail" className="ly-input ly-textarea" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Briefly explain the situation for the admin reviewing this." />
            <span className="ly-hint">{detail.trim().length}/20 characters minimum</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3">
          <Alert tone="info" title="Transfer letter required">A letter from the school you are leaving, or a signed family letter, confirms the move.</Alert>
          <FileDrop files={files} onChange={(f) => { setFiles(f.slice(-1)); setErr(""); }} max={1} sampleName="Transfer_Letter.pdf" inputId="sw-files" />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <KV k="From">{current}</KV>
            <KV k="To">{chosen?.name}</KV>
            <KV k="Effective">{fmtDate(effective)}</KV>
            <KV k="Reason">{reason}</KV>
            <KV k="Letter">{files[0]?.name}</KV>
          </div>
          <Alert tone="info" title="What happens on approval">
            A new academic tenure starts at {chosen?.name}. {origin} stays flagged as your origin school. Your term records and budget line carry over.
          </Alert>
        </div>
      )}

      {step === 4 && (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <div className="ly-ref" style={{ fontSize: 15 }}>{ticket}</div>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>Pending admin approval. It is listed under <strong>School transfers</strong> on this page.</p>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}

/* ================================================================== */
/* Teacher / academic contact drawer                                   */
/* ================================================================== */
export function TeacherDrawer({ teacher, onClose, onMessage }: { teacher: Teacher; onClose: () => void; onMessage: () => void }) {
  const [tab, setTab] = useState<"overview" | "subjects" | "contact">("overview");
  const [reveal, setReveal] = useState(false);
  return (
    <Drawer open onClose={onClose} eyebrow={teacher.role} title={`${teacher.title} ${teacher.name}`} width={520}
      tabs={<Tabs label="Teacher sections" value={tab} onChange={setTab} tabs={[{ key: "overview", label: "Overview" }, { key: "subjects", label: "Subjects", count: teacher.subjects.length }, { key: "contact", label: "Contact" }]} />}
      footer={
        <>
          <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={onMessage}><Icon name="chat" size={15} /> Send message</button>
          <a className="ly-btn ly-btn-primary ly-btn-sm" href={`tel:${teacher.phone}`}><Icon name="phone" size={15} /> Call</a>
        </>
      }>
      {tab === "overview" && (
        <div className="grid gap-4">
          <div className="flex items-center gap-3"><span className="ly-avatar ly-avatar-soft" style={{ width: 52, height: 52 }}>{teacher.initials}</span><div className="font-semibold">{teacher.role}</div></div>
          <Alert tone="info">{teacher.note}</Alert>
        </div>
      )}
      {tab === "subjects" && (
        teacher.subjects.length === 0 ? (
          <EmptyState icon="book" title="No teaching subjects">This contact supports welfare and boarding rather than a subject.</EmptyState>
        ) : (
          <div className="flex flex-wrap gap-2">{teacher.subjects.map((x) => <span key={x} className="pf-tag">{x}</span>)}</div>
        )
      )}
      {tab === "contact" && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <KV k="Phone">{reveal ? <span className="font-mono">{teacher.phone}</span> : <Masked masked={maskPhone(teacher.phone)} full={teacher.phone} label={`${teacher.name}'s phone`} />}</KV>
            <KV k="Email">{teacher.email && teacher.consentToContact ? <a className="ly-link-btn" href={`mailto:${teacher.email}`}>{teacher.email}</a> : "Not shared"}</KV>
          </div>
          <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm justify-self-start" aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>
            <Icon name={reveal ? "eyeOff" : "eye"} size={15} /> {reveal ? "Hide number" : "Reveal number"}
          </button>
        </div>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Consent log (filter by purpose, paginate, export)                   */
/* ================================================================== */
export function ConsentLogDialog({ onClose }: { onClose: () => void }) {
  const [purpose, setPurpose] = useState("ALL");
  const [page, setPage] = useState(1);
  const size = 6;
  const label = (k: string) => CONSENT_PURPOSES.find((c) => c.key === k)?.short ?? k;
  const rows = CONSENT_LOG.filter((c) => purpose === "ALL" || c.purposeKey === purpose).sort((a, b) => b.at.localeCompare(a.at));
  const shown = rows.slice((page - 1) * size, page * size);
  return (
    <Dialog open onClose={onClose} eyebrow="DPA 2019 · consent" title="Full consent log" maxWidth={820} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => downloadText("learnly-consent-log.csv", toCsv([
          ["When", "Purpose", "Decision", "Channel", "Recorded by", "IP (masked)", "Hash"],
          ...rows.map((r) => [fmtDateTime(r.at), label(r.purposeKey), r.granted ? "Granted" : "Withdrawn", r.channel, r.by, r.ip, r.hash]),
        ]), "text/csv")}><Icon name="download" size={16} /> Export CSV</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Close</button>
      </>
    }>
      <div className="grid gap-4">
        <MiniTabs label="Purpose filter" value={purpose} onChange={(v) => { setPurpose(v); setPage(1); }} tabs={[{ key: "ALL", label: "All", count: CONSENT_LOG.length }, ...CONSENT_PURPOSES.map((c) => ({ key: c.key, label: c.short, count: CONSENT_LOG.filter((x) => x.purposeKey === c.key).length }))]} />
        <div className="ly-table-wrap is-card-stack">
          <table className="ly-table responsive-table">
            <thead><tr><th>When</th><th>Purpose</th><th>Decision</th><th>Channel</th><th>Hash</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td data-label="When">{fmtDate(r.at)}<span className="ly-hint block">{r.by}</span></td>
                  <td data-label="Purpose">{label(r.purposeKey)}</td>
                  <td data-label="Decision"><span className={`ly-chip ly-status-chip ${r.granted ? "ly-status-verified" : "ly-status-neutral"}`}>{r.granted ? "Granted" : "Withdrawn"}</span></td>
                  <td data-label="Channel">{r.channel}</td>
                  <td data-label="Hash"><span className="ly-ref">{r.hash}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon="file" title="No entries for this purpose">Choose another purpose to see its history.</EmptyState>}
          <Pagination page={page} pageSize={size} total={rows.length} onChange={setPage} noun="consent entries" />
        </div>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* Change history (every profile edit with before / after)             */
/* ================================================================== */
export function ChangeHistoryDialog({ onClose }: { onClose: () => void }) {
  const s = useStudent();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const size = 6;
  const q = query.trim().toLowerCase();
  const rows = s.profile.audit.filter((a) => !q || `${a.field} ${a.before} ${a.after} ${a.reason ?? ""}`.toLowerCase().includes(q));
  return (
    <Dialog open onClose={onClose} eyebrow="Audit trail · my profile" title="Change history" maxWidth={760} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => downloadText("learnly-profile-history.csv", toCsv([
          ["When", "Field", "Before", "After", "By", "Reason"],
          ...s.profile.audit.map((a) => [fmtDateTime(a.at), a.field, a.before, a.after, a.actor, a.reason ?? ""]),
        ]), "text/csv")}><Icon name="download" size={16} /> Export CSV</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={onClose}>Close</button>
      </>
    }>
      <div className="grid gap-4">
        <div className="ly-search">
          <Icon name="search" size={16} />
          <input className="ly-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search field, value or reason" aria-label="Search change history" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="clock" title="No matching changes">Clear the search to see every change to your profile.</EmptyState>
        ) : (
          <div className="ly-table-wrap is-card-stack">
            <table className="ly-table responsive-table">
              <thead><tr><th>When</th><th>Field</th><th>Before → after</th><th>By</th></tr></thead>
              <tbody>
                {rows.slice((page - 1) * size, page * size).map((a) => (
                  <tr key={a.id}>
                    <td data-label="When">{relativeTime(a.at)}<span className="ly-hint block">{fmtDate(a.at)}</span></td>
                    <td data-label="Field"><strong>{a.field}</strong>{a.reason && <span className="ly-hint block">{a.reason}</span>}</td>
                    <td data-label="Before → after"><span className="diff-old">{a.before}</span> <span className="diff-new">{a.after}</span></td>
                    <td data-label="By">{a.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={size} total={rows.length} onChange={setPage} noun="changes" />
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* Identifier detail                                                   */
/* ================================================================== */
export function IdentifierDialog({ identifier, onCorrect, onClose }: { identifier: Identifier; onCorrect: () => void; onClose: () => void }) {
  const na = identifier.verification === "NOT_APPLICABLE";
  const steps: [string, string, boolean][] = na
    ? []
    : [
        ["Submitted", "Captured at onboarding from your documents", true],
        ["Checked", identifier.verification === "VERIFIED" ? "Verifier matched it to the source document" : "Waiting for the verifier or KNEC", identifier.verification === "VERIFIED"],
        ["Locked", "Protected from edits; changes need a correction request", identifier.verification === "VERIFIED"],
      ];
  return (
    <Dialog open onClose={onClose} eyebrow="Identity" title={identifier.label} maxWidth={560} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={onClose}>Close</button>
        {!na && <button type="button" className="ly-btn ly-btn-primary" onClick={onCorrect}>Request a correction <Icon name="arrowRight" size={16} /></button>}
      </>
    }>
      <div className="grid gap-4">
        <div className="ly-panel ly-panel-soft">
          <KV k="Value">{identifier.value ? <Masked masked={`•••• ${identifier.value.slice(-4)}`} full={identifier.value} label={identifier.label} /> : "—"}</KV>
          <KV k="Status"><span className={`pf-verify is-${identifier.verification === "VERIFIED" ? "verified" : identifier.verification === "PENDING" ? "pending" : identifier.verification === "UNVERIFIED" ? "unverified" : "na"}`}>{VERIFICATION_LABEL[identifier.verification]}</span></KV>
        </div>
        <Alert tone={identifier.verification === "VERIFIED" ? "success" : identifier.verification === "PENDING" ? "warning" : "info"} title="Verification note">{identifier.note}</Alert>
        {steps.length > 0 && (
          <ol className="ly-timeline">
            {steps.map(([t, d, done]) => <li key={t} className={done ? "is-done" : "is-todo"}><strong>{t}</strong><div className="ly-hint">{d}</div></li>)}
          </ol>
        )}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* Disability status (3 steps; block appears only when set)            */
/* ================================================================== */
export function DisabilityWizard({ current, onClose }: { current: { type: string; cardNo: string; docName: string } | null; onClose: () => void }) {
  const s = useStudent();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [type, setType] = useState(current?.type ?? "None");
  const [cardNo, setCardNo] = useState(current?.cardNo ?? "");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [err, setErr] = useState("");
  const none = type === "None";
  const nextValue = none ? null : { type, cardNo: cardNo.trim(), docName: files[0]?.name ?? current?.docName ?? "" };
  const before = current ? `${current.type}${current.cardNo ? ` · card ••••${current.cardNo.slice(-4)}` : ""}` : "None recorded";
  const after = nextValue ? `${nextValue.type}${nextValue.cardNo ? ` · card ••••${nextValue.cardNo.slice(-4)}` : ""}` : "None recorded";
  const changes = diffOf([["Disability status", before, after]]);

  const next = () => {
    if (step === 0) { setErr(""); return setStep(none ? 2 : 1); }
    if (step === 1) {
      if (!/^[A-Z0-9-]{4,}$/i.test(cardNo.trim())) return setErr("Enter the disability card number exactly as printed (letters, numbers or hyphens).");
      setErr("");
      return setStep(2);
    }
    if (step === 2) {
      if (!none && files.length === 0 && !current?.docName) return setErr("Attach the supporting document (NCPWD card or assessment letter).");
      setErr("");
      return setStep(3);
    }
    if (changes.length === 0) return setErr("This is already the saved status.");
    s.saveSection(changes, { personal: { ...s.profile.personal, disability: nextValue } });
    toast(savedToast(1));
    onClose();
  };

  return (
    <Dialog open onClose={onClose} eyebrow="Identity · disability" title="Disability status" maxWidth={600} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step === 2 && none ? 0 : step - 1))}>{step === 0 ? "Cancel" : "Back"}</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={next}>{step === 3 ? "Save status" : "Continue"} {step !== 3 && <Icon name="arrowRight" size={16} />}</button>
      </>
    }>
      <WizardSteps steps={["Status", "Card", "Document", "Review"]} active={step} />
      {step === 0 && (
        <div className="grid gap-3">
          <p className="pf-steps-note">Only record this if you want it considered for support. It is special-category data and can be withdrawn at any time.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISABILITY_TYPES.map((t) => (
              <button key={t} type="button" className={`ly-choice ${type === t ? "is-selected" : ""}`} aria-pressed={type === t} onClick={() => setType(t)}>
                <span className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>{t}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4">
          <div className="ly-field">
            <label className="ly-label" htmlFor="dw-card">Disability card number</label>
            <input id="dw-card" className="ly-input font-mono" value={cardNo} onChange={(e) => { setCardNo(e.target.value.toUpperCase()); setErr(""); }} placeholder="e.g. NCPWD-204481" />
            <span className="ly-hint">Stored masked. Only the last four characters are shown.</span>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-3">
          {current?.docName && <div className="ly-file-row"><Icon name="file" size={16} /><span className="min-w-0 flex-1 truncate">{current.docName}</span><span className="ly-hint">on file</span></div>}
          <FileDrop files={files} onChange={(f) => { setFiles(f.slice(-1)); setErr(""); }} max={1} sampleName="NCPWD_Card.pdf" inputId="dw-files" />
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-3">
          <AuditDiff changes={changes} />
          <Alert tone="info">After saving, a Disability section shows the type and masked card on this page.</Alert>
        </div>
      )}
      {err && <div className="ly-error mt-3" role="alert">{err}</div>}
    </Dialog>
  );
}
