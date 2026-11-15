import { useEffect, useState } from 'react';
import { LearnlyLogo } from '../../components/marketing/LearnlyLogo';
import { Dialog, CountUp } from '../../components/ui/primitives';
import { CategoryBadge, Drawer, Dropdown, Tabs, WizardSteps } from '../../components/ui/overlays';
import { Icon } from '../../components/ui/Icon';
import {
  AdminProvider,
  useAdminStore,
  type AdminRole,
  type PermissionKey,
  type PayoutRecord,
  type StudentRecord,
} from '../../components/admin/AdminStore';
import {
  ADMIN_ACTIVITY,
  ADMIN_LEVELS,
  ADMIN_MONTHS,
  TREND,
  type AdminRequest,
} from '../../data/adminDashboard';
import { PAYOUT_MATRIX } from '../../data/requests';
import { catLabel, kes, type RequestCategory } from '../../data/students';
import { clearSessionPreview, loadSessionPreview } from '../../lib/auth-preview';
import { navigate, usePathname } from '../../lib/navigation';
import { AdminWorkspace, type WorkspaceKind } from './Workspaces';
import { downloadText, toCsv } from '../../lib/download';
import '../../styles/pages/admin-command-center.css';

type Panel =
  | 'students'
  | 'approvals'
  | 'disbursements'
  | 'academic'
  | 'schools'
  | 'users'
  | 'finance'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'notifications'
  | 'messages'
  | 'help';

const NAV: { id: Panel; label: string; icon: string }[] = [
  { id: 'students', label: 'Students', icon: 'users' },
  { id: 'approvals', label: 'Approvals', icon: 'shield' },
  { id: 'disbursements', label: 'Disbursements', icon: 'wallet' },
  { id: 'academic', label: 'Academic verification', icon: 'book' },
  { id: 'schools', label: 'Schools', icon: 'bank' },
  { id: 'users', label: 'Users & permissions', icon: 'user' },
  { id: 'finance', label: 'Finance & budget', icon: 'card' },
  { id: 'reports', label: 'Reports', icon: 'trend' },
  { id: 'audit', label: 'Audit & settings', icon: 'settings' },
];

const alerts = [
  { id: 'queue', icon: 'clock', tone: 'amber', title: 'Approvals awaiting review', detail: 'Requests are ready for your attention.', panel: 'approvals' as Panel },
  { id: 'profiles', icon: 'user', tone: 'blue', title: '3 incomplete profiles', detail: 'Student profiles have been incomplete for over 14 days.', panel: 'students' as Panel },
  { id: 'results', icon: 'calendar', tone: 'purple', title: 'Results window approaching', detail: 'KCSE results upload window opens in 5 days.', panel: 'academic' as Panel },
  { id: 'budget', icon: 'trend', tone: 'gold', title: 'Budget line at 85% utilization', detail: 'Nyeri STEM allocation is nearing its limit.', panel: 'finance' as Panel },
  { id: 'failed', icon: 'alert', tone: 'red', title: '2 payout failures', detail: 'M-Pesa B2C payouts need a closer look.', panel: 'disbursements' as Panel },
];

const colors: Record<string, string> = { Fees: '#284d9e', Upkeep: '#2e9b78', Equipment: '#edae4d' };

const stored = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* session fallback */
  }
};

export default function AdminCommandCenter() {
  return (
    <AdminProvider>
      <AdminCommandCenterInner />
    </AdminProvider>
  );
}

function AdminCommandCenterInner() {
  const {
    requests,
    setRequests,
    students,
    setStudents,
    payouts,
    setPayouts,
    schools,
    permissions,
    togglePermission,
    activeRole,
    setActiveRole,
    hasPermission,
    auditLog,
    logAction,
    updateRequestStatus,
  } = useAdminStore();

  const [dismissed, setDismissed] = useState<string[]>(() => stored('learnly.admin-alerts.v1', []));
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | 'Needs proof' | null>(null);
  const [quickWizard, setQuickWizard] = useState<'student' | 'payout' | 'request' | null>(null);
  const [range, setRange] = useState('Monthly');
  const [series, setSeries] = useState<string[]>(['Fees', 'Upkeep', 'Equipment']);
  const [focus, setFocus] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('ly-theme') === 'dark');
  const [confirmSignout, setConfirmSignout] = useState(false);
  const [schoolDetail, setSchoolDetail] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState('All');

  const pathname = usePathname();
  const routes: Partial<Record<Panel, string>> = {
    students: '/admin/students',
    approvals: '/admin/approvals',
    disbursements: '/admin/disbursements',
    academic: '/admin/academic-verification',
    schools: '/admin/schools',
    users: '/admin/users-permissions',
  };
  const workspace = (Object.keys(routes) as Panel[]).find((k) => routes[k] === pathname) as WorkspaceKind | undefined;

  const session = loadSessionPreview();
  const name = session?.role === 'admin' ? session.fullName : 'Esther Wambui Kariuki';
  const pending = requests.filter((r) => r.status === 'Pending');
  const chosen = requests.find((r) => r.id === selected);
  const visible = alerts.filter((a) => !dismissed.includes(a.id));

  const settledTotal = payouts.filter((p) => p.status === 'Settled').reduce((a, b) => a + b.amount, 0);
  const activeStudentsCount = students.filter((s) => s.status === 'Active').length;
  const budgetTotal = 25200000;
  const budgetUsedPct = Math.min(100, Math.round(((18400000 + settledTotal * 0.05) / budgetTotal) * 100));

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme ? 'dark' : 'light');
    localStorage.setItem('ly-theme', theme ? 'dark' : 'light');
  }, [theme]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    store('learnly.admin-alerts.v1', next);
  };

  const csv = () =>
    downloadText(
      'learnly-admin-approvals.csv',
      toCsv([
        ['Reference', 'Student', 'School', 'Category', 'Amount KES', 'Days waiting', 'Status'],
        ...requests.map((r) => [r.id, r.name, r.school, catLabel(r.category), r.amount, r.days, r.status]),
      ]),
      'text/csv'
    );

  const showPanel = (p: Panel) => {
    setMobile(false);
    if (routes[p]) {
      navigate(routes[p]!);
      return;
    }
    setPanel(p);
  };

  return (
    <div className="admin-shell page-admin-command-center">
      {mobile && <button className="ad-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)} />}
      <aside className={`ad-sidebar ${mobile ? 'open' : ''}`}>
        <div className="ad-logo">
          <LearnlyLogo size={29} />
          <button className="ad-mobile-button" aria-label="Close menu" onClick={() => setMobile(false)}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="ad-workspace">
          <span className="ad-workspace-icon">
            <Icon name="shield" size={17} />
          </span>
          <span>
            <strong>Admin workspace</strong>
            <small>{activeRole}</small>
          </span>
          <Icon name="chevronDown" size={15} />
        </div>
        <div className="ad-nav-label">WORKSPACE</div>
        <nav className="ad-nav" aria-label="Admin navigation">
          <button
            className={!workspace ? 'active' : ''}
            onClick={() => {
              setMobile(false);
              navigate('/admin');
            }}
          >
            <Icon name="home" size={17} /> Command center
          </button>
          {NAV.map((n) => (
            <button key={n.id} className={workspace === n.id ? 'active' : ''} onClick={() => showPanel(n.id)}>
              <Icon name={n.icon} size={17} />
              <span>{n.label}</span>
              {n.id === 'approvals' && <b>{pending.length}</b>}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-bottom">
          <button onClick={() => showPanel('help')}>
            <Icon name="help" size={17} /> Help &amp; support
          </button>
          <button onClick={() => setConfirmSignout(true)}>
            <Icon name="logout" size={17} /> Sign out
          </button>
          <div>
            <span className="ad-avatar">
              {name
                .split(' ')
                .slice(0, 2)
                .map((x) => x[0])
                .join('')}
            </span>
            <span>
              <strong>{name}</strong>
              <small>{activeRole}</small>
            </span>
            <Dropdown
              label="Admin profile menu"
              trigger={<Icon name="more" size={16} />}
              items={[
                { label: 'Account settings', icon: 'settings', onSelect: () => showPanel('settings') },
                { label: 'Sign out', icon: 'logout', onSelect: () => setConfirmSignout(true) },
              ]}
            />
          </div>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-top-title">
            <button className="ad-mobile-button" aria-label="Open navigation" onClick={() => setMobile(true)}>
              <Icon name="menu" size={19} />
            </button>
            <span>Admin workspace</span>
            <Icon name="chevronRight" size={14} />
            <strong>
              {workspace
                ? (
                    {
                      students: 'Student management',
                      approvals: 'Approvals',
                      disbursements: 'Disbursements',
                      academic: 'Academic verification',
                      schools: 'Schools & institutions',
                      users: 'Users & permissions',
                    } as const
                  )[workspace]
                : 'Command center'}
            </strong>
          </div>
          <div className="ad-top-actions">
            <span className="ad-demo-badge">
              <span /> {activeRole.toUpperCase()}
            </span>
            <Dropdown
              label="Notifications"
              trigger={
                <>
                  <Icon name="bell" size={18} />
                  <i />
                </>
              }
              items={[
                { label: `${pending.length} requests awaiting review`, icon: 'clock', onSelect: () => showPanel('approvals') },
                { label: `${payouts.filter((p) => p.status === 'Failed').length} payout failures need review`, icon: 'alert', onSelect: () => showPanel('disbursements') },
                { label: 'View all alerts', icon: 'bell', onSelect: () => showPanel('notifications') },
              ]}
            />
            <button className="ad-top-icon" aria-label="Messages" onClick={() => showPanel('messages')}>
              <Icon name="chat" size={18} />
            </button>
            <button
              className="ad-top-icon"
              aria-label={theme ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme(!theme)}
            >
              <Icon name={theme ? 'sun' : 'moon'} size={18} />
            </button>
            <span className="ad-avatar small">
              {name
                .split(' ')
                .slice(0, 2)
                .map((x) => x[0])
                .join('')}
            </span>
          </div>
        </header>

        <main className="ad-content">
          {workspace ? (
            <AdminWorkspace key={workspace} kind={workspace} />
          ) : (
            <>
              <div className="ad-heading">
                <div>
                  <div className="ad-eyebrow">YOUR PROGRAMME AT A GLANCE</div>
                  <h1>Good day, {name.split(' ')[0]}.</h1>
                  <p>Absolute administrative control across students, approvals, payouts, verification, and schools.</p>
                </div>
                <div className="aw-header-actions">
                  <button className="ly-btn ly-btn-outline" onClick={() => showPanel('reports')}>
                    <Icon name="download" size={16} /> View reports
                  </button>
                  {hasPermission('canInitiatePayouts') && (
                    <button className="ly-btn ly-btn-primary" onClick={() => setQuickWizard('payout')}>
                      <Icon name="plus" size={16} /> Direct payout
                    </button>
                  )}
                </div>
              </div>

              <div className="ad-demo-note">
                <Icon name="info" size={15} /> Synchronized admin workspace. Changes in AD-1 through AD-6 update live across all pages.
              </div>

              {/* S1 — ALERTS RIBBON */}
              <section className="ad-alerts" aria-label="Attention required">
                <div className="ad-alert-head">
                  <div>
                    <span className="ad-alert-head-icon">
                      <Icon name="sparkle" size={17} />
                    </span>
                    <div>
                      <strong>Needs your attention</strong>
                      <small>Important updates across your programme</small>
                    </div>
                  </div>
                  {dismissed.length > 0 && (
                    <button
                      onClick={() => {
                        setDismissed([]);
                        store('learnly.admin-alerts.v1', []);
                      }}
                    >
                      Restore alerts
                    </button>
                  )}
                </div>
                {visible.length ? (
                  <div className="ad-alert-list">
                    {visible.map((a) => (
                      <div key={a.id} className={`ad-alert ${a.tone}`}>
                        <span>
                          <Icon name={a.icon} size={16} />
                        </span>
                        <div>
                          <strong>{a.id === 'queue' ? `${pending.length} ${a.title.toLowerCase()}` : a.title}</strong>
                          <small>{a.detail}</small>
                        </div>
                        <button className="ad-link" onClick={() => showPanel(a.panel)}>
                          Review <Icon name="arrowRight" size={13} />
                        </button>
                        <button
                          className="ad-dismiss"
                          aria-label={`Dismiss ${a.title}`}
                          onClick={() => dismiss(a.id)}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ad-empty-alert">You're all caught up. Restore alerts to see them again.</p>
                )}
              </section>

              {/* S2 — KPI ROW */}
              <section className="ad-kpis" aria-label="Programme metrics">
                {[
                  { label: 'Total students', value: 1235 + students.length, hint: 'Across all education levels', icon: 'users', tone: 'blue', panel: 'students' as Panel },
                  { label: 'Active students', value: 1179 + activeStudentsCount, hint: 'Currently sponsored', icon: 'user', tone: 'green', panel: 'students' as Panel },
                  { label: 'Pending approvals', value: pending.length, hint: 'Requests awaiting review', icon: 'clock', tone: 'amber', panel: 'approvals' as Panel },
                  { label: 'Disbursed YTD', value: 18400000 + settledTotal, hint: 'Across all categories', icon: 'wallet', tone: 'purple', panel: 'disbursements' as Panel },
                  { label: 'Budget used', value: budgetUsedPct, hint: 'Of annual allocation', icon: 'trend', tone: budgetUsedPct < 70 ? 'green' : budgetUsedPct <= 90 ? 'gold' : 'red', panel: 'finance' as Panel },
                ].map((x) => (
                  <button className="ly-card ad-kpi" key={x.label} onClick={() => showPanel(x.panel)}>
                    <div>
                      <span>{x.label}</span>
                      <i className={x.tone}>
                        <Icon name={x.icon} size={17} />
                      </i>
                    </div>
                    <strong>
                      {x.label === 'Disbursed YTD' ? 'KES ' : ''}
                      <CountUp
                        value={x.value}
                        format={(n) =>
                          x.label === 'Disbursed YTD' ? `${(n / 1000000).toFixed(1)}M` : n.toLocaleString('en-KE')
                        }
                      />
                      {x.label === 'Budget used' ? '%' : ''}
                    </strong>
                    <small>{x.hint}</small>
                  </button>
                ))}
              </section>

              {/* S3 — DISBURSEMENT TREND CHART */}
              <section className="ly-card ad-trend">
                <div className="ad-card-head">
                  <div>
                    <div className="ad-eyebrow">FINANCIAL OVERVIEW</div>
                    <h2>Disbursement trends</h2>
                    <p>How sponsorship support has been distributed over time.</p>
                  </div>
                  <div className="ad-chart-actions">
                    <select
                      aria-label="Trend time period"
                      value={range}
                      onChange={(e) => {
                        setRange(e.target.value);
                        setFocus(null);
                      }}
                    >
                      <option>Monthly</option>
                      <option>Weekly</option>
                      <option>Daily</option>
                    </select>
                    <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => window.print()}>
                      <Icon name="download" size={15} /> Export PDF report
                    </button>
                  </div>
                </div>
                <div className="ad-chart-legend">
                  {Object.keys(TREND).map((key) => (
                    <button
                      key={key}
                      className={!series.includes(key) ? 'muted' : ''}
                      onClick={() => setSeries((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]))}
                    >
                      <i style={{ background: colors[key] }} />
                      {key}
                    </button>
                  ))}
                  <span>KES MILLIONS</span>
                </div>
                <div className="ad-chart-area">
                  <div className="ad-axis">
                    {[2, 1.5, 1, 0.5, 0].map((n) => (
                      <span key={n}>
                        {n === 0
                          ? '0'
                          : `${(n * (range === 'Monthly' ? 1 : range === 'Weekly' ? 0.24 : 0.035)).toFixed(
                              range === 'Daily' ? 2 : 1
                            )}M`}
                      </span>
                    ))}
                  </div>
                  <div className="ad-plot">
                    <div className="ad-grid">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <svg viewBox="0 0 1000 220" preserveAspectRatio="none" role="img" aria-label={`Illustrative ${range.toLowerCase()} disbursement trend`}>
                      {Object.entries(TREND)
                        .filter(([key]) => series.includes(key))
                        .map(([key, values]) => (
                          <polyline
                            key={key}
                            points={values.map((v, i) => `${(i * 1000) / 11},${220 - v * 110}`).join(' ')}
                            fill="none"
                            stroke={colors[key]}
                            strokeWidth="2.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                    </svg>
                    {ADMIN_MONTHS.map((m, i) => (
                      <button
                        className="ad-chart-point"
                        key={m}
                        style={{ left: `${(i * 100) / 11}%` }}
                        aria-label={`${range} point ${i + 1}`}
                        onMouseEnter={() => setFocus(i)}
                        onMouseLeave={() => setFocus(null)}
                        onFocus={() => setFocus(i)}
                        onBlur={() => setFocus(null)}
                      >
                        {focus === i && (
                          <span className="ad-chart-tooltip">
                            <strong>{range === 'Monthly' ? m : `${range === 'Weekly' ? 'Week' : 'Day'} ${i + 1}`}</strong>
                            {Object.entries(TREND)
                              .filter(([key]) => series.includes(key))
                              .map(([key, v]) => (
                                <span key={key}>
                                  {key}: KES {(v[i] * (range === 'Monthly' ? 1 : range === 'Weekly' ? 0.24 : 0.035)).toFixed(2)}M
                                </span>
                              ))}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ad-x-labels">
                  {ADMIN_MONTHS.map((m, i) => (
                    <span key={m}>{range === 'Monthly' ? m : range === 'Weekly' ? `W${i + 1}` : `D${i + 1}`}</span>
                  ))}
                </div>
                <div className="ad-chart-foot">
                  <span>
                    <Icon name="info" size={14} /> Select a series to show or hide it
                  </span>
                  <button className="ad-link" onClick={() => showPanel('reports')}>
                    View reports <Icon name="arrowRight" size={14} />
                  </button>
                </div>
              </section>

              {/* S4 — PENDING APPROVALS QUEUE + BUDGET BURN-DOWN */}
              <div className="ad-split">
                <section className="ly-card ad-queue">
                  <div className="ad-card-head">
                    <div>
                      <div className="ad-eyebrow">REQUIRES YOUR REVIEW</div>
                      <h2>Pending approvals</h2>
                      <p>Recent requests from students in your programme.</p>
                    </div>
                    <span className="ad-count">{pending.length} PENDING</span>
                  </div>
                  <div className="ad-queue-table">
                    <table>
                      <thead>
                        <tr>
                          <th>STUDENT</th>
                          <th>CATEGORY</th>
                          <th>AMOUNT</th>
                          <th>WAITING</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.slice(0, 5).map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div className="ad-student">
                                <span className="ad-avatar">{r.initials}</span>
                                <span>
                                  <strong>{r.name}</strong>
                                  <small>{r.school}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <CategoryBadge category={r.category} />
                            </td>
                            <td>
                              <strong>{kes(r.amount)}</strong>
                            </td>
                            <td>
                              <span className={r.days > 3 ? 'ad-overdue' : ''}>
                                {r.days === 0 ? 'Today' : `${r.days} days`}
                              </span>
                            </td>
                            <td>
                              <button className="ad-link" onClick={() => setSelected(r.id)}>
                                Review <Icon name="arrowRight" size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!pending.length && <div className="ad-empty-alert">There are no pending requests.</div>}
                  </div>
                  <div className="ad-card-footer">
                    <span>Showing {Math.min(5, pending.length)} of {pending.length} pending requests</span>
                    <button className="ad-link" onClick={() => showPanel('approvals')}>
                      Open queue ({pending.length}) <Icon name="arrowRight" size={14} />
                    </button>
                  </div>
                </section>

                <section className="ly-card ad-budget">
                  <div className="ad-card-head">
                    <div>
                      <div className="ad-eyebrow">ANNUAL ALLOCATION</div>
                      <h2>Budget burn-down</h2>
                      <p>Programme budget utilisation.</p>
                    </div>
                    <span className="ad-budget-icon">
                      <Icon name="card" size={18} />
                    </span>
                  </div>
                  <div className="ad-donut">
                    <div>
                      <strong>
                        {budgetUsedPct}
                        <span>%</span>
                      </strong>
                      <small>USED</small>
                    </div>
                  </div>
                  <div className="ad-budget-legend">
                    <div>
                      <span>
                        <i className="used" /> Used
                      </span>
                      <strong>KES 18.4M</strong>
                    </div>
                    <div>
                      <span>
                        <i className="remaining" /> Remaining
                      </span>
                      <strong>KES 6.8M</strong>
                    </div>
                    <div>
                      <span>Total annual budget</span>
                      <strong>KES 25.2M</strong>
                    </div>
                  </div>
                  <button className="ad-budget-button" onClick={() => showPanel('finance')}>
                    View budget details <Icon name="arrowRight" size={14} />
                  </button>
                </section>
              </div>

              {/* MASTER CONTROL & PERMISSIONS */}
              <section className="ly-card aw-extra" aria-label="Admin master controls and permissions">
                <div className="ad-card-head">
                  <div>
                    <div className="ad-eyebrow">MASTER ADMIN CONTROL</div>
                    <h2>Quick 4-step wizards &amp; role permissions</h2>
                    <p>Launch multi-step creation wizards or configure permissions for any admin role.</p>
                  </div>
                  <div className="aw-table-actions">
                    {hasPermission('canAddRecords') && (
                      <>
                        <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setQuickWizard('student')}>
                          <Icon name="plus" size={14} /> Onboard student
                        </button>
                        <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setQuickWizard('request')}>
                          <Icon name="plus" size={14} /> Create request
                        </button>
                      </>
                    )}
                    <select
                      aria-label="Active admin role"
                      value={activeRole}
                      onChange={(e) => setActiveRole(e.target.value as AdminRole)}
                    >
                      {(Object.keys(permissions) as AdminRole[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="aw-table-wrap">
                  <table className="aw-table">
                    <thead>
                      <tr>
                        <th>PERMISSION</th>
                        <th>STATUS ({activeRole.toUpperCase()})</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['canAddRecords', 'Add students, requests, docs & schools'],
                          ['canEditRecords', 'Edit any existing record'],
                          ['canDeleteRecords', 'Delete records permanently'],
                          ['canApproveRequests', 'Approve, reject & verify requests'],
                          ['canInitiatePayouts', 'Initiate direct payouts without student request'],
                          ['canReversePayouts', 'Retry or reverse payouts'],
                          ['canSuspendUsers', 'Suspend & activate students/schools'],
                          ['canExportData', 'Export CSV & PDF reports'],
                        ] as [PermissionKey, string][]
                      ).map(([key, label]) => (
                        <tr key={key}>
                          <td>{label}</td>
                          <td>
                            <span className={`aw-status ${hasPermission(key) ? 'active' : 'suspended'}`}>
                              {hasPermission(key) ? 'Allowed' : 'Restricted'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="ly-btn ly-btn-outline ly-btn-sm"
                              onClick={() => togglePermission(activeRole, key)}
                            >
                              {hasPermission(key) ? 'Revoke' : 'Grant'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* S5 — RECENT ACTIVITY + BOTTOM CHARTS */}
              <div className="ad-section-title">
                <div>
                  <div className="ad-eyebrow">ACROSS YOUR PROGRAMME</div>
                  <h2>More insights</h2>
                  <p>A closer look at your students, schools and recent activity.</p>
                </div>
              </div>
              <div className="ad-bottom-grid">
                <section className="ly-card ad-activity">
                  <div className="ad-card-head">
                    <div>
                      <h2>Recent activity</h2>
                      <p>Synchronized updates across all admin pages.</p>
                    </div>
                    <button className="ad-link" onClick={() => setActivityOpen(true)}>
                      View all <Icon name="arrowRight" size={14} />
                    </button>
                  </div>
                  <div className="ad-activity-list">
                    {auditLog.slice(0, 6).map((entry, i) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setActivityFilter(entry.module);
                          setActivityOpen(true);
                        }}
                      >
                        <span className={`ad-activity-icon tone-${i % 4}`}>
                          <Icon
                            name={
                              entry.module === 'Academic'
                                ? 'file'
                                : entry.module === 'Disbursements'
                                  ? 'wallet'
                                  : entry.module === 'Approvals'
                                    ? 'shield'
                                    : 'user'
                            }
                            size={15}
                          />
                        </span>
                        <span>
                          <strong>{entry.actor}</strong> {entry.action}
                          <small>
                            {entry.module} · {entry.timestamp}
                          </small>
                        </span>
                        <Icon name="chevronRight" size={14} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="ly-card ad-levels">
                  <div className="ad-card-head">
                    <div>
                      <h2>Students by level</h2>
                      <p>Distribution across education levels.</p>
                    </div>
                    <button className="ad-link" onClick={() => showPanel('students')}>
                      View <Icon name="arrowRight" size={14} />
                    </button>
                  </div>
                  <div className="ad-bars">
                    {ADMIN_LEVELS.map(([level, count, color]) => (
                      <button key={level} onClick={() => showPanel('students')}>
                        <span>{level}</span>
                        <i>
                          <b style={{ width: `${(count / 286) * 100}%`, background: color }} />
                        </i>
                        <strong>{count}</strong>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <section className="ly-card ad-schools">
                <div className="ad-card-head">
                  <div>
                    <div className="ad-eyebrow">OUR SCHOOL NETWORK</div>
                    <h2>Top schools by students</h2>
                    <p>Institutions with the most learners in your programme.</p>
                  </div>
                  <button className="ad-link" onClick={() => showPanel('schools')}>
                    View all schools <Icon name="arrowRight" size={14} />
                  </button>
                </div>
                <div className="ad-school-table">
                  <table>
                    <thead>
                      <tr>
                        <th>RANK</th>
                        <th>SCHOOL</th>
                        <th>COUNTY</th>
                        <th>STUDENTS</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.slice(0, 10).map((sc, i) => (
                        <tr key={sc.id}>
                          <td>
                            <span className="ad-rank">{String(i + 1).padStart(2, '0')}</span>
                          </td>
                          <td>
                            <div className="ad-school-name">
                              <span>
                                <Icon name="bank" size={15} />
                              </span>
                              <strong>{sc.name}</strong>
                            </div>
                          </td>
                          <td>{sc.county}</td>
                          <td>
                            <strong>{sc.students}</strong>
                          </td>
                          <td>
                            <button className="ad-link" onClick={() => setSchoolDetail(sc.name)}>
                              Details <Icon name="arrowRight" size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <footer className="ad-footer">
                <Icon name="shield" size={14} /> Learnly admin workspace · Synchronized programme control
              </footer>
            </>
          )}
        </main>
      </div>

      {quickWizard && (
        <QuickMultiStepWizard
          mode={quickWizard}
          close={() => setQuickWizard(null)}
          onSave={(data) => {
            if (quickWizard === 'student') {
              const newSt: StudentRecord = {
                id: `ST-${Date.now().toString().slice(-6)}`,
                name: data.name,
                school: data.school,
                level: data.level,
                county: data.county,
                status: 'Active',
                completion: 85,
                onboarded: new Date().toISOString().slice(0, 10),
                email: data.email,
                phone: data.phone,
                guardianName: data.guardian,
              };
              setStudents([newSt, ...students]);
              logAction('Students', `Onboarded ${newSt.name} (4-step wizard)`, `${newSt.school} · ${newSt.level}`);
            } else if (quickWizard === 'payout') {
              const newPo: PayoutRecord = {
                id: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
                requestId: 'ADMIN-DIRECT',
                name: data.name,
                category: data.category as RequestCategory,
                channel: data.channel,
                destination: data.destination,
                amount: Number(data.amount) || 15000,
                status: 'Queued',
                days: 0,
                initiatedBy: 'Admin',
                notes: data.note,
              };
              setPayouts([newPo, ...payouts]);
              logAction('Disbursements', `Initiated direct payout ${newPo.id}`, `${newPo.name} · ${kes(newPo.amount)}`);
            } else if (quickWizard === 'request') {
              const newReq: AdminRequest = {
                id: `LRQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
                name: data.name,
                initials: data.name
                  .split(' ')
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join(''),
                school: data.school,
                level: data.level,
                category: data.category as RequestCategory,
                amount: Number(data.amount) || 20000,
                days: 0,
                status: 'Pending',
                proof: 'Admin-created request',
                note: data.note || 'Created via AD-1 4-step wizard',
                term: `Term 2 · ${new Date().getFullYear()}`,
              };
              setRequests([newReq, ...requests]);
              logAction('Approvals', `Created admin request ${newReq.id}`, `${newReq.name} · ${kes(newReq.amount)}`);
            }
            setQuickWizard(null);
          }}
        />
      )}

      {schoolDetail && (
        <Dialog
          open
          onClose={() => setSchoolDetail(null)}
          title={schoolDetail}
          eyebrow="SCHOOL NETWORK"
          footer={
            <>
              <button className="ly-btn ly-btn-outline" onClick={() => setSchoolDetail(null)}>
                Close
              </button>
              <button
                className="ly-btn ly-btn-primary"
                onClick={() => {
                  setSchoolDetail(null);
                  showPanel('schools');
                }}
              >
                Explore schools
              </button>
            </>
          }
        >
          <div className="ad-detail">
            <div>
              <span>County</span>
              <strong>{schools.find((x) => x.name === schoolDetail)?.county}</strong>
            </div>
            <div>
              <span>Students</span>
              <strong>{schools.find((x) => x.name === schoolDetail)?.students}</strong>
            </div>
            <div>
              <span>Paybill</span>
              <strong>{schools.find((x) => x.name === schoolDetail)?.paybill || '—'}</strong>
            </div>
          </div>
        </Dialog>
      )}

      {panel && (
        <AdminPanel
          key={panel}
          panel={panel}
          close={() => setPanel(null)}
          requests={requests}
          select={(id) => setSelected(id)}
          open={showPanel}
          exportCsv={csv}
        />
      )}

      {chosen && (
        <RequestReview
          key={chosen.id}
          request={chosen}
          close={() => setSelected(null)}
          onDecision={(d) => setDecision(d)}
        />
      )}

      {decision && chosen && (
        <DecisionWizard
          key={`${decision}-${chosen.id}`}
          request={chosen}
          decision={decision}
          close={() => setDecision(null)}
          finish={() => {
            updateRequestStatus(chosen.id, decision);
            setDecision(null);
            setSelected(null);
          }}
        />
      )}

      {activityOpen && (
        <ActivityDialog filter={activityFilter} setFilter={setActivityFilter} close={() => setActivityOpen(false)} />
      )}

      {confirmSignout && (
        <Dialog
          open
          title="Sign out of Learnly?"
          eyebrow="ADMIN WORKSPACE"
          onClose={() => setConfirmSignout(false)}
          footer={
            <>
              <button className="ly-btn ly-btn-outline" onClick={() => setConfirmSignout(false)}>
                Stay signed in
              </button>
              <button
                className="ly-btn ly-btn-primary"
                onClick={() => {
                  clearSessionPreview();
                  navigate('/auth/signin');
                }}
              >
                Sign out
              </button>
            </>
          }
        >
          <p>Your local demo changes stay in this browser. You'll return to the sign-in page.</p>
        </Dialog>
      )}
    </div>
  );
}

function QuickMultiStepWizard({
  mode,
  close,
  onSave,
}: {
  mode: 'student' | 'payout' | 'request';
  close: () => void;
  onSave: (data: Record<string, string>) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({
    name: '',
    email: '',
    phone: '+254 7',
    school: 'Kenya High School',
    level: 'Senior',
    county: 'Nairobi',
    guardian: '',
    category: 'fees',
    channel: 'M-Pesa',
    destination: '+254 712 345 678',
    amount: '15000',
    note: '',
  });
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');

  const titles = {
    student: 'Onboard Student (4-Step Wizard)',
    payout: 'Initiate Direct Payout (4-Step Wizard)',
    request: 'Create Admin Request (4-Step Wizard)',
  };

  const steps =
    mode === 'student'
      ? ['Identity & Contact', 'School & Level', 'Guardian & County', 'Review & Confirm']
      : mode === 'payout'
        ? ['Recipient & Category', 'Channel & Destination', 'Amount & Justification', 'Review & Confirm']
        : ['Student & School', 'Category & Term', 'Amount & Proof', 'Review & Confirm'];

  const next = () => {
    if (step === 0 && form.name.trim().length < 3) {
      setError('Please enter a full name (at least 3 characters).');
      return;
    }
    if (step === 2 && mode !== 'student' && (!form.amount || Number(form.amount) <= 0)) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    setError('');
    setStep((s) => s + 1);
  };

  return (
    <Dialog
      open
      onClose={close}
      eyebrow="ADMIN MASTER WIZARD"
      title={titles[mode]}
      maxWidth={640}
      footer={
        <>
          <button className="ly-btn ly-btn-outline" onClick={() => (step > 0 ? setStep(step - 1) : close())}>
            {step > 0 ? 'Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button className="ly-btn ly-btn-primary" onClick={next}>
              Continue <Icon name="arrowRight" size={15} />
            </button>
          ) : (
            <button className="ly-btn ly-btn-primary" disabled={!ack} onClick={() => onSave(form)}>
              Confirm &amp; Save
            </button>
          )}
        </>
      }
    >
      <WizardSteps steps={steps} active={step} />
      {step === 0 && (
        <div className="aw-form">
          <label>
            Student full name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amani Wanjiku" />
          </label>
          {mode === 'student' ? (
            <>
              <label>
                Email address
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@learnly.ke" />
              </label>
              <label>
                Phone number
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
            </>
          ) : (
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
          )}
          {error && (
            <p role="alert" className="ad-error">
              {error}
            </p>
          )}
        </div>
      )}
      {step === 1 && (
        <div className="aw-form">
          {mode === 'payout' ? (
            <>
              <label>
                Payout channel
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
            </>
          ) : (
            <>
              <label>
                School / Institution
                <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
              </label>
              <label>
                Education level
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  {['Primary', 'Junior', 'Senior', 'TVET', 'University'].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      )}
      {step === 2 && (
        <div className="aw-form">
          {mode === 'student' ? (
            <>
              <label>
                County
                <input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
              </label>
              <label>
                Guardian / Parent name
                <input value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} placeholder="Full name" />
              </label>
            </>
          ) : (
            <>
              <label>
                Amount (KES)
                <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </label>
              <label>
                Justification / Admin note
                <textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason for this action…" />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="ad-error">
              {error}
            </p>
          )}
        </div>
      )}
      {step === 3 && (
        <div className="ad-detail">
          <div>
            <span>Student</span>
            <strong>{form.name}</strong>
          </div>
          {mode !== 'student' && (
            <div>
              <span>Amount</span>
              <strong>{kes(Number(form.amount) || 0)}</strong>
            </div>
          )}
          {mode === 'payout' && (
            <div>
              <span>Channel</span>
              <strong>
                {form.channel} · {form.destination}
              </strong>
            </div>
          )}
          {mode !== 'payout' && (
            <div>
              <span>School &amp; Level</span>
              <strong>
                {form.school} · {form.level}
              </strong>
            </div>
          )}
          <label className="ad-check">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I confirm all details above are accurate.
          </label>
        </div>
      )}
    </Dialog>
  );
}

const PANEL_NAMES: Record<Panel, string> = {
  students: 'Student directory',
  approvals: 'Approvals queue',
  disbursements: 'Disbursements',
  academic: 'Academic verification',
  schools: 'School network',
  users: 'Users & permissions',
  finance: 'Finance & budget',
  reports: 'Reports',
  audit: 'Audit & settings',
  settings: 'Admin settings',
  notifications: 'Programme alerts',
  messages: 'Messages',
  help: 'Help & support',
};

function AdminPanel({
  panel,
  close,
  requests,
  select,
  open,
  exportCsv,
}: {
  panel: Panel;
  close: () => void;
  requests: AdminRequest[];
  select: (id: string) => void;
  open: (p: Panel) => void;
  exportCsv: () => void;
}) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const [detail, setDetail] = useState<string | null>(null);
  const [pref, setPref] = useState(true);
  const rows = requests.filter(
    (r) =>
      (tab === 'All' || r.status === tab) &&
      `${r.name} ${r.school} ${r.id} ${catLabel(r.category)}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Drawer
        open
        onClose={close}
        eyebrow="ADMIN WORKSPACE"
        title={PANEL_NAMES[panel]}
        width={700}
        footer={
          <>
            <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={close}>
              Close
            </button>
            {['approvals', 'students', 'reports'].includes(panel) && (
              <button className="ly-btn ly-btn-primary ly-btn-sm" onClick={exportCsv}>
                <Icon name="download" size={15} /> Export sample CSV
              </button>
            )}
          </>
        }
      >
        {(panel === 'approvals' || panel === 'students') && (
          <>
            <div className="ad-panel-summary">
              <div>
                <span>TOTAL REQUESTS</span>
                <strong>{requests.length}</strong>
              </div>
              <div>
                <span>AWAITING REVIEW</span>
                <strong>{requests.filter((r) => r.status === 'Pending').length}</strong>
              </div>
              <div>
                <span>NEEDS PROOF</span>
                <strong>{requests.filter((r) => r.status === 'Needs proof').length}</strong>
              </div>
            </div>
            <div className="ad-panel-filter">
              <Tabs
                label="Filter request status"
                value={tab}
                onChange={setTab}
                tabs={['All', 'Pending', 'Approved', 'Rejected', 'Needs proof'].map((t) => ({ key: t, label: t }))}
              />
              <div className="ad-panel-search">
                <Icon name="search" size={15} />
                <input
                  aria-label="Search sample records"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students or reference"
                />
              </div>
            </div>
            <div className="ad-panel-list">
              {rows.map((r) => (
                <button key={r.id} onClick={() => select(r.id)}>
                  <span className="ad-avatar">{r.initials}</span>
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {r.id} · {r.school}
                    </small>
                    <small>
                      {catLabel(r.category)} · {kes(r.amount)}
                    </small>
                  </span>
                  <em>{r.status}</em>
                  <Icon name="chevronRight" size={15} />
                </button>
              ))}
            </div>
          </>
        )}
        {panel === 'finance' && (
          <>
            <div className="ad-panel-summary">
              <div>
                <span>ANNUAL BUDGET</span>
                <strong>KES 25.2M</strong>
              </div>
              <div>
                <span>USED</span>
                <strong>KES 18.4M</strong>
              </div>
              <div>
                <span>REMAINING</span>
                <strong>KES 6.8M</strong>
              </div>
            </div>
            <h3 className="ad-panel-title">Budget allocation by category</h3>
            <div className="ad-budget-rows">
              {[
                ['School fees', 9.4],
                ['Upkeep', 3.6],
                ['Equipment', 2.0],
                ['Medical', 1.2],
                ['Pocket money', 1.0],
                ['Fare', 0.7],
                ['Exam registration', 0.5],
              ].map(([name, amount]) => (
                <button key={name} onClick={() => setDetail(String(name))}>
                  <span>{name}</span>
                  <i>
                    <b style={{ width: `${(Number(amount) / 9.4) * 100}%` }} />
                  </i>
                  <strong>KES {amount}M</strong>
                </button>
              ))}
            </div>
          </>
        )}
        {panel === 'users' && (
          <div className="ad-panel-list">
            {[
              ['Esther Wambui Kariuki', 'Super Admin'],
              ['David Kimani Njoroge', 'Finance Officer'],
              ['Samuel Korir Kiprotich', 'Programme Officer'],
              ['Mary Wairimu Mwangi', 'Academic Verifier'],
              ['Lucy Achieng Otieno', 'School Liaison'],
              ['James Gitau Kamau', 'Auditor'],
            ].map(([name, role]) => (
              <button key={name} onClick={() => setDetail(name)}>
                <span className="ad-avatar">
                  {name
                    .split(' ')
                    .slice(0, 2)
                    .map((x) => x[0])
                    .join('')}
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>{role} · Active</small>
                </span>
                <Icon name="chevronRight" size={15} />
              </button>
            ))}
          </div>
        )}
        {panel === 'reports' && (
          <div className="ad-report-list">
            {[
              ['Approvals queue', 'Download a CSV of sample requests and their statuses.', 'download'],
              ['Programme overview', 'Print this dashboard or save it as a PDF using your browser.', 'file'],
              ['Budget allocation', 'Review annual budget and category spending.', 'trend'],
              ['Student distribution', 'Review the student directory and education levels.', 'users'],
            ].map(([title, description, icon], i) => (
              <div key={title}>
                <span className="ad-method-icon">
                  <Icon name={icon} size={18} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <button
                  className="ad-link"
                  onClick={() => (i === 0 ? exportCsv() : i === 1 ? window.print() : open(i === 2 ? 'finance' : 'students'))}
                >
                  {i === 0 ? 'Download' : i === 1 ? 'Print / PDF' : 'Review'} <Icon name="arrowRight" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {panel === 'audit' && (
          <div className="ad-panel-list">
            {ADMIN_ACTIVITY.map(([actor, action, type, minutes], i) => (
              <button key={i} onClick={() => setDetail(`${actor} · ${action}`)}>
                <span className="ad-method-icon">
                  <Icon name="clock" size={17} />
                </span>
                <span>
                  <strong>
                    {actor} · {action}
                  </strong>
                  <small>
                    {type} · {minutes < 60 ? `${minutes} minutes ago` : `${Math.floor(minutes / 60)} hours ago`}
                  </small>
                </span>
                <Icon name="chevronRight" size={15} />
              </button>
            ))}
          </div>
        )}
        {panel === 'settings' && (
          <div className="ad-setting-row">
            <span>
              <strong>Programme notifications</strong>
              <small>Local preview preference for dashboard updates.</small>
            </span>
            <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setPref(!pref)}>
              {pref ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        )}
        {panel === 'notifications' && (
          <div className="ad-panel-list">
            {alerts.map((a) => (
              <button key={a.id} onClick={() => open(a.panel)}>
                <span className="ad-method-icon">
                  <Icon name={a.icon} size={16} />
                </span>
                <span>
                  <strong>{a.title}</strong>
                  <small>{a.detail}</small>
                </span>
                <Icon name="chevronRight" size={15} />
              </button>
            ))}
          </div>
        )}
        {panel === 'messages' && (
          <div className="ad-panel-list">
            {requests.slice(0, 10).map((r) => (
              <button key={r.id} onClick={() => setDetail(`Message from ${r.name}`)}>
                <span className="ad-avatar">{r.initials}</span>
                <span>
                  <strong>{r.name}</strong>
                  <small>
                    Question about {r.id} · {catLabel(r.category)}
                  </small>
                </span>
                <Icon name="chevronRight" size={15} />
              </button>
            ))}
          </div>
        )}
        {panel === 'help' && (
          <div className="ad-help-list">
            {[
              ['How do I review a request?', 'Open the approvals queue, select a request and review its summary and proof.', 'approvals'],
              ['Where can I see budget usage?', 'The finance panel breaks down the annual allocation and category totals.', 'finance'],
              ['How do I export a report?', 'The reports panel offers a CSV download and browser print / PDF option.', 'reports'],
            ].map(([title, body, target]) => (
              <details key={title}>
                <summary>{title}</summary>
                <p>{body}</p>
                <button className="ad-link" onClick={() => open(target as Panel)}>
                  Explore <Icon name="arrowRight" size={13} />
                </button>
              </details>
            ))}
          </div>
        )}
      </Drawer>
      {detail && (
        <Dialog
          open
          title={detail}
          eyebrow={PANEL_NAMES[panel].toUpperCase()}
          onClose={() => setDetail(null)}
          footer={
            <button className="ly-btn ly-btn-outline" onClick={() => setDetail(null)}>
              Close
            </button>
          }
        >
          <div className="ad-detail">
            <p>Synchronized admin record: {detail}</p>
          </div>
        </Dialog>
      )}
    </>
  );
}

function RequestReview({
  request,
  close,
  onDecision,
}: {
  request: AdminRequest;
  close: () => void;
  onDecision: (d: 'Approved' | 'Rejected' | 'Needs proof') => void;
}) {
  const [tab, setTab] = useState('Overview');
  return (
    <Drawer
      open
      onClose={close}
      eyebrow={`${request.id} · ${request.term}`}
      title={request.name}
      width={650}
      tabs={
        <Tabs
          label="Review request sections"
          value={tab}
          onChange={setTab}
          tabs={['Overview', 'Proof', 'Student context'].map((t) => ({ key: t, label: t }))}
        />
      }
      footer={
        <>
          <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => onDecision('Needs proof')}>
            Request proof
          </button>
          <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => onDecision('Rejected')}>
            Reject
          </button>
          <button className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => onDecision('Approved')}>
            Approve request
          </button>
        </>
      }
    >
      {tab === 'Overview' && (
        <div className="ad-review-content">
          <div className="ad-review-hero">
            <span>REQUESTED AMOUNT</span>
            <strong>{kes(request.amount)}</strong>
            <CategoryBadge category={request.category} />
          </div>
          <div className="ad-review-grid">
            <div>
              <span>Request status</span>
              <strong>{request.status}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{request.days === 0 ? 'Today' : `${request.days} days ago`}</strong>
            </div>
            <div>
              <span>School</span>
              <strong>{request.school}</strong>
            </div>
            <div>
              <span>Education level</span>
              <strong>{request.level}</strong>
            </div>
          </div>
          <div className="ad-review-note">
            <strong>Student's explanation</strong>
            <p>{request.note}</p>
          </div>
        </div>
      )}
      {tab === 'Proof' && (
        <div className="ad-review-content">
          <div className="ad-review-note">
            <strong>Supporting documents</strong>
            <p>{request.proof}</p>
          </div>
        </div>
      )}
      {tab === 'Student context' && (
        <div className="ad-review-content">
          <div className="ad-student ad-context-person">
            <span className="ad-avatar">{request.initials}</span>
            <span>
              <strong>{request.name}</strong>
              <small>
                {request.level} · {request.school}
              </small>
            </span>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function DecisionWizard({
  request,
  decision,
  close,
  finish,
}: {
  request: AdminRequest;
  decision: 'Approved' | 'Rejected' | 'Needs proof';
  close: () => void;
  finish: () => void;
}) {
  const [step, setStep] = useState(0);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');

  return (
    <Dialog
      open
      onClose={close}
      eyebrow={`REVIEW DECISION · ${request.id}`}
      title={decision === 'Approved' ? 'Approve request' : decision === 'Rejected' ? 'Reject request' : 'Request additional proof'}
      maxWidth={580}
      footer={
        <>
          <button className="ly-btn ly-btn-outline" onClick={() => (step ? setStep(step - 1) : close())}>
            {step ? 'Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button
              className="ly-btn ly-btn-primary"
              onClick={() => {
                if (step === 1 && decision !== 'Approved' && note.trim().length < 10) {
                  setError('Please provide at least 10 characters.');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
            >
              Continue <Icon name="arrowRight" size={15} />
            </button>
          ) : (
            <button className="ly-btn ly-btn-primary" disabled={!ack} onClick={finish}>
              Record demo decision
            </button>
          )}
        </>
      }
    >
      <WizardSteps steps={['Decision', 'Justification', 'Notification', 'Confirm']} active={step} />
      {step === 0 && (
        <div className="ad-detail">
          <div>
            <span>Student</span>
            <strong>{request.name}</strong>
          </div>
          <div>
            <span>Requested</span>
            <strong>{kes(request.amount)}</strong>
          </div>
          <div>
            <span>Decision</span>
            <strong>{decision}</strong>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="ad-form">
          <label>
            {decision === 'Approved' ? 'Reviewer note (optional)' : 'Reason / instructions'}
            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a note for the review…" />
          </label>
          {error && (
            <p role="alert" className="ad-error">
              {error}
            </p>
          )}
        </div>
      )}
      {step === 2 && (
        <div className="ad-form">
          <label className="ad-check">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify student &amp; school liaison of this decision
          </label>
        </div>
      )}
      {step === 3 && (
        <div className="ad-detail">
          <div>
            <span>Student</span>
            <strong>{request.name}</strong>
          </div>
          <div>
            <span>Decision</span>
            <strong>{decision}</strong>
          </div>
          <label className="ad-check">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I understand this is a local demonstration.
          </label>
        </div>
      )}
    </Dialog>
  );
}

function ActivityDialog({
  filter,
  setFilter,
  close,
}: {
  filter: string;
  setFilter: (s: string) => void;
  close: () => void;
}) {
  const items = ADMIN_ACTIVITY.filter((a) => filter === 'All' || a[2] === filter);
  return (
    <Dialog
      open
      onClose={close}
      title="Recent activity"
      eyebrow="PROGRAMME AUDIT STREAM"
      maxWidth={700}
      footer={
        <button className="ly-btn ly-btn-outline" onClick={close}>
          Close
        </button>
      }
    >
      <div className="ad-activity-filter">
        <label>
          Filter activity{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {[...new Set(ADMIN_ACTIVITY.map((a) => a[2]))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <button
          className="ad-link"
          onClick={() =>
            downloadText(
              'learnly-admin-activity.csv',
              toCsv([['Actor', 'Action', 'Type', 'Minutes ago'], ...items.map((a) => [...a])]),
              'text/csv'
            )
          }
        >
          <Icon name="download" size={14} /> Export CSV
        </button>
      </div>
      <div className="ad-panel-list">
        {items.map(([actor, action, type, minutes], i) => (
          <div key={`${actor}-${i}`}>
            <span className="ad-method-icon">
              <Icon name="clock" size={16} />
            </span>
            <span>
              <strong>{actor}</strong>
              <small>
                {action} · {type}
              </small>
            </span>
            <small>{minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hours ago`}</small>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
