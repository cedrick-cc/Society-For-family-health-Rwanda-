import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTask, getProgram } from '@/services/api';
import type { Program } from '@/lib/api';

type VolunteerOpt = { id: string; name: string };

const getLocalDatetimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  onSaved?: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ open, onOpenChange, programs, onSaved }) => {
  const [programId, setProgramId] = useState('');
  const [volunteers, setVolunteers] = useState<VolunteerOpt[]>([]);
  const [volunteerId, setVolunteerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [loadingVol, setLoadingVol] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProgramId(programs[0]?.id ? String(programs[0].id) : '');
    setVolunteerId('');
    setTitle('');
    setDescription('');
    setDueDate('');
    setLocation('');
    setPriority('MEDIUM');
  }, [open, programs]);

  useEffect(() => {
    if (!open || !programId) {
      setVolunteers([]);
      return;
    }
    let cancelled = false;
    setLoadingVol(true);
    getProgram(programId)
      .then((p: { programVolunteers?: Array<{ volunteer: VolunteerOpt }> }) => {
        if (cancelled) return;
        const list = (p?.programVolunteers || []).map((r) => r.volunteer).filter(Boolean);
        setVolunteers(list);
        setVolunteerId(list[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) setVolunteers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVol(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, programId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId || !volunteerId || !title.trim() || !dueDate) {
      toast.error('Program, volunteer, title, and due date are required.');
      return;
    }
    const selectedDate = new Date(dueDate);
    const now = new Date();
    if (selectedDate < now) {
      toast.error('Due date must be in the future.');
      return;
    }
    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        programId,
        assignedVolunteerId: volunteerId,
        dueDate: new Date(dueDate).toISOString(),
        location: location.trim(),
        priority,
        status: 'PENDING',
      });
      toast.success('Task created.');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Create operational task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Program *</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={String(p.id)} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assigned volunteer *</Label>
            {loadingVol ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading team…
              </div>
            ) : (
              <Select value={volunteerId} onValueChange={setVolunteerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select volunteer" />
                </SelectTrigger>
                <SelectContent>
                  {volunteers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {volunteers.length === 0 && !loadingVol && programId && (
              <p className="text-xs text-muted-foreground">Assign volunteers to this program first.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Due date *</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={getLocalDatetimeString()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site or sector" />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || volunteers.length === 0}>
              {saving ? 'Saving…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskModal;
