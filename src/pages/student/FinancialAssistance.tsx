import { useState } from "react";
import { StudentShell } from "../../components/shell/StudentShell";
import { useStudent } from "../../components/student/StudentStore";
import { Icon } from "../../components/ui/Icon";
import { Dialog, CountUp } from "../../components/ui/primitives";
import { CategoryBadge, Dropdown, EmptyState, Pagination, StatusChip, Tabs, type MenuItem } from "../../components/ui/overlays";
import { ANNUAL_CAPS, PAYOUT_MATRIX, categoryRule, type StudentRequest } from "../../data/requests";
import { catLabel, fmtDateTime, kes, relativeTime, type RequestCategory } from "../../data/students";
import "../../styles/pages/student-financial-assistance.css";

const colors: Record<RequestCategory, string> = { fees: "#25428e", upkeep: "#2b8a65", pocketmoney: "#edaa43", fare: "#55aeca", equipment: "#9171c7", medical: "#df7773", exam: "#ed9557" };
const icons: Record<RequestCategory, string> = { fees: "bank", upkeep: "home", pocketmoney: "wallet", fare: "pin", equipment: "book", medical: "shield", exam: "file" };
type Filter = "All" | "Pending" | "Approved" | "Rejected" | "Disbursed" | "Drafts";
const filters: Filter[] = ["All", "Pending", "Approved", "Rejected", "Disbursed", "Drafts"];
const matches = (r: StudentRequest, tab: Filter) => tab === "All" || (tab === "Pending" ? ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF"].includes(r.status) : tab === "Drafts" ? r.status === "DRAFT" : r.status === tab.toUpperCase());

export default function StudentFinancialAssistance() {
  const s = useStudent();
  const [tab, setTab] = useState<Filter>("All");
  const [category, setCategory] = useState<RequestCategory | "all">("all");
  const [info, setInfo] = useState<RequestCategory | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(s.requests.find(r => r.status === "UNDER_REVIEW")?.id ?? s.requests[0]?.id);
  const current = s.requests.find(r => r.id === selected) ?? s.requests[0];
  const disbursed = s.requests.filter(r => r.status === "DISBURSED" && new Date(r.updatedAt).getFullYear() === new Date().getFullYear());
  const used = disbursed.reduce((sum, r) => sum + (r.approvedKes ?? r.amountKes), 0);
  const pending = s.requests.filter(r => ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF"].includes(r.status));
  const reserved = [...pending, ...s.requests.filter(r => r.status === "APPROVED")].reduce((sum, r) => sum + (r.approvedKes ?? r.amountKes), 0);
  const cap = Object.values(ANNUAL_CAPS).reduce((a,b) => a+b, 0);
  const available = Math.max(0, cap - used - reserved);
  const closed = s.requests.filter(r => ["APPROVED", "DISBURSED", "REJECTED"].includes(r.status)).slice(0, 10);
  const durations = closed.map(r => { const decision = r.timeline.find(t => t.state === "Approved" || t.state === "Rejected"); return decision ? Math.max(0, (new Date(decision.at).getTime() - new Date(r.submittedAt).getTime()) / 86400000) : 0; });
  const avg = durations.length ? (durations.reduce((a,b) => a+b,0) / durations.length).toFixed(1) : "—";
  const rows = s.requests.filter(r => matches(r, tab) && (category === "all" || r.category === category) && `${r.id} ${catLabel(r.category)} ${r.status} ${r.term}`.toLowerCase().includes(search.toLowerCase()));
  const amounts = PAYOUT_MATRIX.map(rule => ({ ...rule, amount: disbursed.filter(r => r.category === rule.category).reduce((sum,r) => sum + (r.approvedKes ?? r.amountKes), 0) }));
  let cursor = 0;
  const gradient = used ? amounts.filter(a => a.amount).map(a => { const start = cursor; cursor += a.amount / used * 100; return `${colors[a.category]} ${start}% ${cursor}%`; }).join(", ") : "#e9eaf0 0% 100%";
  const chooseCategory = (c: RequestCategory | "all") => { setCategory(c); setPage(1); };
  const menuFor = (r: StudentRequest): MenuItem[] => [
    { label: "View request", icon: "eye", onSelect: () => { setSelected(r.id); s.open("request", r.id); } },
    ...(r.status === "DRAFT" ? [{ label: "Edit draft", icon: "edit", onSelect: () => s.open("newRequest", r.id) }] : []),
    ...(["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF"].includes(r.status) ? [{ label: "Add proof", icon: "upload", onSelect: () => s.open("addProof", r.id) }, { label: "Withdraw request", icon: "trash", danger: true, onSelect: () => s.open("withdraw", r.id) }] : []),
    ...(["REJECTED", "WITHDRAWN"].includes(r.status) ? [{ label: "Request again", icon: "refresh", onSelect: () => s.open("newRequest", r.category) }] : []),
    ...(r.payoutId ? [{ label: "View payout", icon: "receipt", onSelect: () => s.open("payout", r.payoutId) }] : []),
  ];
  return <StudentShell pageClass="page-student-financial-assistance">
    <div className="fa-breadcrumb">STUDENT WORKSPACE <Icon name="chevronRight" size={12}/> <span>FINANCIAL ASSISTANCE</span></div>
    <header className="fa-header"><div><div className="fa-kicker"><span/> YOUR SPONSORSHIP</div><h1>Financial assistance</h1><p>Support for the things that move your education forward.</p></div><button className="ly-btn ly-btn-primary fa-primary" onClick={() => s.open("newRequest")}><Icon name="plus" size={17}/> New request</button></header>
    <div className="fa-intro"><div className="fa-intro-icon"><Icon name="sparkle" size={20}/></div><div><strong>Every step, supported.</strong><span> Apply for assistance, keep track of your requests, and see how your sponsorship is working for you.</span></div><button onClick={() => s.open("help")}>How it works <Icon name="arrowRight" size={14}/></button></div>
    <section className="fa-stats" aria-label="Financial assistance summary">
      {[
        { label:"Used this year", value: <CountUp value={used} format={kes}/>, hint:"Disbursed to date", icon:"trend", tone:"blue" },
        { label:"Pending requests", value: <CountUp value={pending.length}/>, hint: `${kes(reserved)} awaiting a decision`, icon:"clock", tone:"amber" },
        { label:"Available balance", value: <CountUp value={available} format={kes}/>, hint:"After pending requests", icon:"wallet", tone:"green" },
        { label:"Avg. decision time", value: `${avg} days`, hint:"Based on recent decisions", icon:"calendar", tone:"purple" },
      ].map(item => <div className="fa-stat ly-card" key={item.label}><div className="fa-stat-top"><span>{item.label}</span><span className={`fa-stat-icon ${item.tone}`}><Icon name={item.icon} size={17}/></span></div><strong>{item.value}</strong><small>{item.hint}</small></div>)}
    </section>
    <div className="fa-section-heading"><div><div className="fa-kicker">YOUR FUNDING AT A GLANCE</div><h2>Make the most of your support</h2><p>Understand your budget and choose the support you need.</p></div><button className="fa-text-link" onClick={() => s.open("caps")}>View sponsor limits <Icon name="arrowRight" size={14}/></button></div>
    <div className="fa-grid">
      <section className="ly-card fa-usage"><div className="fa-card-head"><div><h3>Where your support goes</h3><p>Disbursements by category</p></div><span className="fa-year">YEAR TO DATE</span></div><div className="fa-chart"><div className="fa-donut" style={{background:`conic-gradient(${gradient})`}}><div><span>TOTAL USED</span><strong>{kes(used)}</strong></div></div><div className="fa-legend">{amounts.map(a => <button key={a.category} onClick={() => { chooseCategory(a.category); document.getElementById("requests")?.scrollIntoView({behavior:"smooth"}); }}><i style={{background:colors[a.category]}}/><span>{catLabel(a.category)}</span><strong>{kes(a.amount)}</strong></button>)}</div></div><div className="fa-usage-footer"><span><Icon name="info" size={15}/> Select a category to filter requests</span><button onClick={() => s.open("chart")}>View insights <Icon name="arrowRight" size={14}/></button></div></section>
      <section className="ly-card fa-categories"><div className="fa-card-head"><div><h3>What do you need help with?</h3><p>Choose a category to start a request.</p></div><span className="fa-category-icon"><Icon name="plus" size={18}/></span></div><div className="fa-category-grid">{PAYOUT_MATRIX.map(rule => <button className="fa-category" key={rule.category} onClick={() => setInfo(rule.category)}><span className="fa-cat-icon" style={{color:colors[rule.category], background: `${colors[rule.category]}15`}}><Icon name={icons[rule.category]} size={18}/></span><span><strong>{catLabel(rule.category)}</strong><small>{rule.proofRequired ? "Proof required" : "No proof required"}</small></span><Icon name="chevronRight" size={15}/></button>)}</div><div className="fa-categories-note"><Icon name="shield" size={16}/> Your requests are reviewed securely by your sponsor.</div></section>
    </div>
    <section className="ly-card fa-requests" id="requests"><div className="fa-request-head"><div><div className="fa-kicker">KEEPING YOU IN THE LOOP</div><h2>Request history</h2><p>Follow your requests from submission through to payout.</p></div><div className="fa-actions"><button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("export", "requests")}><Icon name="download" size={15}/> Export</button><button className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("newRequest")}><Icon name="plus" size={15}/> New request</button></div></div>
      <div className="fa-filter-row"><Tabs label="Filter requests by status" value={tab} onChange={(v) => {setTab(v); setPage(1);}} tabs={filters.map(f => ({key:f,label:f,count:s.requests.filter(r => matches(r,f)).length}))}/><div className="fa-search"><Icon name="search" size={16}/><input value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} placeholder="Search requests" aria-label="Search requests"/></div></div>
      {category !== "all" && <div className="fa-filter-active">Showing {catLabel(category)} requests <button onClick={() => chooseCategory("all")}>Clear filter <Icon name="x" size={13}/></button></div>}
      {rows.length === 0 ? <EmptyState icon="search" title="No requests found" action={<button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => {setTab("All"); chooseCategory("all");setSearch("");}}>Clear filters</button>}>Try another filter or start a new request.</EmptyState> : <><div className="ly-table-wrap is-card-stack"><table className="ly-table responsive-table fa-table"><thead><tr><th>REFERENCE</th><th>CATEGORY</th><th>REQUESTED</th><th>APPROVED</th><th>PROOF</th><th>STATUS</th><th>SUBMITTED</th><th>UPDATED</th><th>ACTIONS</th></tr></thead><tbody>{rows.slice((page-1)*10,page*10).map(r => <tr key={r.id} className={s.flash[r.id] ? `ly-flash-${s.flash[r.id]}` : ""}><td data-label="Reference"><button className="fa-ref" onClick={() => {setSelected(r.id);s.open("request",r.id);}}>{r.id}</button><div className="fa-table-sub">{r.term}</div></td><td data-label="Category"><CategoryBadge category={r.category}/></td><td data-label="Requested"><strong>{kes(r.amountKes)}</strong></td><td data-label="Approved">{r.approvedKes === undefined ? "—" : kes(r.approvedKes)}</td><td data-label="Proof"><span className="fa-proof">{r.proofs.length ? <><Icon name="file" size={14}/> {r.proofs.length} file{r.proofs.length !== 1 ? "s" : ""}</> : categoryRule(r.category).proofRequired ? "Required" : "Not required"}</span></td><td data-label="Status"><StatusChip status={r.status}/></td><td data-label="Submitted">{r.status === "DRAFT" ? "—" : relativeTime(r.submittedAt)}</td><td data-label="Updated">{relativeTime(r.updatedAt)}</td><td data-label="Actions"><div className="fa-row-actions"><button onClick={() => {setSelected(r.id);s.open("request",r.id);}}>View</button><Dropdown label={`Actions for ${r.id}`} trigger={<Icon name="more" size={16}/>} items={menuFor(r)}/></div></td></tr>)}</tbody></table></div><Pagination page={page} pageSize={10} total={rows.length} onChange={setPage} noun="requests"/></>}
    </section>
    {current && <section className="ly-card fa-history"><div className="fa-history-header"><div><div className="fa-kicker">FOLLOW THE JOURNEY</div><h2>Approval history</h2><p>See the progress and decisions behind a request.</p></div><label>REQUEST <select value={current.id} onChange={e => setSelected(e.target.value)}>{s.requests.map(r => <option key={r.id} value={r.id}>{r.id} · {catLabel(r.category)}</option>)}</select></label></div><div className="fa-history-body"><div className="fa-history-summary"><CategoryBadge category={current.category}/><h3>{kes(current.amountKes)}</h3><p>{current.id} · {current.term}</p><StatusChip status={current.status}/><button className="fa-text-link" onClick={() => s.open("request",current.id)}>View request details <Icon name="arrowRight" size={14}/></button></div><ol className="ly-timeline fa-timeline">{current.timeline.map((event,i) => <li key={`${event.state}-${i}`} className={/reject|fail/i.test(event.state) ? "is-bad" : "is-done"}><div className="fa-event"><strong>{event.state}</strong><span>{fmtDateTime(event.at)}</span></div><div className="fa-event-actor">{event.actor}</div><p>{event.note}</p></li>)}</ol></div></section>}
    <div className="fa-bottom"><Icon name="shield" size={17}/> Your financial information is private and securely managed. <button onClick={() => s.open("help")}>Need help?</button></div>
    {info && <Dialog open onClose={() => setInfo(null)} eyebrow="ASSISTANCE CATEGORY" title={catLabel(info)} maxWidth={540} footer={<><button className="ly-btn ly-btn-outline" onClick={() => setInfo(null)}>Close</button><button className="ly-btn ly-btn-primary" onClick={() => { const c=info;setInfo(null);s.open("newRequest",c); }}>Start a request <Icon name="arrowRight" size={15}/></button></>}><div className="fa-dialog"><p>{categoryRule(info).destinationHint}</p><div><span>Available to request</span><strong>{kes(s.capInfo(info).max)}</strong></div><div><span>Proof</span><strong>{categoryRule(info).proofDocs}</strong></div><div><span>Frequency</span><strong>{categoryRule(info).frequency}</strong></div><div><span>Payment destination</span><strong>{categoryRule(info).channels.join(" · ")}</strong></div><p className="fa-dialog-note">Your final limit is determined by your sponsor allocation, category cap and any existing requests.</p></div></Dialog>}
  </StudentShell>;
}
