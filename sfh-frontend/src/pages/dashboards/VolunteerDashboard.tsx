import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HeartHandshake, MapPin, CheckCircle2, Clock, Calendar, Activity,
  Award, Megaphone, User, ChevronRight, ClipboardList, Inbox, Play, Ban, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import RegisterBeneficiaryModal from '@/components/modals/RegisterBeneficiaryModal';
import ScheduleActivityModal from '@/components/modals/ScheduleActivityModal';
import CalendarModal from '@/components/modals/CalendarModal';
import SubmitFieldReportModal from '@/components/modals/SubmitFieldReportModal';
import ViewFieldReportModal from '@/components/modals/ViewFieldReportModal';
import RecentFieldReports from '@/components/volunteer/RecentFieldReports';
import AnnouncementsCard from '@/components/AnnouncementsCard';
import { type FieldReport } from '@/types/fieldReport';
import { type Program, type Task, mapApiFieldReportToUI } from '@/lib/api';
import { getVolunteerDashboard, updateTask } from '@/services/api';
import { mapApiProgramToUI, mapApiTaskToUI } from '@/lib/entityMappers';
import type { ApiProgram } from '@/lib/entityMappers';
import { toast } from 'sonner';

interface RecentBeneficiary {
  name: string; service: string; date: string; status: 'completed' | 'follow-up';
}
interface Badge { name: string; icon: string; earned: boolean; }

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

const typeIcons: Record<string, React.ElementType> = {
  visit: MapPin, registration: HeartHandshake, outreach: Megaphone, report: ClipboardList,
};
const typeColors: Record<string, string> = {
  visit: 'text-primary bg-primary/10', registration: 'text-secondary bg-secondary/10',
  outreach: 'text-accent bg-accent/10', report: 'text-info bg-info/10',
};

const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFieldReport, setShowFieldReport] = useState(false);
  const [viewReport, setViewReport] = useState<FieldReport | null>(null);
  const [showViewReport, setShowViewReport] = useState(false);

  // Backend-driven state — starts empty.
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [recentBeneficiaries] = useState<RecentBeneficiary[]>([]);
  const [badges] = useState<Badge[]>([]);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const beneficiariesThisMonth = myPrograms.reduce((acc, p) => acc + (p.beneficiaries || 0), 0);
  const daysActive = 0;
  const monthlyGoal = 100;
  const reloadDashboard = useCallback(() => {
    getVolunteerDashboard()
      .then((d: { programs?: ApiProgram[]; tasks?: unknown[]; reports?: unknown[] }) => {
        const progs = (d.programs || []).map((p) => mapApiProgramToUI(p) as Program);
        setMyPrograms(progs);
        setMyTasks((d.tasks || []).map((t) => mapApiTaskToUI(t as never) as Task));
        const reps = (d.reports || []).map((r) => mapApiFieldReportToUI(r as Record<string, unknown>));
        setFieldReports(reps as FieldReport[]);
      })
      .catch(() => {
        setMyPrograms([]);
        setMyTasks([]);
        setFieldReports([]);
      });
  }, []);

  useEffect(() => {
    reloadDashboard();
  }, [reloadDashboard]);

  const handleReportSubmit = (report: FieldReport) => {
    setFieldReports((prev) => [report, ...prev]);
  };

  const handleViewReport = (report: FieldReport) => {
    setViewReport(report);
    setShowViewReport(true);
  };

  const runTaskUpdate = async (id: string, payload: Record<string, unknown>) => {
    setTaskBusyId(id);
    try {
      await updateTask(id, payload);
      toast.success('Task updated.');
      await reloadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update task.');
    } finally {
      setTaskBusyId(null);
    }
  };

  const openComplete = (id: string) => {
    setCompleteId(id);
    setCompleteNotes('');
    setCompleteOpen(true);
  };

  const confirmComplete = async () => {
    if (!completeId) return;
    await runTaskUpdate(completeId, { status: 'COMPLETED', completionNotes: completeNotes.trim() });
    setCompleteOpen(false);
    setCompleteId(null);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    await runTaskUpdate(cancelId, { status: 'CANCELLED' });
    setCancelOpen(false);
    setCancelId(null);
  };

  const completedToday = myTasks.filter((t) => t.done).length;
  const totalToday = myTasks.length;
  const completion = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const goalProgress = monthlyGoal > 0 ? Math.round((beneficiariesThisMonth / monthlyGoal) * 100) : 0;

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
        {/* Hero */}
        <motion.div variants={item}>
          <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white" />
              <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full bg-white" />
            </div>
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold border border-white/30">
                    Volunteer / Field Staff
                  </span>
                </div>
                <h1 className="text-2xl font-display font-bold">
                  Hello, {user?.name?.split(' ')[0] || 'User'}! 👋
                </h1>
                <p className="text-white/80 mt-1 text-sm">
                  {user?.department} · You've helped <span className="text-white font-bold">{beneficiariesThisMonth} people</span> this month.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{beneficiariesThisMonth}</p>
                    <p className="text-xs text-white/70">Beneficiaries</p>
                  </div>
                  <div className="w-px h-8 bg-white/30" />
                  <div className="text-center">
                    <p className="text-2xl font-bold">{daysActive}</p>
                    <p className="text-xs text-white/70">Days Active</p>
                  </div>
                  <div className="w-px h-8 bg-white/30" />
                  <div className="text-center">
                    <p className="text-2xl font-bold">{fieldReports.length}</p>
                    <p className="text-xs text-white/70">Reports</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-2">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                  <HeartHandshake className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            <div className="relative mt-5">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-white/80">Monthly Goal Progress</span>
                <span className="font-bold">{beneficiariesThisMonth} / {monthlyGoal} beneficiaries</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5">
                <div className="h-2.5 rounded-full bg-white/90 transition-all" style={{ width: `${goalProgress}%` }} />
              </div>
              <p className="text-white/70 text-xs mt-1">
                {monthlyGoal - beneficiariesThisMonth > 0
                  ? `${monthlyGoal - beneficiariesThisMonth} more to reach your monthly target 🎯`
                  : 'Goal reached! 🎉'}
              </p>
            </div>
          </div>
        </motion.div>

        {myPrograms.length > 0 && (
          <motion.div variants={item}>
            <Card className="sfh-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  My assigned programs
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myPrograms.map((p) => (
                  <div key={String(p.id)} className="p-4 rounded-xl bg-muted/40 border border-border/60">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.type}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {p.location}
                    </p>
                    <p className="text-xs mt-2">
                      <span className="text-muted-foreground">Status:</span>{' '}
                      <span className="capitalize font-medium">{p.status}</span>
                    </p>
                    {p.fieldManagerName && (
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">Field manager:</span> {p.fieldManagerName}
                      </p>
                    )}
                    {p.healthResourceLabels && p.healthResourceLabels.length > 0 && (
                      <p className="text-xs mt-2 text-muted-foreground line-clamp-2">
                        Resources: {p.healthResourceLabels.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Today's tasks + Recent beneficiaries */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="sfh-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Today's Tasks
                <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {completedToday}/{totalToday}
                </span>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowSchedule(true)}>
                + Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {totalToday > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Daily completion</span>
                    <span className="font-semibold text-foreground">{completion}%</span>
                  </div>
                  <Progress value={completion} className="h-2" />
                </div>
              )}
              {totalToday === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No tasks assigned yet"
                  description="Tasks assigned to you will appear here."
                  compact
                />
              ) : (
                <div className="space-y-3">
                  {myTasks.map((t) => {
                    const Icon = typeIcons[t.type] || Activity;
                    const st = String(t.rawStatus || 'PENDING').toUpperCase();
                    const busy = taskBusyId === String(t.id);
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'flex flex-col gap-3 p-3 rounded-xl transition-colors border',
                          t.cancelled ? 'bg-destructive/5 border-destructive/25 opacity-90'
                            : t.done ? 'bg-muted/20 opacity-70 border-border'
                            : 'bg-muted/40 hover:bg-muted/60 border-transparent'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeColors[t.type])}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={cn('text-sm font-medium', (t.done || t.cancelled) && 'line-through text-muted-foreground')}>
                                {t.task}
                              </p>
                              <Badge variant="outline" className={cn(
                                'text-[10px] font-bold uppercase',
                                st === 'IN_PROGRESS' && 'bg-primary/10 text-primary border-primary/20',
                                st === 'COMPLETED' && 'bg-success/10 text-success border-success/20',
                                st === 'CANCELLED' && 'bg-destructive/10 text-destructive border-destructive/20',
                                st === 'PENDING' && 'bg-muted text-muted-foreground border-border',
                              )}>
                                {st.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">Assigned by: {t.assignedBy}</p>
                            {t.programTitle ? (
                              <p className="text-xs text-muted-foreground mt-0.5">Program: {t.programTitle}</p>
                            ) : null}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.time}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>
                            </div>
                            <div className="mt-2 max-w-xs">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                                <span>Progress</span>
                                <span>{t.progress ?? 0}%</span>
                              </div>
                              <Progress value={Math.min(100, Math.max(0, t.progress ?? 0))} className="h-1.5" />
                            </div>
                            {t.completionNotes ? (
                              <p className="text-xs mt-2 text-muted-foreground bg-background/50 rounded-md px-2 py-1 border">
                                Notes: {t.completionNotes}
                              </p>
                            ) : null}
                          </div>
                          {busy ? <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 mt-1" /> : null}
                        </div>
                        {!t.done && !t.cancelled ? (
                          <div className="flex flex-wrap gap-2 pl-11">
                            {st === 'PENDING' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 gap-1"
                                disabled={busy}
                                onClick={() => runTaskUpdate(String(t.id), { status: 'IN_PROGRESS' })}
                              >
                                <Play className="w-3.5 h-3.5" /> Start task
                              </Button>
                            ) : null}
                            {(st === 'PENDING' || st === 'IN_PROGRESS') ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 gap-1"
                                  disabled={busy}
                                  onClick={() => openComplete(String(t.id))}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 text-destructive border-destructive/30"
                                  disabled={busy}
                                  onClick={() => {
                                    setCancelId(String(t.id));
                                    setCancelOpen(true);
                                  }}
                                >
                                  <Ban className="w-3.5 h-3.5" /> Cancel task
                                </Button>
                              </>
                            ) : null}
                          </div>
                        ) : t.done ? (
                          <div className="pl-11 flex items-center gap-1 text-xs text-success font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </div>
                        ) : (
                          <div className="pl-11 flex items-center gap-1 text-xs text-destructive font-medium">
                            <Ban className="w-4 h-4" /> Cancelled
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-secondary" /> Recent Beneficiaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentBeneficiaries.length === 0 ? (
                <EmptyState
                  icon={HeartHandshake}
                  title="No beneficiaries yet"
                  description="Register your first beneficiary to get started."
                  compact
                />
              ) : (
                <div className="space-y-3 mb-4">
                  {recentBeneficiaries.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.service} · {b.date}</p>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs border font-medium flex-shrink-0',
                        b.status === 'completed' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20')}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full mt-4" size="sm" onClick={() => setShowRegister(true)}>
                <HeartHandshake className="w-4 h-4" /> Register New Beneficiary
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Announcements + Badges + Quick Actions */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnnouncementsCard compact />

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-warning" /> My Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <EmptyState icon={Award} title="No achievements yet" description="Complete activities to unlock badges." compact />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((b) => (
                    <div key={b.name} className={cn('p-3 rounded-xl text-center border transition-all',
                      b.earned ? 'bg-primary/5 border-primary/20 hover:border-primary/40' : 'bg-muted/30 border-dashed opacity-50')}>
                      <div className="text-2xl mb-1">{b.icon}</div>
                      <p className="text-xs font-medium leading-tight">{b.name}</p>
                      {!b.earned && <p className="text-xs text-muted-foreground mt-0.5">Locked</p>}
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
            <CardContent className="space-y-2">
              {[
                { label: 'Register Beneficiary', icon: HeartHandshake, color: 'text-primary', action: () => setShowRegister(true) },
                { label: 'Submit Field Report', icon: ClipboardList, color: 'text-info', action: () => setShowFieldReport(true) },
                { label: 'View Schedule', icon: Calendar, color: 'text-secondary', action: () => setShowCalendar(true) },
                { label: 'Schedule Activity', icon: Clock, color: 'text-accent', action: () => setShowSchedule(true) },
              ].map((a) => (
                <Button key={a.label} variant="outline" className="w-full justify-between h-11 px-4" onClick={a.action}>
                  <div className="flex items-center gap-3">
                    <a.icon className={cn('w-4 h-4', a.color)} />
                    <span className="text-sm">{a.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <RecentFieldReports reports={fieldReports} onViewReport={handleViewReport} />
        </motion.div>
      </motion.div>

      <RegisterBeneficiaryModal open={showRegister} onOpenChange={setShowRegister} />
      <ScheduleActivityModal open={showSchedule} onOpenChange={setShowSchedule} />
      <CalendarModal open={showCalendar} onOpenChange={setShowCalendar} />
      <SubmitFieldReportModal
        open={showFieldReport}
        onOpenChange={setShowFieldReport}
        programs={myPrograms}
        tasks={myTasks}
        onSubmit={handleReportSubmit}
      />
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark task complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="vol-task-notes">Completion notes (optional)</Label>
            <Textarea
              id="vol-task-notes"
              placeholder='Example: "Visited 24 households successfully."'
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Back
            </Button>
            <Button onClick={confirmComplete}>Submit completion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your field manager will be notified. You can set the task back to pending later only if reassigned.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep task
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Yes, cancel task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewFieldReportModal open={showViewReport} onOpenChange={setShowViewReport} report={viewReport} />
    </>
  );
};

export default VolunteerDashboard;
