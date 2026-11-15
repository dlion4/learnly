import { useState } from "react";
import "../../styles/pages/student-overview.css";
import { StudentShell } from "../../components/shell/StudentShell";
import { useStudent } from "../../components/student/StudentStore";
import { CountUp } from "../../components/ui/primitives";
import {
  Alert, BarChart, CategoryBadge, Dropdown, EmptyState, MiniTabs, Pagination, ProgressBar, StatCard, StatusChip, Tabs, type MenuItem,
} from "../../components/ui/overlays";
import { Icon } from "../../components/ui/Icon";
import { PAYOUT_MATRIX, isActiveRequest, type StudentRequest } from "../../data/requests";
import { monthlyDisbursed, type Payout } from "../../data/payouts";
import { CHANNEL_META, type MethodChannel } from "../../data/payoutMethods";
import { TERM_DATES } from "../../data/academicRecords";
import { TERM_NOW, catLabel, daysUntil, eduLevelLabel, fmtDate, kes, relativeTime } from "../../data/students";

/** PAGE S-1 — /student. First S-page: owns StudentShell (CREATE_SHELL = true). */
export default function StudentOverview() {
  return (
    <StudentShell pageClass="page-student-overview">
      <Greeting />
      <KpiRow />
      <RequestsSection />
      <div className="ov-split">
        <PayoutsSection />
        <TermDatesCard />
      </div>
      <div className="ov-split">
        <ChartCard />
        <CapsCard />
      </div>
      <ActionFlags />
    </StudentShell>
  );
}

/* ================================================================== */
/* S1 — Greeting + profile completeness                                */
/* ================================================================== */
function Greeting() {
  const s = useStudent();
  const st = s.student;
  const sections = [...new Set(s.checklist.map((c) => c.section))].map((sec) => {
    const items = s.checklist.filter((c) => c.section === sec);
    return `${sec} ${Math.round((items.filter((c) => c.done).length / items.length) * 100)}%`;
  });
  return (
    <section className="ly-card ov-hero" aria-label="Welcome">
      <div className="min-w-0">
        <div className="ly-eyebrow">{new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })} · {TERM_NOW}</div>
        <h1 className="ov-hello">{s.t("hello")}, {st.firstName}.</h1>
        <p className="ov-sub">You're in <strong>{st.grade} / {eduLevelLabel(st.eduLevel)} · {st.pathway}</strong> at {st.school}.</p>
        <button type="button" className={`ly-edu-badge ly-edu-badge-${st.eduLevel} ov-edu-btn`} onClick={() => s.open("eduLevel")}>
          <Icon name="cap" size={14} /> {eduLevelLabel(st.eduLevel)} · {st.stream} · {st.pathway}
        </button>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => s.open("newRequest")}><Icon name="plus" size={16} /> Apply for assistance</button>
          <button type="button" className="ly-btn ly-btn-outline" onClick={() => s.open("uploadDoc")}><Icon name="upload" size={16} /> Upload document</button>
        </div>
      </div>
      <div className="ov-complete">
        <div className="flex items-baseline justify-between gap-2">
          <span className="ly-stat-label">Profile completeness</span>
          <span className="font-display" style={{ fontSize: "var(--fs-kpi)", color: "var(--brand-ink)" }}>{s.completeness}%</span>
        </div>
        <div className="my-3" title={sections.join(" · ")}><ProgressBar value={s.completeness} label="Profile completeness" /></div>
        <p className="ly-hint m-0" style={{ fontSize: 12, lineHeight: 1.6 }}>{sections.join(" · ")}</p>
        <button type="button" className="ly-link-btn mt-3" onClick={() => s.open("completeness")}>
          {s.completeness < 100 ? "Complete your profile" : "View profile checklist"} <Icon name="arrowRight" size={14} />
        </button>
      </div>
    </section>
  );
}

/* ================================================================== */
/* S2 — KPI row                                                        */
/* ================================================================== */
function KpiRow() {
  const s = useStudent();
  const active = s.requests.filter(isActiveRequest);
  const pending = s.requests.filter((r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW");
  const needsYou = active.filter((r) => r.status === "AWAITING_PROOF").length;
  const settled = s.payouts.filter((p) => p.status === "SETTLED");
  const total = settled.reduce((sum, p) => sum + p.amountKes, 0);
  const upcoming = [...TERM_DATES].sort((a, b) => a.at.localeCompare(b.at));
  const nextTerm = upcoming.find((d) => d.id === "td-08") ?? upcoming[0];
  const soonest = upcoming[0];
  return (
    <section className="ov-kpis" aria-label="Key figures">
      <StatCard label={s.t("activeRequests")} icon="wallet" value={<CountUp value={active.length} />}
        hint={needsYou ? `${needsYou} waiting for your proof upload` : "Nothing needs your action"} actionLabel="View all requests" onAction={() => s.open("financial")} />
      <StatCard label={s.t("pendingApprovals")} icon="clock" live={pending.length > 0} value={<CountUp value={pending.length} />}
        hint={pending[0] ? `${pending[0].id} is with the reviewer` : "No request is waiting on the sponsor"}
        actionLabel={pending[0] ? "Track this request" : "Start a request"} onAction={() => (pending[0] ? s.open("request", pending[0].id) : s.open("newRequest"))} />
      <StatCard label={s.t("totalDisbursed")} icon="trend" value={<CountUp value={total} format={(n) => kes(n)} />}
        hint={`${settled.length} settled payouts this year`} actionLabel="View disbursement chart" onAction={() => s.open("chart")} />
      <StatCard label={s.t("nextTermDate")} icon="calendar" value={new Date(nextTerm.at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
        hint={`Next term starts in ${daysUntil(nextTerm.at)} days · next up: ${soonest.title.toLowerCase()} in ${daysUntil(soonest.at)} days`} actionLabel="Open term calendar" onAction={() => s.open("termCalendar")} />
    </section>
  );
}

/* ================================================================== */
/* S3 — My requests                                                    */
/* ================================================================== */
type ReqTab = "active" | "drafts" | "closed" | "all";
type SortKey = "updated" | "amount" | "status";
const inTab = (r: StudentRequest, t: ReqTab) => (t === "all" ? true : t === "active" ? isActiveRequest(r) : t === "drafts" ? r.status === "DRAFT" : !isActiveRequest(r) && r.status !== "DRAFT");

function RequestsSection() {
  const s = useStudent();
  const [tab, setTab] = useState<ReqTab>("active");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "updated", dir: -1 });
  const [page, setPage] = useState(1);
  const size = 5;
  const q = query.trim().toLowerCase();

  const rows = s.requests
    .filter((r) => inTab(r, tab))
    .filter((r) => !q || `${r.id} ${catLabel(r.category)} ${r.status.replace("_", " ")} ${r.term}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const cmp = sort.key === "amount" ? (a.approvedKes ?? a.amountKes) - (b.approvedKes ?? b.amountKes) : sort.key === "status" ? a.status.localeCompare(b.status) : a.updatedAt.localeCompare(b.updatedAt);
      return cmp * sort.dir;
    });
  const pageRows = rows.slice((page - 1) * size, page * size);
  const toggleSort = (key: SortKey) => setSort((cur) => ({ key, dir: cur.key === key ? (cur.dir === 1 ? -1 : 1) : -1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : "");

  const menuFor = (r: StudentRequest): MenuItem[] => {
    const open = ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF"].includes(r.status);
    const thread = s.threads.find((t) => t.relatedId === r.id);
    return [
      { label: "View details", icon: "eye", onSelect: () => s.open("request", r.id) },
      ...(r.status === "DRAFT" ? [{ label: "Resume draft", icon: "edit", onSelect: () => s.open("newRequest", r.id) }] : []),
      ...(r.status === "AWAITING_PROOF" ? [{ label: "Upload proof", icon: "upload", onSelect: () => s.open("addProof", r.id) }] : []),
      ...(r.payoutId ? [{ label: "View payout", icon: "receipt", onSelect: () => s.open("payout", r.payoutId) }] : []),
      ...(r.status === "REJECTED" || r.status === "WITHDRAWN" ? [{ label: "Request again", icon: "refresh", onSelect: () => s.open("newRequest", r.category) }] : []),
      { label: "Message admin", icon: "chat", onSelect: () => s.open("messages", thread ? thread.id : `new:${r.id}`) },
      ...(open ? [{ label: "Withdraw request", icon: "trash", danger: true, separatorBefore: true, onSelect: () => s.open("withdraw", r.id) }] : []),
    ];
  };

  return (
    <section className="ly-card ov-card" aria-label="My requests">
      <div className="ov-card-head">
        <div className="ly-toolbar">
          <div>
            <h2 className="ov-title">My requests</h2>
            <p className="ov-caption">Fees, upkeep, pocket money, fare, equipment, medical and exam registration.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => s.open("caps")}>Sponsor caps</button>
            <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => s.open("export", "requests")}><Icon name="download" size={15} /> Export</button>
            <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("newRequest")}><Icon name="plus" size={15} /> New request</button>
          </div>
        </div>
        <div className="ly-toolbar mt-3">
          <Tabs label="Request filter" value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={(["active", "drafts", "closed", "all"] as ReqTab[]).map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1), count: s.requests.filter((r) => inTab(r, t)).length }))} />
          <div className="ly-search">
            <Icon name="search" size={16} />
            <input className="ly-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search requests" aria-label="Search my requests" />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="wallet" title={q ? "No matching requests" : tab === "active" ? "You have no active requests" : "Nothing in this view"} action={
          q ? <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setQuery("")}>Clear search</button>
            : <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("newRequest")}>Apply for assistance <Icon name="arrowRight" size={15} /></button>
        }>
          {q ? `Nothing matches “${query}” in this tab.` : "Apply for assistance and your request will be tracked here from submission to payout."}
        </EmptyState>
      ) : (
        <div className="ly-table-wrap is-card-stack">
          <table className="ly-table responsive-table">
            <thead>
              <tr>
                <th>Request</th>
                <th className="is-num"><button type="button" onClick={() => toggleSort("amount")}>Amount {arrow("amount")}</button></th>
                <th><button type="button" onClick={() => toggleSort("status")}>Status {arrow("status")}</button></th>
                <th><button type="button" onClick={() => toggleSort("updated")}>Submitted {arrow("updated")}</button></th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} data-request={r.id} className={s.flash[r.id] ? `ly-flash-${s.flash[r.id]}` : undefined}>
                  <td data-label="Request">
                    <div className="grid gap-0.5"><CategoryBadge category={r.category} /><span className="ly-ref">{r.id}</span></div>
                  </td>
                  <td data-label="Amount" className="is-num"><span className="ly-amount">{kes(r.approvedKes ?? r.amountKes)}</span></td>
                  <td data-label="Status"><StatusChip status={r.status} /></td>
                  <td data-label="Submitted">{r.status === "DRAFT" ? "Not submitted" : relativeTime(r.submittedAt)}</td>
                  <td data-label="Action">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" className="ly-link-btn" onClick={() => s.open("request", r.id)}>View</button>
                      <Dropdown label={`Actions for ${r.id}`} trigger={<Icon name="more" size={16} />} items={menuFor(r)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={size} total={rows.length} onChange={setPage} noun="requests" />
        </div>
      )}
    </section>
  );
}

/* ================================================================== */
/* S4 — Recent payouts + upcoming term dates + disbursement chart      */
/* ================================================================== */
type ChannelTab = "all" | "mobile" | "school" | "card" | "supplier";
const CHANNEL_GROUP: Record<ChannelTab, MethodChannel[]> = {
  all: [], mobile: ["MPESA", "AIRTEL"], school: ["SCHOOL_PAYBILL", "SCHOOL_BANK"], card: ["CARD"], supplier: ["SUPPLIER_PAYBILL", "HOSPITAL_PAYBILL"],
};

function PayoutsSection() {
  const s = useStudent();
  const [channel, setChannel] = useState<ChannelTab>("all");
  const [page, setPage] = useState(1);
  const size = 5;
  const rows = s.payouts.filter((p) => channel === "all" || CHANNEL_GROUP[channel].includes(p.channel));
  const menuFor = (p: Payout): MenuItem[] => [
    { label: "View details", icon: "eye", onSelect: () => s.open("payout", p.id) },
    ...(p.status === "SETTLED" ? [{ label: "Download receipt", icon: "receipt", onSelect: () => s.open("receipt", p.id) }] : []),
    { label: "View request", icon: "file", onSelect: () => s.open("request", p.requestId) },
    { label: "Report an issue", icon: "flag", separatorBefore: true, onSelect: () => s.open("reportIssue", p.id) },
  ];
  return (
    <section className="ly-card ov-card" aria-label="Recent payouts">
      <div className="ov-card-head">
        <div className="ly-toolbar">
          <div>
            <h2 className="ov-title">Recent payouts</h2>
            <p className="ov-caption">Every disbursement with its channel and processor reference.</p>
          </div>
          <button type="button" className="ly-link-btn" onClick={() => s.open("account")}>View all in Account <Icon name="arrowRight" size={14} /></button>
        </div>
        <div className="mt-3">
          <MiniTabs label="Payout channel" value={channel} onChange={(c) => { setChannel(c); setPage(1); }} tabs={[{ key: "all", label: "All" }, { key: "mobile", label: "Mobile money" }, { key: "school", label: "School" }, { key: "card", label: "Pocket card" }, { key: "supplier", label: "Supplier" }]} />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="receipt" title="No payouts on this channel yet" action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setChannel("all")}>Show all payouts</button>}>
          Your first approved request paid through this channel will appear here.
        </EmptyState>
      ) : (
        <div className="ly-table-wrap is-card-stack">
          <table className="ly-table responsive-table">
            <thead><tr><th>Date</th><th>Channel</th><th className="is-num">Amount</th><th>Reference</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.slice((page - 1) * size, page * size).map((p) => (
                <tr key={p.id} data-payout={p.id} className={s.flash[p.id] ? `ly-flash-${s.flash[p.id]}` : undefined}>
                  <td data-label="Date">{fmtDate(p.at)}</td>
                  <td data-label="Channel">
                    <div className="grid gap-0.5"><span className="font-semibold">{CHANNEL_META[p.channel].label}</span><span className="ly-hint">{catLabel(p.category)}</span></div>
                  </td>
                  <td data-label="Amount" className="is-num"><span className="ly-amount">{kes(p.amountKes)}</span></td>
                  <td data-label="Reference"><span className="ly-ref">{p.processorRef}</span></td>
                  <td data-label="Status"><StatusChip status={p.status} /></td>
                  <td data-label="Action">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" className="ly-link-btn" onClick={() => s.open("payout", p.id)}>View</button>
                      <Dropdown label={`Actions for ${p.id}`} trigger={<Icon name="more" size={16} />} items={menuFor(p)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={size} total={rows.length} onChange={setPage} noun="payouts" />
        </div>
      )}
    </section>
  );
}

function TermDatesCard() {
  const s = useStudent();
  const upcoming = [...TERM_DATES].sort((a, b) => a.at.localeCompare(b.at));
  const results = TERM_DATES.find((d) => d.id === "td-07");
  return (
    <section className="ly-card ov-side" aria-label="Upcoming term dates">
      <h2 className="ov-title">Upcoming term dates</h2>
      <p className="ov-caption">{s.student.school}</p>
      <ul className="m-0 mt-4 grid list-none gap-3 p-0">
        {upcoming.slice(0, 4).map((d) => (
          <li key={d.id} className="flex items-center gap-3">
            <div className="date-block"><span>{new Date(d.at).toLocaleDateString("en-KE", { month: "short" })}</span><strong>{new Date(d.at).getDate()}</strong></div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold" style={{ fontSize: 14 }}>{d.title}</div>
              <div className="ly-hint">in {daysUntil(d.at)} days{s.reminders.includes(d.id) ? " · reminder on" : ""}</div>
            </div>
          </li>
        ))}
      </ul>
      {results && (
        <div className="mt-4"><Alert tone="info">Results upload window opens on <strong>{fmtDate(results.at)}</strong> — upload your report form to unlock next term's fees.</Alert></div>
      )}
      <button type="button" className="ly-btn ly-btn-outline ly-btn-sm mt-4" onClick={() => s.open("termCalendar")}><Icon name="calendar" size={15} /> View calendar &amp; reminders</button>
    </section>
  );
}

function ChartCard() {
  const s = useStudent();
  const [period, setPeriod] = useState<"3" | "6">("6");
  const data = monthlyDisbursed(s.payouts, Number(period));
  const total = data.reduce((sum, b) => sum + b.total, 0);
  return (
    <section className="ly-card ov-side" aria-label="Disbursement trend">
      <div className="ly-toolbar">
        <div>
          <h2 className="ov-title">Disbursed over time</h2>
          <p className="ov-caption"><span className="ly-amount" style={{ color: "var(--brand-ink)" }}>{kes(total)}</span> in the last {period} months</p>
        </div>
        <div className="flex items-center gap-2">
          <MiniTabs label="Chart period" value={period} onChange={setPeriod} tabs={[{ key: "3", label: "3M" }, { key: "6", label: "6M" }]} />
          <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => s.open("chart")}>Expand</button>
        </div>
      </div>
      <div className="mt-4"><BarChart key={period} data={data} height={160} format={kes} /></div>
    </section>
  );
}

function CapsCard() {
  const s = useStudent();
  const top = PAYOUT_MATRIX.map((r) => ({ category: r.category, info: s.capInfo(r.category) })).sort((a, b) => b.info.used / b.info.annualCap - a.info.used / a.info.annualCap).slice(0, 3);
  return (
    <section className="ly-card ov-side" aria-label="Sponsor caps">
      <h2 className="ov-title">Sponsor caps</h2>
      <p className="ov-caption">Most-used categories this year</p>
      <div className="mt-4 grid gap-4">
        {top.map(({ category, info }) => (
          <div key={category}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <CategoryBadge category={category} />
              <span className="ly-hint">{kes(info.annualLeft)} left</span>
            </div>
            <ProgressBar value={(info.used / info.annualCap) * 100} label={`${catLabel(category)} cap used`} />
          </div>
        ))}
      </div>
      <button type="button" className="ly-btn ly-btn-outline ly-btn-sm mt-4" onClick={() => s.open("caps")}>View all 7 categories</button>
    </section>
  );
}

/* ================================================================== */
/* S5 — Action flags (derived; each resolves in a real flow)           */
/* ================================================================== */
interface Flag {
  key: string;
  tone: "warning" | "info" | "danger";
  title: string;
  body: string;
  cta: string;
  run: () => void;
}

function ActionFlags() {
  const s = useStudent();
  const [all, setAll] = useState(false);
  const flags: Flag[] = [];

  s.requests.filter((r) => r.status === "AWAITING_PROOF").forEach((r) => flags.push({
    key: r.id, tone: "warning", title: `Upload proof to unlock ${r.id}`, body: r.adminNote ?? "The verifier asked for more proof.", cta: "Upload proof", run: () => s.open("addProof", r.id),
  }));
  s.payouts.filter((p) => p.status === "FAILED").forEach((p) => flags.push({
    key: p.id, tone: "danger", title: `Payout of ${kes(p.amountKes)} failed`, body: "M-Pesa could not reach the recipient after 3 retries. Finance is reviewing it.", cta: "Review payout", run: () => s.open("payout", p.id),
  }));
  const line = s.methods.find((m) => m.relationship === "Learner" && m.channel === "MPESA" && m.status === "PENDING");
  if (line) flags.push({ key: line.id, tone: "warning", title: "Verify your M-Pesa line", body: "Enter the OTP to use your own line for pocket money and fare.", cta: "Verify now", run: () => s.open("addMethod", `verify:${line.id}`) });
  if (!s.settings.consents.renewed) flags.push({
    key: "consent", tone: "warning", title: `Guardian consent expires in ${daysUntil(s.student.consentExpiresAt)} days`, body: "Renew DPA 2019 consent so your requests are not paused.", cta: "Renew consent", run: () => s.open("settings", "privacy"),
  });
  s.documents.filter((d) => d.status === "PENDING").slice(0, 1).forEach((d) => flags.push({
    key: d.id, tone: "info", title: `${d.title} is awaiting verification`, body: "No action needed — verifiers usually clear documents within 2 working days.", cta: "View document", run: () => s.open("docPreview", d.id),
  }));
  if (!s.documents.some((d) => d.typeKey === "PROFILE_PHOTO")) flags.push({
    key: "photo", tone: "info", title: "Add a profile photo", body: "A passport-size photo completes the Personal section of your profile.", cta: "Upload photo", run: () => s.open("uploadDoc", "PROFILE_PHOTO"),
  });

  const shown = all ? flags : flags.slice(0, 4);
  return (
    <section aria-label="Action flags">
      <div className="ly-toolbar mb-3">
        <div>
          <h2 className="ov-title">Needs your attention</h2>
          <p className="ov-caption">{flags.length ? `${flags.length} item${flags.length === 1 ? "" : "s"} — each one opens the place to fix it.` : "Nothing outstanding."}</p>
        </div>
        {flags.length > 4 && <button type="button" className="ly-link-btn" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${flags.length}`}</button>}
      </div>
      {flags.length === 0 ? (
        <Alert tone="success" title="You're all caught up" action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("newRequest")}>New request</button>}>
          Your profile, documents and payout methods are in good order.
        </Alert>
      ) : (
        <div className="ov-flags">
          {shown.map((f) => (
            <Alert key={f.key} tone={f.tone} title={f.title} action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={f.run}>{f.cta}</button>}>{f.body}</Alert>
          ))}
        </div>
      )}
    </section>
  );
}
