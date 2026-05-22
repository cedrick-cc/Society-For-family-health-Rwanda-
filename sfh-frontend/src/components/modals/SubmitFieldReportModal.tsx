import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, MapPin, Camera, X, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FieldReport } from '@/types/fieldReport';
import { submitFieldReport } from '@/services/api';
import { mapApiFieldReportToUI } from '@/lib/api';
import type { Program } from '@/lib/api';
import type { Task } from '@/lib/api';

interface SubmitFieldReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  tasks: Task[];
  onSubmit: (report: FieldReport) => void;
}

const SubmitFieldReportModal: React.FC<SubmitFieldReportModalProps> = ({
  open,
  onOpenChange,
  programs,
  tasks,
  onSubmit,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [programId, setProgramId] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [beneficiariesServed, setBeneficiariesServed] = useState('');
  const [description, setDescription] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedTaskId('');
    setProgramId(programs[0]?.id ? String(programs[0].id) : '');
    setLocation('');
    setLatitude('');
    setLongitude('');
    setBeneficiariesServed('');
    setDescription('');
    setActivityOutcome('');
    setPhotos([]);
    setGpsLoading(false);
    setGpsSuccess(false);
  }, [open, programs]);

  const tasksForProgram = tasks.filter(
    (t) => !programId || String((t as Task & { programId?: string }).programId || '') === programId
  );

  const handleTaskChange = (id: string) => {
    setSelectedTaskId(id);
    const row = tasks.find((t) => String(t.id) === id) as (Task & { programId?: string }) | undefined;
    if (row?.programId) setProgramId(String(row.programId));
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsSuccess(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
        setGpsSuccess(true);
        toast.success('Location captured successfully.');
      },
      () => {
        setGpsLoading(false);
        toast.error('Unable to capture location. Please enter manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, 5);
    setPhotos(next);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) {
      toast.error('Select a program.');
      return;
    }
    if (!activityOutcome) {
      toast.error('Select activity status.');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Enter valid GPS coordinates or use Capture GPS.');
      return;
    }

    const fd = new FormData();
    fd.append('programId', programId);
    if (selectedTaskId) fd.append('taskId', selectedTaskId);
    fd.append('location', location);
    fd.append('latitude', String(lat));
    fd.append('longitude', String(lng));
    fd.append('beneficiariesCount', String(parseInt(beneficiariesServed, 10) || 0));
    fd.append('notes', description);
    fd.append('activityOutcome', activityOutcome);
    photos.forEach((file) => fd.append('photos', file));

    setSubmitting(true);
    try {
      const raw = await submitFieldReport(fd);
      const mapped = mapApiFieldReportToUI(raw as Record<string, unknown>);
      onSubmit(mapped as FieldReport);
      toast.success('Field report submitted successfully.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <ClipboardList className="w-5 h-5 text-primary" />
            Submit Field Report
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Program *</Label>
              <Select value={programId} onValueChange={setProgramId} required>
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
              <Label>Related task</Label>
              <Select value={selectedTaskId} onValueChange={handleTaskChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional — link to a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasksForProgram.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                      {t.task}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Location
            </h3>
            <div className="space-y-2">
              <Label>Location description *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Remera sector outreach site"
                required
              />
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[120px]">
                <Label>Latitude *</Label>
                <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-1.9536" required />
              </div>
              <div className="space-y-2 flex-1 min-w-[120px]">
                <Label>Longitude *</Label>
                <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="30.0946" required />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-10 gap-1.5" onClick={captureGPS} disabled={gpsLoading}>
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {gpsLoading ? 'Capturing…' : 'Capture GPS'}
              </Button>
            </div>
            {gpsSuccess && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> GPS saved for this report.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Beneficiaries served *</Label>
              <Input
                type="number"
                min={0}
                value={beneficiariesServed}
                onChange={(e) => setBeneficiariesServed(e.target.value)}
                placeholder="e.g., 12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Activity status *</Label>
              <Select value={activityOutcome} onValueChange={setActivityOutcome} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partially completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Field notes *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the activity, observations, and outcomes…"
              rows={4}
              required
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Camera className="w-4 h-4" /> Photo evidence
            </h3>
            <div className="flex flex-wrap gap-3">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:text-primary">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">Upload</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoPick} />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Up to 5 images (max 5MB each).</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || programs.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" /> Submit report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitFieldReportModal;
