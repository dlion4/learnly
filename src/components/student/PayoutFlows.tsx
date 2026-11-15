import { useState } from "react";
import { Dialog, useToast } from "../ui/primitives";
import { Alert, BarChart, CategoryBadge, Drawer, KV, MiniTabs, StatusChip, WizardSteps } from "../ui/overlays";
import { Icon } from "../ui/Icon";
import { OTPInput } from "../auth/OTPInput";
import { useStudent } from "./StudentStore";
import { monthlyDisbursed, type Payout } from "../../data/payouts";
import { CATEGORY_CHANNELS, CHANNEL_META, KENYAN_BANKS, type MethodChannel } from "../../data/payoutMethods";
import { isActiveRequest } from "../../data/requests";
import { catLabel, daysAgo, fmtDate, fmtDateTime, kes, type RequestCategory } from "../../data/students";
import { OTP_PREVIEW_CODE } from "../../data/auth";
import { downloadText } from "../../lib/download";

const CHANNELS = Object.keys(CHANNEL_META) as MethodChannel[];
const servedBy = (ch: MethodChannel) => (Object.keys(CATEGORY_CHANNELS) as RequestCategory[]).filter((c) => CATEGORY_CHANNELS[c].includes(ch));

/* ================================================================== */
/* 7. Payout detail drawer                                             */
/* ================================================================== */
export function PayoutDrawer() {
  const s = useStudent();
  const id = s.overlays.payout;
  const po = typeof id === "string" ? s.payouts.find((p) => p.id === id) : undefined;
  if (!po) return null;
  const close = () => s.close("payout");
  const thread = s.threads.find((t) => t.relatedId === po.id);
  const ok = po.status === "SETTLED" || po.status === "REVERSED";

  const steps: { label: string; note: string; cls: string }[] = [
    { label: "Approved", note: `Request ${po.requestId} approved by Finance`, cls: "is-done" },
    { label: "Queued", note: "Payout job created for the next batch", cls: "is-done" },
    { label: "Submitted to processor", note: CHANNEL_META[po.channel].label, cls: "is-done" },
    ok
      ? { label: "Settled", note: `Processor reference ${po.processorRef}`, cls: "is-done" }
      : { label: "Failed", note: po.failure ?? "Processor returned an error", cls: "is-bad" },
    ...(po.status === "REVERSED" ? [{ label: "Reversed", note: po.note ?? "Reversed by Finance", cls: "is-bad" }] : []),
    ...(po.status === "FAILED" ? [{ label: "Manual review by Finance", note: "Re-queue or change destination", cls: "is-todo" }] : []),
    ...(po.status === "SETTLED" ? [{ label: "Reconciled", note: "Matched against the processor statement overnight", cls: "is-done" }] : []),
  ];

  return (
    <Drawer
      open
      onClose={close}
      eyebrow={`${po.id} · ${fmtDate(po.at)}`}
      title={<span className="flex flex-wrap items-center gap-2">{kes(po.amountKes)} <StatusChip status={po.status} /></span>}
      footer={
        <>
          <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => { close(); s.open("request", po.requestId); }}>View request</button>
          <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("reportIssue", po.id)}><Icon name="flag" size={15} /> Report an issue</button>
          {po.status === "SETTLED" && <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("receipt", po.id)}><Icon name="receipt" size={15} /> Receipt</button>}
        </>
      }
    >
      <div className="grid gap-4">
        {po.status === "FAILED" && (
          <Alert tone="danger" title="This payout did not reach the destination" action={
            <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => { close(); s.open("messages", thread ? thread.id : `new:${po.id}`); }}>Message Finance</button>
          }>{po.failure}</Alert>
        )}
        {po.status === "REVERSED" && <Alert tone="info" title="Reversed">{po.note}</Alert>}
        <div className="ly-panel">
          <KV k="Category"><CategoryBadge category={po.category} /></KV>
          <KV k="Channel">{CHANNEL_META[po.channel].label}</KV>
          <KV k="Destination">{po.destination}</KV>
          <KV k="Amount"><span className="ly-amount">{kes(po.amountKes)}</span></KV>
          <KV k="Processor fee (paid by sponsor)">{kes(po.feeKes)}</KV>
          <KV k="Processor reference"><span className="ly-ref">{po.processorRef}</span></KV>
          <KV k="Date">{fmtDateTime(po.at)}</KV>
        </div>
        <div>
          <h3 className="ly-section-title">Payout lifecycle</h3>
          <ol className="ly-timeline">
            {steps.map((st) => (
              <li key={st.label} className={st.cls}><strong>{st.label}</strong><div className="ly-hint">{st.note}</div></li>
            ))}
          </ol>
        </div>
        <div className="ly-panel ly-panel-soft">
          <div className="ly-eyebrow mb-2">Processor response</div>
          <div className="font-mono" style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
            <div>OriginatorConversationID: {po.id}</div>
            <div>ResultCode: {po.status === "FAILED" ? "1037" : "0"}</div>
            <div>ResultDesc: {po.status === "FAILED" ? "DS timeout user cannot be reached" : "The service request is processed successfully."}</div>
            <div>TransactionID: {po.processorRef}</div>
          </div>
        </div>
        {po.channel === "MPESA" && po.status === "SETTLED" && (
          <span className="ly-hint">M-Pesa already sent its own SMS for this payout, so Learnly did not send a duplicate.</span>
        )}
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* 8. Receipt (real download)                                          */
/* ================================================================== */
function receiptText(po: Payout, learner: string, school: string): string {
  return [
    "LEARNLY — PAYOUT RECEIPT",
    "========================",
    `Receipt no:        ${po.id}`,
    `Date:              ${fmtDateTime(po.at)}`,
    `Learner:           ${learner}`,
    `School:            ${school}`,
    `Request:           ${po.requestId}`,
    `Category:          ${catLabel(po.category)}`,
    `Channel:           ${CHANNEL_META[po.channel].label}`,
    `Destination:       ${po.destination}`,
    `Amount:            ${kes(po.amountKes)}`,
    `Processor ref:     ${po.processorRef}`,
    `Status:            ${po.status}`,
    "",
    "Learnly Technologies Ltd · Nairobi, Kenya · hello@learnly.co.ke",
    "Account and phone numbers are masked under the Data Protection Act 2019.",
  ].join("\n");
}

export function ReceiptModal() {
  const s = useStudent();
  const id = s.overlays.receipt;
  const po = typeof id === "string" ? s.payouts.find((p) => p.id === id) : undefined;
  const [saved, setSaved] = useState("");
  if (!po) return null;
  const close = () => { setSaved(""); s.close("receipt"); };
  return (
    <Dialog open onClose={close} eyebrow="Payout receipt" title={po.id} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Close</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={() => {
          const name = `learnly-receipt-${po.id}.txt`;
          downloadText(name, receiptText(po, s.student.fullName, s.student.school));
          setSaved(name);
        }}><Icon name="download" size={16} /> Download receipt</button>
      </>
    }>
      <div className="ly-panel" style={{ borderTop: "4px solid var(--brand-accent)" }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-display" style={{ fontSize: "1.2rem" }}>Learnly</div>
            <div className="ly-hint">Nairobi, Kenya</div>
          </div>
          <StatusChip status={po.status} />
        </div>
        <div className="mb-3 text-center">
          <div className="ly-eyebrow">Amount paid</div>
          <div className="font-display" style={{ fontSize: "var(--fs-kpi-xl)", color: "var(--brand-ink)" }}>{kes(po.amountKes)}</div>
        </div>
        <KV k="Learner">{s.student.fullName}</KV>
        <KV k="School">{s.student.school}</KV>
        <KV k="Category">{catLabel(po.category)}</KV>
        <KV k="Paid to">{po.destination}</KV>
        <KV k="Channel">{CHANNEL_META[po.channel].label}</KV>
        <KV k="Processor reference"><span className="ly-ref">{po.processorRef}</span></KV>
        <KV k="Date">{fmtDateTime(po.at)}</KV>
        <KV k="Request">{po.requestId}</KV>
      </div>
      {saved && <div className="mt-3"><Alert tone="success" title="Receipt downloaded">{saved} was saved to your device.</Alert></div>}
    </Dialog>
  );
}

/* ================================================================== */
/* 9. Report a payout issue (3 steps)                                  */
/* ================================================================== */
const ISSUES = ["Money not received", "Wrong amount received", "Sent to the wrong destination", "Duplicate payout", "Something else"];
const CONTACTS = ["In-app message", "SMS to my guardian", "Email"];

export function ReportIssueModal() {
  const s = useStudent();
  const id = s.overlays.reportIssue;
  if (typeof id !== "string") return null;
  return <ReportIssueInner key={id} id={id} />;
}

function ReportIssueInner({ id }: { id: string }) {
  const s = useStudent();
  const [step, setStep] = useState(0);
  const [issue, setIssue] = useState(ISSUES[0]);
  const [detail, setDetail] = useState("");
  const [contact, setContact] = useState(CONTACTS[0]);
  const [error, setError] = useState("");
  const [threadId, setThreadId] = useState("");
  const [ticket] = useState(() => `SUP-${Math.floor(10_000 + Math.random() * 89_999)}`);
  const po = s.payouts.find((p) => p.id === id);
  const close = () => s.close("reportIssue");

  const send = () => {
    const tid = s.createThread(`${ticket}: ${issue} — ${id}`, "David Kimani Njoroge", "Finance Officer", `${issue}. ${detail.trim()} (Preferred contact: ${contact}.)`, id);
    setThreadId(tid);
    setStep(2);
  };

  return (
    <Dialog open onClose={close} eyebrow={id} title={step === 2 ? "Issue reported" : "Report a payout issue"} footer={
      step === 2 ? (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Done</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => { close(); s.close("payout"); s.open("messages", threadId); }}>Open conversation</button>
        </>
      ) : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 ? close() : setStep(0))}>{step === 0 ? "Cancel" : "Back"}</button>
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => {
            if (step === 0) {
              if (detail.trim().length < 20) return setError("Describe what happened in at least 20 characters.");
              setStep(1);
            } else send();
          }}>{step === 0 ? "Continue" : "Send to Finance"}</button>
        </>
      )
    }>
      <WizardSteps steps={["Issue", "Contact", "Sent"]} active={step} />
      {step === 0 && (
        <div className="grid gap-4">
          {po && <div className="ly-panel ly-panel-soft"><KV k="Payout">{kes(po.amountKes)} · {CHANNEL_META[po.channel].label}</KV><KV k="Destination">{po.destination}</KV></div>}
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="ly-label mb-2">What went wrong?</legend>
            {ISSUES.map((opt) => (
              <label key={opt} className={`ly-choice ${issue === opt ? "is-selected" : ""}`} style={{ flexDirection: "row", alignItems: "center", padding: "10px 12px" }}>
                <input type="radio" name="issue" checked={issue === opt} onChange={() => setIssue(opt)} />
                <span style={{ fontSize: "var(--fs-sm)" }}>{opt}</span>
              </label>
            ))}
          </fieldset>
          <div className="ly-field">
            <label className="ly-label" htmlFor="ri-detail">Describe what happened</label>
            <textarea id="ri-detail" className={`ly-input ly-textarea ${error ? "is-invalid" : ""}`} value={detail} onChange={(e) => { setDetail(e.target.value); setError(""); }} placeholder="e.g. Mum's phone shows no M-Pesa message for this amount." />
            {error && <span className="ly-error" role="alert">{error}</span>}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4">
          <div className="ly-panel"><KV k="Issue">{issue}</KV><KV k="Details">{detail.trim()}</KV></div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="ri-contact">How should Finance reply?</label>
            <select id="ri-contact" className="ly-select" value={contact} onChange={(e) => setContact(e.target.value)}>
              {CONTACTS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="ly-hint">Finance replies within one working day. M-Pesa reversals are only possible within 24 hours of settlement.</span>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <div className="ly-ref" style={{ fontSize: 15 }}>{ticket}</div>
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>Your report is with David Kimani Njoroge (Finance Officer). A conversation has been opened in Messages so you can follow up.</p>
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* 10. Add / verify payout method wizard                               */
/* ================================================================== */
const isMobile = (ch: MethodChannel) => ch === "MPESA" || ch === "AIRTEL";
const isPaybill = (ch: MethodChannel) => ch === "SCHOOL_PAYBILL" || ch === "SUPPLIER_PAYBILL" || ch === "HOSPITAL_PAYBILL";

export function AddMethodWizard() {
  const s = useStudent();
  const seed = s.overlays.addMethod;
  if (!seed) return null;
  return <AddMethodInner key={String(seed)} seed={seed} />;
}

function AddMethodInner({ seed }: { seed: string | true }) {
  const s = useStudent();
  const { toast } = useToast();
  const verifyId = typeof seed === "string" && seed.startsWith("verify:") ? seed.slice(7) : "";
  const existing = s.methods.find((m) => m.id === verifyId);
  const seedChannel = typeof seed === "string" && (CHANNELS as string[]).includes(seed) ? (seed as MethodChannel) : null;

  const [step, setStep] = useState(existing ? 2 : seedChannel ? 1 : 0);
  const [channel, setChannel] = useState<MethodChannel | null>(existing?.channel ?? seedChannel);
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState("");
  const [relationship, setRelationship] = useState("Mother");
  const [phone, setPhone] = useState("");
  const [paybill, setPaybill] = useState("");
  const [account, setAccount] = useState("");
  const [bank, setBank] = useState(KENYAN_BANKS[0].name);
  const [issuer, setIssuer] = useState("Pesapal");
  const [confirmed, setConfirmed] = useState(false);
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<"VERIFIED" | "PENDING" | null>(null);
  const close = () => s.close("addMethod");
  const needsOtp = !!existing || (channel !== null && (isMobile(channel) || channel === "CARD"));

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!channel) return false;
    if (label.trim().length < 3) e.label = "Give this method a short name, e.g. “Aunt Mary's M-Pesa”.";
    if (owner.trim().split(/\s+/).length < 2) e.owner = "Enter the registered name (at least two names).";
    if (isMobile(channel) && !/^[17]\d{8}$/.test(phone)) e.phone = "Enter a Kenyan number without the leading 0, e.g. 712345678.";
    if (isPaybill(channel) && !/^\d{5,7}$/.test(paybill)) e.paybill = "Paybill numbers are 5–7 digits.";
    if (isPaybill(channel) && account.trim().length < 3) e.account = "Enter the account or admission number.";
    if (channel === "SCHOOL_BANK" && !/^\d{8,14}$/.test(account)) e.account = "Bank account numbers are 8–14 digits.";
    if (channel === "CARD" && !/^\d{4}$/.test(account)) e.account = "Enter the last 4 digits printed on the card.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finish = () => {
    if (existing) {
      if (otp !== OTP_PREVIEW_CODE) return setErrors({ otp: `That code doesn't match. Use preview code ${OTP_PREVIEW_CODE}.` });
      s.verifyMethod(existing.id);
      setDone("VERIFIED");
      setStep(3);
      toast(`${existing.label} verified — you can now use it for payouts.`);
      return;
    }
    if (!channel) return;
    if (needsOtp && otp !== OTP_PREVIEW_CODE) return setErrors({ otp: `That code doesn't match. Use preview code ${OTP_PREVIEW_CODE}.` });
    if (!needsOtp && !confirmed) return setErrors({ confirmed: "Confirm the details match the official document." });
    const status = needsOtp ? "VERIFIED" : "PENDING";
    const identifier = isMobile(channel) ? `+254${phone}` : isPaybill(channel) ? `${paybill} · ${account.trim()}` : account;
    const masked = isMobile(channel) ? `+254 ••• ••• ${phone.slice(-3)}`
      : isPaybill(channel) ? `Paybill ${paybill} · Acc •••• ${account.trim().slice(-4)}`
      : channel === "SCHOOL_BANK" ? `${bank} •••• ${account.slice(-4)}` : `${issuer} **** ${account}`;
    s.addMethod({ channel, label: label.trim(), owner: owner.trim(), relationship: isMobile(channel) || channel === "CARD" ? relationship : "Institution", identifier, masked, status });
    setDone(status);
    setStep(3);
    toast(`${label.trim()} added${status === "VERIFIED" ? " and verified" : " — pending second-admin approval"}.`);
  };

  const footer = step === 3 ? (
    <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Done</button>
  ) : (
    <>
      <button type="button" className="ly-btn ly-btn-ghost" onClick={() => (step === 0 || existing || (step === 1 && seedChannel) ? close() : setStep(step - 1))}>
        {step === 0 || existing || (step === 1 && seedChannel) ? "Cancel" : "Back"}
      </button>
      <button type="button" className="ly-btn ly-btn-primary" onClick={() => {
        if (step === 0) {
          if (!channel) return setErrors({ channel: "Choose a channel to continue." });
          setErrors({});
          setStep(1);
        } else if (step === 1) {
          if (validateDetails()) setStep(2);
        } else finish();
      }}>{step === 2 ? (needsOtp ? "Verify & save" : "Submit for approval") : "Continue"}</button>
    </>
  );

  return (
    <Dialog open onClose={close} eyebrow="Account & payout methods" title={existing ? `Verify ${existing.label}` : step === 3 ? "Payout method saved" : "Add a payout method"} maxWidth={640} footer={footer}>
      <WizardSteps steps={["Channel", "Details", "Verify", "Done"]} active={step} />

      {step === 0 && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHANNELS.map((ch) => (
              <button key={ch} type="button" className={`ly-choice ${channel === ch ? "is-selected" : ""}`} aria-pressed={channel === ch} onClick={() => { setChannel(ch); setErrors({}); }}>
                <span className="flex items-center gap-2 font-semibold"><Icon name={CHANNEL_META[ch].icon} size={17} /> {CHANNEL_META[ch].label}</span>
                <span className="ly-hint">{CHANNEL_META[ch].blurb}</span>
                <span className="ly-hint">Used for: {servedBy(ch).map(catLabel).join(" · ")}</span>
              </button>
            ))}
          </div>
          {errors.channel && <div className="ly-error mt-3" role="alert">{errors.channel}</div>}
        </div>
      )}

      {step === 1 && channel && (
        <div className="grid gap-4">
          <Alert tone="info" title={CHANNEL_META[channel].label}>Can receive: {servedBy(channel).map(catLabel).join(" · ")}.</Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="ly-field">
              <label className="ly-label" htmlFor="am-label">Display name</label>
              <input id="am-label" className={`ly-input ${errors.label ? "is-invalid" : ""}`} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={isMobile(channel) ? "Aunt Mary's M-Pesa" : "Kenya High Fees A/C"} />
              {errors.label && <span className="ly-error" role="alert">{errors.label}</span>}
            </div>
            <div className="ly-field">
              <label className="ly-label" htmlFor="am-owner">{isMobile(channel) || channel === "CARD" ? "Registered owner" : "Account name"}</label>
              <input id="am-owner" className={`ly-input ${errors.owner ? "is-invalid" : ""}`} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={isMobile(channel) ? "Mary Wairimu Mwangi" : "Kenya High School"} />
              {errors.owner && <span className="ly-error" role="alert">{errors.owner}</span>}
            </div>
          </div>

          {(isMobile(channel) || channel === "CARD") && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="am-rel">Relationship to learner</label>
              <select id="am-rel" className="ly-select" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {["Learner", "Mother", "Father", "Guardian"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          {isMobile(channel) && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="am-phone">Mobile number</label>
              <div className="ly-phone-input">
                <span className="prefix">+254</span>
                <input id="am-phone" inputMode="numeric" maxLength={9} placeholder="712 345 678" value={phone} aria-invalid={!!errors.phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
              </div>
              {errors.phone ? <span className="ly-error" role="alert">{errors.phone}</span> : <span className="ly-hint">An OTP is sent to this line to prove ownership.</span>}
            </div>
          )}

          {isPaybill(channel) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ly-field">
                <label className="ly-label" htmlFor="am-paybill">Paybill number</label>
                <input id="am-paybill" inputMode="numeric" maxLength={7} className={`ly-input ${errors.paybill ? "is-invalid" : ""}`} value={paybill} onChange={(e) => setPaybill(e.target.value.replace(/\D/g, ""))} placeholder="247247" />
                {errors.paybill && <span className="ly-error" role="alert">{errors.paybill}</span>}
              </div>
              <div className="ly-field">
                <label className="ly-label" htmlFor="am-account">Account / admission number</label>
                <input id="am-account" className={`ly-input ${errors.account ? "is-invalid" : ""}`} value={account} onChange={(e) => setAccount(e.target.value)} placeholder="KHS1187" />
                {errors.account && <span className="ly-error" role="alert">{errors.account}</span>}
              </div>
            </div>
          )}

          {channel === "SCHOOL_BANK" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ly-field">
                <label className="ly-label" htmlFor="am-bank">Bank</label>
                <select id="am-bank" className="ly-select" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {KENYAN_BANKS.map((b) => <option key={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="ly-field">
                <label className="ly-label" htmlFor="am-account">Account number</label>
                <input id="am-account" inputMode="numeric" maxLength={14} className={`ly-input ${errors.account ? "is-invalid" : ""}`} value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} placeholder="1104478204471" />
                {errors.account && <span className="ly-error" role="alert">{errors.account}</span>}
              </div>
            </div>
          )}

          {channel === "CARD" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ly-field">
                <label className="ly-label" htmlFor="am-issuer">Card issuer</label>
                <select id="am-issuer" className="ly-select" value={issuer} onChange={(e) => setIssuer(e.target.value)}>
                  {["Pesapal", "Cellulant", "Mastercard", "Visa"].map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="ly-field">
                <label className="ly-label" htmlFor="am-account">Last 4 digits</label>
                <input id="am-account" inputMode="numeric" maxLength={4} className={`ly-input ${errors.account ? "is-invalid" : ""}`} value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} placeholder="6094" />
                {errors.account ? <span className="ly-error" role="alert">{errors.account}</span> : <span className="ly-hint">The full card number and CVV are never stored.</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        needsOtp ? (
          <div className="grid gap-4">
            <Alert tone="info" title={`Enter the 6-digit code sent to ${existing ? existing.masked : isMobile(channel as MethodChannel) ? `+254 ••• ••• ${phone.slice(-3)}` : "your registered phone"}`} action={
              <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => { setOtp(OTP_PREVIEW_CODE); setErrors({}); }}>Use {OTP_PREVIEW_CODE}</button>
            }>
              Preview mode — no SMS is sent. Use code {OTP_PREVIEW_CODE}.
            </Alert>
            <OTPInput idPrefix="pm-otp" ariaLabel="Payout method verification code" value={otp} onChange={(v) => { setOtp(v); setErrors({}); }} invalid={!!errors.otp} />
            {errors.otp && <div className="ly-error" role="alert">{errors.otp}</div>}
          </div>
        ) : (
          <div className="grid gap-4">
            <Alert tone="warning" title="Institution accounts need a second approval">
              School, supplier and hospital accounts are added as <strong>Pending</strong>. A school liaison and a second admin must confirm them (4-eyes check) before any payout is sent.
            </Alert>
            <div className="ly-panel">
              <KV k="Channel">{channel ? CHANNEL_META[channel].label : "—"}</KV>
              <KV k="Name">{label.trim()}</KV>
              <KV k="Account name">{owner.trim()}</KV>
              <KV k="Identifier">{channel && isPaybill(channel) ? `Paybill ${paybill} · ${account}` : `${bank} · ${account}`}</KV>
            </div>
            <label className="flex items-start gap-3" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setErrors({}); }} />
              <span>I confirm these details match the official fee structure, invoice or letterhead.</span>
            </label>
            {errors.confirmed && <div className="ly-error" role="alert">{errors.confirmed}</div>}
          </div>
        )
      )}

      {step === 3 && (
        <div className="grid justify-items-center gap-3 text-center">
          <span className="ly-success-mark"><Icon name="check" size={28} strokeWidth={2.5} /></span>
          <StatusChip status={done ?? "PENDING"} />
          <p className="m-0" style={{ color: "var(--text-secondary)" }}>
            {done === "VERIFIED"
              ? "This method is verified and now appears as a destination for its allowed categories."
              : "Saved as pending. You'll be notified once the second admin approves it — it cannot receive payouts until then."}
          </p>
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* 11. Remove payout method (reason + OTP if recently used)            */
/* ================================================================== */
export function RemoveMethodDialog() {
  const s = useStudent();
  const id = s.overlays.removeMethod;
  if (typeof id !== "string") return null;
  return <RemoveMethodInner key={id} id={id} />;
}

function RemoveMethodInner({ id }: { id: string }) {
  const s = useStudent();
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const method = s.methods.find((m) => m.id === id);
  const close = () => s.close("removeMethod");
  if (!method) return null;
  const blocking = s.requests.find((r) => r.methodId === id && isActiveRequest(r));
  const recent = !!method.lastUsedAt && method.lastUsedAt > daysAgo(180);

  return (
    <Dialog open onClose={close} eyebrow={method.masked} title={`Remove ${method.label}?`} footer={
      blocking ? <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Keep method</button> : (
        <>
          <button type="button" className="ly-btn ly-btn-ghost" onClick={close}>Keep method</button>
          <button type="button" className="ly-btn ly-btn-danger" onClick={() => {
            if (reason.trim().length < 10) return setError("Add a reason of at least 10 characters.");
            if (recent && otp !== OTP_PREVIEW_CODE) return setError(`Enter the confirmation code ${OTP_PREVIEW_CODE}.`);
            s.removeMethod(id);
            close();
          }}>Remove method</button>
        </>
      )
    }>
      {blocking ? (
        <Alert tone="danger" title="This method is in use" action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => { close(); s.open("request", blocking.id); }}>View {blocking.id}</button>}>
          {blocking.id} is still open and pays to this destination. Withdraw it or wait for it to close before removing the method.
        </Alert>
      ) : (
        <div className="grid gap-4">
          <Alert tone="warning">{recent ? "This method received a payout in the last 6 months, so removal needs a confirmation code and is flagged to your admin." : "Removal is recorded in the audit trail."}</Alert>
          <div className="ly-field">
            <label className="ly-label" htmlFor="rm-reason">Reason for removal</label>
            <textarea id="rm-reason" className="ly-input ly-textarea" value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} placeholder="e.g. Dad changed his number." />
          </div>
          {recent && (
            <div className="ly-field">
              <label className="ly-label" htmlFor="rm-otp">Confirmation code (preview: {OTP_PREVIEW_CODE})</label>
              <input id="rm-otp" inputMode="numeric" maxLength={6} className="ly-input font-mono" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }} placeholder="6-digit code" />
            </div>
          )}
          {error && <div className="ly-error" role="alert">{error}</div>}
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================== */
/* 12. Disbursement chart                                              */
/* ================================================================== */
type Period = "1" | "3" | "6" | "12";

export function ChartModal() {
  const s = useStudent();
  const [period, setPeriod] = useState<Period>("6");
  const close = () => s.close("chart");
  if (!s.overlays.chart) return null;

  const months = Number(period);
  const buckets = monthlyDisbursed(s.payouts, months);
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime();
  const inPeriod = s.payouts.filter((p) => p.status === "SETTLED" && new Date(p.at).getTime() >= since);
  const total = inPeriod.reduce((sum, p) => sum + p.amountKes, 0);
  const byCat = new Map<RequestCategory, number>();
  inPeriod.forEach((p) => byCat.set(p.category, (byCat.get(p.category) ?? 0) + p.amountKes));

  return (
    <Dialog open onClose={close} eyebrow="Disbursements" title="Money disbursed over time" maxWidth={760} footer={
      <>
        <button type="button" className="ly-btn ly-btn-ghost" onClick={() => { close(); s.open("export", "payouts"); }}><Icon name="download" size={16} /> Export payouts</button>
        <button type="button" className="ly-btn ly-btn-primary" onClick={close}>Close</button>
      </>
    }>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MiniTabs label="Period" value={period} onChange={setPeriod} tabs={[{ key: "1", label: "1M" }, { key: "3", label: "3M" }, { key: "6", label: "6M" }, { key: "12", label: "12M" }]} />
          <div className="text-right">
            <div className="font-display" style={{ fontSize: "var(--fs-kpi)", color: "var(--brand-ink)" }}>{kes(total)}</div>
            <div className="ly-hint">{inPeriod.length} settled payout{inPeriod.length === 1 ? "" : "s"}</div>
          </div>
        </div>
        <div className="ly-panel"><BarChart key={period} data={buckets} height={170} format={kes} /></div>
        {inPeriod.length === 0 ? (
          <Alert tone="info" title="No settled payouts in this period">Try a longer period, or apply for assistance — your first approved request will appear here.</Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <span key={cat} className="ly-chip" style={{ boxShadow: "none" }}>
                  <CategoryBadge category={cat} /> <span className="ly-amount" style={{ fontSize: 13 }}>{kes(amt)}</span>
                </span>
              ))}
            </div>
            <div className="ly-table-wrap is-card-stack">
              <table className="ly-table responsive-table">
                <thead><tr><th>Date</th><th>Category</th><th>Channel</th><th className="is-num">Amount</th></tr></thead>
                <tbody>
                  {inPeriod.map((p) => (
                    <tr key={p.id} className="is-clickable" onClick={() => { close(); s.open("payout", p.id); }}>
                      <td data-label="Date">{fmtDate(p.at)}</td>
                      <td data-label="Category"><CategoryBadge category={p.category} /></td>
                      <td data-label="Channel">{CHANNEL_META[p.channel].label}</td>
                      <td data-label="Amount" className="is-num"><span className="ly-amount">{kes(p.amountKes)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
