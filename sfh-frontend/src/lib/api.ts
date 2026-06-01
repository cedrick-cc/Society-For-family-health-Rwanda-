import {
  getPrograms as apiGetPrograms,
  getBeneficiaries as apiGetBeneficiaries,
  getDashboardStats as apiGetDashboardStats,
  getMyTasks as apiGetMyTasks,
  getMyFieldReports as apiGetMyFieldReports,
  getPendingFieldReports as apiGetPendingFieldReports,
  getRecentFieldReports as apiGetRecentFieldReports,
  getNotifications as apiGetNotifications,
} from '@/services/api';
import { mapApiBeneficiaryToUI, mapApiProgramToUI, mapApiTaskToUI } from '@/lib/entityMappers';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

// Generic helper – simulates async I/O without any data
const empty = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 0));

export interface Program {
  id: number | string;
  name: string;
  description: string;
  location: string;
  district: string;
  sector?: string;
  status: 'planned' | 'ongoing' | 'completed';
  progress: number;
  startDate: string;
  endDate: string;
  volunteers: number;
  volunteersNeeded?: number;
  assignedVolunteerCount?: number;
  beneficiaries: number;
  type: string;
  programType?: string;
  programResources?: Array<{ quantityAssigned: number; quantityUsed: number; resource?: { name: string } }>;
  fieldManagerName?: string;
}

export interface Volunteer {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  location: string;
  district: string;
  status: 'active' | 'inactive' | 'on_leave';
  skills: string[];
  certifications: string[];
  joinDate: string;
  programsCompleted: number;
  beneficiariesServed: number;
  currentProgram?: string;
}

export interface Beneficiary {
  id: number | string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  location: string;
  district: string;
  householdSize: number;
  registrationDate: string;
  lastVisit: string;
  services: string[];
  status: 'active' | 'inactive' | 'completed';
  consentGiven: boolean;
  followUpScheduled?: string;
  riskLevel: 'low' | 'medium' | 'high';
  assignedProgramTitle?: string;
}

export interface DashboardStats {
  totalUsers?: number;
  activeUsers?: number;
  pendingUsers?: number;
  activeVolunteers?: number;
  totalPrograms?: number;
  ongoingPrograms?: number;
  totalBeneficiaries?: number;
  pendingFieldReports?: number;
  activePrograms?: number;
  completedPrograms?: number;
  pendingReports?: number;
  completedTasks?: number;
  volunteersAssigned?: number;
  beneficiariesReached?: number;
  lowStockAlerts?: number;
  reportsAwaitingReview?: number;
  programsUnderManagement?: number;
  approvalRate?: number;
  activeFieldManagers?: number;
  assignedVolunteers?: number;
  activeFieldTasks?: number;
  completedTasksToday?: number;
  volunteerUtilization?: number;
  assignedTasks?: number;
  pendingTasks?: number;
  monthlyProgress?: number;
}

export interface OutreachLocation {
  id: number | string;
  name: string;
  type: string;
  location: string;
  district: string;
  lat: number;
  lng: number;
  status: 'planned' | 'ongoing' | 'completed';
  volunteers: number;
  beneficiaries: number;
  date: string;
  coverage: number;
}

export interface SystemUser {
  id: number | string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
}

export interface AuditLog {
  id: number | string;
  user: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  createdAt?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  category?: string;
  linkPath?: string;
  linkTargetId?: string;
  type?: string;
}

export interface Task {
  id: number | string;
  task: string;
  time: string;
  location: string;
  done: boolean;
  cancelled?: boolean;
  type: 'visit' | 'registration' | 'outreach' | 'report';
  assignedBy: string;
  programId?: string;
  programTitle?: string;
  rawStatus?: string;
  priority?: string;
  /** 0–100 from backend */
  progress?: number;
  completionNotes?: string;
  description?: string;
  assignedToName?: string;
  assignedToId?: string;
  assignedById?: string;
  createdAt?: string;
  dueDateIso?: string;
  progressHistory?: Array<{
    at: string;
    status: string;
    progress: number;
    note?: string;
    userId?: string;
    userName?: string;
  }>;
}

export interface AnalyticsSummary {
  totalReach: number;
  activeVolunteers: number;
  geographicCoverage: number;
  programEffectiveness: number;
  ongoingPrograms: number;
  completedPrograms: number;
  fieldReportsSubmitted: number;
  monthlyTrend: Array<{ month: string; beneficiaries: number; volunteers: number; programs: number }>;
  provinceDistribution: Array<{ name: string; value: number; beneficiaries: number; programs?: number; reports?: number; color: string }>;
  districtCoverage?: Array<{ district: string; programs: number; reports: number; beneficiaries: number }>;
  programTypes: Array<{ type: string; count: number; beneficiaries: number }>;
  resourceUtilization?: Array<{ name: string; available: number; assigned: number; used: number }>;
  taskCompletionAnalytics?: { completed: number; inProgress: number; pending: number };
}

export const emptyAnalytics: AnalyticsSummary = {
  totalReach: 0,
  activeVolunteers: 0,
  geographicCoverage: 0,
  programEffectiveness: 0,
  ongoingPrograms: 0,
  completedPrograms: 0,
  fieldReportsSubmitted: 0,
  monthlyTrend: [],
  provinceDistribution: [],
  programTypes: [],
};

// === Placeholder fetchers ===
// Replace each with `fetch(`${API_BASE}/...`)` once the backend is live.

export async function fetchPrograms(): Promise<Program[]> {
  const raw = await apiGetPrograms();
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => mapApiProgramToUI(p));
}

export async function fetchVolunteers(): Promise<Volunteer[]> {
  try {
    const { getVolunteersList } = await import('@/services/api');
    const raw = await getVolunteersList();
    if (!Array.isArray(raw)) return [];
    return raw.map((v: Record<string, unknown>) => {
      const ops = String(v.volunteerOpsStatus || 'AVAILABLE').toLowerCase();
      const status =
        ops === 'on_leave' ? 'on_leave' : String(v.status || '').toLowerCase() === 'active' ? 'active' : 'inactive';
      return {
        id: String(v.id),
        name: String(v.name || ''),
        email: String(v.email || ''),
        phone: v.phone || v.phoneNumber ? String(v.phone || v.phoneNumber) : '—',
        nationalId: v.nationalId ? String(v.nationalId) : undefined,
        avatar: v.profileImage ? String(v.profileImage) : undefined,
        location: String(v.volunteerDistrict || 'Rwanda'),
        district: String(v.volunteerDistrict || '—'),
        status: status as Volunteer['status'],
        skills: Array.isArray(v.skills) ? (v.skills as string[]) : [],
        certifications: Array.isArray(v.certifications) ? (v.certifications as string[]) : [],
        joinDate: v.joinDate ? new Date(String(v.joinDate)).toLocaleDateString() : '',
        programsCompleted: Number(v.programsParticipated ?? v.programsCompleted) || 0,
        beneficiariesServed: Number(v.beneficiariesServed) || 0,
        currentProgram: v.currentProgram ? String(v.currentProgram) : undefined,
        volunteerOpsStatus: String(v.volunteerOpsStatus || ''),
        assignedProgramsCount: Number(v.assignedProgramsCount) || 0,
        taskSummary: String(v.taskSummary || ''),
        activitySummary: String(v.activitySummary || ''),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchBeneficiaries(): Promise<Beneficiary[]> {
  const raw = await apiGetBeneficiaries();
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => mapApiBeneficiaryToUI(b));
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiGetDashboardStats() as Promise<DashboardStats>;
}
export const fetchLocations = (): Promise<OutreachLocation[]> => empty([]);
export const fetchUsers = (): Promise<SystemUser[]> => empty([]);
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const { getAuditLogs } = await import('@/services/api');
    const raw = await getAuditLogs();
    if (!Array.isArray(raw)) return [];
    return raw.map((l: Record<string, unknown>) => ({
      id: String(l.id),
      user: String(l.userName || (l.user as { name?: string })?.name || 'System'),
      action: String(l.action),
      module: String(l.module),
      details: String(l.description),
      timestamp: new Date(String(l.createdAt)).toLocaleString(),
      createdAt: String(l.createdAt),
      severity: String(l.severity || 'INFO').toLowerCase() as AuditLog['severity'],
    }));
  } catch {
    return [];
  }
}
export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const raw = await apiGetNotifications();
    if (!Array.isArray(raw)) return [];
    return raw.map(
      (n: {
        id: string;
        title: string;
        body: string;
        read: boolean;
        createdAt: string;
        category?: string;
        linkPath?: string;
        linkTargetId?: string;
        type?: string;
      }) => ({
        id: n.id,
        title: n.title,
        message: n.body,
        time: new Date(n.createdAt).toLocaleString(),
        unread: !n.read,
        category: n.category,
        linkPath: n.linkPath,
        linkTargetId: n.linkTargetId,
        type: n.type,
      })
    );
  } catch {
    return [];
  }
}

export async function fetchTasks(): Promise<Task[]> {
  try {
    const raw = await apiGetMyTasks();
    if (!Array.isArray(raw)) return [];
    return raw.map((t) => mapApiTaskToUI(t) as Task);
  } catch {
    return [];
  }
}
export function mapApiFieldReportToUI(r: Record<string, unknown>) {
  const volunteer = r.volunteer as { name?: string } | undefined;
  const program = r.program as { title?: string } | undefined;
  const task = r.task as { title?: string } | undefined;
  const reviewedBy = r.reviewedBy as { name?: string } | undefined;
  const createdAt = r.createdAt as string;
  const status = String(r.status || '').toLowerCase();
  const reviewUi =
    status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
  return {
    id: String(r.id),
    taskId: r.taskId ? String(r.taskId) : '',
    taskName: task?.title || 'General activity',
    program: program?.title || 'Program',
    programId: String(r.programId || ''),
    location: String(r.location || ''),
    latitude: typeof r.latitude === 'number' ? r.latitude : undefined,
    longitude: typeof r.longitude === 'number' ? r.longitude : undefined,
    beneficiariesServed: Number(r.beneficiariesCount) || 0,
    description: String(r.notes || ''),
    photos: Array.isArray(r.evidenceUrls) ? (r.evidenceUrls as string[]) : [],
    status: String(r.activityOutcome || 'completed') as 'completed' | 'partial' | 'cancelled',
    reviewStatus: reviewUi as 'pending' | 'approved' | 'rejected',
    submittedAt: createdAt ? new Date(createdAt).toLocaleString() : '',
    volunteerName: volunteer?.name || 'Volunteer',
    activityOutcome: r.activityOutcome ? String(r.activityOutcome) : undefined,
    reviewNotes: r.reviewNotes ? String(r.reviewNotes) : undefined,
    reviewerName: reviewedBy?.name,
    submittedAtIso: createdAt,
  };
}

export async function fetchReports(): Promise<any[]> {
  try {
    const raw = await apiGetPendingFieldReports();
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => mapApiFieldReportToUI(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function fetchRecentFieldReports(): Promise<any[]> {
  try {
    const raw = await apiGetRecentFieldReports();
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => mapApiFieldReportToUI(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function fetchMyReports(): Promise<any[]> {
  try {
    const raw = await apiGetMyFieldReports();
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => mapApiFieldReportToUI(r as Record<string, unknown>));
  } catch {
    return [];
  }
}
export async function fetchAnalytics(period = 'monthly'): Promise<AnalyticsSummary> {
  try {
    const { getAnalytics } = await import('@/services/api');
    const data = await getAnalytics(period);
    const s = data.summary || {};
    const reach = data.beneficiariesReachedOverTime || [];
    const volunteerTrend = data.volunteerActivityTrend || [];
    const programTrend = data.programCompletionTrend || [];
    const districtCoverage = data.districtCoverage || data.districtActivity || [];
    return {
      totalReach: s.totalReach ?? 0,
      activeVolunteers: s.activeVolunteers ?? 0,
      geographicCoverage: s.geographicCoverage ?? 0,
      programEffectiveness: s.programEffectiveness ?? 0,
      ongoingPrograms: s.ongoingPrograms ?? 0,
      completedPrograms: s.completedPrograms ?? 0,
      fieldReportsSubmitted: s.fieldReportsSubmitted ?? 0,
      monthlyTrend: reach.map((b: { label: string; value: number }, i: number) => ({
        month: b.label,
        beneficiaries: b.value,
        volunteers: volunteerTrend[i]?.actions ?? volunteerTrend[i]?.tasks ?? 0,
        programs: programTrend[i]?.ongoing ?? 0,
      })),
      districtCoverage: districtCoverage.map(
        (d: { district?: string; name?: string; programs: number; reports: number; beneficiaries: number }) => ({
          district: d.district || d.name || '',
          programs: d.programs ?? 0,
          reports: d.reports ?? 0,
          beneficiaries: d.beneficiaries ?? 0,
        })
      ),
      provinceDistribution: districtCoverage.map(
        (d: { district?: string; name?: string; programs: number; reports: number; beneficiaries: number; value?: number }, i: number) => ({
          name: d.district || d.name || '',
          value: (d.programs ?? 0) + (d.reports ?? 0) + (d.beneficiaries ?? 0),
          beneficiaries: d.beneficiaries ?? 0,
          programs: d.programs ?? 0,
          reports: d.reports ?? 0,
          color: `hsl(${(i * 40) % 360}, 70%, 50%)`,
        })
      ),
      programTypes: (data.programTypes || []).map((p: { name: string; value: number }) => ({
        type: p.name.replace(/_/g, ' '),
        count: p.value,
        beneficiaries: 0,
      })),
      resourceUtilization: data.resourceUtilization,
      taskCompletionAnalytics: data.taskCompletionAnalytics,
    };
  } catch {
    return emptyAnalytics;
  }
}
export const fetchMessages = (): Promise<any[]> => empty([]);
export async function fetchCalendarEvents(): Promise<
  Array<{
    id: string;
    title: string;
    date: Date;
    time: string;
    location: string;
    type: string;
    description?: string;
  }>
> {
  try {
    const { getScheduledActivities } = await import('@/services/api');
    const raw = await getScheduledActivities();
    if (!Array.isArray(raw)) return [];
    return raw.map((a: Record<string, unknown>) => ({
      id: String(a.id),
      title: String(a.title || ''),
      date: new Date(String(a.date)),
      time: String(a.time || ''),
      location: String(a.district || ''),
      type: 'outreach',
      description: String(a.description || ''),
    }));
  } catch {
    return [];
  }
}

export interface ProgramAttentionItem {
  programId: string;
  programTitle: string;
  district: string;
  status: string;
  reasons: Array<{ type: string; label: string; severity: string }>;
}

export async function fetchProgramsAttention(): Promise<ProgramAttentionItem[]> {
  try {
    const { getProgramsAttention } = await import('@/services/api');
    const raw = await getProgramsAttention();
    return Array.isArray(raw) ? (raw as ProgramAttentionItem[]) : [];
  } catch {
    return [];
  }
}
