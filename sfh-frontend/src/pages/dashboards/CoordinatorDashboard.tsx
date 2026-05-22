import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarRange, Users, HeartHandshake, ArrowUpRight,
  CheckCircle2, Clock, Plus, ListChecks, BarChart3, MapPin,
  ClipboardList, Check, X, Eye, FileText, TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import CalendarModal from '@/components/modals/CalendarModal';
import CreateProgramModal from '@/components/modals/CreateProgramModal';
import ScheduleActivityModal from '@/components/modals/ScheduleActivityModal';
import GenerateReportModal from '@/components/modals/GenerateReportModal';
import ViewFieldReportModal from '@/components/modals/ViewFieldReportModal';
import type { FieldReport } from '@/types/fieldReport';
import {
  fetchPrograms,
  fetchReports,
  fetchRecentFieldReports,
  fetchDashboardStats,
  fetchProgramsAttention,
  type DashboardStats,
  type Program,
  type ProgramAttentionItem,
} from '@/lib/api';
import { reviewFieldReport } from '@/services/api';
import { toast } from 'sonner';

interface PendingFieldReport extends FieldReport {
  volunteerName: string;
}

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [showScheduleActivity, setShowScheduleActivity] = useState(false);
  const [showGenerateReport, setShowGenerateReport] = useState(false);

  // Backend-driven state — starts empty.
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingFieldReport[]>([]);
  const [recentReports, setRecentReports] = useState<PendingFieldReport[]>([]);
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [attentionItems, setAttentionItems] = useState<ProgramAttentionItem[]>([]);
  const [viewReport, setViewReport] = useState<FieldReport | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const reloadPrograms = useCallback(() => {
    fetchPrograms().then(setPrograms).catch(() => setPrograms([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPrograms(),
      fetchReports(),
      fetchRecentFieldReports(),
      fetchDashboardStats(),
      fetchProgramsAttention(),
    ])
      .then(([progs, reports, recent, d, attention]) => {
        if (cancelled) return;
        setPrograms(progs);
        setPendingReports(reports as PendingFieldReport[]);
        setRecentReports((recent as PendingFieldReport[]).slice(0, 8));
        setDash(d as DashboardStats);
        setAttentionItems(attention);
      })
      .catch(() => {
        if (!cancelled) {
          setPrograms([]);
          setPendingReports([]);
          setRecentReports([]);
          setDash(null);
          setAttentionItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await reviewFieldReport(id, 'APPROVED', '');
      toast.success('Report approved.');
      setPendingReports((prev) => prev.filter((r) => r.id !== id));
      const recent = await fetchRecentFieldReports();
      setRecentReports((recent as PendingFieldReport[]).slice(0, 8));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed.');
    }
  };
  const openReject = (id: string) => {
    setRejectTargetId(id);
    setRejectNotes('');
    setRejectOpen(true);
  };
  const confirmReject = async () => {
    if (!rejectTargetId) return;
    try {
      await reviewFieldReport(rejectTargetId, 'REJECTED', rejectNotes);
      toast.success('Report rejected.');
      setRejectOpen(false);
      setRejectTargetId(null);
      setPendingReports((prev) => prev.filter((r) => r.id !== rejectTargetId));
      const recent = await fetchRecentFieldReports();
      setRecentReports((recent as PendingFieldReport[]).slice(0, 8));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed.');
    }
  };

  const assignedOnPrograms = programs.reduce((acc, p) => acc + (p.assignedVolunteerCount ?? 0), 0);
  const totalVolunteers =
    assignedOnPrograms > 0 ? assignedOnPrograms : dash?.activeVolunteers ?? 0;
  const totalBeneficiaries =
    dash?.totalBeneficiaries ??
    programs.reduce((acc, p) => acc + (p.beneficiaries || 0), 0);
  const programsRequiringAttention = programs.filter((p) => p.status === 'ongoing' && p.progress < 50).length;

  const stats = useMemo(
    () => [
      {
        title: 'Programs Under Management',
        value: String(programs.length),
        sub: programsRequiringAttention > 0 ? `${programsRequiringAttention} require attention` : 'All on track',
        icon: CalendarRange,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        title: 'Volunteers Coordinated',
        value: String(totalVolunteers),
        sub: totalVolunteers === 0 ? 'No volunteers yet' : 'Active volunteers (system)',
        icon: Users,
        color: 'text-secondary',
        bg: 'bg-secondary/10',
      },
      {
        title: 'Beneficiaries',
        value: totalBeneficiaries.toLocaleString(),
        sub: totalBeneficiaries === 0 ? 'No data yet' : 'Registered in system',
        icon: HeartHandshake,
        color: 'text-accent',
        bg: 'bg-accent/10',
      },
      {
        title: 'Reports Awaiting Review',
        value: String(pendingReports.length),
        sub: pendingReports.length > 0 ? `${pendingReports.length} pending` : 'All clear',
        icon: ListChecks,
        color: 'text-warning',
        bg: 'bg-warning/10',
      },
    ],
    [programs, programsRequiringAttention, totalVolunteers, totalBeneficiaries, pendingReports]
  );

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={item} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20">
                Program Coordinator
              </span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Program Command Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Good morning, {user?.name?.split(' ')[0] || 'User'}.{' '}
              {pendingReports.length > 0 ? (
                <>You have <span className="text-warning font-semibold">{pendingReports.length} reports awaiting review</span> today.</>
              ) : (
                <>No pending reports right now.</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCalendar(true)}>
              <Clock className="w-4 h-4" /> Schedule
            </Button>
            <Button size="sm" onClick={() => setShowCreateProgram(true)}>
              <Plus className="w-4 h-4" /> New Program
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <motion.div key={s.title} whileHover={{ y: -4 }} className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium leading-tight">{s.title}</p>
                  <p className="text-3xl font-display font-bold mt-2">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                  <s.icon className={cn('w-5 h-5', s.color)} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="sfh-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Programs Requiring Attention</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" onClick={() => setShowGenerateReport(true)}>
                <BarChart3 className="w-3.5 h-3.5" /> Reports
              </Button>
            </CardHeader>
            <CardContent className="max-h-[320px] overflow-y-auto space-y-3">
              {attentionItems.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="All programs on track"
                  description="No pending reports, resource shortages, missing volunteers, or overdue tasks detected."
                  compact
                />
              ) : (
                attentionItems.map((item) => (
                  <div
                    key={item.programId}
                    className="p-3 rounded-xl bg-muted/40 border border-border hover:border-warning/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold">{item.programTitle}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {item.district}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs shrink-0">
                        {item.status}
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {item.reasons.map((r) => (
                        <li
                          key={r.type}
                          className={cn(
                            'text-xs flex items-center gap-1.5',
                            r.severity === 'critical' ? 'text-destructive font-medium' : 'text-warning'
                          )}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-warning" />
                Reports Awaiting Review
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Review and approve field reports submitted by volunteers.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingReports.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No pending reports" description="Reports submitted by volunteers will appear here." compact />
              ) : (
                pendingReports.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{r.taskName}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.volunteerName}</p>
                      <p className="flex items-center gap-1"><FileText className="w-3 h-3" /> {r.program}</p>
                      <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location}</p>
                      <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.submittedAt}</p>
                      {r.beneficiariesServed > 0 && (
                        <p className="flex items-center gap-1"><HeartHandshake className="w-3 h-3" /> {r.beneficiariesServed} beneficiaries</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleApprove(r.id)} className="flex-1 text-xs py-1.5 rounded-lg bg-success/10 text-success font-medium hover:bg-success/20 transition-colors flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => openReject(r.id)} className="flex-1 text-xs py-1.5 rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-1">
                        <X className="w-3 h-3" /> Reject
                      </button>
                      <button onClick={() => setViewReport(r)} className="text-xs py-1.5 px-2 rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardContent className="pt-0 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent submissions</p>
              {recentReports.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent activity.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {recentReports.map((r) => (
                    <li key={r.id} className="text-xs text-muted-foreground flex justify-between gap-2">
                      <span className="truncate">{r.volunteerName} — {r.program}</span>
                      <span className="shrink-0 text-[10px] uppercase">{r.reviewStatus || 'pending'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="sfh-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">My Programs</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={() => setShowCreateProgram(true)}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {programs.length === 0 ? (
                <EmptyState
                  icon={CalendarRange}
                  title="No programs yet"
                  description="Create your first program to get started."
                  action={
                    <Button size="sm" onClick={() => setShowCreateProgram(true)}>
                      <Plus className="w-4 h-4" /> Create Program
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {programs.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs border font-medium flex-shrink-0',
                            p.status === 'ongoing' ? 'status-ongoing' : p.status === 'planned' ? 'status-planned' : 'status-completed')}>
                            {p.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span><Users className="w-3 h-3 inline mr-1" />{p.volunteers} team</span>
                          <span><Clock className="w-3 h-3 inline mr-1" />Due {new Date(p.endDate).toLocaleDateString()}</span>
                        </div>
                        {p.progress > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={p.progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-medium w-8 text-right">{p.progress}%</span>
                          </div>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              {[
                { label: 'Create Program', icon: CalendarRange, color: 'text-primary', action: () => setShowCreateProgram(true) },
                { label: 'Schedule Activity', icon: Clock, action: () => setShowScheduleActivity(true), color: 'text-secondary' },
                { label: 'View Calendar', icon: CalendarRange, action: () => setShowCalendar(true), color: 'text-accent' },
                { label: 'Generate Report', icon: TrendingUp, action: () => setShowGenerateReport(true), color: 'text-info' },
              ].map((a) => (
                <Button key={a.label} variant="outline" className="justify-start gap-3 h-11" onClick={a.action}>
                  <a.icon className={cn('w-4 h-4', a.color)} />
                  <span className="text-sm">{a.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <CalendarModal open={showCalendar} onOpenChange={setShowCalendar} />
      <CreateProgramModal
        open={showCreateProgram}
        onOpenChange={setShowCreateProgram}
        onCompleted={reloadPrograms}
      />
      <ScheduleActivityModal
        open={showScheduleActivity}
        onOpenChange={setShowScheduleActivity}
        onScheduled={() => setShowCalendar(true)}
      />
      <GenerateReportModal open={showGenerateReport} onOpenChange={setShowGenerateReport} />
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject field report</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-notes">Feedback for the volunteer (optional)</Label>
            <Textarea
              id="reject-notes"
              placeholder="Explain what needs to change or why the report cannot be approved."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ViewFieldReportModal open={!!viewReport} onOpenChange={() => setViewReport(null)} report={viewReport} />
    </>
  );
};

export default CoordinatorDashboard;
