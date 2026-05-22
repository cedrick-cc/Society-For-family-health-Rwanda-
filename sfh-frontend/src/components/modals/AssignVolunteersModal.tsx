import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Loader2, Search } from 'lucide-react';
import {
  getProgram,
  getAvailableVolunteers,
  assignProgramVolunteers,
  removeProgramVolunteer,
} from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type VolunteerRow = {
  id: string;
  name: string;
  email: string;
  skills?: string[];
  certifications?: string[];
  volunteerOpsStatus?: string;
  volunteerDistrict?: string | null;
  programCount?: number;
  _count?: { programVolunteers?: number };
};

type AssignmentRow = {
  id: string;
  volunteer: VolunteerRow;
};

export interface AssignVolunteersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string | null;
  programTitle?: string;
  volunteersNeeded?: number;
  onSaved?: () => void;
}

const AssignVolunteersModal: React.FC<AssignVolunteersModalProps> = ({
  open,
  onOpenChange,
  programId,
  programTitle,
  volunteersNeeded,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigned, setAssigned] = useState<AssignmentRow[]>([]);
  const [available, setAvailable] = useState<VolunteerRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');

  const load = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const [p, av] = await Promise.all([getProgram(programId), getAvailableVolunteers(programId)]);
      setAssigned(Array.isArray(p?.programVolunteers) ? p.programVolunteers : []);
      const rows = Array.isArray(av) ? av : [];
      setAvailable(
        rows.map((v: VolunteerRow) => ({
          ...v,
          programCount: v._count?.programVolunteers ?? v.programCount ?? 0,
        }))
      );
      setSelected([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load volunteers.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && programId) load();
  }, [open, programId]);

  const skillOptions = useMemo(() => {
    const set = new Set<string>();
    available.forEach((v) => (v.skills || []).forEach((s) => set.add(s)));
    return ['all', ...Array.from(set).sort()];
  }, [available]);

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available.filter((v) => {
      const matchQ =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        (v.volunteerDistrict || '').toLowerCase().includes(q);
      const matchSkill =
        skillFilter === 'all' || (v.skills || []).includes(skillFilter);
      return matchQ && matchSkill;
    });
  }, [available, search, skillFilter]);

  const toggle = (id: string) => {
    const row = available.find((v) => v.id === id);
    if (row?.volunteerOpsStatus === 'ON_LEAVE') return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAdd = async () => {
    if (!programId || selected.length === 0) return;
    setSaving(true);
    try {
      await assignProgramVolunteers(programId, selected);
      toast({ title: 'Volunteers assigned', description: `${selected.length} volunteer(s) added.` });
      onSaved?.();
      await load();
      setSelected([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Assignment failed.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (volunteerId: string) => {
    if (!programId) return;
    setSaving(true);
    try {
      await removeProgramVolunteer(programId, volunteerId);
      toast({ title: 'Removed', description: 'Volunteer unassigned from this program.' });
      onSaved?.();
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Remove failed.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = assigned.length;
  const cap = volunteersNeeded ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Assign volunteers
          </DialogTitle>
          {programTitle && <p className="text-sm text-muted-foreground">{programTitle}</p>}
          {cap > 0 && (
            <p className="text-xs text-muted-foreground">
              Target team size: {cap} · Currently assigned: {assignedCount}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-2">Assigned volunteers</p>
              {assigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">No volunteers assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {assigned.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{row.volunteer.name}</p>
                        <p className="text-xs text-muted-foreground">{row.volunteer.email}</p>
                        {(row.volunteer.skills?.length || row.volunteer.certifications?.length) ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.volunteer.skills?.slice(0, 3).map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs font-normal">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => handleRemove(row.volunteer.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Available to assign</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Search name, email, district…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {skillOptions.length > 1 && (
                  <Select value={skillFilter} onValueChange={setSkillFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9">
                      <SelectValue placeholder="Skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === 'all' ? 'All skills' : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground">No volunteers match your filters.</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredAvailable.map((v) => {
                    const onLeave = v.volunteerOpsStatus === 'ON_LEAVE';
                    return (
                      <label
                        key={v.id}
                        className={cn(
                          'flex items-start gap-2 rounded-lg border p-2 transition-colors',
                          onLeave ? 'opacity-60 bg-muted/30 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/40'
                        )}
                      >
                        <Checkbox
                          checked={selected.includes(v.id)}
                          disabled={onLeave}
                          onCheckedChange={() => toggle(v.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.email}</p>
                          {v.volunteerDistrict && (
                            <p className="text-xs text-muted-foreground mt-0.5">District: {v.volunteerDistrict}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {v.volunteerOpsStatus && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  onLeave && 'border-destructive/40 text-destructive bg-destructive/5'
                                )}
                              >
                                {v.volunteerOpsStatus}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs font-normal">
                              Programs: {v.programCount ?? 0}
                            </Badge>
                          </div>
                          {(v.skills?.length || v.certifications?.length) ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {v.skills?.slice(0, 4).map((s) => (
                                <Badge key={s} variant="outline" className="text-[10px] font-normal">
                                  {s}
                                </Badge>
                              ))}
                              {v.certifications?.slice(0, 2).map((c) => (
                                <Badge key={c} variant="outline" className="text-[10px] font-normal">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {onLeave && (
                            <p className="text-[11px] text-destructive mt-1">Cannot assign while on leave.</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button type="button" onClick={handleAdd} disabled={saving || selected.length === 0 || loading}>
            {saving ? 'Saving…' : `Add selected (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignVolunteersModal;
