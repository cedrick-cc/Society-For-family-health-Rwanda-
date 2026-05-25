import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Calendar,
  Users,
  HeartHandshake,
  ClipboardList,
  UserCircle,
  Loader2,
  FileText,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProgram } from '@/services/api';
import { PROGRAM_TYPE_LABELS, labelsForResourceKeys } from '@/lib/programResources';
import type { ProgramTypeKey } from '@/lib/programResources';
import { computeProgramProgress } from '@/lib/programProgress';

type ApiVolunteer = { id: string; name: string; email?: string };
type ApiReport = {
  id: string;
  status: string;
  createdAt: string;
  beneficiariesCount: number;
  volunteer?: ApiVolunteer;
  task?: { title: string } | null;
};
type ApiTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  location?: string;
  assignedTo?: ApiVolunteer;
};

type ProgramResource = {
  resourceId: string;
  quantityAssigned: number;
  quantityUsed: number;
  resource?: { name: string; unit?: string };
};

type ProgramDetail = {
  id: string;
  title: string;
  description: string;
  district: string;
  sector?: string | null;
  status: string;
  programType?: string;
  startDate: string;
  endDate: string;
  volunteersNeeded?: number;
  targetBeneficiaries?: number;
  progress?: number;
  healthResources?: string[];
  programResources?: ProgramResource[];
  fieldManager?: ApiVolunteer | null;
  programVolunteers?: Array<{ volunteer: ApiVolunteer }>;
  fieldReports?: ApiReport[];
  tasks?: ApiTask[];
};

function statusUi(s: string) {
  const x = String(s || '').toLowerCase();
  if (x === 'ongoing' || x === 'planned' || x === 'completed') return x as 'ongoing' | 'planned' | 'completed';
  return 'planned';
}

function typeLabel(programType?: string) {
  const key = (programType || 'MATERNAL_HEALTH') as ProgramTypeKey;
  return PROGRAM_TYPE_LABELS[key] || programType || 'Program';
}

export interface ProgramDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string | null;
}

const ProgramDetailsModal: React.FC<ProgramDetailsModalProps> = ({ open, onOpenChange, programId }) => {
  const [loading, setLoading] = useState(false);
  const [p, setP] = useState<ProgramDetail | null>(null);

  const loadProgram = () => {
    if (!programId) return;
    getProgram(programId)
      .then((row) => setP(row as ProgramDetail))
      .catch(() => setP(null));
  };

  useEffect(() => {
    if (!open || !programId) {
      setP(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getProgram(programId)
      .then((row) => {
        if (!cancelled) setP(row as ProgramDetail);
      })
      .catch(() => {
        if (!cancelled) setP(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const interval = setInterval(() => {
      if (!cancelled) loadProgram();
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, programId]);

  const st = p ? statusUi(p.status) : 'planned';
  const progressPct = p
    ? computeProgramProgress(st, p.startDate, p.endDate, p.progress)
    : 0;
  const assigned = p?.programVolunteers?.length ?? 0;
  const needed = p?.volunteersNeeded ?? 0;
  const hr = Array.isArray(p?.healthResources) ? p!.healthResources! : [];
  const hrLabels = labelsForResourceKeys(hr);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-display pr-8">
            {loading ? 'Program details' : p?.title || 'Program'}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && p && (
          <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)] pr-3">
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={cn(
                    'capitalize border',
                    st === 'ongoing' && 'status-ongoing',
                    st === 'planned' && 'status-planned',
                    st === 'completed' && 'status-completed'
                  )}
                >
                  {st}
                </Badge>
                <Badge variant="outline">{typeLabel(p.programType)}</Badge>
              </div>

              <p className="text-muted-foreground leading-relaxed">{p.description}</p>

              <div className="grid gap-2">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {[p.district, p.sector].filter(Boolean).join(', ')}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0" />
                  {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                </p>
                {p.fieldManager && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Field manager:{' '}
                      <span className="text-foreground font-medium">{p.fieldManager.name}</span>
                    </span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <Users className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-semibold">{assigned}</p>
                  <p className="text-xs text-muted-foreground">Volunteers assigned</p>
                  <p className="text-xs text-muted-foreground mt-1">Target: {needed}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <HeartHandshake className="w-4 h-4 mx-auto text-accent mb-1" />
                  <p className="text-lg font-semibold">{(p.targetBeneficiaries ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Beneficiaries reached (target)</p>
                </div>
              </div>

              {hrLabels.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Health resources
                  </p>
                  <p className="text-sm">{hrLabels.join(', ')}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Allocated resources
                </p>
                {(p.programResources || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No inventory resources allocated yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(p.programResources || []).map((pr) => {
                      const remaining = Math.max(0, pr.quantityAssigned - pr.quantityUsed);
                      return (
                        <li key={pr.resourceId} className="rounded-md border px-3 py-2 text-xs flex justify-between gap-2">
                          <span className="font-medium">{pr.resource?.name || 'Resource'}</span>
                          <span className="text-muted-foreground shrink-0">
                            {pr.quantityAssigned} assigned · {pr.quantityUsed} used · <strong>{remaining}</strong> left
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> Related tasks
                </p>
                {(p.tasks || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks recorded for this program.</p>
                ) : (
                  <ul className="space-y-2">
                    {(p.tasks || []).slice(0, 12).map((t) => (
                      <li key={t.id} className="rounded-md border px-3 py-2 text-xs">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {t.assignedTo?.name} · {String(t.status).replace('_', ' ')} ·{' '}
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Field reports
                </p>
                {(p.fieldReports || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No field reports yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(p.fieldReports || []).slice(0, 15).map((r) => (
                      <li key={r.id} className="rounded-md border px-3 py-2 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{r.volunteer?.name || 'Volunteer'}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {r.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {r.task?.title || 'Activity'} · {r.beneficiariesCount} beneficiaries ·{' '}
                          {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        {!loading && !p && programId && (
          <p className="text-sm text-muted-foreground py-6 text-center">Could not load program.</p>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramDetailsModal;
