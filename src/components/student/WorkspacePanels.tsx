import { useEffect, useRef, useState } from "react";
import { Alert, BarChart, CategoryBadge, Drawer, Dropdown, EmptyState, KV, Masked, MiniTabs, Pagination, StatusChip, Tabs, Toggle } from "../ui/overlays";
import { Icon } from "../ui/Icon";
import { useStudent, type PanelKey } from "./StudentStore";
import { PAYOUT_MATRIX, isActiveRequest } from "../../data/requests";
import { CATEGORY_CHANNELS, CHANNEL_META, type MethodChannel } from "../../data/payoutMethods";
import { DOC_CATEGORY_LABEL, type DocCategory } from "../../data/documents";
import { ACADEMIC_TENURES, EXAM_RESULTS, TERM_RECORDS } from "../../data/academicRecords";
import { RELATED_GROUP_LABEL, RELATED_USERS, type RelatedGroup } from "../../data/relatedUsers";
import { NOTIFICATION_CATEGORY_LABEL, type NotificationCategory } from "../../data/messages";
import { catLabel, daysUntil, fmtDate, kes, maskPhone, relativeTime, type RequestCategory } from "../../data/students";

const servedBy = (ch: MethodChannel) => (Object.keys(CATEGORY_CHANNELS) as RequestCategory[]).filter((c) => CATEGORY_CHANNELS[c].includes(ch));

/** Open another panel from inside a panel: close the current one first so drawers never stack out of order. */
function useSwitch(current: PanelKey) {
  const s = useStudent();
  return (key: Parameters<typeof s.open>[0], payload?: string) => {
    s.close(current);
    s.open(key, payload);
  };
}

/* ================================================================== */
/* Financial assistance                                                */
/* ================================================================== */
type FinTab = "all" | "pending" | "approved" | "rejected" | "disbursed";
const FIN_MATCH: Record<FinTab, string[]> = {
  all: [], pending: ["SUBMITTED", "UNDER_REVIEW", "AWAITING_PROOF"], approved: ["APPROVED"], rejected: ["REJECTED", "FAILED", "WITHDRAWN"], disbursed: ["DISBURSED"],
};

export function FinancialPanel() {
  const s = useStudent();
  const [tab, setTab] = useState<FinTab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const count = (t: FinTab) => (t === "all" ? s.requests.length : s.requests.filter((r) => FIN_MATCH[t].includes(r.status)).length);
  const q = query.trim().toLowerCase();
  const rows = s.requests
    .filter((r) => tab === "all" || FIN_MATCH[tab].includes(r.status))
    .filter((r) => !q || `${r.id} ${catLabel(r.category)} ${r.status} ${r.term}`.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const size = 6;
  const pageRows = rows.slice((page - 1) * size, page * size);
  const used = PAYOUT_MATRIX.reduce((sum, r) => sum + s.capInfo(r.category).used, 0);
  const pending = s.requests.filter(isActiveRequest).reduce((sum, r) => sum + r.amountKes, 0);

  return (
    <Drawer open={!!s.overlays.financial} onClose={() => s.close("financial")} eyebrow="S-3 · Financial assistance" title="Requests & sponsor caps" width={640}
      tabs={<Tabs label="Request status" value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={(["all", "pending", "approved", "rejected", "disbursed"] as FinTab[]).map((t) => ({ key: t, label: t === "rejected" ? "Closed" : t[0].toUpperCase() + t.slice(1), count: count(t) }))} />}
      footer={
        <>
          <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => s.open("export", "requests")}><Icon name="download" size={15} /> Export</button>
          <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("caps")}>Sponsor caps</button>
          <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("newRequest")}><Icon name="plus" size={15} /> New request</button>
        </>
      }>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="ly-panel ly-panel-soft"><div className="ly-stat-label">Approved this year</div><div className="font-display" style={{ fontSize: "var(--fs-kpi-sm, 1.25rem)" }}>{kes(used)}</div></div>
          <div className="ly-panel ly-panel-soft"><div className="ly-stat-label">In review</div><div className="font-display" style={{ fontSize: "var(--fs-kpi-sm, 1.25rem)" }}>{kes(pending)}</div></div>
        </div>
        <div className="ly-search">
          <Icon name="search" size={16} />
          <input className="ly-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search reference, category or status" aria-label="Search requests" />
        </div>
        {pageRows.length === 0 ? (
          <EmptyState icon="wallet" title="No requests here" action={<button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("newRequest")}>Apply for assistance</button>}>
            {q ? `Nothing matches “${query}”. Clear the search or start a new request.` : "You have no requests in this view yet."}
          </EmptyState>
        ) : (
          <div className="grid gap-2">
            {pageRows.map((r) => (
              <button key={r.id} type="button" className="ly-row-btn" onClick={() => s.open("request", r.id)}>
                <span className="min-w-0 flex-1">
                  <CategoryBadge category={r.category} />
                  <span className="ly-ref block">{r.id} · {relativeTime(r.updatedAt)}</span>
                </span>
                <span className="grid justify-items-end gap-1">
                  <span className="ly-amount">{kes(r.approvedKes ?? r.amountKes)}</span>
                  <StatusChip status={r.status} />
                </span>
              </button>
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={size} total={rows.length} onChange={setPage} noun="requests" />
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* Academic records                                                    */
/* ================================================================== */
type AcadTab = "terms" | "journey" | "exams";

export function AcademicPanel() {
  const s = useStudent();
  const [tab, setTab] = useState<AcadTab>("terms");
  const [page, setPage] = useState(1);
  const size = 5;
  const trend = [...TERM_RECORDS].reverse().slice(-6).map((r) => ({ label: `${r.grade.replace("Grade ", "G")} T${r.term.slice(-1)}`, total: r.meanScore }));
  return (
    <Drawer open={!!s.overlays.academic} onClose={() => s.close("academic")} eyebrow="S-4 · Academic records" title="Your academic journey" width={640}
      tabs={<Tabs label="Academic sections" value={tab} onChange={setTab} tabs={[{ key: "terms", label: "Term records", count: TERM_RECORDS.length }, { key: "journey", label: "Schools", count: ACADEMIC_TENURES.length }, { key: "exams", label: "National exams", count: EXAM_RESULTS.length }]} />}
      footer={<button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("uploadDoc", "RESULT_SLIP")}><Icon name="upload" size={15} /> Upload result slip</button>}>
      {tab === "terms" && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <div className="ly-eyebrow mb-2">Mean score — last 6 terms (%)</div>
            <BarChart data={trend} height={140} format={(n) => `${n}%`} />
          </div>
          <div className="ly-table-wrap is-card-stack">
            <table className="ly-table responsive-table">
              <thead><tr><th>Term</th><th>School</th><th className="is-num">Mean</th><th>Level</th><th>Position</th></tr></thead>
              <tbody>
                {TERM_RECORDS.slice((page - 1) * size, page * size).map((r) => (
                  <tr key={r.id}>
                    <td data-label="Term"><strong>{r.grade}</strong> · {r.term} {r.year}</td>
                    <td data-label="School">{r.school}</td>
                    <td data-label="Mean" className="is-num"><span className="ly-amount">{r.meanScore}%</span></td>
                    <td data-label="Level"><span className={`ly-chip ly-status-chip ${r.level === "EE" ? "ly-status-approved" : r.level === "ME" ? "ly-status-disbursed" : "ly-status-warn"}`}>{r.level}</span></td>
                    <td data-label="Position">{r.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={size} total={TERM_RECORDS.length} onChange={setPage} noun="term records" />
          </div>
          <span className="ly-hint">EE = Exceeding · ME = Meeting · AE = Approaching Expectation. Verified records unlock fees and upkeep for the next term.</span>
        </div>
      )}
      {tab === "journey" && (
        <ol className="ly-timeline">
          {ACADEMIC_TENURES.map((t) => (
            <li key={t.id} className="is-done">
              <div className="flex flex-wrap items-center gap-2"><strong>{t.school}</strong>{t.origin && <span className="ly-chip ly-status-chip ly-status-warn"><Icon name="star" size={12} /> Origin school</span>}</div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--brand-ink)", fontWeight: 600 }}>{t.level}</div>
              <div className="ly-hint">{t.from} – {t.to} · {t.county} County</div>
              <p className="m-0 mt-1" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{t.note}</p>
            </li>
          ))}
        </ol>
      )}
      {tab === "exams" && (
        <div className="grid gap-3">
          {EXAM_RESULTS.map((e) => (
            <div key={e.id} className="ly-panel">
              <div className="font-semibold">{e.exam}</div>
              <KV k="Year">{e.year}</KV>
              <KV k="Index number"><span className="ly-ref">{e.index}</span></KV>
              <KV k="Outcome">{e.outcome}</KV>
            </div>
          ))}
          <Alert tone="info" title="Next national assessment">KSSEA at Grade 12. Exam registration requests open when the KNEC window does.</Alert>
        </div>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Related users                                                       */
/* ================================================================== */
type RelTab = "ALL" | RelatedGroup;

export function RelatedPanel() {
  const s = useStudent();
  const [group, setGroup] = useState<RelTab>("ALL");
  const rows = RELATED_USERS.filter((u) => group === "ALL" || u.group === group);
  return (
    <Drawer open={!!s.overlays.related} onClose={() => s.close("related")} eyebrow="S-5 · Related users" title="People on your record" width={560}>
      <div className="grid gap-4">
        <MiniTabs label="Relationship group" value={group} onChange={setGroup} tabs={[{ key: "ALL", label: "All", count: RELATED_USERS.length }, ...(Object.keys(RELATED_GROUP_LABEL) as RelatedGroup[]).map((g) => ({ key: g as RelTab, label: RELATED_GROUP_LABEL[g], count: RELATED_USERS.filter((u) => u.group === g).length }))]} />
        <div className="grid gap-2">
          {rows.map((u) => (
            <button key={u.id} type="button" className="ly-row-btn" onClick={() => s.open("relatedUser", u.id)}>
              <span className="ly-avatar ly-avatar-soft">{u.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{u.name}</span>
                <span className="ly-hint block truncate" style={{ fontSize: 12 }}>{u.role}</span>
              </span>
              {u.primaryContact && <span className="ly-chip ly-status-chip ly-status-approved">Primary</span>}
              <Icon name="chevronRight" size={16} />
            </button>
          ))}
        </div>
        <span className="ly-hint">Phone numbers stay masked until you reveal them; every reveal is audit-logged.</span>
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* Account & payout methods                                            */
/* ================================================================== */
export function AccountPanel() {
  const s = useStudent();
  const verified = s.methods.filter((m) => m.status === "VERIFIED").length;
  const received = s.payouts.filter((p) => p.status === "SETTLED").reduce((sum, p) => sum + p.amountKes, 0);
  return (
    <Drawer open={!!s.overlays.account} onClose={() => s.close("account")} eyebrow="S-6 · Account & payout methods" title="Where your payouts go" width={600}
      footer={<button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("addMethod")}><Icon name="plus" size={15} /> Add payout method</button>}>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="ly-panel ly-panel-soft"><div className="ly-stat-label">Received</div><div className="font-display" style={{ fontSize: "1.15rem" }}>{kes(received)}</div></div>
          <div className="ly-panel ly-panel-soft"><div className="ly-stat-label">Methods</div><div className="font-display" style={{ fontSize: "1.15rem" }}>{s.methods.length}</div></div>
          <div className="ly-panel ly-panel-soft"><div className="ly-stat-label">Verified</div><div className="font-display" style={{ fontSize: "1.15rem" }}>{verified} / {s.methods.length}</div></div>
        </div>
        <div className="grid gap-3">
          {s.methods.map((m) => (
            <article key={m.id} className="ly-panel">
              <div className="flex items-start gap-3">
                <span className="ly-stat-icon"><Icon name={CHANNEL_META[m.channel].icon} size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.label}</span><StatusChip status={m.status} /></div>
                  <div className="ly-ref">{m.masked}</div>
                  <div className="ly-hint">{CHANNEL_META[m.channel].label} · {m.owner} ({m.relationship})</div>
                </div>
                <Dropdown label={`Actions for ${m.label}`} trigger={<Icon name="more" size={16} />} items={[
                  ...(m.status === "VERIFIED" ? servedBy(m.channel).filter((c) => !m.defaultFor.includes(c)).map((c) => ({ label: `Set as default for ${catLabel(c).toLowerCase()}`, icon: "star", onSelect: () => s.setDefaultMethod(m.id, c) })) : []),
                  ...(m.status === "PENDING" && (m.channel === "MPESA" || m.channel === "AIRTEL") ? [{ label: "Verify with OTP", icon: "shield", onSelect: () => s.open("addMethod", `verify:${m.id}`) }] : []),
                  { label: "Remove method", icon: "trash", danger: true, separatorBefore: true, onSelect: () => s.open("removeMethod", m.id) },
                ]} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {servedBy(m.channel).map((c) => (
                  <span key={c} className={`ly-chip ly-status-chip ${m.defaultFor.includes(c) ? "ly-status-disbursed" : "ly-status-neutral"}`}>
                    <span className={`ly-cat-dot ly-cat-dot-${c}`} /> {catLabel(c)}{m.defaultFor.includes(c) ? " · default" : ""}
                  </span>
                ))}
              </div>
              {m.status === "PENDING" && (m.channel === "MPESA" || m.channel === "AIRTEL") && (
                <button type="button" className="ly-btn ly-btn-outline ly-btn-sm mt-3" onClick={() => s.open("addMethod", `verify:${m.id}`)}>Verify this line</button>
              )}
              {m.status === "PENDING" && m.channel !== "MPESA" && m.channel !== "AIRTEL" && <div className="ly-hint mt-3">Waiting for school liaison and second-admin approval (4-eyes check).</div>}
            </article>
          ))}
        </div>
        <details className="ly-panel help-faq">
          <summary>Which category can use which channel?</summary>
          <div className="mt-2">
            {(Object.keys(CATEGORY_CHANNELS) as RequestCategory[]).map((c) => (
              <KV key={c} k={catLabel(c)}>{CATEGORY_CHANNELS[c].map((ch) => CHANNEL_META[ch].label).join(" · ")}</KV>
            ))}
          </div>
        </details>
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* Documents                                                           */
/* ================================================================== */
type DocTab = "ALL" | DocCategory;

export function DocumentsPanel() {
  const s = useStudent();
  const [cat, setCat] = useState<DocTab>("ALL");
  const rows = s.documents.filter((d) => cat === "ALL" || d.category === cat);
  const cats = (Object.keys(DOC_CATEGORY_LABEL) as DocCategory[]).filter((c) => s.documents.some((d) => d.category === c));
  return (
    <Drawer open={!!s.overlays.documents} onClose={() => s.close("documents")} eyebrow="S-7 · Documents vault" title="Your documents" width={600}
      tabs={<Tabs label="Document category" value={cat} onChange={setCat} tabs={[{ key: "ALL", label: "All", count: s.documents.length }, ...cats.map((c) => ({ key: c as DocTab, label: DOC_CATEGORY_LABEL[c], count: s.documents.filter((d) => d.category === c).length }))]} />}
      footer={<button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("uploadDoc")}><Icon name="upload" size={15} /> Upload document</button>}>
      <div className="grid gap-2">
        {rows.map((d) => (
          <button key={d.id} type="button" className="ly-row-btn" onClick={() => s.open("docPreview", d.id)}>
            <span className="ly-stat-icon"><Icon name="file" size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{d.title}</span>
              <span className="ly-hint block truncate" style={{ fontSize: 12 }}>{d.fileName} · {fmtDate(d.uploadedAt)}</span>
            </span>
            <StatusChip status={d.status} />
          </button>
        ))}
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* Messages (list → thread → compose)                                  */
/* ================================================================== */
const STAFF = RELATED_USERS.filter((u) => u.group !== "FAMILY");

export function MessagesPanel() {
  const s = useStudent();
  const seed = s.overlays.messages;
  if (!seed) return null;
  return <MessagesInner key={String(seed)} seed={typeof seed === "string" ? seed : ""} />;
}

function MessagesInner({ seed }: { seed: string }) {
  const s = useStudent();
  const composing = seed.startsWith("new:") || seed.startsWith("to:");
  const [threadId, setThreadId] = useState(composing ? "" : seed);
  const [compose, setCompose] = useState(composing);
  const [to, setTo] = useState(seed.startsWith("to:") ? seed.slice(3) : "ru-10");
  const [subject, setSubject] = useState(seed.startsWith("new:") ? `Question about ${seed.slice(4)}` : "");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const thread = s.threads.find((t) => t.id === threadId);
  const { readThread } = s;

  useEffect(() => {
    if (thread) {
      readThread(thread.id);
      end.current?.scrollIntoView({ block: "end" });
    }
  }, [thread, readThread]);

  const send = () => {
    if (body.trim().length < 2) return setError("Write a message first.");
    if (compose) {
      if (subject.trim().length < 4) return setError("Add a subject of at least 4 characters.");
      const person = STAFF.find((u) => u.id === to) ?? STAFF[STAFF.length - 1];
      const id = s.createThread(subject.trim(), person.name, person.role, body.trim(), seed.startsWith("new:") ? seed.slice(4) : undefined);
      setCompose(false);
      setThreadId(id);
    } else if (thread) s.sendMessage(thread.id, body.trim());
    setBody("");
    setError("");
  };

  const title = compose ? "New message" : thread ? thread.subject : "Messages";
  return (
    <Drawer open onClose={() => s.close("messages")} eyebrow={thread && !compose ? `${thread.with} · ${thread.withRole}` : "S-8 · Messages"} title={title} width={560}
      footer={(compose || thread) ? (
        <div className="grid w-full gap-2">
          {error && <div className="ly-error" role="alert">{error}</div>}
          <div className="flex items-end gap-2">
            <textarea className="ly-input" rows={2} style={{ resize: "none" }} value={body} aria-label="Message" placeholder="Write a message…" onChange={(e) => { setBody(e.target.value); setError(""); }} />
            <button type="button" className="ly-btn ly-btn-primary" onClick={send}><Icon name="send" size={16} /> Send</button>
          </div>
        </div>
      ) : (
        <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => setCompose(true)}><Icon name="plus" size={15} /> New message</button>
      )}>
      {compose ? (
        <div className="grid gap-4">
          <button type="button" className="ly-link-btn justify-self-start" onClick={() => { setCompose(false); setError(""); }}><Icon name="arrowLeft" size={14} /> All conversations</button>
          <div className="ly-field">
            <label className="ly-label" htmlFor="msg-to">To</label>
            <select id="msg-to" className="ly-select" value={to} onChange={(e) => setTo(e.target.value)}>
              {STAFF.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
            </select>
          </div>
          <div className="ly-field">
            <label className="ly-label" htmlFor="msg-subject">Subject</label>
            <input id="msg-subject" className="ly-input" value={subject} onChange={(e) => { setSubject(e.target.value); setError(""); }} placeholder="e.g. Question about my fees request" />
          </div>
          <span className="ly-hint">Write your message below and press Send. Replies arrive here and as an in-app notification.</span>
        </div>
      ) : thread ? (
        <div className="grid gap-3">
          <button type="button" className="ly-link-btn justify-self-start" onClick={() => setThreadId("")}><Icon name="arrowLeft" size={14} /> All conversations</button>
          {thread.relatedId && (
            <button type="button" className="ly-chip justify-self-start" style={{ cursor: "pointer" }} onClick={() => s.open(thread.relatedId?.startsWith("PO-") ? "payout" : "request", thread.relatedId)}>
              <Icon name="file" size={14} /> About {thread.relatedId}
            </button>
          )}
          {thread.messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.from === "me" ? "is-me" : ""}`}>
              <div className="chat-meta">{msg.author} · {relativeTime(msg.at)}</div>
              {msg.body}
            </div>
          ))}
          <div ref={end} />
        </div>
      ) : (
        <div className="grid gap-2">
          {s.threads.map((th) => {
            const last = th.messages[th.messages.length - 1];
            return (
              <button key={th.id} type="button" className="ly-row-btn" onClick={() => setThreadId(th.id)}>
                <span className="ly-avatar ly-avatar-soft">{th.with.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{th.subject}</span>
                  <span className="ly-hint block truncate" style={{ fontSize: 12 }}>{last.from === "me" ? "You: " : ""}{last.body}</span>
                </span>
                <span className="grid justify-items-end gap-1">
                  <span className="ly-hint">{relativeTime(last.at)}</span>
                  {th.unread > 0 && <span className="ly-badge-count">{th.unread}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Notifications                                                       */
/* ================================================================== */
type NoteTab = "all" | "unread";
type NoteCat = "ALL" | NotificationCategory;
const NOTE_ICON: Record<NotificationCategory, string> = { APPROVAL: "shield", PAYOUT: "wallet", DOCUMENT: "file", MESSAGE: "chat", TERM_REMINDER: "calendar", SYSTEM: "info" };

export function NotificationsPanel() {
  const s = useStudent();
  const go = useSwitch("notifications");
  const [tab, setTab] = useState<NoteTab>("all");
  const [cat, setCat] = useState<NoteCat>("ALL");
  const rows = s.notifications.filter((n) => (tab === "all" || !n.read) && (cat === "ALL" || n.category === cat));
  return (
    <Drawer open={!!s.overlays.notifications} onClose={() => s.close("notifications")} eyebrow="S-9 · Notifications" title="What's new" width={540}
      tabs={<Tabs label="Notification filter" value={tab} onChange={setTab} tabs={[{ key: "all", label: "All", count: s.notifications.length }, { key: "unread", label: "Unread", count: s.unreadNotifications }]} />}
      footer={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" disabled={s.unreadNotifications === 0} onClick={s.markAllRead}><Icon name="check" size={15} /> Mark all as read</button>}>
      <div className="grid gap-3">
        <MiniTabs label="Notification category" value={cat} onChange={setCat} tabs={[{ key: "ALL", label: "All" }, ...(Object.keys(NOTIFICATION_CATEGORY_LABEL) as NotificationCategory[]).map((c) => ({ key: c as NoteCat, label: NOTIFICATION_CATEGORY_LABEL[c] }))]} />
        {rows.length === 0 ? (
          <EmptyState icon="bell" title="You're all caught up" action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => { setTab("all"); setCat("ALL"); }}>Show all notifications</button>}>
            No notifications match this filter.
          </EmptyState>
        ) : rows.map((n) => (
          <button key={n.id} type="button" className={`ly-row-btn ${n.read ? "" : "is-unread"}`} onClick={() => { s.markRead(n.id); go(n.link.kind === "settings" ? "settings" : n.link.kind, n.link.kind === "settings" ? "privacy" : n.link.id); }}>
            <span className="ly-stat-icon"><Icon name={NOTE_ICON[n.category]} size={17} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{n.title}</span>
              <span className="block" style={{ fontSize: 12, color: "var(--text-secondary)" }}>{n.body}</span>
              <span className="ly-hint">{relativeTime(n.at)}</span>
            </span>
            {!n.read && <span className="ly-pulse ly-pulse-warn" aria-label="Unread" />}
          </button>
        ))}
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* Settings                                                            */
/* ================================================================== */
type SetTab = "account" | "alerts" | "privacy";
const PREF_ROWS: [NotificationCategory, string][] = [["APPROVAL", "Approvals"], ["PAYOUT", "Payouts"], ["DOCUMENT", "Documents"], ["MESSAGE", "Messages"], ["TERM_REMINDER", "Term reminders"]];
const PREF_COLS: [string, string][] = [["email", "Email"], ["sms", "SMS"], ["push", "Push"]];
const CONSENTS: [string, string, boolean][] = [
  ["sponsorship", "Process personal data for sponsorship", true],
  ["special", "Process special-category data (medical, disability, ID)", true],
  ["school", "Share data with my school for verification", true],
  ["comms", "Transactional SMS & email (OTP, approvals, receipts)", false],
  ["marketing", "News and programme updates", false],
];

export function SettingsPanel() {
  const s = useStudent();
  const seed = s.overlays.settings;
  if (!seed) return null;
  return <SettingsInner key={String(seed)} initial={seed === "privacy" ? "privacy" : seed === "alerts" ? "alerts" : "account"} />;
}

function SettingsInner({ initial }: { initial: SetTab }) {
  const s = useStudent();
  const [tab, setTab] = useState<SetTab>(initial);
  const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-bs-theme") === "dark");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { prefs, consents, language } = s.settings;
  const renewed = !!consents.renewed;
  const deleting = !!consents.deletionRequested;
  const left = daysUntil(s.student.consentExpiresAt);

  const setTheme = (next: boolean) => {
    setDark(next);
    document.documentElement.setAttribute("data-bs-theme", next ? "dark" : "light");
    localStorage.setItem("ly-theme", next ? "dark" : "light");
  };

  return (
    <Drawer open onClose={() => s.close("settings")} eyebrow="S-10 · Settings" title="Settings" width={560}
      tabs={<Tabs label="Settings sections" value={tab} onChange={setTab} tabs={[{ key: "account", label: "Account" }, { key: "alerts", label: "Notifications" }, { key: "privacy", label: "Consent & data" }]} />}>
      {tab === "account" && (
        <div className="grid gap-4">
          <div className="ly-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="font-semibold">Language</div><div className="ly-hint">Applies to menus and headline labels.</div></div>
              <MiniTabs label="Language" value={language} onChange={(l) => s.updateSettings({ language: l })} tabs={[{ key: "en", label: "English" }, { key: "sw", label: "Kiswahili" }]} />
            </div>
          </div>
          <div className="ly-panel flex items-center justify-between gap-3">
            <div><div className="font-semibold">Dark mode</div><div className="ly-hint">Saved on this device.</div></div>
            <Toggle checked={dark} onChange={setTheme} label="Dark mode" />
          </div>
          <div className="ly-panel">
            <KV k="Email">{s.student.email}</KV>
            <KV k="Phone"><Masked masked={maskPhone(s.student.phone)} full={s.student.phone} label="your phone number" /></KV>
            <KV k="Timezone">Africa/Nairobi (EAT)</KV>
          </div>
          <span className="ly-hint">Changing your email or phone needs an OTP — ask your programme officer through Messages.</span>
        </div>
      )}
      {tab === "alerts" && (
        <div className="grid gap-3">
          <div className="ly-table-wrap">
            <table className="ly-table">
              <thead><tr><th>Event</th>{PREF_COLS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
              <tbody>
                {PREF_ROWS.map(([cat, label]) => (
                  <tr key={cat}>
                    <td>{label}</td>
                    {PREF_COLS.map(([ch, chLabel]) => {
                      const key = `${cat}:${ch}`;
                      return <td key={ch}><Toggle checked={!!prefs[key]} onChange={(v) => s.updateSettings({ prefs: { ...prefs, [key]: v } })} label={`${label} by ${chLabel}`} /></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="ly-hint">In-app notifications are always on. SMS is used for OTPs and payout outcomes only — never marketing.</span>
        </div>
      )}
      {tab === "privacy" && (
        <div className="grid gap-4">
          {renewed ? (
            <Alert tone="success" title="Consent renewed">Your guardian's consent is valid for another 12 months.</Alert>
          ) : (
            <Alert tone="warning" title={`Guardian consent expires in ${left} days`} action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.updateSettings({ consents: { ...consents, renewed: true } })}>Renew consent</button>}>
              Under the Data Protection Act 2019, consent is renewed every 12 months. Requests pause if it lapses.
            </Alert>
          )}
          <div className="ly-panel grid gap-3">
            {CONSENTS.map(([key, label, required]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{label}</div>
                  {required && <div className="ly-hint">Required for sponsorship — withdraw by deleting your account.</div>}
                </div>
                {required ? <span className="ly-chip ly-status-chip ly-status-verified"><Icon name="lock" size={12} /> Granted</span> : <Toggle checked={!!consents[key]} onChange={(v) => s.updateSettings({ consents: { ...consents, [key]: v } })} label={label} />}
              </div>
            ))}
          </div>
          <button type="button" className="ly-btn ly-btn-outline justify-self-start" onClick={() => s.open("dataExport")}><Icon name="download" size={16} /> Download my data</button>
          <div className="ly-panel" style={{ borderColor: "color-mix(in srgb, var(--brand-danger) 35%, transparent)" }}>
            <div className="font-semibold" style={{ color: "var(--brand-danger)" }}>Delete my account</div>
            {deleting ? (
              <Alert tone="danger" title="Deletion scheduled in 30 days" action={<button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.updateSettings({ consents: { ...consents, deletionRequested: false } })}>Cancel deletion</button>}>
                Your account stays active during the grace period. Open payouts and audit records are kept under legal hold.
              </Alert>
            ) : (
              <div className="grid gap-2">
                <p className="m-0" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>Starts a 30-day grace period, then removes your profile and documents. You can cancel any time before then.</p>
                <textarea className="ly-input ly-textarea" style={{ minHeight: 64 }} aria-label="Reason for deleting your account" placeholder="Tell us why (required)" value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} />
                {error && <div className="ly-error" role="alert">{error}</div>}
                <button type="button" className="ly-btn ly-btn-danger ly-btn-sm justify-self-start" onClick={() => {
                  if (reason.trim().length < 10) return setError("Give a reason of at least 10 characters.");
                  s.updateSettings({ consents: { ...consents, deletionRequested: true } });
                  setReason("");
                }}>Request account deletion</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
