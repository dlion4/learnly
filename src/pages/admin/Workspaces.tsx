import { useState, type ReactNode } from 'react';
import { Dialog } from '../../components/ui/primitives';
import { CategoryBadge, Drawer, Dropdown, Pagination, Tabs, WizardSteps } from '../../components/ui/overlays';
import { Icon } from '../../components/ui/Icon';
import {
  DOC_TYPES,
  useAdminStore,
  type DocRecord,
  type PayoutRecord,
  type SchoolRecord,
  type StaffRecord,
  type StudentRecord,
  type AdminRole,
  type PermissionKey,
} from '../../components/admin/AdminStore';
import { type AdminRequest, type AdminStatus } from '../../data/adminDashboard';
import { PAYOUT_MATRIX } from '../../data/requests';
import { catLabel, kes, type RequestCategory } from '../../data/students';
import { downloadText, toCsv } from '../../lib/download';
import { navigate } from '../../lib/navigation';
import '../../styles/pages/admin-workspaces.css';

export type WorkspaceKind = 'students' | 'approvals' | 'disbursements' | 'academic' | 'schools' | 'users';
type Item = AdminRequest | StudentRecord | PayoutRecord | DocRecord | SchoolRecord;

const configs: Record<WorkspaceKind, { title: string; sub: string; kicker: string; icon: string }> = {
  students: {
    title: 'Student management',
    sub: 'Complete administrative control over every learner in your programme.',
    kicker: 'YOUR STUDENT ROSTER',
    icon: 'users',
  },
  approvals: {
    title: 'Approvals',
    sub: 'Review student requests, create admin requests, and enforce funding decisions.',
    kicker: 'REVIEW & DECISIONS',
    icon: 'shield',
  },
  disbursements: {
    title: 'Disbursements & payouts',
    sub: 'Initiate direct payouts, run batches, retry failures, and control every shilling.',
    kicker: 'PAYMENT OPERATIONS',
    icon: 'wallet',
  },
  academic: {
    title: 'Academic verification',
    sub: 'Add, verify, reject, or request re-uploads for student academic records.',
    kicker: 'DOCUMENT REVIEW',
    icon: 'book',
  },
  schools: {
    title: 'Schools & institutions',
    sub: 'Register, edit, suspend, and manage banking & card programmes for institutions.',
    kicker: 'INSTITUTION REGISTRY',
    icon: 'bank',
  },
  users: {
    title: 'Users & permissions',
    sub: 'Manage staff, sub-admins, RBAC roles, data scopes, 2FA, and active sessions.',
    kicker: 'ACCESS & RBAC CONTROL',
    icon: 'user',
  },
};

function Kpis({ items }: { items: { label: string; value: ReactNode; hint: string; icon: string }[] }) {
  return (
    <div className="aw-kpis">
      {items.map((x, i) => (
        <div className="ly-card aw-kpi" key={x.label}>
          <div>
            <span>{x.label}</span>
            <i className={`aw-tone-${i % 4}`}>
              <Icon name={x.icon} size={17} />
            </i>
          </div>
          <strong>{x.value}</strong>
          <small>{x.hint}</small>
        </div>
      ))}
    </div>
  );
}

const fileCsv = (filename: string, rows: (string | number)[][]) =>
  downloadText(filename, toCsv(rows), 'text/csv');

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function AdminWorkspace({ kind }: { kind: WorkspaceKind }) {
  if (kind === 'users') return <UsersPermissionsWorkspace />;
  const {
    requests,
    setRequests,
    students,
    setStudents,
    payouts,
    setPayouts,
    docs,
    setDocs,
    schools,
    setSchools,
    activeRole,
    hasPermission,
    auditLog,
    logAction,
    deleteRecord,
  } = useAdminStore();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Item | null>(null);
  const [drawerTab, setDrawerTab] = useState('Overview');
  const [action, setAction] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [extra, setExtra] = useState(false);
  const [minCompletion, setMinCompletion] = useState(0);
  const [onlyPendingReq, setOnlyPendingReq] = useState(false);
  const [sortBy, setSortBy] = useState<'oldest' | 'newest' | 'amount' | 'waiting'>('waiting');

  const config = configs[kind];
  const selectedId = selected?.id;

  const canAdd = hasPermission('canAddRecords');
  const canEdit = hasPermission('canEditRecords');
  const canDelete = hasPermission('canDeleteRecords');
  const canApprove = hasPermission('canApproveRequests');
  const canPayout = hasPermission('canInitiatePayouts');
  const canSuspend = hasPermission('canSuspendUsers');
  const canExport = hasPermission('canExportData');

  const all: Item[] =
    kind === 'students'
      ? students
      : kind === 'approvals'
        ? requests
        : kind === 'disbursements'
          ? payouts
          : kind === 'academic'
            ? docs
            : schools;

  const tabs =
    kind === 'students'
      ? ['All', 'Active', 'Pending', 'Inactive', 'Suspended']
      : kind === 'approvals'
        ? ['All', ...PAYOUT_MATRIX.map((r) => catLabel(r.category))]
        : kind === 'disbursements'
          ? ['All', 'Queued', 'Submitted', 'Settled', 'Failed', 'Reversed']
          : kind === 'academic'
            ? ['All', ...DOC_TYPES]
            : ['All', 'Active', 'Inactive', 'Suspended'];

  const rows = all.filter((item) => {
    const str = JSON.stringify(item).toLowerCase();
    if (!str.includes(query.toLowerCase())) return false;
    if (tab !== 'All') {
      if (kind === 'approvals' && 'category' in item) {
        if (catLabel(item.category) !== tab) return false;
      } else if (kind === 'academic' && 'type' in item) {
        if (item.type !== tab) return false;
      } else if ('status' in item && item.status !== tab) return false;
    }
    if (filter !== 'All') {
      if (kind === 'students' && 'level' in item && item.level !== filter) return false;
      if (kind === 'approvals' && 'status' in item && item.status !== filter) return false;
      if (kind === 'disbursements' && 'channel' in item && item.channel !== filter) return false;
      if (kind === 'academic' && 'status' in item && item.status !== filter) return false;
      if (kind === 'schools' && 'county' in item && item.county !== filter) return false;
    }
    if (kind === 'students' && 'completion' in item) {
      if (item.completion < minCompletion) return false;
      if (onlyPendingReq && !requests.some((r) => r.name === item.name && r.status === 'Pending')) return false;
    }
    return true;
  });

  const sortedRows =
    kind === 'approvals'
      ? [...rows].sort((a, b) => {
          const ra = a as AdminRequest;
          const rb = b as AdminRequest;
          if (sortBy === 'amount') return rb.amount - ra.amount;
          if (sortBy === 'newest') return ra.days - rb.days;
          if (sortBy === 'oldest') return rb.days - ra.days;
          return rb.days - ra.days;
        })
      : rows;
  const filters =
    kind === 'students'
      ? ['Primary', 'Junior', 'Senior', 'TVET', 'University']
      : kind === 'approvals'
        ? ['Pending', 'Approved', 'Rejected', 'Needs proof']
        : kind === 'disbursements'
          ? ['M-Pesa', 'School paybill', 'Bank EFT', 'Card top-up', 'Airtel Money']
          : kind === 'academic'
            ? ['Pending', 'Verified', 'Rejected', 'Re-upload']
            : ['Nairobi', 'Kiambu', 'Nyeri'];

  const openItem = (item: Item) => {
    setDrawerTab('Overview');
    setSelected(item);
  };

  const exportRows = () => {
    if (!canExport) return;
    const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    fileCsv(`learnly-${kind}.csv`, [
      columns,
      ...rows.map((r) => columns.map((k) => String((r as unknown as Record<string, unknown>)[k] ?? ''))),
    ]);
    logAction(
      kind === 'students' ? 'Students' : kind === 'approvals' ? 'Approvals' : kind === 'disbursements' ? 'Disbursements' : kind === 'academic' ? 'Academic' : 'Schools',
      `Exported ${rows.length} ${kind} records to CSV`,
      `Role: ${activeRole}`
    );
  };

  const pending = requests.filter((r) => r.status === 'Pending');
  const cfgStats =
    kind === 'students'
      ? [
          ['Total students', students.length, 'Synchronized roster', 'users'],
          ['Active', students.filter((x) => x.status === 'Active').length, 'Currently enrolled', 'user'],
          ['Pending review', students.filter((x) => x.status === 'Pending').length, 'Onboarding queue', 'clock'],
          ['Suspended / Inactive', students.filter((x) => x.status === 'Inactive' || x.status === 'Suspended').length, 'Needs attention', 'alert'],
          ['New this month', students.filter((x) => x.onboarded.startsWith(new Date().toISOString().slice(0, 7))).length || 2, 'Recent onboarding', 'sparkle'],
        ]
        : kind === 'approvals'
          ? [
              ['Pending review', pending.length, 'Awaiting a decision', 'clock'],
              ['Submitted today', requests.filter((r) => r.days === 0).length, 'New arrivals', 'sparkle'],
              ['Awaiting more proof', requests.filter((r) => r.status === 'Needs proof').length, 'Waiting on student', 'alert'],
              ['Avg wait time', `${(pending.reduce((a, r) => a + r.days, 0) / Math.max(pending.length, 1)).toFixed(1)} days`, 'Pending queue', 'trend'],
              ['Approved', requests.filter((r) => r.status === 'Approved').length, 'Ready for payout', 'check'],
              ['Rejected', requests.filter((r) => r.status === 'Rejected').length, 'Declined requests', 'x'],
            ]
          : kind === 'disbursements'
            ? [
                ['Settled total', kes(payouts.filter((x) => x.status === 'Settled').reduce((a, x) => a + x.amount, 0)), 'Synchronized payout history', 'wallet'],
                ['In flight', payouts.filter((x) => ['Queued', 'Submitted'].includes(x.status)).length, 'Queued or submitted', 'clock'],
                ['Failed / Reversed', payouts.filter((x) => x.status === 'Failed' || x.status === 'Reversed').length, 'Requires attention', 'alert'],
                ['Success rate', `${Math.round((payouts.filter((x) => x.status === 'Settled').length / Math.max(payouts.length, 1)) * 100)}%`, 'Of total payouts', 'trend'],
                ['Avg settlement time', '1.4 min', 'Daraja & EFT average', 'sparkle'],
              ]
            : kind === 'academic'
              ? [
                  ['Pending verification', docs.filter((x) => x.status === 'Pending').length, 'Awaiting review', 'clock'],
                  ['Verified', docs.filter((x) => x.status === 'Verified').length, 'Approved records', 'shield'],
                  ['Rejected', docs.filter((x) => x.status === 'Rejected').length, 'Needs attention', 'alert'],
                  ['Re-upload requested', docs.filter((x) => x.status === 'Re-upload').length, 'Waiting for student', 'upload'],
                  ['Expiring soon', docs.filter((x) => x.type === 'Fee structure').length, 'Lapse in 30 days', 'calendar'],
                ]
              : [
                  ['Institutions', schools.length, 'In registry', 'bank'],
                  ['Active', schools.filter((x) => x.status === 'Active').length, 'Available institutions', 'shield'],
                  ['Linked students', schools.reduce((a, x) => a + x.students, 0), 'Across institutions', 'users'],
                  ['Card programmes', schools.filter((x) => x.card).length, 'Pesapal enabled', 'card'],
                  ['Verified bank / paybill', schools.filter((x) => Boolean(x.paybill || x.bankName)).length, 'Anti-fraud verified', 'check'],
                ];

  const primaryActionLabel =
    kind === 'students'
      ? 'Onboard student'
      : kind === 'schools'
        ? 'Register institution'
        : kind === 'disbursements'
          ? 'Initiate direct payout'
          : kind === 'academic'
            ? 'Add academic record'
            : 'Create admin request';

  const moduleAudit = auditLog.filter(
    (a) =>
      (kind === 'students' && a.module === 'Students') ||
      (kind === 'approvals' && a.module === 'Approvals') ||
      (kind === 'disbursements' && a.module === 'Disbursements') ||
      (kind === 'academic' && a.module === 'Academic') ||
      (kind === 'schools' && a.module === 'Schools')
  );

  return (
    <div className={`admin-workspace page-admin-${kind === 'academic' ? 'academic-verification' : kind}`}>
      <div className="aw-breadcrumb">
        ADMIN WORKSPACE <Icon name="chevronRight" size={12} />
        <span>{config.title.toUpperCase()}</span>
      </div>

      <div className="aw-header">
        <div>
          <div className="ad-eyebrow">{config.kicker}</div>
          <h1>{config.title}</h1>
          <p>{config.sub}</p>
        </div>
        <div className="aw-header-actions">
          {canExport && (
            <button className="ly-btn ly-btn-outline" onClick={exportRows}>
              <Icon name="download" size={16} /> Export CSV
            </button>
          )}
          {(canAdd || canPayout) && (
            <button className="ly-btn ly-btn-primary" onClick={() => setAction(primaryActionLabel)}>
              <Icon name="plus" size={16} />
              {primaryActionLabel}
            </button>
          )}
        </div>
      </div>

      <div className="aw-notice">
        <Icon name="shield" size={19} />
        <span>
          <strong>Master Admin Control ({activeRole}).</strong> All changes are synchronized across AD-1 to AD-6 and persisted locally.
        </span>
      </div>

      {/* SECTION 1: KPIs */}
      <Kpis
        items={cfgStats.map(([label, value, hint, icon]) => ({
          label: String(label),
          value,
          hint: String(hint),
          icon: String(icon),
        }))}
      />

      {/* SECTION 2: Admin Master Control Bar */}
      <section className="ly-card aw-extra" aria-label="Admin master controls">
        <div className="aw-section-head">
          <div>
            <div className="ad-eyebrow">ABSOLUTE ADMIN CONTROL</div>
            <h2>Master actions &amp; batch operations</h2>
          </div>
          <div className="aw-table-actions">
            {kind === 'students' && (
              <>
                {canAdd && (
                  <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Import students')}>
                    <Icon name="upload" size={14} /> Import CSV
                  </button>
                )}
                <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Bulk message')}>
                  <Icon name="chat" size={14} /> Bulk message
                </button>
              </>
            )}
            {kind === 'approvals' && (
              <>
                {canAdd && (
                  <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Create admin request')}>
                    <Icon name="plus" size={14} /> Add request
                  </button>
                )}
                <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Review guidelines')}>
                  <Icon name="info" size={14} /> Guidelines
                </button>
              </>
            )}
            {kind === 'disbursements' && (
              <>
                {canPayout && (
                  <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Run batch payout')}>
                    <Icon name="wallet" size={14} /> Run batch ({payouts.filter((p) => p.status === 'Queued').length} queued)
                  </button>
                )}
                <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Reconcile payouts')}>
                  <Icon name="refresh" size={14} /> Reconcile
                </button>
              </>
            )}
            {kind === 'academic' && (
              <>
                {canApprove && (
                  <button
                    className="ly-btn ly-btn-outline ly-btn-sm"
                    onClick={() => {
                      const next = docs.map((d) => (d.status === 'Pending' ? { ...d, status: 'Verified' as const } : d));
                      setDocs(next);
                      logAction('Academic', 'Bulk verified all pending documents', `${docs.filter((d) => d.status === 'Pending').length} documents verified`);
                    }}
                  >
                    <Icon name="check" size={14} /> Bulk verify pending
                  </button>
                )}
                <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setAction('Verification rules')}>
                  <Icon name="settings" size={14} /> Rules
                </button>
              </>
            )}
            {kind === 'schools' && (
              <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setExtra(!extra)}>
                <Icon name="card" size={14} /> {extra ? 'Hide' : 'Show'} card programmes
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3 (Disbursements): Channel Volume */}
      {kind === 'disbursements' && (
        <section className="ly-card aw-channel">
          <div>
            <div className="ad-eyebrow">LIVE CHANNEL DISTRIBUTION</div>
            <h2>Volume by channel</h2>
            <p>Settled payout volume across available payment channels. Click any bar to filter.</p>
          </div>
          <div className="aw-channel-bars">
            {['M-Pesa', 'School paybill', 'Bank EFT', 'Card top-up', 'Airtel Money'].map((c) => {
              const total = payouts
                .filter((p) => p.channel === c && p.status === 'Settled')
                .reduce((a, p) => a + p.amount, 0);
              const max = Math.max(
                1,
                ...['M-Pesa', 'School paybill', 'Bank EFT', 'Card top-up', 'Airtel Money'].map((ch) =>
                  payouts.filter((p) => p.channel === ch && p.status === 'Settled').reduce((a, p) => a + p.amount, 0)
                )
              );
              return (
                <button
                  key={c}
                  onClick={() => {
                    setFilter(c);
                    setPage(1);
                  }}
                >
                  <span>{c}</span>
                  <i>
                    <b style={{ width: `${(total / max) * 100}%` }} />
                  </i>
                  <strong>{kes(total)}</strong>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 4: Main Data Table */}
      <section className="ly-card aw-table-card">
        <div className="aw-section-head">
          <div>
            <div className="ad-eyebrow">
              {kind === 'students'
                ? 'PROGRAMME ROSTER'
                : kind === 'approvals'
                  ? 'REQUEST QUEUE'
                  : kind === 'disbursements'
                    ? 'PAYOUT HISTORY'
                    : kind === 'academic'
                      ? 'VERIFICATION QUEUE'
                      : 'PARTNER INSTITUTIONS'}
            </div>
            <h2>
              {kind === 'students'
                ? 'Students'
                : kind === 'approvals'
                  ? 'Request queue'
                  : kind === 'disbursements'
                    ? 'Payouts'
                    : kind === 'academic'
                      ? 'Documents awaiting review'
                      : 'Institution directory'}
            </h2>
            <p>{rows.length} matching records · Full edit, suspend, and delete controls enabled.</p>
          </div>
        </div>

        <div className="aw-toolbar">
          <div className="aw-tabs">
            <Tabs
              label={`${config.title} filters`}
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(1);
              }}
              tabs={tabs.map((t) => ({ key: t, label: t }))}
            />
          </div>
          <div className="aw-controls">
            {kind === 'approvals' && (
              <select
                aria-label="Sort approvals"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'oldest' | 'newest' | 'amount' | 'waiting')}
              >
                <option value="waiting">Longest waiting</option>
                <option value="amount">Highest amount</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            )}
            <select
              aria-label={`Filter ${config.title}`}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">
                {kind === 'students'
                  ? 'All levels'
                  : kind === 'approvals' || kind === 'academic'
                    ? 'All statuses'
                    : kind === 'disbursements'
                      ? 'All channels'
                      : 'All counties'}
              </option>
              {filters.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <div className="aw-search">
              <Icon name="search" size={15} />
              <input
                type="search"
                aria-label={`Search ${config.title}`}
                placeholder="Search records"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {kind === 'students' && (
          <div className="aw-toolbar" style={{ paddingTop: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span>Min profile completeness: <strong>{minCompletion}%</strong></span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minCompletion}
                onChange={(e) => {
                  setMinCompletion(Number(e.target.value));
                  setPage(1);
                }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={onlyPendingReq}
                onChange={(e) => {
                  setOnlyPendingReq(e.target.checked);
                  setPage(1);
                }}
              />
              Has pending request
            </label>
          </div>
        )}

        {kind === 'students' && checked.length > 0 && (
          <div className="aw-bulk">
            <strong>{checked.length} selected</strong>
            {canApprove && (
              <button
                onClick={() => {
                  setStudents(students.map((s) => (checked.includes(s.id) ? { ...s, status: 'Active' } : s)));
                  logAction('Students', 'Bulk approved students', `${checked.length} students activated`);
                  setChecked([]);
                }}
              >
                Bulk approve
              </button>
            )}
            {canSuspend && <button onClick={() => setAction('Bulk suspend')}>Suspend selected</button>}
            <button onClick={() => setAction('Bulk message')}>Message selected</button>
            <button onClick={() => setChecked([])}>Clear selection</button>
          </div>
        )}

        {rows.length ? (
          <>
            <div className="aw-table-wrap">
              <table className="aw-table">
                <thead>
                  <tr>
                    {kind === 'students' ? (
                      <>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="Select all visible students"
                            checked={rows.length > 0 && rows.every((r) => checked.includes(r.id))}
                            onChange={(e) => setChecked(e.target.checked ? rows.map((r) => r.id) : [])}
                          />
                        </th>
                        <th>STUDENT</th>
                        <th>LEVEL</th>
                        <th>SCHOOL</th>
                        <th>COUNTY</th>
                        <th>STATUS</th>
                        <th>PROFILE</th>
                        <th>ONBOARDED</th>
                        <th>ACTIONS</th>
                      </>
                    ) : kind === 'approvals' ? (
                      <>
                        <th>STUDENT</th>
                        <th>REFERENCE</th>
                        <th>CATEGORY</th>
                        <th>AMOUNT</th>
                        <th>PROOF</th>
                        <th>WAITING</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </>
                    ) : kind === 'disbursements' ? (
                      <>
                        <th>REFERENCE</th>
                        <th>STUDENT</th>
                        <th>CATEGORY</th>
                        <th>CHANNEL</th>
                        <th>DESTINATION</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </>
                    ) : kind === 'academic' ? (
                      <>
                        <th>STUDENT</th>
                        <th>DOCUMENT TYPE</th>
                        <th>TERM</th>
                        <th>OCR SUMMARY</th>
                        <th>WAITING</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </>
                    ) : (
                      <>
                        <th>INSTITUTION</th>
                        <th>MOE CODE</th>
                        <th>TYPE / LEVEL</th>
                        <th>COUNTY</th>
                        <th>STUDENTS</th>
                        <th>CARD</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.slice((page - 1) * 10, page * 10).map((item) => {
                    const r = item as AdminRequest;
                    const st = item as StudentRecord;
                    const po = item as PayoutRecord;
                    const d = item as DocRecord;
                    const sc = item as SchoolRecord;
                    return (
                      <tr key={item.id}>
                        {kind === 'students' ? (
                          <>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Select ${st.name}`}
                                checked={checked.includes(st.id)}
                                onChange={(e) =>
                                  setChecked(
                                    e.target.checked ? [...checked, st.id] : checked.filter((x) => x !== st.id)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <div className="ad-student">
                                <span className="ad-avatar">
                                  {st.name
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((x) => x[0])
                                    .join('')}
                                </span>
                                <span>
                                  <strong>{st.name}</strong>
                                  <small>{st.id}</small>
                                </span>
                              </div>
                            </td>
                            <td>{st.level}</td>
                            <td>{st.school}</td>
                            <td>{st.county}</td>
                            <td>
                              <span className={`aw-status ${st.status.toLowerCase()}`}>{st.status}</span>
                            </td>
                            <td>
                              <div className="aw-progress">
                                <i>
                                  <b style={{ width: `${st.completion}%` }} />
                                </i>
                                {st.completion}%
                              </div>
                            </td>
                            <td>{st.onboarded}</td>
                          </>
                        ) : kind === 'approvals' ? (
                          <>
                            <td>
                              <div className="ad-student">
                                <span className="ad-avatar">{r.initials}</span>
                                <span>
                                  <strong>{r.name}</strong>
                                  <small>{r.school}</small>
                                </span>
                              </div>
                            </td>
                            <td>{r.id}</td>
                            <td>
                              <CategoryBadge category={r.category} />
                            </td>
                            <td>
                              <strong>{kes(r.amount)}</strong>
                            </td>
                            <td>{r.proof}</td>
                            <td className={r.days > 3 ? 'ad-overdue' : ''}>
                              {r.days === 0 ? 'Today' : `${r.days} days`}
                            </td>
                            <td>
                              <span className={`aw-status ${r.status.toLowerCase().replace(' ', '-')}`}>
                                {r.status}
                              </span>
                            </td>
                          </>
                        ) : kind === 'disbursements' ? (
                          <>
                            <td>
                              <strong>{po.id}</strong>
                              <div className="aw-muted">
                                {po.requestId} {po.initiatedBy === 'Admin' ? '· Admin' : ''}
                              </div>
                            </td>
                            <td>{po.name}</td>
                            <td>
                              <CategoryBadge category={po.category} />
                            </td>
                            <td>{po.channel}</td>
                            <td>{po.destination}</td>
                            <td>
                              <strong>{kes(po.amount)}</strong>
                            </td>
                            <td>
                              <span className={`aw-status ${po.status.toLowerCase()}`}>{po.status}</span>
                            </td>
                          </>
                        ) : kind === 'academic' ? (
                          <>
                            <td>
                              <strong>{d.name}</strong>
                              <div className="aw-muted">{d.school}</div>
                            </td>
                            <td>{d.type}</td>
                            <td>{d.term}</td>
                            <td>{d.summary}</td>
                            <td>{d.days} days</td>
                            <td>
                              <span className={`aw-status ${d.status.toLowerCase()}`}>{d.status}</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <div className="ad-student">
                                <span className="ad-method-icon">
                                  <Icon name="bank" size={16} />
                                </span>
                                <span>
                                  <strong>{sc.name}</strong>
                                  <small>{sc.id}</small>
                                </span>
                              </div>
                            </td>
                            <td>{sc.code}</td>
                            <td>
                              {sc.type} · {sc.level}
                            </td>
                            <td>{sc.county}</td>
                            <td>{sc.students}</td>
                            <td>{sc.card ? 'Yes' : '—'}</td>
                            <td>
                              <span className={`aw-status ${sc.status.toLowerCase()}`}>{sc.status}</span>
                            </td>
                          </>
                        )}
                        <td>
                          <div className="aw-row-actions">
                            <button className="ad-link" onClick={() => openItem(item)}>
                              {kind === 'approvals' || kind === 'academic' ? 'Review' : 'View'}{' '}
                              <Icon name="arrowRight" size={13} />
                            </button>
                            <Dropdown
                              label={`Actions for ${item.name}`}
                              trigger={<Icon name="more" size={16} />}
                              items={[
                                { label: 'View details', icon: 'eye', onSelect: () => openItem(item) },
                                ...(canEdit
                                  ? [
                                      {
                                        label: 'Edit record',
                                        icon: 'settings',
                                        onSelect: () => {
                                          setSelected(item);
                                          setAction('Edit record');
                                        },
                                      },
                                    ]
                                  : []),
                                ...(kind === 'students' && canSuspend
                                  ? [
                                      {
                                        label: st.status === 'Suspended' ? 'Activate student' : 'Suspend student',
                                        icon: 'user',
                                        onSelect: () => {
                                          setSelected(item);
                                          setAction(st.status === 'Suspended' ? 'Activate student' : 'Suspend student');
                                        },
                                      },
                                    ]
                                  : []),
                                ...(kind === 'disbursements'
                                  ? [
                                      {
                                        label: po.status === 'Failed' ? 'Retry payout' : 'View lifecycle',
                                        icon: 'refresh',
                                        onSelect: () => {
                                          setSelected(item);
                                          if (po.status === 'Failed') setAction('Retry payout');
                                          else setDrawerTab('Timeline');
                                        },
                                      },
                                      ...(po.status === 'Queued' && canPayout
                                        ? [
                                            {
                                              label: 'Mark settled',
                                              icon: 'check',
                                              onSelect: () => {
                                                setPayouts(
                                                  payouts.map((x) =>
                                                    x.id === po.id ? { ...x, status: 'Settled' } : x
                                                  )
                                                );
                                                logAction('Disbursements', `Settled payout ${po.id}`, `${po.name} · ${kes(po.amount)}`);
                                              },
                                            },
                                          ]
                                        : []),
                                      ...(po.status === 'Settled'
                                        ? [
                                            {
                                              label: 'Download receipt',
                                              icon: 'download',
                                              onSelect: () =>
                                                downloadText(
                                                  `${po.id}-receipt.txt`,
                                                  `LEARNLY PAYOUT RECEIPT\nReference: ${po.id}\nStudent: ${po.name}\nAmount: ${kes(po.amount)}\nChannel: ${po.channel}\nStatus: ${po.status}\n`
                                                ),
                                            },
                                          ]
                                        : []),
                                    ]
                                  : []),
                                ...(kind === 'academic' && canApprove
                                  ? [
                                      {
                                        label: 'Verify document',
                                        icon: 'check',
                                        onSelect: () => {
                                          setSelected(item);
                                          setAction('Verify document');
                                        },
                                      },
                                    ]
                                  : []),
                                ...(kind === 'schools' && canSuspend
                                  ? [
                                      {
                                        label: sc.status === 'Active' ? 'Deactivate institution' : 'Activate institution',
                                        icon: 'settings',
                                        onSelect: () => {
                                          setSelected(item);
                                          setAction(sc.status === 'Active' ? 'Deactivate institution' : 'Activate institution');
                                        },
                                      },
                                    ]
                                  : []),
                                ...(canDelete
                                  ? [
                                      {
                                        label: 'Delete record',
                                        icon: 'x',
                                        onSelect: () => deleteRecord(kind, item.id),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={10} total={rows.length} onChange={setPage} noun="records" />
          </>
        ) : (
          <div className="aw-empty">
            <Icon name="search" size={23} />
            <strong>No matching records</strong>
            <p>Try another search or filter.</p>
            <button
              className="ly-btn ly-btn-outline ly-btn-sm"
              onClick={() => {
                setTab('All');
                setFilter('All');
                setQuery('');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* SECTION 5: Domain-Specific Management & Analytics */}
      {kind === 'students' && (
        <section className="ly-card aw-extra">
          <div className="aw-section-head">
            <div>
              <div className="ad-eyebrow">COMPLIANCE &amp; PROFILE WATCH</div>
              <h2>Incomplete profiles (&lt; 75% completion)</h2>
              <p>Students requiring admin follow-up or profile completion.</p>
            </div>
          </div>
          {students.filter((s) => s.completion < 75).length === 0 ? (
            <p className="aw-muted">All student profiles are above 75% completion.</p>
          ) : (
            students
              .filter((s) => s.completion < 75)
              .map((s) => (
                <div key={s.id}>
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {s.school} · {s.completion}% complete · {s.status}
                    </small>
                  </span>
                  <button
                    className="ad-link"
                    onClick={() => {
                      setSelected(s);
                      setAction('Edit record');
                    }}
                  >
                    Edit profile <Icon name="arrowRight" size={13} />
                  </button>
                </div>
              ))
          )}
        </section>
      )}

      {kind === 'approvals' && (
        <section className="ly-card aw-extra">
          <div className="aw-section-head">
            <div>
              <div className="ad-eyebrow">CATEGORY BREAKDOWN</div>
              <h2>Requests by support category</h2>
              <p>Total requested volume across all categories.</p>
            </div>
          </div>
          {PAYOUT_MATRIX.slice(0, 6).map((cat) => {
            const items = requests.filter((r) => r.category === cat.category);
            const sum = items.reduce((a, b) => a + b.amount, 0);
            return (
              <div key={cat.category}>
                <span>
                  <strong>{catLabel(cat.category)}</strong>
                  <small>{items.length} requests</small>
                </span>
                <strong>{kes(sum)}</strong>
              </div>
            );
          })}
        </section>
      )}

      {kind === 'disbursements' && (
        <section className="ly-card aw-extra">
          <div className="aw-section-head">
            <div>
              <div className="ad-eyebrow">RECOVERY QUEUE</div>
              <h2>Failed &amp; reversed payouts</h2>
              <p>Payouts that need immediate admin retry or channel reassignment.</p>
            </div>
          </div>
          {payouts.filter((p) => p.status === 'Failed' || p.status === 'Reversed').length === 0 ? (
            <p className="aw-muted">No failed or reversed payouts.</p>
          ) : (
            payouts
              .filter((p) => p.status === 'Failed' || p.status === 'Reversed')
              .map((p) => (
                <div key={p.id}>
                  <span>
                    <strong>
                      {p.id} · {p.name}
                    </strong>
                    <small>
                      {p.channel} · {kes(p.amount)} · {p.status}
                    </small>
                  </span>
                  <button
                    className="ad-link"
                    onClick={() => {
                      setSelected(p);
                      setAction('Retry payout');
                    }}
                  >
                    Retry now <Icon name="arrowRight" size={13} />
                  </button>
                </div>
              ))
          )}
        </section>
      )}

      {kind === 'academic' && (
        <section className="ly-card aw-extra">
          <div className="aw-section-head">
            <div>
              <div className="ad-eyebrow">DOCUMENT SUMMARY</div>
              <h2>Verification breakdown by type</h2>
              <p>Click any document type to filter the verification queue.</p>
            </div>
          </div>
          {DOC_TYPES.map((dt) => {
            const count = docs.filter((d) => d.type === dt).length;
            const verified = docs.filter((d) => d.type === dt && d.status === 'Verified').length;
            return (
              <div key={dt}>
                <span>
                  <strong>{dt}</strong>
                  <small>
                    {verified} of {count} verified
                  </small>
                </span>
                <button className="ad-link" onClick={() => setTab(dt)}>
                  Filter <Icon name="arrowRight" size={13} />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {extra && kind === 'schools' && (
        <section className="ly-card aw-extra">
          <div className="aw-section-head">
            <div>
              <h2>Pocket-card programmes &amp; banking</h2>
              <p>Institutions with active Pesapal card programmes.</p>
            </div>
            <button className="ad-link" onClick={() => setExtra(false)}>
              Close <Icon name="x" size={14} />
            </button>
          </div>
          {schools
            .filter((x) => x.card)
            .map((x) => (
              <div key={x.id}>
                <span>
                  <strong>{x.name}</strong>
                  <small>
                    Pesapal · Paybill {x.paybill || 'N/A'} · {x.bankName || 'KCB'}
                  </small>
                </span>
                <button
                  className="ad-link"
                  onClick={() => {
                    setSelected(x);
                    setAction('Edit record');
                  }}
                >
                  Manage
                </button>
              </div>
            ))}
        </section>
      )}

      {/* SECTION 6: Synchronized Module Audit Log */}
      <section className="ly-card aw-extra">
        <div className="aw-section-head">
          <div>
            <div className="ad-eyebrow">SYNCHRONIZED AUDIT TRAIL</div>
            <h2>Recent {config.title.toLowerCase()} activity</h2>
            <p>Every admin action is logged with actor, role, and timestamp.</p>
          </div>
          <button className="ad-link" onClick={() => setAction('Activity log')}>
            View all ({moduleAudit.length}) <Icon name="arrowRight" size={14} />
          </button>
        </div>
        {moduleAudit.length === 0 ? (
          <p className="aw-muted">No recent actions recorded in this module yet.</p>
        ) : (
          moduleAudit.slice(0, 4).map((entry) => (
            <div key={entry.id}>
              <span>
                <strong>{entry.action}</strong>
                <small>
                  {entry.actor} ({entry.role}) · {entry.details}
                </small>
              </span>
              <small>{entry.timestamp}</small>
            </div>
          ))
        )}
      </section>

      {selected && !action && (
        <RecordDrawer
          key={`${kind}-${selected.id}`}
          kind={kind}
          item={selected}
          close={() => setSelected(null)}
          tab={drawerTab}
          setTab={setDrawerTab}
          action={setAction}
        />
      )}

      {action && (
        <ActionWizard
          key={`${action}-${selectedId ?? ''}`}
          action={action}
          kind={kind}
          selected={selected}
          checked={checked}
          audit={moduleAudit.map((a) => `${a.timestamp} · ${a.action} (${a.actor})`)}
          close={() => setAction(null)}
          submit={(form) => {
            const note = form.note.trim();

            if (action === 'Edit record' && selected) {
              if (kind === 'students') {
                setStudents(
                  students.map((x) =>
                    x.id === selected.id
                      ? {
                          ...x,
                          name: form.name || x.name,
                          school: form.school || x.school,
                          level: form.level || x.level,
                          county: form.county || x.county,
                          completion: form.amount ? Math.min(100, Math.max(0, Number(form.amount))) : x.completion,
                        }
                      : x
                  )
                );
                logAction('Students', `Edited student ${selected.name}`, note || 'Updated profile fields');
              } else if (kind === 'approvals') {
                setRequests(
                  requests.map((x) =>
                    x.id === selected.id
                      ? {
                          ...x,
                          name: form.name || x.name,
                          amount: form.amount ? Number(form.amount) : x.amount,
                          decisionNote: note || x.decisionNote,
                        }
                      : x
                  )
                );
                logAction('Approvals', `Edited request ${selected.id}`, note || 'Updated request details');
              } else if (kind === 'disbursements') {
                setPayouts(
                  payouts.map((x) =>
                    x.id === selected.id
                      ? {
                          ...x,
                          channel: form.channel || x.channel,
                          destination: form.destination || x.destination,
                          amount: form.amount ? Number(form.amount) : x.amount,
                        }
                      : x
                  )
                );
                logAction('Disbursements', `Edited payout ${selected.id}`, note || 'Updated payout details');
              } else if (kind === 'academic') {
                setDocs(
                  docs.map((x) =>
                    x.id === selected.id
                      ? {
                          ...x,
                          type: form.docType || x.type,
                          summary: form.note || x.summary,
                        }
                      : x
                  )
                );
                logAction('Academic', `Edited document ${selected.id}`, note || 'Updated document metadata');
              } else if (kind === 'schools') {
                setSchools(
                  schools.map((x) =>
                    x.id === selected.id
                      ? {
                          ...x,
                          name: form.name || x.name,
                          county: form.county || x.county,
                          paybill: form.amount || x.paybill,
                          bankName: form.destination || x.bankName,
                        }
                      : x
                  )
                );
                logAction('Schools', `Edited institution ${selected.name}`, note || 'Updated institution details');
              }
              setAction(null);
              setSelected(null);
              return;
            }

            if (kind === 'approvals') {
              if (action === 'Create admin request' && form.name) {
                const newReq: AdminRequest = {
                  id: `LRQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
                  name: form.name,
                  initials: form.name
                    .split(' ')
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join(''),
                  school: form.school || 'Kenya High School',
                  level: form.level || 'Senior',
                  category: (form.category || 'fees') as RequestCategory,
                  amount: Number(form.amount) || 15000,
                  days: 0,
                  status: 'Pending',
                  proof: 'Admin-initiated request',
                  note: note || 'Created directly by administrator.',
                  term: `Term 2 · ${new Date().getFullYear()}`,
                };
                setRequests([newReq, ...requests]);
                logAction('Approvals', `Created admin request ${newReq.id}`, `${newReq.name} · ${kes(newReq.amount)}`);
              } else if (selected) {
                const status: AdminStatus =
                  action === 'Approve request' ? 'Approved' : action === 'Reject request' ? 'Rejected' : 'Needs proof';
                setRequests(
                  requests.map((x) =>
                    x.id === selected.id
                      ? {
                          ...x,
                          status,
                          ...(status === 'Approved' ? { approvedAmount: form.amount ? Number(form.amount) : x.amount } : {}),
                          decisionNote: form.note,
                        }
                      : x
                  )
                );
                logAction('Approvals', `${status} request ${selected.id}`, note || selected.name);
              }
            }

            if (kind === 'students') {
              if (action === 'Import students' && form.csv) {
                const lines = parseCsv(form.csv);
                const headers = lines[0].map((h) => h.toLowerCase());
                const imported = lines
                  .slice(1)
                  .map((line, i) => ({
                    id: `ST-IMP-${Date.now()}-${i}`,
                    name: line[headers.indexOf('name')] || '',
                    school: line[headers.indexOf('school')] || 'Not specified',
                    level: line[headers.indexOf('level')] || 'Senior',
                    status: 'Pending' as const,
                    completion: 40,
                    county: 'Nairobi',
                    onboarded: new Date().toISOString().slice(0, 10),
                  }))
                  .filter((x) => x.name);
                setStudents([...imported, ...students]);
                logAction('Students', `Imported ${imported.length} students via CSV`, 'Bulk CSV import');
              } else if (action === 'Onboard student' && form.name) {
                const newSt: StudentRecord = {
                  id: `ST-${Date.now().toString().slice(-6)}`,
                  name: form.name,
                  school: form.school || 'Not specified',
                  level: form.level || 'Senior',
                  status: 'Pending',
                  completion: 60,
                  county: form.county || 'Nairobi',
                  onboarded: new Date().toISOString().slice(0, 10),
                };
                setStudents([newSt, ...students]);
                logAction('Students', `Onboarded student ${newSt.name}`, `${newSt.school} · ${newSt.level}`);
              } else if (action === 'Suspend student' || action === 'Activate student' || action === 'Bulk suspend') {
                const ids = action === 'Bulk suspend' ? checked : [selectedId];
                setStudents(
                  students.map((x) =>
                    ids.includes(x.id) ? { ...x, status: action === 'Activate student' ? 'Active' : 'Suspended' } : x
                  )
                );
                setChecked([]);
                logAction('Students', action, `${ids.length} student(s) updated`);
              }
            }

            if (kind === 'disbursements') {
              if (action === 'Initiate direct payout' && form.name) {
                const newPo: PayoutRecord = {
                  id: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
                  requestId: 'ADMIN-DIRECT',
                  name: form.name,
                  category: (form.category || 'fees') as RequestCategory,
                  channel: form.channel || 'M-Pesa',
                  destination: form.destination || '+254 700 000 000',
                  amount: Number(form.amount) || 10000,
                  status: 'Queued',
                  days: 0,
                  initiatedBy: 'Admin',
                  notes: note,
                };
                setPayouts([newPo, ...payouts]);
                logAction('Disbursements', `Initiated direct payout ${newPo.id}`, `${newPo.name} · ${kes(newPo.amount)} via ${newPo.channel}`);
              } else if (action === 'Retry payout' || action === 'Reverse payout') {
                setPayouts(
                  payouts.map((x) =>
                    x.id === selectedId ? { ...x, status: action === 'Retry payout' ? 'Queued' : 'Reversed' } : x
                  )
                );
                logAction('Disbursements', `${action} ${selectedId}`, note || 'Status updated');
              } else if (action === 'Run batch payout') {
                const count = payouts.filter((x) => x.status === 'Queued').length;
                setPayouts(payouts.map((x) => (x.status === 'Queued' ? { ...x, status: 'Submitted' } : x)));
                logAction('Disbursements', `Ran batch payout`, `${count} queued payouts submitted`);
              }
            }

            if (kind === 'academic') {
              if (action === 'Add academic record' && form.name) {
                const newDoc: DocRecord = {
                  id: `DOC-${Date.now().toString().slice(-4)}`,
                  requestId: 'ADMIN-ENTRY',
                  name: form.name,
                  school: form.school || 'Kenya High School',
                  type: form.docType || 'Result slip',
                  term: `Term 2 · ${new Date().getFullYear()}`,
                  summary: note || 'Admin-verified record',
                  status: 'Verified',
                  days: 0,
                  uploadedBy: 'Admin',
                };
                setDocs([newDoc, ...docs]);
                logAction('Academic', `Added academic record ${newDoc.id}`, `${newDoc.name} · ${newDoc.type}`);
              } else if (selected && ['Verify document', 'Reject document', 'Request re-upload'].includes(action)) {
                const status: DocRecord['status'] =
                  action === 'Verify document' ? 'Verified' : action === 'Reject document' ? 'Rejected' : 'Re-upload';
                setDocs(docs.map((x) => (x.id === selected.id ? { ...x, status } : x)));
                logAction('Academic', `${action} ${selected.id}`, note || selected.name);
              }
            }

            if (kind === 'schools') {
              if (action === 'Register institution' && form.name) {
                const newSc: SchoolRecord = {
                  id: `SCH-${Date.now().toString().slice(-4)}`,
                  name: form.name,
                  county: form.school || 'Nairobi',
                  level: form.level || 'Senior',
                  type: 'Public',
                  code: form.amount || 'MOE-NEW',
                  status: 'Active',
                  students: 0,
                  card: false,
                };
                setSchools([newSc, ...schools]);
                logAction('Schools', `Registered institution ${newSc.name}`, `${newSc.county} · ${newSc.code}`);
              } else if (action === 'Deactivate institution' || action === 'Activate institution') {
                setSchools(
                  schools.map((x) =>
                    x.id === selectedId
                      ? { ...x, status: action === 'Activate institution' ? 'Active' : 'Inactive' }
                      : x
                  )
                );
                logAction('Schools', `${action} ${selected?.name}`, note || 'Status updated');
              }
            }

            setAction(null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function RecordDrawer({
  kind,
  item,
  close,
  tab,
  setTab,
  action,
}: {
  kind: WorkspaceKind;
  item: Item;
  close: () => void;
  tab: string;
  setTab: (v: string) => void;
  action: (v: string) => void;
}) {
  const names: Record<WorkspaceKind, string[]> = {
    students: ['Overview', 'Profile', 'Requests', 'Academic', 'Payouts', 'Related users', 'Documents', 'Audit'],
    approvals: ['Overview', 'Proof', 'Student context', 'History'],
    disbursements: ['Overview', 'Timeline', 'Request'],
    academic: ['Overview', 'Document', 'Student context'],
    schools: ['Overview', 'Banking', 'Students', 'Staff', 'Activity'],
    users: ['Profile', 'Permissions', 'Activity', 'Sessions'],
  };
  const r = item as AdminRequest;
  const st = item as StudentRecord;
  const p = item as PayoutRecord;
  const d = item as DocRecord;
  const sc = item as SchoolRecord;

  return (
    <Drawer
      open
      onClose={close}
      eyebrow={`${configs[kind].title.toUpperCase()} · ${item.id}`}
      title={item.name}
      width={690}
      tabs={<Tabs label="Record sections" value={tab} onChange={setTab} tabs={names[kind].map((t) => ({ key: t, label: t }))} />}
      footer={
        <>
          <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={close}>
            Close
          </button>
          <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => action('Edit record')}>
            Edit
          </button>
          {kind === 'approvals' && (
            <>
              <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => action('Request proof')}>
                Request proof
              </button>
              <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => action('Reject request')}>
                Reject
              </button>
              <button className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => action('Approve request')}>
                Approve
              </button>
            </>
          )}
          {kind === 'academic' && (
            <>
              <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => action('Request re-upload')}>
                Re-upload
              </button>
              <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => action('Reject document')}>
                Reject
              </button>
              <button className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => action('Verify document')}>
                Verify
              </button>
            </>
          )}
          {kind === 'disbursements' && p.status === 'Failed' && (
            <button className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => action('Retry payout')}>
              Retry payout
            </button>
          )}
          {kind === 'disbursements' && p.status === 'Settled' && (
            <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => action('Reverse payout')}>
              Reverse payout
            </button>
          )}
          {kind === 'students' && (
            <button
              className="ly-btn ly-btn-outline ly-btn-sm"
              onClick={() => action(st.status === 'Suspended' ? 'Activate student' : 'Suspend student')}
            >
              {st.status === 'Suspended' ? 'Activate' : 'Suspend'}
            </button>
          )}
          {kind === 'schools' && (
            <button
              className="ly-btn ly-btn-outline ly-btn-sm"
              onClick={() => action(sc.status === 'Active' ? 'Deactivate institution' : 'Activate institution')}
            >
              {sc.status === 'Active' ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </>
      }
    >
      <div className="aw-drawer">
        {tab === 'Overview' && (
          <>
            <div className="aw-drawer-hero">
              <span>
                {kind === 'approvals'
                  ? 'REQUESTED AMOUNT'
                  : kind === 'disbursements'
                    ? 'PAYOUT AMOUNT'
                    : kind === 'schools'
                      ? 'LINKED STUDENTS'
                      : kind === 'academic'
                        ? 'DOCUMENT TYPE'
                        : 'PROFILE COMPLETENESS'}
              </span>
              <strong>
                {kind === 'approvals'
                  ? kes(r.amount)
                  : kind === 'disbursements'
                    ? kes(p.amount)
                    : kind === 'schools'
                      ? sc.students
                      : kind === 'academic'
                        ? d.type
                        : `${st.completion}%`}
              </strong>
              <small>
                {'status' in item ? item.status : ''} · {item.id}
              </small>
            </div>
            <div className="aw-kv">
              {Object.entries(item)
                .filter(([k]) => !['id', 'initials', 'note'].includes(k))
                .map(([k, v]) => (
                  <div key={k}>
                    <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <strong>
                      {k === 'category'
                        ? catLabel(v as AdminRequest['category'])
                        : k === 'amount'
                          ? kes(Number(v))
                          : String(v)}
                    </strong>
                  </div>
                ))}
            </div>
            {kind === 'approvals' && (
              <div className="aw-note">
                <strong>Justification</strong>
                <p>{r.note}</p>
                {r.decisionNote && (
                  <p>
                    <strong>Review note:</strong> {r.decisionNote}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {tab === 'Profile' && kind === 'students' && (
          <div className="aw-kv">
            <div>
              <span>Student</span>
              <strong>{st.name}</strong>
            </div>
            <div>
              <span>School</span>
              <strong>{st.school}</strong>
            </div>
            <div>
              <span>Education level</span>
              <strong>{st.level}</strong>
            </div>
            <div>
              <span>County</span>
              <strong>{st.county}</strong>
            </div>
            <div>
              <span>Onboarded</span>
              <strong>{st.onboarded}</strong>
            </div>
          </div>
        )}
        {tab === 'Related users' && kind === 'students' && (
          <div className="aw-kv">
            <div>
              <span>Guardian / Parent</span>
              <strong>{st.guardianName || 'Parent / Guardian'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{st.phone || '+254 700 000 000'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{st.email || '—'}</strong>
            </div>
          </div>
        )}
        {tab === 'Proof' && kind === 'approvals' && (
          <div className="aw-note">
            <strong>Supporting proof</strong>
            <p>{r.proof}</p>
          </div>
        )}
        {tab === 'Student context' && (
          <div className="aw-note">
            <strong>{item.name}</strong>
            <p>
              {'school' in item ? item.school : ''} · {'term' in item ? item.term : 'Current academic year'}
            </p>
            <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => navigate('/admin/students')}>
              Open student directory
            </button>
          </div>
        )}
        {tab === 'Document' && kind === 'academic' && (
          <div className="aw-doc-preview">
            <span>
              <Icon name="file" size={32} />
            </span>
            <strong>{d.type}</strong>
            <div className="aw-kv">
              <div>
                <span>Document type</span>
                <strong>{d.type}</strong>
              </div>
              <div>
                <span>Summary</span>
                <strong>{d.summary}</strong>
              </div>
            </div>
          </div>
        )}
        {tab === 'Banking' && kind === 'schools' && (
          <div className="aw-kv">
            <div>
              <span>Bank</span>
              <strong>{sc.bankName || 'KCB Bank Kenya'}</strong>
            </div>
            <div>
              <span>Account</span>
              <strong>{sc.accountNumber || '—'}</strong>
            </div>
            <div>
              <span>Paybill</span>
              <strong>{sc.paybill || '—'}</strong>
            </div>
          </div>
        )}
        {tab === 'Students' && kind === 'schools' && (
          <div className="aw-note">
            <strong>{sc.students} linked students</strong>
            <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => navigate('/admin/students')}>
              Open student directory
            </button>
          </div>
        )}
        {tab === 'Staff' && (
          <div className="aw-kv">
            <div>
              <span>Primary contact</span>
              <strong>{sc.contactName || 'School Administrator'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{sc.contactPhone || '+254 700 000 000'}</strong>
            </div>
          </div>
        )}
        {(tab === 'History' || tab === 'Timeline' || tab === 'Activity' || tab === 'Audit') && (
          <ol className="ly-timeline">
            <li className="is-done">
              <strong>Record created</strong>
              <p className="aw-muted">Synchronized in Learnly Admin Store.</p>
            </li>
            <li className="is-done">
              <strong>Current status: {'status' in item ? item.status : 'Recorded'}</strong>
              <p className="aw-muted">Active workspace record.</p>
            </li>
          </ol>
        )}
      </div>
    </Drawer>
  );
}

type Form = {
  name: string;
  dob: string;
  gender: string;
  nationalId: string;
  nemis: string;
  email: string;
  phone: string;
  county: string;
  subCounty: string;
  ward: string;
  school: string;
  level: string;
  classYear: string;
  admissionNo: string;
  boardingStatus: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianId: string;
  emergencyContact: string;
  category: string;
  amount: string;
  channel: string;
  destination: string;
  feeBalance: string;
  meanScore: string;
  attendance: string;
  docType: string;
  term: string;
  medicalInfo: string;
  nhifNo: string;
  specialNeeds: string;
  initialStatus: string;
  completion: string;
  officer: string;
  note: string;
  csv: string;
};

function ActionWizard({
  action,
  kind,
  selected,
  checked,
  audit,
  close,
  submit,
}: {
  action: string;
  kind: WorkspaceKind;
  selected: Item | null;
  checked: string[];
  audit: string[];
  close: () => void;
  submit: (v: Form) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    name: selected?.name || '',
    dob: '2009-05-14',
    gender: 'Female',
    nationalId: '',
    nemis: '',
    email: '',
    phone: '+254 712 345 678',
    county: selected && 'county' in selected ? selected.county : 'Nairobi',
    subCounty: 'Westlands',
    ward: 'Kangemi',
    school: selected && 'school' in selected ? selected.school : '',
    level: selected && 'level' in selected ? selected.level : 'Senior',
    classYear: 'Form 3',
    admissionNo: '',
    boardingStatus: 'Boarding',
    guardianName: '',
    guardianRelation: 'Mother',
    guardianPhone: '+254 722 000 000',
    guardianId: '',
    emergencyContact: '',
    category: 'fees',
    amount: selected && 'amount' in selected ? String(selected.amount) : '15000',
    channel: 'M-Pesa',
    destination: '+254 712 345 678',
    feeBalance: '0',
    meanScore: '78%',
    attendance: '96%',
    docType: 'Result slip',
    term: `Term 2 · ${new Date().getFullYear()}`,
    medicalInfo: 'None reported',
    nhifNo: '',
    specialNeeds: 'None',
    initialStatus: 'Active',
    completion: '95',
    officer: 'Esther Wambui Kariuki',
    note: '',
    csv: '',
  });
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const informational = [
    'Review guidelines',
    'Review proof details',
    'Review card programme',
    'Verification rules',
    'Activity log',
    'Reconcile payouts',
  ].includes(action);

  const isCreate = [
    'Onboard student',
    'Register institution',
    'Initiate direct payout',
    'Create admin request',
    'Add academic record',
  ].includes(action);

  const reasonRequired = [
    'Reject request',
    'Request proof',
    'Reject document',
    'Request re-upload',
    'Reverse payout',
    'Bulk message',
  ].includes(action);

  const steps = isCreate
    ? [
        '1. Identity',
        '2. Contact',
        '3. School',
        '4. Guardian',
        '5. Finance',
        '6. Academic',
        '7. Welfare',
        '8. Compliance',
        '9. Confirm',
      ]
    : ['Details', 'Confirmation'];
  const maxStep = steps.length - 1;

  const next = () => {
    if (isCreate && form.name.trim().length < 3) {
      setError('Enter a name of at least 3 characters.');
      return;
    }
    if (reasonRequired && form.note.trim().length < 10) {
      setError('Please provide at least 10 characters.');
      return;
    }
    if (
      action === 'Import students' &&
      (!form.csv ||
        parseCsv(form.csv).length < 2 ||
        !parseCsv(form.csv)[0].some((h) => h.toLowerCase() === 'name'))
    ) {
      setError('Choose a CSV with a header and at least one data row (name, school, level).');
      return;
    }
    setError('');
    setStep((s) => Math.min(maxStep, s + 1));
  };

  const save = () => {
    submit(form);
    setDone(true);
  };

  return (
    <Dialog
      open
      onClose={close}
      eyebrow={`${configs[kind].title.toUpperCase()} · ADMIN CONTROL`}
      title={action}
      maxWidth={620}
      footer={
        informational ? (
          <button className="ly-btn ly-btn-outline" onClick={close}>
            Close
          </button>
        ) : done ? (
          <button className="ly-btn ly-btn-primary" onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button className="ly-btn ly-btn-outline" onClick={() => (step ? setStep(0) : close())}>
              {step ? 'Back' : 'Cancel'}
            </button>
            {step < maxStep ? (
              <button className="ly-btn ly-btn-primary" onClick={next}>
                Continue <Icon name="arrowRight" size={15} />
              </button>
            ) : (
              <button className="ly-btn ly-btn-primary" disabled={!ack} onClick={save}>
                Save demo action
              </button>
            )}
          </>
        )
      }
    >
      {informational ? (
        <div className="aw-action-info">
          {action === 'Activity log' ? (
            audit.length ? (
              audit.map((entry, i) => <p key={i}>{entry}</p>)
            ) : (
              <p>No activity recorded yet.</p>
            )
          ) : (
            <p>
              {action === 'Review guidelines'
                ? 'Review the request, supporting proof, and student context before making a decision.'
                : action === 'Verification rules'
                  ? 'Academic documents must clearly show student name, term, and institution.'
                  : 'All payouts and records are synchronized across AD-1 to AD-6.'}
            </p>
          )}
        </div>
      ) : done ? (
        <div className="aw-success">
          <Icon name="check" size={25} />
          <h3>Saved &amp; synchronized</h3>
          <p>Changes are live across all admin workspaces.</p>
        </div>
      ) : (
        <>
          <WizardSteps steps={steps} active={step} />
          {step < maxStep ? (
            <div className="aw-form">
              <p>
                {selected
                  ? `Updating ${selected.name}.`
                  : action === 'Bulk suspend'
                    ? `${checked.length} selected students will be suspended.`
                    : `Step ${step + 1} of ${steps.length}: ${steps[step]}`}
              </p>

              {isCreate && step === 0 && (
                <>
                  <label>
                    {kind === 'schools' ? 'Institution name' : 'Student full name'}
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full legal name" />
                  </label>
                  <label>
                    Date of birth
                    <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                  </label>
                  <label>
                    Gender
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other / Prefer not to say</option>
                    </select>
                  </label>
                  <label>
                    National ID / Birth Certificate No.
                    <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} placeholder="e.g. BC-4829104" />
                  </label>
                  <label>
                    NEMIS / Student UPI
                    <input value={form.nemis} onChange={(e) => setForm({ ...form, nemis: e.target.value })} placeholder="e.g. NEM-2026-8841" />
                  </label>
                </>
              )}

              {isCreate && step === 1 && (
                <>
                  <label>
                    Email address
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@learnly.ke" />
                  </label>
                  <label>
                    Phone number
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </label>
                  <label>
                    County
                    <input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
                  </label>
                  <label>
                    Sub-County
                    <input value={form.subCounty} onChange={(e) => setForm({ ...form, subCounty: e.target.value })} />
                  </label>
                  <label>
                    Ward / Estate
                    <input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
                  </label>
                </>
              )}

              {isCreate && step === 2 && (
                <>
                  <label>
                    {kind === 'schools' ? 'County' : 'School / Institution'}
                    <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="e.g. Kenya High School" />
                  </label>
                  <label>
                    Education level
                    <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                      {['Primary', 'Junior', 'Senior', 'TVET', 'University'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Class / Form / Year
                    <input value={form.classYear} onChange={(e) => setForm({ ...form, classYear: e.target.value })} />
                  </label>
                  <label>
                    Admission number
                    <input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="e.g. ADM-1042" />
                  </label>
                  <label>
                    Boarding / Day status
                    <select value={form.boardingStatus} onChange={(e) => setForm({ ...form, boardingStatus: e.target.value })}>
                      <option>Boarding</option>
                      <option>Day Scholar</option>
                    </select>
                  </label>
                </>
              )}

              {isCreate && step === 3 && (
                <>
                  <label>
                    Primary Guardian / Parent name
                    <input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} placeholder="Full name" />
                  </label>
                  <label>
                    Relationship
                    <select value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}>
                      <option>Mother</option>
                      <option>Father</option>
                      <option>Legal Guardian</option>
                      <option>Sibling / Relative</option>
                    </select>
                  </label>
                  <label>
                    Guardian phone
                    <input value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
                  </label>
                  <label>
                    Guardian National ID
                    <input value={form.guardianId} onChange={(e) => setForm({ ...form, guardianId: e.target.value })} placeholder="ID Number" />
                  </label>
                  <label>
                    Emergency contact
                    <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Name & Phone" />
                  </label>
                </>
              )}

              {isCreate && step === 4 && (
                <>
                  <label>
                    Support category
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {PAYOUT_MATRIX.map((m) => (
                        <option key={m.category} value={m.category}>
                          {catLabel(m.category)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Amount / Annual Cap (KES)
                    <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </label>
                  <label>
                    Disbursement channel
                    <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                      {['M-Pesa', 'School paybill', 'Bank EFT', 'Card top-up', 'Airtel Money'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Destination (Phone / Account / Paybill)
                    <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                  </label>
                  <label>
                    Current fee balance (KES)
                    <input type="number" value={form.feeBalance} onChange={(e) => setForm({ ...form, feeBalance: e.target.value })} />
                  </label>
                </>
              )}

              {isCreate && step === 5 && (
                <>
                  <label>
                    Previous term mean score / grade
                    <input value={form.meanScore} onChange={(e) => setForm({ ...form, meanScore: e.target.value })} />
                  </label>
                  <label>
                    Attendance rate (%)
                    <input value={form.attendance} onChange={(e) => setForm({ ...form, attendance: e.target.value })} />
                  </label>
                  <label>
                    Supporting document type
                    <select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                      {DOC_TYPES.map((dt) => (
                        <option key={dt}>{dt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Academic term
                    <input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
                  </label>
                </>
              )}

              {isCreate && step === 6 && (
                <>
                  <label>
                    Medical conditions / Allergies
                    <input value={form.medicalInfo} onChange={(e) => setForm({ ...form, medicalInfo: e.target.value })} />
                  </label>
                  <label>
                    NHIF / SHA Number
                    <input value={form.nhifNo} onChange={(e) => setForm({ ...form, nhifNo: e.target.value })} placeholder="Optional" />
                  </label>
                  <label>
                    Special needs / SNE support
                    <input value={form.specialNeeds} onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })} />
                  </label>
                </>
              )}

              {isCreate && step === 7 && (
                <>
                  <label>
                    Initial account status
                    <select value={form.initialStatus} onChange={(e) => setForm({ ...form, initialStatus: e.target.value })}>
                      <option>Active</option>
                      <option>Pending</option>
                    </select>
                  </label>
                  <label>
                    Profile completeness (%)
                    <input type="number" min="0" max="100" value={form.completion} onChange={(e) => setForm({ ...form, completion: e.target.value })} />
                  </label>
                  <label>
                    Assigned programme officer
                    <input value={form.officer} onChange={(e) => setForm({ ...form, officer: e.target.value })} />
                  </label>
                  <label>
                    Admin justification / Notes
                    <textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Comprehensive admin notes…" />
                  </label>
                </>
              )}

              {!isCreate && action === 'Edit record' && (
                <>
                  <label>
                    {kind === 'schools' ? 'Institution name' : 'Student name'}
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  {(kind === 'students' || kind === 'approvals' || kind === 'academic' || kind === 'schools') && (
                    <label>
                      {kind === 'schools' ? 'County' : 'School'}
                      <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
                    </label>
                  )}
                </>
              )}

              {action === 'Approve request' && (
                <label>
                  Approved amount (KES, optional)
                  <input
                    type="number"
                    min="1"
                    max={(selected as AdminRequest)?.amount}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder={`Default: ${kes((selected as AdminRequest)?.amount || 0)}`}
                  />
                </label>
              )}

              {action === 'Import students' && (
                <label>
                  CSV file (columns: name, school, level)
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void f.text().then((csv) => setForm((v) => ({ ...v, csv })));
                    }}
                  />
                </label>
              )}

              {(step === 2 || !isCreate) && (reasonRequired || action === 'Approve request' || isCreate || action === 'Edit record') && (
                <label>
                  {action === 'Bulk message' ? 'Message' : 'Notes / Details'}
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Add details for this action…"
                  />
                </label>
              )}

              {error && (
                <p role="alert" className="aw-error">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="aw-form">
              <h3>Review before saving</h3>
              <div className="aw-kv">
                <div>
                  <span>Action</span>
                  <strong>{action}</strong>
                </div>
                {form.name && (
                  <div>
                    <span>Name</span>
                    <strong>{form.name}</strong>
                  </div>
                )}
                {form.amount && (
                  <div>
                    <span>Amount</span>
                    <strong>{form.amount}</strong>
                  </div>
                )}
                {form.note && (
                  <div>
                    <span>Details</span>
                    <strong>{form.note}</strong>
                  </div>
                )}
              </div>
      <label className="aw-check">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I understand this is
        a local demonstration.
      </label>
    </div>
  )}
</>
)}
</Dialog>
);
}

function UsersPermissionsWorkspace() {
  const { staff, setStaff, permissions, togglePermission, activeRole, setActiveRole, auditLog, logAction } =
    useAdminStore();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const [selected, setSelected] = useState<StaffRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState('Profile');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState(0);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '+254 7',
    role: 'Programme Officer' as AdminRole,
    scope: 'All' as StaffRecord['scope'],
    note: '',
  });

  const filtered = staff.filter(
    (s) =>
      (tab === 'All' || s.status === tab) &&
      `${s.name} ${s.email} ${s.role} ${s.scope}`.toLowerCase().includes(query.toLowerCase())
  );

  const roles = Object.keys(permissions) as AdminRole[];
  const permKeys: [PermissionKey, string][] = [
    ['canAddRecords', 'Add students, requests, docs & schools'],
    ['canEditRecords', 'Edit any existing record'],
    ['canDeleteRecords', 'Delete records permanently'],
    ['canApproveRequests', 'Approve, reject & verify requests'],
    ['canInitiatePayouts', 'Initiate direct payouts'],
    ['canReversePayouts', 'Retry or reverse payouts'],
    ['canSuspendUsers', 'Suspend & activate users/schools'],
    ['canManagePermissions', 'Modify RBAC role permissions'],
    ['canExportData', 'Export CSV & PDF reports'],
  ];

  return (
    <div className="admin-workspace page-admin-users-permissions">
      <div className="aw-breadcrumb">
        ADMIN WORKSPACE <Icon name="chevronRight" size={12} />
        <span>USERS &amp; PERMISSIONS</span>
      </div>

      <div className="aw-header">
        <div>
          <div className="ad-eyebrow">ACCESS &amp; RBAC CONTROL</div>
          <h1>Users &amp; permissions</h1>
          <p>Manage staff, sub-admins, RBAC roles, data scopes, 2FA, and active sessions.</p>
        </div>
        <div className="aw-header-actions">
          <button
            className="ly-btn ly-btn-outline"
            onClick={() =>
              fileCsv('learnly-staff.csv', [
                ['ID', 'Name', 'Email', 'Phone', 'Role', 'Scope', 'Status', '2FA'],
                ...filtered.map((s) => [s.id, s.name, s.email, s.phone, s.role, s.scope, s.status, s.twoFa ? 'Yes' : 'No']),
              ])
            }
          >
            <Icon name="download" size={16} /> Export CSV
          </button>
          <button
            className="ly-btn ly-btn-primary"
            onClick={() => {
              setInviteStep(0);
              setInviteOpen(true);
            }}
          >
            <Icon name="plus" size={16} /> Invite staff
          </button>
        </div>
      </div>

      {/* S1 — KPI ROW */}
      <Kpis
        items={[
          { label: 'Total staff', value: staff.length, hint: 'Registered operators', icon: 'users' },
          { label: 'Active now', value: staff.filter((s) => s.status === 'Active').length, hint: 'Currently active', icon: 'user' },
          { label: 'Super Admins', value: staff.filter((s) => s.role === 'Super Admin').length, hint: 'Full system access', icon: 'shield' },
          { label: 'Pending invites', value: staff.filter((s) => s.status === 'Invited').length, hint: 'Awaiting onboarding', icon: 'clock' },
          { label: '2FA enabled', value: staff.filter((s) => s.twoFa).length, hint: 'Protected accounts', icon: 'check' },
        ]}
      />

      {/* S2 — STAFF TABLE */}
      <section className="ly-card aw-table-card">
        <div className="aw-section-head">
          <div>
            <div className="ad-eyebrow">STAFF DIRECTORY</div>
            <h2>Admin &amp; operations team</h2>
            <p>{filtered.length} staff members · Click any row to inspect profile, permissions, or sessions.</p>
          </div>
        </div>
        <div className="aw-toolbar">
          <div className="aw-tabs">
            <Tabs
              label="Staff status"
              value={tab}
              onChange={setTab}
              tabs={['All', 'Active', 'Invited', 'Suspended'].map((t) => ({ key: t, label: t }))}
            />
          </div>
          <div className="aw-controls">
            <div className="aw-search">
              <Icon name="search" size={15} />
              <input
                type="search"
                aria-label="Search staff"
                placeholder="Search staff, email, or role"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="aw-table-wrap">
          <table className="aw-table">
            <thead>
              <tr>
                <th>STAFF MEMBER</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>ROLE</th>
                <th>DATA SCOPE</th>
                <th>LAST LOGIN</th>
                <th>2FA</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="ad-student">
                      <span className="ad-avatar">
                        {s.name
                          .split(' ')
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join('')}
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.role}</td>
                  <td>{s.scope}</td>
                  <td>{s.lastLogin}</td>
                  <td>
                    <span className={`aw-status ${s.twoFa ? 'active' : 'pending'}`}>{s.twoFa ? 'Enabled' : 'Off'}</span>
                  </td>
                  <td>
                    <span className={`aw-status ${s.status.toLowerCase()}`}>{s.status}</span>
                  </td>
                  <td>
                    <div className="aw-row-actions">
                      <button
                        className="ad-link"
                        onClick={() => {
                          setDrawerTab('Profile');
                          setSelected(s);
                        }}
                      >
                        View <Icon name="arrowRight" size={13} />
                      </button>
                      <Dropdown
                        label={`Actions for ${s.name}`}
                        trigger={<Icon name="more" size={16} />}
                        items={[
                          {
                            label: s.status === 'Suspended' ? 'Activate user' : 'Suspend user',
                            icon: 'user',
                            onSelect: () => {
                              const nextStatus = s.status === 'Suspended' ? 'Active' : 'Suspended';
                              setStaff(staff.map((x) => (x.id === s.id ? { ...x, status: nextStatus } : x)));
                              logAction('Permissions', `${nextStatus} staff ${s.name}`, s.role);
                            },
                          },
                          {
                            label: 'Reset 2FA',
                            icon: 'shield',
                            onSelect: () => {
                              setStaff(staff.map((x) => (x.id === s.id ? { ...x, twoFa: false } : x)));
                              logAction('Permissions', `Reset 2FA for ${s.name}`, '2FA disabled pending re-enrollment');
                            },
                          },
                          {
                            label: 'Delete staff',
                            icon: 'x',
                            onSelect: () => {
                              setStaff(staff.filter((x) => x.id !== s.id));
                              logAction('Permissions', `Removed staff ${s.name}`, s.email);
                            },
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* S5 — ROLES & PERMISSIONS MATRIX */}
      <section className="ly-card aw-extra">
        <div className="aw-section-head">
          <div>
            <div className="ad-eyebrow">CANONICAL RBAC MATRIX</div>
            <h2>Roles &amp; permissions matrix</h2>
            <p>Click any cell to grant or revoke a permission for that role. Active role: <strong>{activeRole}</strong></p>
          </div>
          <select
            aria-label="Test active role"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as AdminRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                Active: {r}
              </option>
            ))}
          </select>
        </div>
        <div className="aw-table-wrap">
          <table className="aw-table">
            <thead>
              <tr>
                <th>PERMISSION</th>
                {roles.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permKeys.map(([key, label]) => (
                <tr key={key}>
                  <td>{label}</td>
                  {roles.map((r) => {
                    const allowed = permissions[r][key];
                    return (
                      <td key={r}>
                        <button
                          className={`ly-btn ly-btn-sm ${allowed ? 'ly-btn-primary' : 'ly-btn-outline'}`}
                          onClick={() => togglePermission(r, key)}
                        >
                          {allowed ? '✓' : '✖'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* S3 — USER DETAIL DRAWER */}
      {selected && (
        <Drawer
          open
          onClose={() => setSelected(null)}
          eyebrow={`STAFF RECORD · ${selected.id}`}
          title={selected.name}
          width={680}
          tabs={
            <Tabs
              label="Staff detail tabs"
              value={drawerTab}
              onChange={setDrawerTab}
              tabs={['Profile', 'Permissions', 'Activity', 'Sessions'].map((t) => ({ key: t, label: t }))}
            />
          }
          footer={
            <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          }
        >
          {drawerTab === 'Profile' && (
            <div className="aw-kv">
              <div>
                <span>Full name</span>
                <strong>{selected.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{selected.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selected.phone}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{selected.role}</strong>
              </div>
              <div>
                <span>Data scope</span>
                <strong>{selected.scope}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selected.status}</strong>
              </div>
            </div>
          )}
          {drawerTab === 'Permissions' && (
            <div className="aw-kv">
              {permKeys.map(([k, lbl]) => (
                <div key={k}>
                  <span>{lbl}</span>
                  <strong>{permissions[selected.role][k] ? 'Allowed' : 'Restricted'}</strong>
                </div>
              ))}
            </div>
          )}
          {drawerTab === 'Activity' && (
            <div className="aw-note">
              <strong>Recent audit entries</strong>
              {auditLog.slice(0, 5).map((a) => (
                <p key={a.id}>
                  {a.timestamp} · {a.action} ({a.module})
                </p>
              ))}
            </div>
          )}
          {drawerTab === 'Sessions' && (
            <div className="aw-note">
              <strong>Active browser sessions</strong>
              <p>Chrome on Linux · Nairobi, KE · Current session</p>
              <button
                className="ly-btn ly-btn-outline ly-btn-sm"
                onClick={() => logAction('Permissions', `Revoked sessions for ${selected.name}`, 'All tokens invalidated')}
              >
                Revoke all sessions
              </button>
            </div>
          )}
        </Drawer>
      )}

      {/* S4 — INVITE STAFF WIZARD */}
      {inviteOpen && (
        <Dialog
          open
          onClose={() => setInviteOpen(false)}
          eyebrow="STAFF ONBOARDING"
          title="Invite staff member"
          maxWidth={600}
          footer={
            <>
              <button
                className="ly-btn ly-btn-outline"
                onClick={() => (inviteStep > 0 ? setInviteStep(inviteStep - 1) : setInviteOpen(false))}
              >
                {inviteStep > 0 ? 'Back' : 'Cancel'}
              </button>
              {inviteStep < 3 ? (
                <button className="ly-btn ly-btn-primary" onClick={() => setInviteStep(inviteStep + 1)}>
                  Continue <Icon name="arrowRight" size={15} />
                </button>
              ) : (
                <button
                  className="ly-btn ly-btn-primary"
                  onClick={() => {
                    const newStaff: StaffRecord = {
                      id: `STF-${Date.now().toString().slice(-3)}`,
                      name: inviteForm.name || 'New Staff Member',
                      email: inviteForm.email || 'staff@learnly.ke',
                      phone: inviteForm.phone,
                      role: inviteForm.role,
                      scope: inviteForm.scope,
                      lastLogin: 'Never',
                      status: 'Invited',
                      twoFa: false,
                    };
                    setStaff([newStaff, ...staff]);
                    logAction('Permissions', `Invited ${newStaff.name}`, `${newStaff.role} · ${newStaff.scope}`);
                    setInviteOpen(false);
                  }}
                >
                  Send invite
                </button>
              )}
            </>
          }
        >
          <WizardSteps steps={['Identity', 'Role & Scope', 'Message', 'Confirm']} active={inviteStep} />
          {inviteStep === 0 && (
            <div className="aw-form">
              <label>
                Full name
                <input
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. Grace Muthoni"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="grace@learnly.ke"
                />
              </label>
              <label>
                Phone
                <input
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                />
              </label>
            </div>
          )}
          {inviteStep === 1 && (
            <div className="aw-form">
              <label>
                Role
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as AdminRole })}
                >
                  {roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                Data scope
                <select
                  value={inviteForm.scope}
                  onChange={(e) => setInviteForm({ ...inviteForm, scope: e.target.value as StaffRecord['scope'] })}
                >
                  <option>All</option>
                  <option>By school</option>
                  <option>By county</option>
                </select>
              </label>
            </div>
          )}
          {inviteStep === 2 && (
            <div className="aw-form">
              <label>
                Custom welcome message
                <textarea
                  rows={3}
                  value={inviteForm.note}
                  onChange={(e) => setInviteForm({ ...inviteForm, note: e.target.value })}
                  placeholder="Welcome to the Learnly admin team…"
                />
              </label>
            </div>
          )}
          {inviteStep === 3 && (
            <div className="aw-kv">
              <div>
                <span>Name</span>
                <strong>{inviteForm.name || 'New Staff Member'}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{inviteForm.email || 'staff@learnly.ke'}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{inviteForm.role}</strong>
              </div>
              <div>
                <span>Scope</span>
                <strong>{inviteForm.scope}</strong>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
