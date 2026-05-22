import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Clock, MapPin, Users, FileText, Loader2 } from 'lucide-react';
import { createScheduledActivity, getPrograms, getVolunteersList } from '@/services/api';
import { toast } from 'sonner';

const districts = [
  'Kigali City', 'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana',
  'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo', 'Gisagara', 'Huye', 'Kamonyi', 'Muhanga',
  'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango', 'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke',
  'Rubavu', 'Rusizi', 'Rutsiro',
];

interface ScheduleActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

const ScheduleActivityModal: React.FC<ScheduleActivityModalProps> = ({ open, onOpenChange, onScheduled }) => {
  const [programs, setPrograms] = useState<Array<{ id: string; title: string; district: string }>>([]);
  const [volunteers, setVolunteers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    programId: '',
    date: undefined as Date | undefined,
    time: '',
    district: '',
    volunteerIds: [] as string[],
    description: '',
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([getPrograms(), getVolunteersList({ status: 'ACTIVE' })])
      .then(([progs, vols]) => {
        setPrograms(
          (Array.isArray(progs) ? progs : []).map((p: { id: string; title?: string; name?: string; district: string }) => ({
            id: p.id,
            title: p.title || p.name || 'Program',
            district: p.district,
          }))
        );
        setVolunteers(
          (Array.isArray(vols) ? vols : []).map((v: { id: string; name: string }) => ({
            id: v.id,
            name: v.name,
          }))
        );
      })
      .catch(() => {
        setPrograms([]);
        setVolunteers([]);
      });
  }, [open]);

  const updateFormData = (field: string, value: string | Date | undefined | string[]) => {
    setFormData({ ...formData, [field]: value });
  };

  const toggleVolunteer = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      volunteerIds: prev.volunteerIds.includes(id)
        ? prev.volunteerIds.filter((v) => v !== id)
        : [...prev.volunteerIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date || !formData.time || !formData.district) {
      toast.error('Title, date, time, and district are required.');
      return;
    }
    setLoading(true);
    try {
      await createScheduledActivity({
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date.toISOString(),
        time: formData.time,
        district: formData.district,
        programId: formData.programId || null,
        volunteerIds: formData.volunteerIds,
      });
      toast.success('Activity scheduled. Volunteers will be notified.');
      onOpenChange(false);
      onScheduled?.();
      setFormData({
        title: '',
        programId: '',
        date: undefined,
        time: '',
        district: '',
        volunteerIds: [],
        description: '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <CalendarIcon className="w-5 h-5 text-accent" />
            Schedule Activity
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Activity Title *</Label>
            <Input
              placeholder="e.g., CHW field visit - Gasabo"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Related Program</Label>
              <Select
                value={formData.programId}
                onValueChange={(v) => {
                  updateFormData('programId', v);
                  const prog = programs.find((p) => p.id === v);
                  if (prog?.district) updateFormData('district', prog.district);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>District *</Label>
              <Select value={formData.district} onValueChange={(v) => updateFormData('district', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => updateFormData('date', date)}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time *
            </Label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => updateFormData('time', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assign Volunteers
            </Label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
              {volunteers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No active volunteers available.</p>
              ) : (
                volunteers.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.volunteerIds.includes(v.id)}
                      onChange={() => toggleVolunteer(v.id)}
                    />
                    {v.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </Label>
            <Textarea
              placeholder="Activity objectives and notes..."
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Schedule Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleActivityModal;
