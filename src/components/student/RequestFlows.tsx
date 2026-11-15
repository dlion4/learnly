import { useMemo, useState } from "react";
import { z } from "zod";
import { Dialog, useToast } from "../ui/primitives";
import { Alert, CategoryBadge, Drawer, FileDrop, KV, MiniTabs, ProgressBar, StatusChip, Tabs, WizardSteps, type UploadFile } from "../ui/overlays";
import { Icon } from "../ui/Icon";
import { SpinnerIcon } from "../marketing/LandingDialogs";
import { useStudent } from "./StudentStore";
import { PAYOUT_MATRIX, categoryRule, type RequestProof, type StudentRequest } from "../../data/requests";
import { CATEGORY_CHANNELS, CHANNEL_META } from "../../data/payoutMethods";
import { TERM_NOW, catLabel, fmtDate, fmtDateTime, kes, relativeTime, type RequestCategory } from "../../data/students";
import { downloadText, toCsv } from "../../lib/download";

const CATS = PAYOUT_MATRIX.map((r) => r.category);
const isCategory = (v: unknown): v is RequestCategory => typeof v === "string" && (CATS as string[]).includes(v);
const PROOF_PURPOSE: Record<RequestCategory, string> = {
  fees: "Fee structure", upkeep: "Previous term result slip", pocketmoney: "Supporting note", fare: "Supporting note",
  equipment: "Proforma invoice", medical: "Hospital invoice", exam: "School KNEC invoice",
};
const SAMPLE_FILE: Record<RequestCategory, string> = {
  fees: "KenyaHigh_FeeStructure_Stamped.pdf", upkeep: "Term_Report_Form.pdf", pocketmoney: "Supporting_Note.pdf", fare: "Supporting_Note.pdf",
  equipment: "Stamped_Proforma_Invoice.pdf", medical: "Hospital_Invoice.pdf", exam: "KNEC_Registration_Invoice.pdf",
};
const STEPS = ["Category", "Details", "Proof", "Review"];
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/* ================================================================== */
/* 1. New request wizard                                               */
/* ================================================================== */
export function NewRequestWizard() {
  const s = useStudent();
  const seed = s.overlays.newRequest;
  if (!seed) return null;
  return <WizardInner key={String(seed)} seed={seed} />;
}

function WizardInner({ seed }: { seed: string | true }) {
  const s = useStudent();
  const { toast } = useToast();
  const draft = typeof seed === "string" ? s.requests.find((r) => r.id === seed && r.status === "DRAFT") : undefined;
  const [draftId] = useState(draft?.id);
  const seedCat = draft?.category ?? (isCategory(seed) ? seed : null);

  const methodsFor = (c: RequestCategory) => s.methods.filter((m) => CATEGORY_CHANNELS[c].includes(m.channel));
  const pickDefault = (c: RequestCategory) => {
    const ok = methodsFor(c).filter((m) => m.status === "VERIFIED");
    return (ok.find((m) => m.defaultFor.includes(c)) ?? ok[0])?.id ?? "";
  };

  const [cat, setCat] = useState<RequestCategory | null>(() => (seedCat && !s.termBlocker(seedCat) ? seedCat : null));
  const [step, setStep] = useState(() => (seedCat && !s.termBlocker(seedCat) ? 1 : 0));
  const [amount, setAmount] = useState(draft ? String(draft.amountKes) : "");
  const [methodId, setMethodId] = useState(() => draft?.methodId ?? (cat ? pickDefault(cat) : ""));
  const [why, setWhy] = useState(draft?.justification ?? "");
  const [neededBy, setNeededBy] = useState(tomorrow);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  const close = () => !busy && s.close("newRequest");
  const rule = cat ? categoryRule(cat) : null;
  const cap = cat ? s.capInfo(cat) : null;
  const vaultSlip = s.documents.find((d) => d.typeKey === "RESULT_SLIP" && d.status === "VERIFIED");
  const usesVault = !!vaultSlip && (cat === "fees" || cat === "upkeep");
  const minFiles = !rule?.proofRequired ? 0 : cat === "upkeep" ? (vaultSlip ? 0 : 1) : cat === "fees" ? (vaultSlip ? 1 : 2) : 1;
  const method = s.methods.find((m) => m.id === methodId);
  const verifiedMethods = cat ? methodsFor(cat).filter((m) => m.status === "VERIFIED") : [];

  const proofs: RequestProof[] = cat
    ? [
        ...files.map((f): RequestProof => ({ name: f.name, purpose: PROOF_PURPOSE[cat], status: "PENDING" })),
        ...(usesVault && vaultSlip ? [{ name: vaultSlip.fileName, purpose: "Previous term result slip (from vault)", status: "VERIFIED" } as RequestProof] : []),
      ]
    : [];

  const schema = useMemo(() => z.object({
    amount: z.number().int("Enter a whole KES amount.").min(100, "Enter an amount of at least KES 100.").max(cap?.max ?? 0, `Above the binding cap — the most you can request is ${kes(cap?.max ?? 0)}.`),
    methodId: z.string().min(1, "Choose a verified payout destination."),
    why: z.string().trim().min(50, "Give at least 50 characters so the reviewer understands the need.").max(500, "Keep the justification under 500 characters."),
    neededBy: z.string().refine((d) => d >= tomorrow(), "Choose a date from tomorrow onwards."),
  }), [cap?.max]);

  const choose = (c: RequestCategory) => {
    setCat(c);
    setMethodId(pickDefault(c));
    setFiles([]);
    setErrors({});
  };

  const next = () => {
    const e: Record<string, string> = {};
    if (step === 0 && !cat) e.cat = "Choose a category to continue.";
    if (step === 1) {
      const res = schema.safeParse({ amount: Number(amount), methodId, why, neededBy });
      if (!res.success) for (const issue of res.error.issues) {
        const key = String(issue.path[0]);
        if (!e[key]) e[key] = issue.message;
      }
    }
    if (step === 2 && files.length < minFiles) e.files = "Proof required for this category — attach the document to continue.";
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(step + 1);
  };

  const submit = () => {
    if (!cat) return;
    if (!declared) return setErrors({ declared: "Tick the declaration to submit your request." });
    setBusy(true);
    window.setTimeout(() => {
      const id = s.submitRequest({ category: cat, amountKes: Number(amount), methodId, justification: why.trim(), proofs }, draftId);
      setBusy(false);
      setDoneId(id);
      toast(`Request ${id} submitted — ${kes(Number(amount))} for ${catLabel(cat).toLowerCase()}.`);
    }, 800);
  };

  const saveDraft = () => {
    if (!cat) return;
    s.saveDraft({ category: cat, amountKes: Number(amount) || 0, methodId, justification: why, proofs: [] }, draftId);
    s.close("newRequest");
  };

  const footer = doneId ? (
    <>
      <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Done</button>
      <button type="button" className="ly-btn ly-btn-primary" onClick={() => { s.close("newRequest"); s.open("request", doneId); }}>
        Track {doneId} <Icon name="arrowRight" size={16} />
      </button>
    </>
  ) : (
    <>
      <button type="button" className="ly-btn ly-btn-ghost" disabled={busy} onClick={() => (step === 0 ? close() : setStep(step - 1))}>
        {step === 0 ? "Cancel" : "Back"}
      </button>
      {cat && step >= 1 && (
        <button type="button" className="ly-btn ly-btn-outline" disabled={busy} onClick={saveDraft}>Save draft</button>
      )}
      {step < 3 ? (
        <button type="button" className="ly-btn ly-btn-primary" onClick={next}>Continue <Icon name="arrowRight" size={16} /></button>
      ) : (
        <button type="button" className="ly-btn ly-btn-primary" disabled={busy} onClick={submit}>
          {busy ? <><SpinnerIcon /> Submitting…</> : "Submit request"}
        </button>
      )}
    </>
  );

  return (
    <Dialog open onClose={close} eyebrow={draftId ? `Resume draft ${draftId}` : "Financial assistance"} title={doneId ? "Request submitted" : "New assistance request"} maxWidth={720} footer={footer}>
      {doneId && cat ? (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <div className="ly-ref" style={{ fontSize: 15 }}>{doneId}</div>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>
            {kes(Number(amount))} for {catLabel(cat).toLowerCase()} is now in the verifier queue.
          </p>
          <ol className="ly-timeline w-full text-left" style={{ maxWidth: 420 }}>
            <li className="is-done"><strong>Submitted</strong><div className="ly-hint">Just now · reference assigned</div></li>
            <li className="is-todo"><strong>Under review</strong><div className="ly-hint">{rule?.proofRequired ? "Verifier checks your proof against OCR" : "Cap and frequency checks"}</div></li>
            <li className="is-todo"><strong>Decision</strong><div className="ly-hint">Average 2.3 days · you'll get an SMS and in-app alert</div></li>
            <li className="is-todo"><strong>Disbursement</strong><div className="ly-hint">To {method?.label ?? "your selected destination"}</div></li>
          </ol>
        </div>
      ) : (
        <>
          <WizardSteps steps={STEPS} active={step} />

          {step === 0 && (
            <div>
              <p className="mt-0" style={{ color: "var(--text-secondary)" }}>What do you need support with for {TERM_NOW}? Each category has its own cap, proof rule and payout channel.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYOUT_MATRIX.map((r) => {
                  const info = s.capInfo(r.category);
                  const blocker = s.termBlocker(r.category);
                  if (blocker || info.max < 100) {
                    return (
                      <div key={r.category} className="ly-choice is-blocked">
                        <CategoryBadge category={r.category} />
                        <span className="ly-hint">{blocker ? `Already requested for ${TERM_NOW} — ${r.frequency.toLowerCase()} only.` : "Annual sponsor cap fully used."}</span>
                        {blocker && (
                          <button type="button" className="ly-link-btn" onClick={() => { s.close("newRequest"); s.open("request", blocker.id); }}>
                            View {blocker.id} <Icon name="arrowRight" size={14} />
                          </button>
                        )}
                      </div>
                    );
                  }
                  return (
                    <button key={r.category} type="button" className={`ly-choice ${cat === r.category ? "is-selected" : ""}`} aria-pressed={cat === r.category} onClick={() => choose(r.category)}>
                      <span className="flex items-center justify-between gap-2">
                        <CategoryBadge category={r.category} />
                        <span className={`ly-chip ly-status-chip ${r.proofRequired ? "ly-status-warn" : "ly-status-approved"}`}>{r.proofRequired ? "Proof required" : "No proof"}</span>
                      </span>
                      <span className="ly-amount" style={{ color: "var(--brand-ink)" }}>Up to {kes(info.max)}</span>
                      <span className="ly-hint">{kes(info.annualLeft)} left this year · {r.proofRequired ? r.frequency.toLowerCase() : "request any time"}</span>
                    </button>
                  );
                })}
              </div>
              {errors.cat && <div className="ly-error mt-3" role="alert">{errors.cat}</div>}
            </div>
          )}

          {step === 1 && cat && cap && rule && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CategoryBadge category={cat} />
                <button type="button" className="ly-link-btn" onClick={() => setStep(0)}>Change category</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="ly-field">
                  <label className="ly-label" htmlFor="nr-amount">Amount requested</label>
                  <div className={`ly-phone-input ${errors.amount ? "is-invalid" : ""}`}>
                    <span className="prefix">KES</span>
                    <input id="nr-amount" inputMode="numeric" placeholder="e.g. 2500" value={amount} aria-invalid={!!errors.amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))} />
                  </div>
                  {errors.amount ? <span className="ly-error" role="alert">{errors.amount}</span> : <span className="ly-hint">Max you can request: <strong>{kes(cap.max)}</strong> (limited by {cap.binding}).</span>}
                </div>
                <div className="ly-field">
                  <label className="ly-label" htmlFor="nr-date">Needed by</label>
                  <input id="nr-date" type="date" className={`ly-input ${errors.neededBy ? "is-invalid" : ""}`} min={tomorrow()} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
                  {errors.neededBy ? <span className="ly-error" role="alert">{errors.neededBy}</span> : <span className="ly-hint">Term: {TERM_NOW} · currency locked to KES.</span>}
                </div>
              </div>

              <div className="ly-panel ly-panel-soft">
                <KV k="Category cap per request">{kes(cap.perTerm)}</KV>
                <KV k="Annual cap remaining">{kes(cap.annualLeft)} of {kes(cap.annualCap)}</KV>
                <KV k="Budget line balance">{kes(cap.budgetLeft)}</KV>
              </div>

              <div className="ly-field">
                <label className="ly-label" htmlFor="nr-method">Payout destination</label>
                {verifiedMethods.length === 0 ? (
                  <Alert tone="danger" title={`Add a verified ${CHANNEL_META[CATEGORY_CHANNELS[cat][0]].label} payout method first`} action={
                    <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("addMethod", CATEGORY_CHANNELS[cat][0])}>Add method</button>
                  }>
                    {catLabel(cat)} can only be paid to: {CATEGORY_CHANNELS[cat].map((c) => CHANNEL_META[c].label).join(" · ")}.
                  </Alert>
                ) : (
                  <select id="nr-method" className="ly-select" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
                    {methodsFor(cat).map((m) => (
                      <option key={m.id} value={m.id} disabled={m.status !== "VERIFIED"}>
                        {m.label} — {m.masked}{m.status !== "VERIFIED" ? " (pending verification)" : ""}
                      </option>
                    ))}
                  </select>
                )}
                {errors.methodId && verifiedMethods.length > 0 && <span className="ly-error" role="alert">{errors.methodId}</span>}
                <span className="ly-hint">Only channels allowed for {catLabel(cat).toLowerCase()} are listed: {CATEGORY_CHANNELS[cat].map((c) => CHANNEL_META[c].label).join(" · ")}.</span>
              </div>

              <div className="ly-field">
                <label className="ly-label" htmlFor="nr-why">Justification</label>
                <textarea id="nr-why" className={`ly-input ly-textarea ${errors.why ? "is-invalid" : ""}`} maxLength={500} placeholder="Explain what this covers and why it is needed this term." value={why} aria-invalid={!!errors.why} onChange={(e) => setWhy(e.target.value)} />
                <div className="flex justify-between gap-2">
                  {errors.why ? <span className="ly-error" role="alert">{errors.why}</span> : <span className="ly-hint">50–500 characters.</span>}
                  <span className="ly-hint">{why.trim().length}/500</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && cat && rule && (
            <div className="grid gap-4">
              {!rule.proofRequired ? (
                <Alert tone="success" title={`No proof needed for ${catLabel(cat).toLowerCase()}`}>
                  Sponsor cap and frequency checks still apply. You can go straight to review.
                </Alert>
              ) : (
                <>
                  <Alert tone="info" title="Proof required before submission">{rule.proofDocs}. {rule.ocrNote}</Alert>
                  {usesVault && vaultSlip && (
                    <div className="ly-file-row">
                      <Icon name="shield" size={16} />
                      <span className="min-w-0 flex-1 truncate">{vaultSlip.title}</span>
                      <StatusChip status="VERIFIED" />
                      <span className="ly-hint">from your vault</span>
                    </div>
                  )}
                  {minFiles > 0 ? (
                    <FileDrop files={files} onChange={(f) => { setFiles(f); setErrors({}); }} sampleName={SAMPLE_FILE[cat]} inputId="nr-files" />
                  ) : (
                    <Alert tone="success" title="Proof satisfied from your vault">Your verified result slip covers this request — no upload needed.</Alert>
                  )}
                  {cat === "fees" && files.length > 0 && (
                    <Alert tone="info" title="OCR read “Total payable: KES 53,400” from the fee structure" action={
                      amount !== "53400" ? <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAmount("53400")}>Use this amount</button> : undefined
                    }>
                      {amount === "53400" ? "Your requested amount matches the fee structure." : `You entered ${kes(Number(amount))}. A mismatch slows down verification.`}
                    </Alert>
                  )}
                  {errors.files && <div className="ly-error" role="alert">{errors.files}</div>}
                </>
              )}
            </div>
          )}

          {step === 3 && cat && (
            <div className="grid gap-4">
              <div className="ly-panel">
                <KV k="Category"><CategoryBadge category={cat} /></KV>
                <KV k="Amount"><span className="ly-amount">{kes(Number(amount))}</span></KV>
                <KV k="Term">{TERM_NOW}</KV>
                <KV k="Needed by">{fmtDate(neededBy)}</KV>
                <KV k="Destination">{method ? `${method.label} · ${method.masked}` : "—"}</KV>
                <KV k="Proof">{proofs.length ? `${proofs.length} document(s)` : "Not required"}</KV>
              </div>
              <div className="ly-panel ly-panel-soft">
                <div className="ly-eyebrow mb-1">Justification</div>
                <p className="m-0" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{why.trim()}</p>
              </div>
              <label className="flex items-start gap-3" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                <input type="checkbox" className="mt-1" checked={declared} onChange={(e) => { setDeclared(e.target.checked); setErrors({}); }} />
                <span>I confirm this request is genuine and the proof documents are authentic. I understand misrepresentation may lead to suspension of sponsorship.</span>
              </label>
              {errors.declared && <div className="ly-error" role="alert">{errors.declared}</div>}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* 2. Request detail drawer                                            */
/* ================================================================== */
type ReqTab = "overview" | "timeline" | "proofs";
const NEXT_STEPS: Partial<Record<StudentRequest["status"], string[]>> = {
  SUBMITTED: ["Under review", "Decision", "Disbursement"],
  UNDER_REVIEW: ["Decision", "Disbursement"],
  AWAITING_PROOF: ["Your proof upload", "Re-review", "Decision"],
  APPROVED: ["Disbursement"],
};

export function RequestDrawer() {
  const s = useStudent();
  const id = s.overlays.request;
  const req = typeof id === "string" ? s.requests.find((r) => r.id === id) : undefined;
  const [tab, setTab] = useState<ReqTab>("overview");
  const close = () => s.close("request");
  if (!req) return null;

  const method = s.methods.find((m) => m.id === req.methodId);
  const adjusted = req.approvedKes !== undefined && req.approvedKes !== req.amountKes;
  const delta = adjusted ? Math.round((((req.approvedKes ?? 0) - req.amountKes) / req.amountKes) * 1000) / 10 : 0;
  const open = ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF"].includes(req.status);
  const thread = s.threads.find((t) => t.relatedId === req.id);

  return (
    <Drawer
      open
      onClose={close}
      eyebrow={`${req.id} · ${req.term}`}
      title={<span className="flex flex-wrap items-center gap-2">{catLabel(req.category)} <StatusChip status={req.status} /></span>}
      tabs={<Tabs label="Request sections" value={tab} onChange={setTab} tabs={[{ key: "overview", label: "Overview" }, { key: "timeline", label: "Timeline", count: req.timeline.length }, { key: "proofs", label: "Proofs", count: req.proofs.length }]} />}
      footer={
        <>
          <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => { close(); s.open("messages", thread ? thread.id : `new:${req.id}`); }}>
            <Icon name="chat" size={15} /> Message admin
          </button>
          {req.payoutId && <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("payout", req.payoutId)}>View payout</button>}
          {open && <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("withdraw", req.id)}>Withdraw</button>}
          {req.status === "AWAITING_PROOF" && <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("addProof", req.id)}><Icon name="upload" size={15} /> Upload proof</button>}
          {req.status === "DRAFT" && <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => { close(); s.open("newRequest", req.id); }}>Resume draft</button>}
          {(req.status === "REJECTED" || req.status === "WITHDRAWN") && <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => { close(); s.open("newRequest", req.category); }}>Request again</button>}
        </>
      }
    >
      {tab === "overview" && (
        <div className="grid gap-4">
          <div className="ly-panel ly-panel-soft">
            <div className="ly-eyebrow mb-1">{adjusted ? "Requested → approved" : req.approvedKes !== undefined ? "Approved amount" : "Amount requested"}</div>
            <div className="flex flex-wrap items-baseline gap-3">
              {adjusted && <span className="ly-amount" style={{ textDecoration: "line-through", opacity: 0.55 }}>{kes(req.amountKes)}</span>}
              <span className="font-display" style={{ fontSize: "var(--fs-kpi)", color: "var(--brand-ink)" }}>{kes(req.approvedKes ?? req.amountKes)}</span>
              {adjusted && <span className="ly-chip ly-status-chip ly-status-warn">{delta}% adjusted</span>}
            </div>
          </div>
          {req.status === "AWAITING_PROOF" && <Alert tone="warning" title="More proof requested" action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("addProof", req.id)}>Upload</button>}>{req.adminNote}</Alert>}
          {req.status === "REJECTED" && <Alert tone="danger" title="Why this was rejected">{req.reason}</Alert>}
          {req.status === "FAILED" && <Alert tone="danger" title="Payout failed" action={req.payoutId ? <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("payout", req.payoutId)}>Details</button> : undefined}>{req.reason}</Alert>}
          {req.status === "WITHDRAWN" && <Alert tone="info" title="Withdrawn by you">{req.reason}</Alert>}
          {adjusted && req.adminNote && <Alert tone="info" title="Adjustment reason (over 10% change)">Finance note: {req.adminNote}</Alert>}
          <div className="ly-panel">
            <KV k="Category"><CategoryBadge category={req.category} /></KV>
            <KV k="Term">{req.term}</KV>
            <KV k={req.status === "DRAFT" ? "Drafted" : "Submitted"}>{fmtDateTime(req.submittedAt)}</KV>
            <KV k="Last update">{relativeTime(req.updatedAt)}</KV>
            <KV k="Destination">{method ? `${method.label} · ${method.masked}` : "Method removed"}</KV>
            <KV k="Channel">{method ? CHANNEL_META[method.channel].label : "—"}</KV>
          </div>
          <div className="ly-panel">
            <div className="ly-eyebrow mb-1">Justification</div>
            <p className="m-0" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>{req.justification || "No justification written yet."}</p>
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <ol className="ly-timeline">
          {req.timeline.map((ev) => (
            <li key={`${ev.state}-${ev.at}`} className={/fail|reject/i.test(ev.state) ? "is-bad" : "is-done"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{ev.state}</strong>
                <span className="ly-hint">{fmtDateTime(ev.at)}</span>
              </div>
              <div style={{ fontSize: "var(--fs-label)", color: "var(--brand-ink)", fontWeight: 600 }}>{ev.actor}</div>
              <p className="m-0 mt-1" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{ev.note}</p>
            </li>
          ))}
          {(NEXT_STEPS[req.status] ?? []).map((label) => (
            <li key={label} className="is-todo"><strong>{label}</strong><div className="ly-hint">Pending</div></li>
          ))}
        </ol>
      )}

      {tab === "proofs" && (
        <div className="grid gap-3">
          {req.proofs.length === 0 ? (
            <Alert tone="info" title="No proof attached">{categoryRule(req.category).proofRequired ? "This category needs proof before it can be reviewed." : `${catLabel(req.category)} does not require proof — it is governed by the sponsor cap.`}</Alert>
          ) : (
            req.proofs.map((p) => (
              <div key={p.name} className="ly-file-row">
                <Icon name="file" size={16} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="ly-hint">{p.purpose}</span>
                </span>
                <StatusChip status={p.status} />
              </div>
            ))
          )}
          {open && (
            <button type="button" className="ly-btn ly-btn-outline ly-btn-sm justify-self-start" onClick={() => s.open("addProof", req.id)}>
              <Icon name="plus" size={15} /> Add another document
            </button>
          )}
        </div>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* 3. Withdraw confirm (destructive → explicit reason)                 */
/* ================================================================== */
export function WithdrawDialog() {
  const s = useStudent();
  const id = s.overlays.withdraw;
  if (typeof id !== "string") return null;
  return <WithdrawInner key={id} id={id} />;
}

function WithdrawInner({ id }: { id: string }) {
  const s = useStudent();
  const { toast } = useToast();
  const [reason, setReason] = useState("Duplicate request");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const req = s.requests.find((r) => r.id === id);
  const close = () => s.close("withdraw");

  return (
    <Dialog open onClose={close} eyebrow={id} title="Withdraw this request?" footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Keep request</button>
        <button type="button" className="ly-btn ly-btn-danger" onClick={() => {
          if (detail.trim().length < 10) return setError("Add at least 10 characters explaining why.");
          s.withdrawRequest(id, `${reason} — ${detail.trim()}`);
          close();
          toast(`${id} withdrawn. You can request again any time.`);
        }}>Withdraw request</button>
      </>
    }>
      <div className="grid gap-4">
        <Alert tone="warning">Withdrawing removes {req ? `${kes(req.amountKes)} for ${catLabel(req.category).toLowerCase()}` : "this request"} from the review queue. This is recorded in the audit trail and cannot be undone.</Alert>
        <div className="ly-field">
          <label className="ly-label" htmlFor="wd-reason">Reason</label>
          <select id="wd-reason" className="ly-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            {["Duplicate request", "No longer needed", "Wrong amount or destination", "Paid by family instead", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="ly-field">
          <label className="ly-label" htmlFor="wd-detail">Explain briefly</label>
          <textarea id="wd-detail" className={`ly-input ly-textarea ${error ? "is-invalid" : ""}`} value={detail} onChange={(e) => { setDetail(e.target.value); setError(""); }} placeholder="e.g. Submitted twice by mistake." />
          {error && <span className="ly-error" role="alert">{error}</span>}
        </div>
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 4. Add proof                                                        */
/* ================================================================== */
export function AddProofModal() {
  const s = useStudent();
  const id = s.overlays.addProof;
  if (typeof id !== "string") return null;
  return <AddProofInner key={id} id={id} />;
}

function AddProofInner({ id }: { id: string }) {
  const s = useStudent();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const req = s.requests.find((r) => r.id === id);
  const close = () => s.close("addProof");

  return (
    <Dialog open onClose={close} eyebrow={id} title={sent ? "Proof sent for re-review" : "Upload additional proof"} footer={
      sent ? <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Done</button> : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Cancel</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => {
            if (!files.length) return setError("Attach at least one document.");
            s.addProof(id, files.map((f) => f.name));
            setSent(true);
          }}>Send for re-review</button>
        </>
      )
    }>
      {sent ? (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>{files.length} document(s) attached to {id}. The request is back in the verifier queue — no need to submit a new one.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {req?.adminNote && <Alert tone="warning" title="Verifier note">{req.adminNote}</Alert>}
          <FileDrop files={files} onChange={(f) => { setFiles(f); setError(""); }} sampleName={req ? SAMPLE_FILE[req.category] : "Supporting_Document.pdf"} inputId="ap-files" />
          {error && <div className="ly-error" role="alert">{error}</div>}
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* 5. Sponsor caps breakdown                                           */
/* ================================================================== */
export function CapsModal() {
  const s = useStudent();
  const close = () => s.close("caps");
  return (
    <Dialog open={!!s.overlays.caps} onClose={close} eyebrow={s.student.budgetLine} title="Sponsor caps by category" maxWidth={720} footer={<button type="button" className="ly-btn ly-btn-primary" onClick={close}>Close</button>}>
      <p className="mt-0" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
        Caps are set by {s.student.sponsor}. Approved and disbursed requests count against them; admins can only adjust amounts down.
      </p>
      <div className="grid gap-3">
        {PAYOUT_MATRIX.map((r) => {
          const info = s.capInfo(r.category);
          const blocker = s.termBlocker(r.category);
          const pct = (info.used / info.annualCap) * 100;
          return (
            <div key={r.category} className="ly-panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CategoryBadge category={r.category} />
                <span className="ly-hint">{r.frequency}</span>
              </div>
              <div className="my-2"><ProgressBar value={pct} label={`${catLabel(r.category)} cap used`} tone={pct > 85 ? "warn" : "brand"} /></div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                  <span className="ly-amount" style={{ color: "var(--text-primary)" }}>{kes(info.used)}</span> of {kes(info.annualCap)} used · {kes(info.annualLeft)} left
                </span>
                {blocker ? (
                  <button type="button" className="ly-link-btn" onClick={() => { close(); s.open("request", blocker.id); }}>View {blocker.id}</button>
                ) : info.max >= 100 ? (
                  <button type="button" className="ly-link-btn" onClick={() => { close(); s.open("newRequest", r.category); }}>Request <Icon name="arrowRight" size={14} /></button>
                ) : (
                  <span className="ly-hint">Cap fully used</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

/* ================================================================== */
/* 6. Export (real CSV download)                                       */
/* ================================================================== */
type ExportSet = "requests" | "payouts";
const EXPORT_COLS: Record<ExportSet, string[]> = {
  requests: ["Reference", "Category", "Requested (KES)", "Approved (KES)", "Status", "Term", "Submitted"],
  payouts: ["Payout", "Request", "Category", "Amount (KES)", "Channel", "Status", "Processor ref", "Date"],
};

export function ExportDialog() {
  const s = useStudent();
  if (!s.overlays.export) return null;
  return <ExportInner initial={s.overlays.export === "payouts" ? "payouts" : "requests"} />;
}

function ExportInner({ initial }: { initial: ExportSet }) {
  const s = useStudent();
  const [set, setSet] = useState<ExportSet>(initial);
  const [off, setOff] = useState<string[]>([]);
  const [done, setDone] = useState("");
  const close = () => s.close("export");
  const cols = EXPORT_COLS[set].filter((c) => !off.includes(c));

  const rows: Record<string, string | number>[] = set === "requests"
    ? s.requests.map((r) => ({ Reference: r.id, Category: catLabel(r.category), "Requested (KES)": r.amountKes, "Approved (KES)": r.approvedKes ?? "", Status: r.status, Term: r.term, Submitted: fmtDate(r.submittedAt) }))
    : s.payouts.map((p) => ({ Payout: p.id, Request: p.requestId, Category: catLabel(p.category), "Amount (KES)": p.amountKes, Channel: CHANNEL_META[p.channel].label, Status: p.status, "Processor ref": p.processorRef, Date: fmtDate(p.at) }));

  return (
    <Dialog open onClose={close} eyebrow="Export" title="Download your records" footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Close</button>
        <button type="button" className="ly-btn ly-btn-primary" disabled={cols.length === 0} onClick={() => {
          const name = `learnly-${set}-${new Date().toISOString().slice(0, 10)}.csv`;
          downloadText(name, toCsv([cols, ...rows.map((r) => cols.map((c) => r[c]))]), "text/csv");
          setDone(`${name} downloaded — ${rows.length} rows, ${cols.length} columns.`);
        }}><Icon name="download" size={16} /> Download CSV</button>
      </>
    }>
      <div className="grid gap-4">
        <MiniTabs label="Dataset" value={set} onChange={(k) => { setSet(k); setOff([]); setDone(""); }} tabs={[{ key: "requests", label: "Requests", count: s.requests.length }, { key: "payouts", label: "Payouts", count: s.payouts.length }]} />
        <fieldset className="m-0 border-0 p-0">
          <legend className="ly-label mb-2">Columns to include</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXPORT_COLS[set].map((c) => (
              <label key={c} className="flex items-center gap-2" style={{ fontSize: "var(--fs-sm)" }}>
                <input type="checkbox" checked={!off.includes(c)} onChange={() => { setOff((o) => (o.includes(c) ? o.filter((x) => x !== c) : [...o, c])); setDone(""); }} />
                {c}
              </label>
            ))}
          </div>
        </fieldset>
        {cols.length === 0 && <div className="ly-error" role="alert">Select at least one column.</div>}
        {done ? <Alert tone="success" title="Export ready">{done}</Alert> : <span className="ly-hint">Account numbers and phone numbers stay masked in exports.</span>}
      </div>
    </Dialog>
  );
}
