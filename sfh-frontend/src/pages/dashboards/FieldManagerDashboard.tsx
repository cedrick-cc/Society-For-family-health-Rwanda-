import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Users, CheckCircle2, Navigation, Clock, ArrowUpRight,
  Radio, Zap, Package, Plus, ListTodo, Eye, Ban,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import AddVolunteerModal from '@/components/modals/AddVolunteerModal';
import ScheduleActivityModal from '@/components/modals/ScheduleActivityModal';
import AddLocationModal from '@/components/modals/AddLocationModal';
import RegisterBeneficiaryModal from '@/components/modals/RegisterBeneficiaryModal';
import AssignVolunteersModal from '@/components/modals/AssignVolunteersModal';
import CreateTaskModal from '@/components/modals/CreateTaskModal';
import TaskDetailsModal from '@/components/modals/TaskDetailsModal';
import { type Program, type Task } from '@/lib/api';
import {
  getProgramsAsFieldManager,
  getFieldManagerDashboard,
  getManagedTasks,
  updateTask,
  recordResourceUsage,
} from '@/services/api';
import { mapApiProgramToUI, mapApiTaskToUI } from '@/lib/entityMappers';
import type { ApiProgram } from '@/lib/entityMappers';
import { toast } from 'sonner';

interface FieldTeam {
  id: number | string;
  name: string;
  leader: string;
  location: string;
  status: 'active' | 'transit' | 'standby';
  members: number;
  task: string;
  completion: number;
}
interface ProgramResourceRow {
  programId: string;
  resourceId: string;
  resourceName: string;
  programTitle?: string;
  quantityAssigned: number;
  quantityUsed: number;
  remaining: number;
}

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

const statusConfig = {
  active: { label: 'Active', color: 'bg-success/10 text-success border-success/20' },
  transit: { label: 'In Transit', color: 'bg-warning/10 text-warning border-warning/20' },
  standby: { label: 'Standby', color: 'bg-muted text-muted-foreground border-border' },
};

const FieldManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [assignProgramTitle, setAssignProgramTitle] = useState('');
  const [assignVolunteersNeeded, setAssignVolunteersNeeded] = useState(0);

  // Backend-driven state — starts empty.
  const [fieldTeams] = useState<FieldTeam[]>([]);
  const [programResources, setProgramResources] = useState<ProgramResourceRow[]>([]);
  const [usageModal, setUsageModal] = useState<ProgramResourceRow | null>(null);
  const [usageQty, setUsageQty] = useState('');
  const [usageSaving, setUsageSaving] = useState(false);
  const [todayActivities, setTodayActivities] = useState<Task[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [assignedVolunteerCount, setAssignedVolunteerCount] = useState(0);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const loadPrograms = () => {
    getProgramsAsFieldManager()
      .then((raw) => {
        const list = Array.isArray(raw) ? raw : [];
        setMyPrograms(list.map((p: ApiProgram) => mapApiProgramToUI(p) as Program));
      })
      .catch(() => setMyPrograms([]));
  };

  const loadManagedTasks = () => {
    getManagedTasks()
      .then((raw) => {
        const list = Array.isArray(raw) ? raw : [];
        setTodayActivities(list.map((t) => mapApiTaskToUI(t as never) as Task));
      })
      .catch(() => setTodayActivities([]));
  };

  const loadDashboard = () => {
    getFieldManagerDashboard()
      .then((d: { assignedVolunteerCount?: number; programResources?: ProgramResourceRow[] }) => {
        if (typeof d?.assignedVolunteerCount === 'number') setAssignedVolunteerCount(d.assignedVolunteerCount);
        setProgramResources(Array.isArray(d?.programResources) ? d.programResources : []);
      })
      .catch(() => {
        setAssignedVolunteerCount(0);
        setProgramResources([]);
      });
  };

  useEffect(() => {
    loadManagedTasks();
    loadDashboard();
    loadPrograms();
  }, []);

  const submitUsage = async () => {
    if (!usageModal) return;
    const qty = Number(usageQty);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity.');
      return;
    }
    if (qty > usageModal.remaining) {
      toast.error('Usage cannot exceed remaining quantity.');
      return;
    }
    setUsageSaving(true);
    try {
      await recordResourceUsage(usageModal.programId, usageModal.resourceId, qty);
      toast.success('Usage recorded.');
      setUsageModal(null);
      setUsageQty('');
      loadDashboard();
      loadPrograms();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record usage.');
    } finally {
      setUsageSaving(false);
    }
  };

  const openTaskDetail = (t: Task) => {
    setDetailTask(t);
    setTaskDetailOpen(true);
  };

  const fmMarkCompleted = async (id: string) => {
    try {
      await updateTask(id, { status: 'COMPLETED' });
      toast.success('Task marked completed.');
      setTaskDetailOpen(false);
      setDetailTask(null);
      loadManagedTasks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const fmCancelTask = async (id: string) => {
    try {
      await updateTask(id, { status: 'CANCELLED' });
      toast.success('Task cancelled.');
      setTaskDetailOpen(false);
      setDetailTask(null);
      loadManagedTasks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const taskStatusClass = (st?: string) => {
    const s = String(st || 'PENDING').toUpperCase();
    if (s === 'IN_PROGRESS') return 'bg-primary/10 text-primary border-primary/20';
    if (s === 'COMPLETED') return 'bg-success/10 text-success border-success/20';
    if (s === 'CANCELLED') return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  const lowRemaining = programResources.filter((r) => r.remaining <= Math.max(1, r.quantityAssigned * 0.2)).length;

  const totalFieldVolunteers = assignedVolunteerCount || fieldTeams.reduce((acc, t) => acc + t.members, 0);
  const tasksDone = todayActivities.filter((a) => a.done).length;
  const totalTasks = todayActivities.length;

  const activeDeployments = myPrograms.filter((p) => p.status === 'ongoing').length;

  const stats = [
    { title: 'Active deployments', value: String(activeDeployments), sub: `${myPrograms.length} programs assigned`, icon: Radio, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Field Volunteers', value: String(totalFieldVolunteers), sub: totalFieldVolunteers === 0 ? 'None on your programs' : 'Across your assigned programs', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Tasks Completed Today', value: `${tasksDone}/${totalTasks}`, sub: totalTasks > 0 ? `${Math.round((tasksDone / totalTasks) * 100)}% completion` : 'No tasks yet', icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10' },
    { title: 'Program Resources', value: String(programResources.length), sub: lowRemaining > 0 ? `${lowRemaining} low remaining` : 'Tracked on your programs', icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={item} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/20 flex items-center gap-1">
                <Radio className="w-3 h-3" /> Field Manager
              </span>
              <span className="flex items-center gap-1 text-xs text-success">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live Operations
              </span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Field Operations Hub</h1>
            <p className="text-muted-foreground mt-1">
              {user?.name?.split(' ')[0] || 'User'}, you have <span className="text-primary font-semibold">{totalTasks - tasksDone} tasks</span> pending today across your programs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddLocation(true)}>
              <MapPin className="w-4 h-4" /> Add Location
            </Button>
            <Button size="sm" onClick={() => setShowSchedule(true)}>
              <Zap className="w-4 h-4" /> Quick Deploy
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
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" /> Programs assigned to you
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={loadPrograms}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {myPrograms.length === 0 ? (
                <EmptyState
                  icon={Radio}
                  title="No programs assigned"
                  description="When a coordinator assigns you as field manager on a program, it will appear here for volunteer deployment."
                />
              ) : (
                <div className="space-y-3">
                  {myPrograms.map((prog) => (
                    <div key={String(prog.id)} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/10">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{prog.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{prog.type} · {prog.location}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Volunteers: {prog.assignedVolunteerCount ?? 0} / {prog.volunteersNeeded ?? prog.volunteers} assigned
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-shrink-0"
                          onClick={() => {
                            setAssignProgramId(String(prog.id));
                            setAssignProgramTitle(prog.name);
                            setAssignVolunteersNeeded(prog.volunteersNeeded ?? prog.volunteers ?? 0);
                          }}
                        >
                          <Users className="w-3.5 h-3.5 mr-1" />
                          Assign
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full border capitalize',
                          prog.status === 'ongoing' ? 'status-ongoing' : prog.status === 'planned' ? 'status-planned' : 'status-completed',
                        )}>{prog.status}</span>
                        <span>Ends {new Date(prog.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" /> Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayActivities.length === 0 ? (
                <EmptyState icon={Clock} title="No activities scheduled" compact />
              ) : (
                <div className="space-y-3">
                  {todayActivities.map((a, i) => (
                    <div key={a.id ?? i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                          a.done ? 'bg-success/10' : 'bg-primary/10')}>
                          {a.done
                            ? <CheckCircle2 className="w-4 h-4 text-success" />
                            : <Clock className="w-4 h-4 text-primary" />}
                        </div>
                        {i < todayActivities.length - 1 && (
                          <div className={cn('w-0.5 h-6 mt-1', a.done ? 'bg-success/30' : 'bg-border')} />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className={cn('text-sm font-medium', a.done && 'line-through text-muted-foreground')}>{a.task}</p>
                        <p className="text-xs text-muted-foreground">{a.time} · {a.location}</p>
                        <p className="text-xs text-muted-foreground/70">Assigned by: {a.assignedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full mt-2" size="sm" onClick={() => setShowCreateTask(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Create task
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="sfh-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary" /> Assigned volunteer tasks
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={loadManagedTasks}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {todayActivities.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="No tasks to track"
                  description="Create a task for a volunteer on one of your programs to see progress here."
                />
              ) : (
                <div className="space-y-3">
                  {todayActivities.map((t) => (
                    <div
                      key={String(t.id)}
                      className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-xl border bg-muted/20 hover:bg-muted/35 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground">{t.task}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            <span className="text-muted-foreground/80">Volunteer:</span>{' '}
                            {t.assignedToName || '—'}
                          </span>
                          <span>
                            <span className="text-muted-foreground/80">Program:</span> {t.programTitle || '—'}
                          </span>
                          <span>
                            <span className="text-muted-foreground/80">Due:</span> {t.time}
                          </span>
                          <span className="capitalize">
                            <span className="text-muted-foreground/80">Priority:</span> {String(t.priority || 'MEDIUM').toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 max-w-md">
                          <Progress value={Math.min(100, Math.max(0, t.progress ?? 0))} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium w-10 text-right">{t.progress ?? 0}%</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', taskStatusClass(t.rawStatus))}>
                          {String(t.rawStatus || 'PENDING').replace('_', ' ')}
                        </Badge>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openTaskDetail(t)}>
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Button>
                        {t.rawStatus !== 'COMPLETED' && t.rawStatus !== 'CANCELLED' ? (
                          <>
                            <Button size="sm" variant="secondary" className="gap-1" onClick={() => fmMarkCompleted(String(t.id))}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => fmCancelTask(String(t.id))}>
                              <Ban className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="sfh-card md:col-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-warning" /> Resource Usage
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={loadDashboard}>Refresh</Button>
            </CardHeader>
            <CardContent>
              {programResources.length === 0 ? (
                <EmptyState icon={Package} title="No resources assigned" description="Resources allocated to your programs will appear here." compact />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Resource</TableHead>
                        <TableHead className="text-xs text-right">Assigned</TableHead>
                        <TableHead className="text-xs text-right">Used</TableHead>
                        <TableHead className="text-xs text-right">Left</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programResources.map((r) => (
                        <TableRow key={`${r.programId}-${r.resourceId}`}>
                          <TableCell className="text-xs font-medium">
                            {r.resourceName}
                            {r.programTitle && <span className="block text-muted-foreground font-normal">{r.programTitle}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right">{r.quantityAssigned}</TableCell>
                          <TableCell className="text-xs text-right">{r.quantityUsed}</TableCell>
                          <TableCell className={cn('text-xs text-right font-semibold', r.remaining === 0 && 'text-destructive')}>{r.remaining}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={r.remaining <= 0}
                              onClick={() => { setUsageModal(r); setUsageQty(''); }}
                            >
                              Record
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add Volunteer', icon: Users, color: 'text-primary', action: () => setShowAddVolunteer(true) },
                { label: 'Register Beneficiary', icon: ArrowUpRight, color: 'text-secondary', action: () => setShowRegister(true) },
                { label: 'Add Location', icon: MapPin, color: 'text-accent', action: () => setShowAddLocation(true) },
                { label: 'Schedule Task', icon: Clock, color: 'text-info', action: () => setShowCreateTask(true) },
              ].map((a) => (
                <Button key={a.label} variant="outline" className="h-auto py-4 flex-col gap-2" onClick={a.action}>
                  <a.icon className={cn('w-5 h-5', a.color)} />
                  <span className="text-xs text-center leading-tight">{a.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <AddVolunteerModal open={showAddVolunteer} onOpenChange={setShowAddVolunteer} />
      <ScheduleActivityModal open={showSchedule} onOpenChange={setShowSchedule} />
      <AddLocationModal open={showAddLocation} onOpenChange={setShowAddLocation} />
      <RegisterBeneficiaryModal open={showRegister} onOpenChange={setShowRegister} />
      <AssignVolunteersModal
        open={!!assignProgramId}
        onOpenChange={(o) => !o && setAssignProgramId(null)}
        programId={assignProgramId}
        programTitle={assignProgramTitle}
        volunteersNeeded={assignVolunteersNeeded}
        onSaved={loadPrograms}
      />
      <CreateTaskModal
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        programs={myPrograms}
        onSaved={() => {
          loadManagedTasks();
          loadDashboard();
        }}
      />
      <Dialog open={!!usageModal} onOpenChange={(o) => !o && setUsageModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Usage</DialogTitle>
          </DialogHeader>
          {usageModal && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {usageModal.resourceName} — up to <strong>{usageModal.remaining}</strong> remaining
              </p>
              <div className="space-y-2">
                <Label htmlFor="usage-qty">Quantity used</Label>
                <Input
                  id="usage-qty"
                  type="number"
                  min={1}
                  max={usageModal.remaining}
                  value={usageQty}
                  onChange={(e) => setUsageQty(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageModal(null)}>Cancel</Button>
            <Button onClick={submitUsage} disabled={usageSaving}>{usageSaving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailsModal
        open={taskDetailOpen}
        onOpenChange={(o) => {
          setTaskDetailOpen(o);
          if (!o) setDetailTask(null);
        }}
        task={detailTask}
        onMarkCompleted={fmMarkCompleted}
        onCancelTask={fmCancelTask}
      />
    </>
  );
};

export default FieldManagerDashboard;
