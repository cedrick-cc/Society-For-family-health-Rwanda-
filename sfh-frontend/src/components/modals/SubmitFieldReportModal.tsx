import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { FIELD_REPORT_DRAFT_KEY } from '@/lib/formDraftStorage';
import { useFormDraft } from '@/hooks/useFormDraft';
import type { Program } from '@/lib/api';
import type { Task } from '@/lib/api';

function getExifDate(arrayBuffer: ArrayBuffer): Date | null {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 4) return null;
  if (view.getUint16(0, false) !== 0xFFD8) return null;

  let offset = 2;
  const length = view.byteLength;
  while (offset < length) {
    if (offset + 4 > length) break;
    const marker = view.getUint16(offset, false);
    const markerLength = view.getUint16(offset + 2, false);
    if (marker === 0xFFE1) {
      const exifOffset = offset + 4;
      if (exifOffset + 6 > length) break;
      const isExif = 
        view.getUint32(exifOffset, false) === 0x45786966 &&
        view.getUint16(exifOffset + 4, false) === 0x0000;
      if (!isExif) break;

      const tiffOffset = exifOffset + 6;
      if (tiffOffset + 8 > length) break;

      const isLittleEndian = view.getUint16(tiffOffset, false) === 0x4949;
      if (view.getUint16(tiffOffset + 2, !isLittleEndian) !== 0x002A) break;

      const ifd0Offset = view.getUint32(tiffOffset + 4, !isLittleEndian);
      const parseIFD = (ifdOffset: number): string | null => {
        if (ifdOffset + 2 > length) return null;
        const numEntries = view.getUint16(ifdOffset, !isLittleEndian);
        let entryOffset = ifdOffset + 2;
        let subExifOffset = 0;

        for (let i = 0; i < numEntries; i++) {
          if (entryOffset + 12 > length) break;
          const tag = view.getUint16(entryOffset, !isLittleEndian);
          const type = view.getUint16(entryOffset + 2, !isLittleEndian);
          const count = view.getUint32(entryOffset + 4, !isLittleEndian);
          const valueOffset = view.getUint32(entryOffset + 8, !isLittleEndian);

          if ((tag === 0x9003 || tag === 0x9004 || tag === 0x0132) && type === 2) {
            let dataOffset = tiffOffset + valueOffset;
            if (count <= 4) {
              dataOffset = entryOffset + 8;
            }
            if (dataOffset + count <= length) {
              const chars: string[] = [];
              for (let c = 0; c < count; c++) {
                const charCode = view.getUint8(dataOffset + c);
                if (charCode === 0) break;
                chars.push(String.fromCharCode(charCode));
              }
              const str = chars.join('').trim();
              if (str.match(/^\d{4}:\d{2}:\d{2}/)) {
                return str;
              }
            }
          } else if (tag === 0x8769) {
            subExifOffset = valueOffset;
          }
          entryOffset += 12;
        }

        if (subExifOffset > 0) {
          const res = parseIFD(tiffOffset + subExifOffset);
          if (res) return res;
        }
        return null;
      };

      const dateStr = parseIFD(tiffOffset + ifd0Offset);
      if (dateStr) {
        const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (match) {
          const [_, y, m, d, hh, mm, ss] = match;
          const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      break;
    }
    offset += 2 + markerLength;
  }
  return null;
}

async function validateImageAge(file: File): Promise<boolean> {
  let imageDate: Date | null = null;
  try {
    const buffer = await file.arrayBuffer();
    imageDate = getExifDate(buffer);
  } catch (err) {
    console.error('Failed to parse EXIF metadata', err);
  }

  if (!imageDate) {
    imageDate = new Date(file.lastModified);
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  if (imageDate < threeDaysAgo) {
    return false;
  }
  return true;
}

interface FieldReportDraft {
  selectedTaskId: string;
  programId: string;
  location: string;
  latitude: string;
  longitude: string;
  beneficiariesServed: string;
  description: string;
  activityOutcome: string;
}

function hasFieldReportDraftContent(data: FieldReportDraft): boolean {
  return Boolean(
    data.selectedTaskId ||
      data.location.trim() ||
      data.latitude.trim() ||
      data.longitude.trim() ||
      data.beneficiariesServed.trim() ||
      data.description.trim() ||
      data.activityOutcome.trim()
  );
}

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
  const prevOpenRef = useRef(false);

  const draftData = useMemo<FieldReportDraft>(
    () => ({
      selectedTaskId,
      programId,
      location,
      latitude,
      longitude,
      beneficiariesServed,
      description,
      activityOutcome,
    }),
    [selectedTaskId, programId, location, latitude, longitude, beneficiariesServed, description, activityOutcome]
  );

  const {
    showRestorePrompt,
    restoreDraft,
    discardDraft,
    clearSavedDraft,
  } = useFormDraft({
    storageKey: FIELD_REPORT_DRAFT_KEY,
    open,
    enabled: true,
    data: draftData,
    hasContent: hasFieldReportDraftContent,
  });

  const resetForm = useCallback(
    (defaultProgramId?: string) => {
      setSelectedTaskId('');
      setProgramId(defaultProgramId ?? (programs[0]?.id ? String(programs[0].id) : ''));
      setLocation('');
      setLatitude('');
      setLongitude('');
      setBeneficiariesServed('');
      setDescription('');
      setActivityOutcome('');
      setPhotos([]);
      setGpsLoading(false);
      setGpsSuccess(false);
    },
    [programs]
  );

  const applyDraft = useCallback((draft: FieldReportDraft) => {
    setSelectedTaskId(draft.selectedTaskId);
    setProgramId(draft.programId);
    setLocation(draft.location);
    setLatitude(draft.latitude);
    setLongitude(draft.longitude);
    setBeneficiariesServed(draft.beneficiariesServed);
    setDescription(draft.description);
    setActivityOutcome(draft.activityOutcome);
    setPhotos([]);
    setGpsLoading(false);
    setGpsSuccess(Boolean(draft.latitude && draft.longitude));
  }, []);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!open || !justOpened) return;
    resetForm();
  }, [open, resetForm]);

  const tasksForProgram = tasks.filter(
    (t) => !programId || String((t as Task & { programId?: string }).programId || '') === programId
  );

  const handleTaskChange = (id: string) => {
    setSelectedTaskId(id);
    const row = tasks.find((t) => String(t.id) === id) as (Task & { programId?: string }) | undefined;
    if (row?.programId) setProgramId(String(row.programId));
  };

  const captureGPS = () => {
    if (!window.isSecureContext) {
      toast.error('GPS requires a secure connection (HTTPS). Enter coordinates manually or use location description.');
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsSuccess(false);

    const onSuccess = (pos: GeolocationPosition) => {
      setLatitude(pos.coords.latitude.toFixed(6));
      setLongitude(pos.coords.longitude.toFixed(6));
      setGpsLoading(false);
      setGpsSuccess(true);
      toast.success('Location captured successfully.');
    };

    const onError = (err: GeolocationPositionError, fromWatch = false) => {
      if (err.code === err.TIMEOUT || err.code === 3) {
        if (!fromWatch) {
          toast.warning('GPS timed out. Trying again with lower accuracy…');
          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              navigator.geolocation.clearWatch(watchId);
              onSuccess(pos);
            },
            (watchErr) => {
              navigator.geolocation.clearWatch(watchId);
              onError(watchErr, true);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
          return;
        }
        toast.error('GPS timed out. Enter coordinates manually or submit with location description only.');
      } else if (err.code === err.PERMISSION_DENIED || err.code === 1) {
        toast.error('Location permission denied. Allow location access in your browser settings, or enter coordinates manually.');
      } else if (err.code === err.POSITION_UNAVAILABLE || err.code === 2) {
        toast.error('Location unavailable. Check that GPS/location services are enabled, or enter coordinates manually.');
      } else {
        toast.warning('Could not capture GPS. You can still submit with location description only.');
      }
      setGpsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => onError(err, false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const isValid = await validateImageAge(file);
      if (!isValid) {
        toast.error("This image appears to be older than 3 days. Please upload a recent field activity photo.");
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      const next = [...photos, ...validFiles].slice(0, 5);
      setPhotos(next);
    }
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
    if (!location.trim()) {
      toast.error('Location description is required.');
      return;
    }

    const fd = new FormData();
    fd.append('programId', programId);
    if (selectedTaskId) fd.append('taskId', selectedTaskId);
    fd.append('location', location.trim());
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      fd.append('latitude', String(lat));
      fd.append('longitude', String(lng));
    }
    fd.append('beneficiariesCount', String(parseInt(beneficiariesServed, 10) || 0));
    fd.append('notes', description);
    fd.append('activityOutcome', activityOutcome);
    photos.forEach((file) => fd.append('photos', file));

    setSubmitting(true);
    try {
      const raw = await submitFieldReport(fd);
      const mapped = mapApiFieldReportToUI(raw as Record<string, unknown>);
      clearSavedDraft();
      onSubmit(mapped as FieldReport);
      toast.success('Field report submitted successfully.');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submit failed.';
      toast.error(message, {
        description: 'Submission failed. Your draft has been saved locally and can be restored later.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreDraft = () => {
    const draft = restoreDraft();
    if (draft) applyDraft(draft as FieldReportDraft);
  };

  const handleDiscardDraft = () => {
    discardDraft();
    resetForm();
  };

  return (
    <>
    <AlertDialog open={showRestorePrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore saved draft?</AlertDialogTitle>
          <AlertDialogDescription>
            A saved draft was found. Would you like to restore it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDiscardDraft}>Discard Draft</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestoreDraft}>Restore Draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <ClipboardList className="w-5 h-5 text-primary" />
            Submit Field Report
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                <Label>Latitude (optional)</Label>
                <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-1.9536" />
              </div>
              <div className="space-y-2 flex-1 min-w-[120px]">
                <Label>Longitude (optional)</Label>
                <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="30.0946" />
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
    </>
  );
};

export default SubmitFieldReportModal;
