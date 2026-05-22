import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, MapPin, User, Calendar, Flag, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/api';

export interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onMarkCompleted?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
}

const statusBadge = (st?: string) => {
  const s = String(st || 'PENDING').toUpperCase();
  const map: Record<string, string> = {
    PENDING: 'bg-muted text-muted-foreground border-border',
    IN_PROGRESS: 'bg-primary/10 text-primary border-primary/20',
    COMPLETED: 'bg-success/10 text-success border-success/20',
    CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return map[s] || map.PENDING;
};

const priorityBadge = (p?: string) => {
  const x = String(p || 'MEDIUM').toUpperCase();
  if (x === 'HIGH') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (x === 'LOW') return 'bg-muted text-muted-foreground border-border';
  return 'bg-warning/10 text-warning border-warning/20';
};

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  open,
  onOpenChange,
  task,
  onMarkCompleted,
  onCancelTask,
}) => {
  if (!task) return null;

  const history = [...(task.progressHistory || [])].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[min(90vh,100dvh)] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-start gap-3 text-xl font-display pr-8">
            <ClipboardList className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <span className="leading-tight">{task.task}</span>
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={cn('text-xs font-semibold', statusBadge(task.rawStatus))}>
              {String(task.rawStatus || 'PENDING').replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={cn('text-xs font-semibold', priorityBadge(task.priority))}>
              Priority: {String(task.priority || 'MEDIUM')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.progress ?? 0}% complete
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3" /> Volunteer
                </p>
                <p className="font-medium">{task.assignedToName || '—'}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3" /> Assigned by
                </p>
                <p className="font-medium">{task.assignedBy}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program</p>
                <p className="font-medium">{task.programTitle || '—'}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> District / location
                </p>
                <p className="font-medium">{task.location}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due date
                </p>
                <p className="font-medium">{task.time}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Created
                </p>
                <p className="font-medium">
                  {task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm leading-relaxed rounded-xl bg-muted/40 p-4 border">
                {task.description?.trim() ? task.description : 'No description provided.'}
              </p>
            </div>

            {task.completionNotes ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Completion notes
                </p>
                <p className="text-sm leading-relaxed rounded-xl bg-secondary/5 border border-secondary/20 p-4">
                  {task.completionNotes}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Progress</p>
              <Progress value={Math.min(100, Math.max(0, task.progress ?? 0))} className="h-2" />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <History className="w-3 h-3" /> Progress timeline
              </p>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="space-y-3 border-l-2 border-primary/20 pl-4 ml-1">
                  {history.map((h, idx) => (
                    <li key={`${h.at}-${idx}`} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.at).toLocaleString()}
                      </p>
                      <p className="text-sm font-medium">
                        {h.userName || 'User'} — {String(h.status || '').replace('_', ' ')} ({h.progress ?? 0}%)
                      </p>
                      {h.note ? <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onCancelTask && task.rawStatus !== 'CANCELLED' && task.rawStatus !== 'COMPLETED' ? (
            <Button variant="destructive" onClick={() => onCancelTask(String(task.id))}>
              Cancel task
            </Button>
          ) : null}
          {onMarkCompleted && task.rawStatus !== 'COMPLETED' && task.rawStatus !== 'CANCELLED' ? (
            <Button onClick={() => onMarkCompleted(String(task.id))}>Mark completed</Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
