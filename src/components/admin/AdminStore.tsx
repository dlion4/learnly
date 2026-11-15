import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  ADMIN_ACTIVITY,
  ADMIN_REQUESTS,
  ADMIN_SCHOOLS,
  type AdminRequest,
  type AdminStatus,
} from '../../data/adminDashboard';
import { kes } from '../../data/students';

export type AdminRole =
  | 'Super Admin'
  | 'Finance Officer'
  | 'Programme Officer'
  | 'Academic Verifier'
  | 'School Liaison'
  | 'Auditor';

export type PermissionKey =
  | 'canAddRecords'
  | 'canEditRecords'
  | 'canDeleteRecords'
  | 'canApproveRequests'
  | 'canInitiatePayouts'
  | 'canReversePayouts'
  | 'canSuspendUsers'
  | 'canManagePermissions'
  | 'canExportData';

export type RolePermissions = Record<AdminRole, Record<PermissionKey, boolean>>;

export interface StudentRecord {
  id: string;
  name: string;
  school: string;
  level: string;
  status: 'Active' | 'Pending' | 'Inactive' | 'Suspended';
  completion: number;
  county: string;
  onboarded: string;
  email?: string;
  phone?: string;
  guardianName?: string;
  notes?: string;
}

export interface PayoutRecord {
  id: string;
  requestId: string;
  name: string;
  category: AdminRequest['category'];
  channel: string;
  destination: string;
  amount: number;
  status: 'Queued' | 'Submitted' | 'Settled' | 'Failed' | 'Reversed';
  days: number;
  initiatedBy?: 'Student' | 'Admin';
  notes?: string;
}

export interface DocRecord {
  id: string;
  requestId: string;
  name: string;
  school: string;
  type: string;
  term: string;
  summary: string;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Re-upload';
  days: number;
  uploadedBy?: 'Student' | 'Admin';
  notes?: string;
}

export interface SchoolRecord {
  id: string;
  name: string;
  county: string;
  students: number;
  level: string;
  type: string;
  code: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  card: boolean;
  bankName?: string;
  accountNumber?: string;
  paybill?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  scope: 'All' | 'By school' | 'By county';
  lastLogin: string;
  status: 'Active' | 'Suspended' | 'Invited';
  twoFa: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: AdminRole;
  module: 'Command Center' | 'Students' | 'Approvals' | 'Disbursements' | 'Academic' | 'Schools' | 'Permissions';
  action: string;
  details: string;
}

const get = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

const put = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage fallback */
  }
};

const year = new Date().getFullYear();

const studentSeeds: StudentRecord[] = ADMIN_REQUESTS.map((r, i) => ({
  id: `ST-${String(1100 + i)}`,
  name: r.name,
  school: r.school,
  level: r.level,
  status: i === 9 ? 'Pending' : i === 10 ? 'Inactive' : 'Active',
  completion: Math.max(52, 97 - i * 3),
  county: i % 3 === 0 ? 'Kiambu' : i % 3 === 1 ? 'Nairobi' : 'Nyeri',
  onboarded: `${year}-0${1 + (i % 9)}-12`,
  email: `${r.name.toLowerCase().replace(/\s+/g, '.')}@learnly.ke`,
  phone: `+254 7${10 + i} ${200 + i} ${300 + i}`,
  guardianName: `Parent / Guardian of ${r.name.split(' ')[0]}`,
}));

const payoutSeeds: PayoutRecord[] = ADMIN_REQUESTS.map((r, i) => ({
  id: `PO-${year}-${String(730 + i)}`,
  requestId: r.id,
  name: r.name,
  category: r.category,
  channel: ['M-Pesa', 'School paybill', 'Bank EFT', 'Card top-up', 'Airtel Money'][i % 5],
  destination: [
    '+254 ••• ••• 418',
    'School A/C •••• 1187',
    'Bank A/C •••• 4471',
    'Card •••• 6094',
    '+254 ••• ••• 871',
  ][i % 5],
  amount: r.amount,
  status: (
    [
      'Failed',
      'Queued',
      'Submitted',
      'Settled',
      'Settled',
      'Settled',
      'Reversed',
      'Settled',
      'Settled',
      'Settled',
      'Queued',
      'Settled',
    ] as PayoutRecord['status'][]
  )[i],
  days: i,
  initiatedBy: 'Student',
}));

export const DOC_TYPES = [
  'Result slip',
  'Fee structure',
  'School letter',
  'Exam registration',
  'Medical letter',
  'Residence proof',
];

const docSeeds: DocRecord[] = ADMIN_REQUESTS.map((r, i) => ({
  id: `DOC-${100 + i}`,
  requestId: r.id,
  name: r.name,
  school: r.school,
  type: DOC_TYPES[i % DOC_TYPES.length],
  term: r.term,
  summary: i % 2 ? `Total: ${kes(r.amount)}` : `Mean score: ${70 + i}%`,
  status: i < 7 ? 'Pending' : i === 7 ? 'Rejected' : 'Verified',
  days: i % 6,
  uploadedBy: 'Student',
}));

const schoolSeeds: SchoolRecord[] = ADMIN_SCHOOLS.map(([name, county, students], i) => ({
  id: `SCH-${101 + i}`,
  name,
  county,
  students,
  level: ['Senior', 'Junior', 'Senior', 'University', 'Primary', 'TVET', 'Senior', 'Senior', 'Senior', 'University'][i],
  type: i === 5 ? 'TVET' : i === 3 || i === 9 ? 'University' : 'Public',
  code: `MOE-${204010 + i}`,
  status: 'Active',
  card: i % 3 === 0,
  bankName: i % 2 === 0 ? 'KCB Bank Kenya' : 'Equity Bank Kenya',
  accountNumber: `110${4500 + i * 17}`,
  paybill: `${522500 + i}`,
  contactName: `Principal · ${name.split(' ')[0]}`,
  contactPhone: `+254 722 ${100 + i} ${400 + i}`,
}));

const staffSeeds: StaffRecord[] = [
  ['Esther Wambui Kariuki', 'esther@learnly.ke', '+254 712 100 101', 'Super Admin', 'All', '2 mins ago', 'Active', true],
  ['David Kimani Njoroge', 'david@learnly.ke', '+254 712 100 102', 'Finance Officer', 'All', '18 mins ago', 'Active', true],
  ['Samuel Korir Kiprotich', 'samuel@learnly.ke', '+254 712 100 103', 'Programme Officer', 'By county', '1 hr ago', 'Active', true],
  ['Mary Wairimu Mwangi', 'mary@learnly.ke', '+254 712 100 104', 'Academic Verifier', 'All', '3 hrs ago', 'Active', true],
  ['Lucy Achieng Otieno', 'lucy@learnly.ke', '+254 712 100 105', 'School Liaison', 'By school', '5 hrs ago', 'Active', false],
  ['James Gitau Kamau', 'james@learnly.ke', '+254 712 100 106', 'Auditor', 'All', '1 day ago', 'Active', true],
  ['Naomi Chepkoech Rono', 'naomi@learnly.ke', '+254 712 100 107', 'Academic Verifier', 'By county', '2 days ago', 'Active', true],
  ['Halima Abdi Noor', 'halima@learnly.ke', '+254 712 100 108', 'Programme Officer', 'By school', '3 days ago', 'Invited', false],
  ['Peter Mutuku Musyoka', 'peter@learnly.ke', '+254 712 100 109', 'School Liaison', 'By school', '5 days ago', 'Active', true],
  ['Brian Mwangi', 'brian.staff@learnly.ke', '+254 712 100 110', 'Auditor', 'All', '1 week ago', 'Suspended', false],
].map((s, i) => ({
  id: `STF-${101 + i}`,
  name: String(s[0]),
  email: String(s[1]),
  phone: String(s[2]),
  role: s[3] as AdminRole,
  scope: s[4] as StaffRecord['scope'],
  lastLogin: String(s[5]),
  status: s[6] as StaffRecord['status'],
  twoFa: Boolean(s[7]),
}));

const defaultPermissions: RolePermissions = {
  'Super Admin': {
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: true,
    canApproveRequests: true,
    canInitiatePayouts: true,
    canReversePayouts: true,
    canSuspendUsers: true,
    canManagePermissions: true,
    canExportData: true,
  },
  'Finance Officer': {
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: false,
    canApproveRequests: true,
    canInitiatePayouts: true,
    canReversePayouts: true,
    canSuspendUsers: false,
    canManagePermissions: false,
    canExportData: true,
  },
  'Programme Officer': {
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: false,
    canApproveRequests: true,
    canInitiatePayouts: false,
    canReversePayouts: false,
    canSuspendUsers: true,
    canManagePermissions: false,
    canExportData: true,
  },
  'Academic Verifier': {
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: false,
    canApproveRequests: false,
    canInitiatePayouts: false,
    canReversePayouts: false,
    canSuspendUsers: false,
    canManagePermissions: false,
    canExportData: true,
  },
  'School Liaison': {
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: false,
    canApproveRequests: false,
    canInitiatePayouts: false,
    canReversePayouts: false,
    canSuspendUsers: false,
    canManagePermissions: false,
    canExportData: true,
  },
  Auditor: {
    canAddRecords: false,
    canEditRecords: false,
    canDeleteRecords: false,
    canApproveRequests: false,
    canInitiatePayouts: false,
    canReversePayouts: false,
    canSuspendUsers: false,
    canManagePermissions: false,
    canExportData: true,
  },
};

const initialAuditSeeds: AuditEntry[] = ADMIN_ACTIVITY.slice(0, 8).map(([actor, action, type, minutes], i) => ({
  id: `AUD-${1000 + i}`,
  timestamp: minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hrs ago`,
  actor,
  role: 'Super Admin',
  module:
    type === 'Approvals' || type === 'Requests'
      ? 'Approvals'
      : type === 'Payouts' || type === 'Accounts'
        ? 'Disbursements'
        : type === 'Documents' || type === 'Academic'
          ? 'Academic'
          : 'Students',
  action,
  details: `${type} · Synchronized programme log`,
}));

interface AdminContextValue {
  requests: AdminRequest[];
  setRequests: (v: AdminRequest[]) => void;
  students: StudentRecord[];
  setStudents: (v: StudentRecord[]) => void;
  payouts: PayoutRecord[];
  setPayouts: (v: PayoutRecord[]) => void;
  docs: DocRecord[];
  setDocs: (v: DocRecord[]) => void;
  schools: SchoolRecord[];
  setSchools: (v: SchoolRecord[]) => void;
  staff: StaffRecord[];
  setStaff: (v: StaffRecord[]) => void;
  permissions: RolePermissions;
  togglePermission: (role: AdminRole, key: PermissionKey) => void;
  activeRole: AdminRole;
  setActiveRole: (role: AdminRole) => void;
  hasPermission: (key: PermissionKey) => boolean;
  auditLog: AuditEntry[];
  logAction: (module: AuditEntry['module'], action: string, details: string, actor?: string) => void;
  updateRequestStatus: (id: string, status: AdminStatus, note?: string, approvedAmount?: number) => void;
  deleteRecord: (kind: 'students' | 'approvals' | 'disbursements' | 'academic' | 'schools', id: string) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [requests, setRequestsState] = useState<AdminRequest[]>(() =>
    get('learnly.admin-requests.v1', ADMIN_REQUESTS)
  );
  const [students, setStudentsState] = useState<StudentRecord[]>(() =>
    get('learnly.admin-students.v1', studentSeeds)
  );
  const [payouts, setPayoutsState] = useState<PayoutRecord[]>(() =>
    get('learnly.admin-payouts.v1', payoutSeeds)
  );
  const [docs, setDocsState] = useState<DocRecord[]>(() =>
    get('learnly.admin-docs.v1', docSeeds)
  );
  const [schools, setSchoolsState] = useState<SchoolRecord[]>(() =>
    get('learnly.admin-schools.v1', schoolSeeds)
  );
  const [staff, setStaffState] = useState<StaffRecord[]>(() =>
    get('learnly.admin-staff.v1', staffSeeds)
  );
  const [permissions, setPermissions] = useState<RolePermissions>(() =>
    get('learnly.admin-permissions.v1', defaultPermissions)
  );
  const [activeRole, setActiveRoleState] = useState<AdminRole>(() =>
    get('learnly.admin-active-role.v1', 'Super Admin')
  );
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() =>
    get('learnly.admin-audit-log.v1', initialAuditSeeds)
  );

  const setRequests = (v: AdminRequest[]) => {
    setRequestsState(v);
    put('learnly.admin-requests.v1', v);
  };
  const setStudents = (v: StudentRecord[]) => {
    setStudentsState(v);
    put('learnly.admin-students.v1', v);
  };
  const setPayouts = (v: PayoutRecord[]) => {
    setPayoutsState(v);
    put('learnly.admin-payouts.v1', v);
  };
  const setDocs = (v: DocRecord[]) => {
    setDocsState(v);
    put('learnly.admin-docs.v1', v);
  };
  const setSchools = (v: SchoolRecord[]) => {
    setSchoolsState(v);
    put('learnly.admin-schools.v1', v);
  };
  const setStaff = (v: StaffRecord[]) => {
    setStaffState(v);
    put('learnly.admin-staff.v1', v);
  };
  const setActiveRole = (role: AdminRole) => {
    setActiveRoleState(role);
    put('learnly.admin-active-role.v1', role);
  };

  const logAction = (
    module: AuditEntry['module'],
    action: string,
    details: string,
    actor = 'Esther Wambui Kariuki'
  ) => {
    const entry: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      actor,
      role: activeRole,
      module,
      action,
      details,
    };
    const next = [entry, ...auditLog].slice(0, 100);
    setAuditLog(next);
    put('learnly.admin-audit-log.v1', next);
  };

  const togglePermission = (role: AdminRole, key: PermissionKey) => {
    const next: RolePermissions = {
      ...permissions,
      [role]: {
        ...permissions[role],
        [key]: !permissions[role][key],
      },
    };
    setPermissions(next);
    put('learnly.admin-permissions.v1', next);
    logAction('Permissions', `Toggled ${key} for ${role}`, `Set to ${!permissions[role][key]}`);
  };

  const hasPermission = (key: PermissionKey) => Boolean(permissions[activeRole]?.[key]);

  const updateRequestStatus = (id: string, status: AdminStatus, note?: string, approvedAmount?: number) => {
    const next = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            ...(approvedAmount ? { approvedAmount } : {}),
            ...(note ? { decisionNote: note } : {}),
          }
        : r
    );
    setRequests(next);
    logAction('Approvals', `${status} request ${id}`, note || `Updated status to ${status}`);
  };

  const deleteRecord = (
    kind: 'students' | 'approvals' | 'disbursements' | 'academic' | 'schools',
    id: string
  ) => {
    if (kind === 'students') setStudents(students.filter((x) => x.id !== id));
    if (kind === 'approvals') setRequests(requests.filter((x) => x.id !== id));
    if (kind === 'disbursements') setPayouts(payouts.filter((x) => x.id !== id));
    if (kind === 'academic') setDocs(docs.filter((x) => x.id !== id));
    if (kind === 'schools') setSchools(schools.filter((x) => x.id !== id));
    logAction(
      kind === 'students'
        ? 'Students'
        : kind === 'approvals'
          ? 'Approvals'
          : kind === 'disbursements'
            ? 'Disbursements'
            : kind === 'academic'
              ? 'Academic'
              : 'Schools',
      `Deleted record ${id}`,
      `Permanently removed from ${kind}`
    );
  };

  return (
    <AdminContext.Provider
      value={{
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
        staff,
        setStaff,
        permissions,
        togglePermission,
        activeRole,
        setActiveRole,
        hasPermission,
        auditLog,
        logAction,
        updateRequestStatus,
        deleteRecord,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminStore() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminStore must be used inside AdminProvider');
  return ctx;
}
