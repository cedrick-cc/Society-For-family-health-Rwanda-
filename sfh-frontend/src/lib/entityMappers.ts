import type { ProgramTypeKey } from '@/lib/programResources';
import { PROGRAM_TYPE_LABELS } from '@/lib/programResources';
import { computeProgramProgress, type ProgramStatusUI } from '@/lib/programProgress';

export type { ProgramStatusUI } from '@/lib/programProgress';

export type ProgramUI = {
  id: string;
  name: string;
  description: string;
  location: string;
  district: string;
  sector?: string;
  status: ProgramStatusUI;
  progress: number;
  startDate: string;
  endDate: string;
  volunteers: number;
  volunteersNeeded: number;
  assignedVolunteerCount: number;
  beneficiaries: number;
  type: string;
  programType?: ProgramTypeKey;
  programResources?: Array<{
    quantityAssigned: number;
    quantityUsed: number;
    resource?: { name: string; unit: string };
  }>;
  fieldManagerName?: string;
};

export type BeneficiaryUI = {
  id: string;
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
  riskLevel: 'low' | 'medium' | 'high';
  assignedProgramTitle?: string;
};

export type ApiProgram = {
  id: string;
  title: string;
  description: string;
  district: string;
  sector?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  programType?: string;
  targetBeneficiaries?: number;
  volunteersNeeded?: number;
  volunteersRequired?: number;
  progress?: number;
  programResources?: Array<{
    quantityAssigned: number;
    quantityUsed: number;
    resource?: { name: string; unit: string };
  }>;
  fieldManagerId?: string | null;
  fieldManager?: { id: string; name?: string; email?: string } | null;
  beneficiaryCount?: number;
  programVolunteers?: Array<{ volunteer: { id: string; name: string } }>;
};

export type ApiBeneficiary = {
  id: string;
  fullName: string;
  gender: string;
  age: number;
  phone?: string | null;
  district: string;
  sector?: string | null;
  village?: string | null;
  riskLevel?: string | null;
  householdSize?: number;
  servicesReceived?: string[];
  registrationDate: string;
  lastVisit?: string | null;
  status?: string | null;
  assignedProgramId?: string | null;
  assignedProgram?: { id: string; title?: string } | null;
};

function programStatusFromApi(status: string): ProgramStatusUI {
  const s = String(status || 'PLANNED').toLowerCase();
  if (s === 'ongoing' || s === 'planned' || s === 'completed') return s;
  return 'planned';
}

export function mapApiProgramToUI(p: ApiProgram): ProgramUI {
  const status = programStatusFromApi(p.status);
  const progress = computeProgramProgress(status, p.startDate, p.endDate, p.progress);

  const sector = p.sector?.trim() || '';
  const location = [p.district, sector].filter(Boolean).join(', ');
  const needed = p.volunteersNeeded ?? p.volunteersRequired ?? 0;
  const assigned = p.programVolunteers?.length ?? 0;
  const ben = p.beneficiaryCount ?? p.targetBeneficiaries ?? 0;
  const rawPt = (p.programType || 'MATERNAL_HEALTH') as string;
  const pt = (rawPt in PROGRAM_TYPE_LABELS ? rawPt : 'MATERNAL_HEALTH') as ProgramTypeKey;
  const typeLabel = PROGRAM_TYPE_LABELS[pt] || 'Program';
  const pr = Array.isArray(p.programResources) ? p.programResources : [];

  const out: ProgramUI = {
    id: p.id,
    name: p.title,
    description: p.description || '',
    location,
    district: p.district,
    sector: p.sector ?? undefined,
    status,
    progress,
    startDate: p.startDate,
    endDate: p.endDate,
    volunteers: needed,
    volunteersNeeded: needed,
    assignedVolunteerCount: assigned,
    beneficiaries: ben,
    type: typeLabel,
    programType: PROGRAM_TYPE_LABELS[pt] ? pt : undefined,
    programResources: pr,
    fieldManagerName: p.fieldManager?.name,
  };
  return out;
}

function formatGender(g: string): BeneficiaryUI['gender'] {
  const x = (g || '').toLowerCase();
  if (x === 'female') return 'Female';
  if (x === 'male') return 'Male';
  return 'Other';
}

export function mapApiBeneficiaryToUI(b: ApiBeneficiary): BeneficiaryUI {
  const village = b.village?.trim();
  const sector = b.sector?.trim();
  const parts = [village, sector, b.district].filter(Boolean);
  const location = parts.join(', ') || b.district;
  const st = (b.status || 'active').toLowerCase();
  const status: BeneficiaryUI['status'] =
    st === 'inactive' || st === 'completed' ? st : 'active';
  const risk = (b.riskLevel || 'medium').toLowerCase();
  const riskLevel: BeneficiaryUI['riskLevel'] =
    risk === 'low' || risk === 'high' ? risk : 'medium';

  return {
    id: b.id,
    name: b.fullName,
    age: b.age,
    gender: formatGender(b.gender),
    phone: b.phone || '',
    location,
    district: b.district,
    householdSize: Math.max(1, b.householdSize ?? 1),
    registrationDate: b.registrationDate,
    lastVisit: b.lastVisit ? String(b.lastVisit) : '',
    services: Array.isArray(b.servicesReceived) ? b.servicesReceived : [],
    status,
    consentGiven: true,
    riskLevel,
    assignedProgramTitle: b.assignedProgram?.title,
  };
}

export function mapApiTaskToUI(t: {
  id: string;
  title: string;
  dueDate?: string;
  date?: string;
  status: string;
  location?: string;
  priority?: string;
  progress?: number;
  completionNotes?: string | null;
  description?: string;
  createdAt?: string;
  progressHistory?: unknown;
  program?: { id?: string; title?: string; district?: string; sector?: string | null };
  assignedBy?: { id?: string; name?: string; email?: string };
  assignedTo?: { id?: string; name?: string; email?: string };
}) {
  const due = t.dueDate || t.date;
  const st = String(t.status || 'PENDING').toUpperCase();
  const done = st === 'COMPLETED';
  const cancelled = st === 'CANCELLED';
  const loc =
    t.location && String(t.location).trim()
      ? String(t.location)
      : t.program?.title
        ? String(t.program.title)
        : '—';
  let progress = typeof t.progress === 'number' ? t.progress : 0;
  if (st === 'IN_PROGRESS' && !progress) progress = 50;
  if (st === 'COMPLETED' && progress < 100) progress = 100;
  if (st === 'PENDING' && progress > 0) progress = 0;
  const hist = Array.isArray(t.progressHistory) ? t.progressHistory : [];
  return {
    id: t.id,
    task: t.title,
    time: due ? new Date(due).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '',
    dueDateIso: due,
    location: loc,
    done,
    cancelled,
    type: 'visit' as const,
    assignedBy: t.assignedBy?.name || '—',
    assignedById: t.assignedBy?.id,
    assignedToName: t.assignedTo?.name,
    assignedToId: t.assignedTo?.id,
    rawStatus: st,
    priority: t.priority,
    programTitle: t.program?.title,
    programId: t.program?.id,
    progress,
    completionNotes: t.completionNotes || undefined,
    description: t.description || '',
    createdAt: t.createdAt,
    progressHistory: hist as Array<{
      at: string;
      status: string;
      progress: number;
      note?: string;
      userId?: string;
      userName?: string;
    }>,
  };
}
