import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Award, ClipboardList, FileText, Calendar, User } from 'lucide-react';
import { getVolunteerDetail } from '@/services/api';
import UserAvatar from '@/components/UserAvatar';

export type VolunteerProfileData = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  phoneNumber?: string | null;
  nationalId?: string | null;
  profileImage?: string | null;
  volunteerDistrict?: string | null;
  status: string;
  volunteerOpsStatus?: string;
  skills: string[];
  certifications: string[];
  programsParticipated?: number;
  programsAssigned?: number;
  programsCompleted?: number;
  fieldReportsSubmitted?: number;
  beneficiariesServed?: number;
  registrationDate?: string;
  joinDate?: string;
  bio?: string | null;
  yearsOfExperience?: number;
  assignedPrograms?: Array<{ id: string; title: string; status: string; district: string }>;
  completedTasks?: Array<{ id: string; title: string }>;
  fieldReports?: Array<{
    id: string;
    status: string;
    location: string;
    programTitle?: string;
    beneficiariesCount: number;
    notes?: string;
    createdAt: string;
  }>;
  recentActivities?: Array<{ action: string; description: string; at: string }>;
};

interface VolunteerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteerId: string | null;
}

const VolunteerProfileModal: React.FC<VolunteerProfileModalProps> = ({
  open,
  onOpenChange,
  volunteerId,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VolunteerProfileData | null>(null);

  useEffect(() => {
    if (!open || !volunteerId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getVolunteerDetail(volunteerId)
      .then((row) => {
        if (!cancelled) setData(row as VolunteerProfileData);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, volunteerId]);

  const phone = data?.phoneNumber ?? data?.phone;
  const registrationDate = data?.registrationDate ?? data?.joinDate;
  const programsAssigned = data?.programsAssigned ?? data?.assignedPrograms?.length ?? 0;
  const programsCompleted = data?.programsCompleted ?? 0;
  const fieldReportsCount = data?.fieldReportsSubmitted ?? data?.fieldReports?.length ?? 0;
  const served = data?.beneficiariesServed ?? 0;

  const avatarUser = data
    ? {
        id: data.id,
        name: data.name,
        email: data.email,
        role: 'volunteer' as const,
        department: '',
        profileImage: data.profileImage || undefined,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle className="text-base font-display pr-8">
            {loading ? 'Volunteer profile' : data?.name || 'Volunteer'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Volunteer profile details including contact information, programs, tasks, and field reports.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-10 shrink-0">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && data && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5">
            <div className="space-y-4 text-sm pb-5">
              <div className="flex items-center gap-4">
                {avatarUser && (
                  <UserAvatar
                    user={avatarUser}
                    sizeClass="h-14 w-14"
                    className="ring-2 ring-primary/20"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">{String(data.status).toLowerCase()}</Badge>
                  {data.volunteerOpsStatus && (
                    <Badge variant="secondary" className="capitalize">
                      {String(data.volunteerOpsStatus).replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Personal information
                </p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted-foreground shrink-0">Full name</dt>
                    <dd className="font-medium text-right">{data.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted-foreground shrink-0">Email</dt>
                    <dd className="font-medium text-right break-all">{data.email}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted-foreground shrink-0">Phone number</dt>
                    <dd className="font-medium text-right">{phone || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted-foreground shrink-0">National ID</dt>
                    <dd className="font-medium text-right">{data.nationalId || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted-foreground shrink-0">District</dt>
                    <dd className="font-medium text-right">{data.volunteerDistrict || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted-foreground shrink-0">Status</dt>
                    <dd className="font-medium text-right capitalize">{String(data.status).toLowerCase()}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-1">
                    <dt className="text-muted-foreground shrink-0">Experience</dt>
                    <dd className="font-medium text-right">
                      {(data.yearsOfExperience ?? 0) > 0
                        ? `${data.yearsOfExperience} ${data.yearsOfExperience === 1 ? 'year' : 'years'}`
                        : '—'}
                    </dd>
                  </div>
                  {registrationDate && (
                    <div className="flex justify-between gap-4 pt-1 text-xs text-muted-foreground">
                      <dt className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Registered
                      </dt>
                      <dd>{new Date(registrationDate).toLocaleDateString()}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-semibold">{programsAssigned}</p>
                  <p className="text-xs text-muted-foreground">Assigned</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-semibold">{programsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-semibold">{fieldReportsCount}</p>
                  <p className="text-xs text-muted-foreground">Reports</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-semibold">{served}</p>
                  <p className="text-xs text-muted-foreground">Served</p>
                </div>
              </div>

              {data.bio && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Bio</p>
                  <p className="text-sm text-muted-foreground">{data.bio}</p>
                </div>
              )}

              {data.skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.certifications?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Certifications
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {data.certifications.map((c) => (
                      <Badge key={c} className="text-xs font-normal">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Assigned programs</p>
                {(data.assignedPrograms || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No program assignments.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(data.assignedPrograms || []).map((p) => (
                      <li key={p.id} className="rounded-md border px-3 py-2 text-xs">
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground"> · {p.district} · {p.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> Completed tasks
                </p>
                {(data.completedTasks || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {(data.completedTasks || []).slice(0, 8).map((t) => (
                      <li key={t.id} className="text-muted-foreground">• {t.title}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Field reports ({fieldReportsCount})
                </p>
                {(data.fieldReports || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No reports submitted.</p>
                ) : (
                  <ul className="space-y-2">
                    {(data.fieldReports || []).slice(0, 10).map((r) => (
                      <li key={r.id} className="rounded-md border px-3 py-2 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{r.programTitle || 'Program'}</span>
                          <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {r.location} · {r.beneficiariesCount} reached ·{' '}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {(data.recentActivities || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent activity</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {(data.recentActivities || []).slice(0, 5).map((a, i) => (
                      <li key={i}>{a.description || a.action} · {new Date(a.at).toLocaleString()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t shrink-0 flex justify-end bg-background">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VolunteerProfileModal;
