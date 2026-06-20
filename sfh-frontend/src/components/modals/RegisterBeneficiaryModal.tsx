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
import { HeartHandshake, User, MapPin, Stethoscope, Phone, IdCard } from 'lucide-react';
import { createBeneficiary, getPrograms, getProgramsAsVolunteer, getProgram, updateBeneficiary } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiBeneficiary } from '@/lib/entityMappers';
import {
  RWANDA_DISTRICTS,
  SECTORS_BY_DISTRICT,
  ageFromRwandaNationalId,
  validateNationalIdFormat,
} from '@/lib/rwandaDistricts';
import { toast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
import { BENEFICIARY_REGISTRATION_DRAFT_KEY } from '@/lib/formDraftStorage';
import { cn } from '@/lib/utils';

export interface RegisterBeneficiaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  beneficiaryToEdit?: ApiBeneficiary | null;
}

function ageFromAgeGroup(ageGroup: string): number {
  if (!ageGroup) return 25;
  if (ageGroup === '65+') return 70;
  const m = ageGroup.match(/^(\d+)-(\d+)/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    return Math.round((a + b) / 2);
  }
  const m2 = ageGroup.match(/^(\d+)/);
  return m2 ? parseInt(m2[1], 10) + 2 : 25;
}

function householdSizeFromSelect(value: string): number {
  if (!value) return 1;
  if (value === '9+') return 9;
  if (value === '2-3') return 2;
  if (value === '4-5') return 4;
  if (value === '6-8') return 6;
  return parseInt(value, 10) || 1;
}

const emptyForm = () => ({
  firstName: '',
  lastName: '',
  phone: '',
  nationalId: '',
  ageGroup: '',
  editAge: '',
  gender: '',
  householdSize: '',
  district: '',
  sector: '',
  cell: '',
  program: '',
  referralSource: '',
  serviceType: '',
  healthConditions: '',
  riskLevel: 'medium',
  notes: '',
});

type ProgramAgeLimits = { minAge?: number | null; maxAge?: number | null; title?: string };
type BeneficiaryFormData = ReturnType<typeof emptyForm>;

function hasBeneficiaryDraftContent(data: BeneficiaryFormData): boolean {
  return Boolean(
    data.firstName ||
      data.lastName ||
      data.phone ||
      data.nationalId ||
      data.ageGroup ||
      data.gender ||
      data.householdSize ||
      data.district ||
      data.sector ||
      data.cell ||
      data.program ||
      data.referralSource ||
      data.serviceType ||
      data.healthConditions ||
      data.notes
  );
}

const RegisterBeneficiaryModal: React.FC<RegisterBeneficiaryModalProps> = ({
  open,
  onOpenChange,
  onSaved,
  beneficiaryToEdit,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(emptyForm);
  const [programs, setPrograms] = useState<Array<{ id: string; title: string; status?: string }>>([]);
  const [programAgeLimits, setProgramAgeLimits] = useState<ProgramAgeLimits | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const draftEnabled = user?.role === 'volunteer' && !beneficiaryToEdit;
  const {
    showRestorePrompt,
    restoreDraft,
    discardDraft,
    clearSavedDraft,
  } = useFormDraft({
    storageKey: BENEFICIARY_REGISTRATION_DRAFT_KEY,
    open,
    enabled: draftEnabled,
    data: formData,
    hasContent: hasBeneficiaryDraftContent,
  });

  const applyEmptyForm = useCallback(
    (programList: Array<{ id: string }> = programs) => {
      const next = emptyForm();
      if (user?.role === 'volunteer' && programList.length === 1) {
        next.program = programList[0].id;
      }
      setFormData(next);
    },
    [programs, user?.role]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingPrograms(true);
      try {
        const raw =
          user?.role === 'volunteer' ? await getProgramsAsVolunteer() : await getPrograms();
        if (cancelled) return;
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list
          .map((p: { id: string; title: string; status?: string }) => ({
            id: p.id,
            title: p.title,
            status: p.status,
          }))
          .filter((p) => String(p.status || '').toUpperCase() !== 'COMPLETED');
        setPrograms(mapped);
        if (user?.role === 'volunteer' && mapped.length === 1 && !beneficiaryToEdit && !showRestorePrompt) {
          setFormData((prev) => (prev.program ? prev : { ...prev, program: mapped[0].id }));
        }
      } catch {
        if (!cancelled) setPrograms([]);
      } finally {
        if (!cancelled) setLoadingPrograms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.role, beneficiaryToEdit, showRestorePrompt]);

  useEffect(() => {
    if (!open || !formData.program) {
      setProgramAgeLimits(null);
      return;
    }
    let cancelled = false;
    getProgram(formData.program)
      .then((p) => {
        if (!cancelled) {
          setProgramAgeLimits({
            minAge: (p as { minAge?: number }).minAge ?? null,
            maxAge: (p as { maxAge?: number }).maxAge ?? null,
            title: (p as { title?: string }).title,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setProgramAgeLimits(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, formData.program]);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!open || !justOpened) return;

    if (beneficiaryToEdit) {
      const parts = (beneficiaryToEdit.fullName || '').trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      setFormData({
        ...emptyForm(),
        firstName,
        lastName,
        phone: beneficiaryToEdit.phone || '',
        nationalId: (beneficiaryToEdit as ApiBeneficiary & { nationalId?: string }).nationalId || '',
        editAge: String(beneficiaryToEdit.age ?? ''),
        gender: (beneficiaryToEdit.gender || '').toLowerCase(),
        householdSize: String(beneficiaryToEdit.householdSize ?? 1),
        district: beneficiaryToEdit.district || '',
        sector: beneficiaryToEdit.sector || '',
        cell: beneficiaryToEdit.village || '',
        program: beneficiaryToEdit.assignedProgramId || beneficiaryToEdit.assignedProgram?.id || '',
        riskLevel: (beneficiaryToEdit.riskLevel || 'medium').toLowerCase(),
      });
    } else if (!draftEnabled) {
      setFormData(emptyForm());
    } else {
      applyEmptyForm();
    }
  }, [open, beneficiaryToEdit, draftEnabled, applyEmptyForm]);

  const computedAgeFromId = useMemo(() => {
    if (beneficiaryToEdit || !formData.nationalId.trim()) return null;
    if (!validateNationalIdFormat(formData.nationalId)) return null;
    return ageFromRwandaNationalId(formData.nationalId);
  }, [formData.nationalId, beneficiaryToEdit]);

  const ageValidation = useMemo(() => {
    if (beneficiaryToEdit || computedAgeFromId === null) return null;
    const { minAge, maxAge } = programAgeLimits || {};
    if (minAge == null && maxAge == null) return null;
    const age = computedAgeFromId;
    if (minAge != null && age < minAge) {
      return {
        valid: false,
        message: `Age ${age} is below the program minimum (${minAge} years).`,
      };
    }
    if (maxAge != null && age > maxAge) {
      return {
        valid: false,
        message: `Age ${age} exceeds the program maximum (${maxAge} years).`,
      };
    }
    return {
      valid: true,
      message: `Age ${age} meets program requirements${minAge != null || maxAge != null ? ` (${minAge ?? '—'}–${maxAge ?? '—'} years)` : ''}.`,
    };
  }, [beneficiaryToEdit, computedAgeFromId, programAgeLimits]);

  const sectorOptions = formData.district
    ? SECTORS_BY_DISTRICT[formData.district] || []
    : [];

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    if (!fullName || !formData.gender || !formData.district || !formData.program) {
      toast({
        title: 'Missing fields',
        description: 'Please complete name, gender, district, and program.',
        variant: 'destructive',
      });
      return;
    }

    const selectedProgram = programs.find((p) => p.id === formData.program);
    if (selectedProgram && String(selectedProgram.status || '').toUpperCase() === 'COMPLETED') {
      toast({
        title: 'Program completed',
        description: 'Cannot register beneficiaries for a completed program.',
        variant: 'destructive',
      });
      return;
    }

    if (!beneficiaryToEdit && formData.nationalId.trim() && !validateNationalIdFormat(formData.nationalId)) {
      toast({ title: 'Invalid national ID', description: 'National ID must be 16 digits.', variant: 'destructive' });
      return;
    }

    if (ageValidation && !ageValidation.valid) {
      toast({ title: 'Age not eligible', description: ageValidation.message, variant: 'destructive' });
      return;
    }

    const age = beneficiaryToEdit
      ? Math.min(130, Math.max(0, parseInt(formData.editAge, 10) || 0))
      : computedAgeFromId ?? ageFromAgeGroup(formData.ageGroup);

    if (!beneficiaryToEdit && !formData.nationalId.trim() && !formData.ageGroup) {
      toast({ title: 'Age required', description: 'Enter national ID or select an age group.', variant: 'destructive' });
      return;
    }
    if (beneficiaryToEdit && (!formData.editAge || Number.isNaN(parseInt(formData.editAge, 10)))) {
      toast({ title: 'Age required', description: 'Enter a valid age.', variant: 'destructive' });
      return;
    }

    const servicesReceived: string[] = [];
    if (formData.serviceType) servicesReceived.push(formData.serviceType);
    if (formData.referralSource) servicesReceived.push(`referral:${formData.referralSource}`);
    if (formData.healthConditions) servicesReceived.push(`notes:${formData.healthConditions}`);
    if (formData.notes) servicesReceived.push(`additional:${formData.notes}`);

    const payload: Record<string, unknown> = {
      fullName,
      gender: formData.gender,
      age,
      phone: formData.phone.trim() || undefined,
      district: formData.district,
      sector: formData.sector.trim() || undefined,
      village: formData.cell.trim() || undefined,
      riskLevel: formData.riskLevel || 'medium',
      householdSize: beneficiaryToEdit
        ? Math.max(1, parseInt(formData.householdSize, 10) || 1)
        : householdSizeFromSelect(formData.householdSize),
      servicesReceived,
      assignedProgramId: formData.program,
    };
    if (formData.nationalId.trim()) {
      payload.nationalId = formData.nationalId.replace(/\s/g, '');
    }

    setSubmitting(true);
    try {
      if (beneficiaryToEdit) {
        await updateBeneficiary(beneficiaryToEdit.id, payload);
        toast({ title: 'Beneficiary updated', description: 'Changes were saved.' });
      } else {
        await createBeneficiary(payload);
        toast({ title: 'Beneficiary registered', description: fullName });
      }
      if (draftEnabled) clearSavedDraft();
      onSaved?.();
      onOpenChange(false);
      setFormData(emptyForm());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed.';
      toast({
        title: 'Could not save',
        description: draftEnabled
          ? `${message} Submission failed. Your draft has been saved locally and can be restored later.`
          : message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitBlocked = Boolean(ageValidation && !ageValidation.valid);

  const handleRestoreDraft = () => {
    const draft = restoreDraft();
    if (draft) setFormData(draft);
  };

  const handleDiscardDraft = () => {
    discardDraft();
    applyEmptyForm();
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
            <HeartHandshake className="w-5 h-5 text-secondary" />
            {beneficiaryToEdit ? 'Edit Beneficiary' : 'Register Beneficiary'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</Label>
                <Input
                  placeholder="e.g., 078XXXXXXX"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                />
              </div>
              {!beneficiaryToEdit && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><IdCard className="w-3 h-3" /> National ID</Label>
                  <Input
                    placeholder="16-digit Rwanda national ID"
                    value={formData.nationalId}
                    onChange={(e) => updateFormData('nationalId', e.target.value.replace(/\D/g, '').slice(0, 16))}
                    maxLength={16}
                  />
                  {formData.nationalId.length > 0 && formData.nationalId.length < 16 && (
                    <p className="text-xs text-muted-foreground">{formData.nationalId.length}/16 digits</p>
                  )}
                  {ageValidation && (
                    <p className={cn('text-xs font-medium', ageValidation.valid ? 'text-success' : 'text-destructive')}>
                      {ageValidation.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Demographics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {beneficiaryToEdit ? (
                <div className="space-y-2">
                  <Label>Age (years) *</Label>
                  <Input
                    type="number"
                    min={0}
                    max={130}
                    value={formData.editAge}
                    onChange={(e) => updateFormData('editAge', e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Age Group {!formData.nationalId.trim() ? '*' : ''}</Label>
                  <Select
                    value={formData.ageGroup}
                    onValueChange={(v) => updateFormData('ageGroup', v)}
                    required={!formData.nationalId.trim()}
                    disabled={Boolean(computedAgeFromId !== null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={computedAgeFromId != null ? `From ID: ${computedAgeFromId} yrs` : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-5">0-5 years</SelectItem>
                      <SelectItem value="6-12">6-12 years</SelectItem>
                      <SelectItem value="13-17">13-17 years</SelectItem>
                      <SelectItem value="18-24">18-24 years</SelectItem>
                      <SelectItem value="25-34">25-34 years</SelectItem>
                      <SelectItem value="35-44">35-44 years</SelectItem>
                      <SelectItem value="45-54">45-54 years</SelectItem>
                      <SelectItem value="55-64">55-64 years</SelectItem>
                      <SelectItem value="65+">65+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(v) => updateFormData('gender', v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Household Size</Label>
                {beneficiaryToEdit ? (
                  <Input
                    type="number"
                    min={1}
                    value={formData.householdSize}
                    onChange={(e) => updateFormData('householdSize', e.target.value)}
                  />
                ) : (
                  <Select value={formData.householdSize} onValueChange={(v) => updateFormData('householdSize', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 person</SelectItem>
                      <SelectItem value="2-3">2-3 persons</SelectItem>
                      <SelectItem value="4-5">4-5 persons</SelectItem>
                      <SelectItem value="6-8">6-8 persons</SelectItem>
                      <SelectItem value="9+">9+ persons</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>Risk level</Label>
              <Select value={formData.riskLevel} onValueChange={(v) => updateFormData('riskLevel', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>District *</Label>
                <Select value={formData.district} onValueChange={(v) => { updateFormData('district', v); updateFormData('sector', ''); }} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {RWANDA_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                {sectorOptions.length > 0 ? (
                  <Select value={formData.sector} onValueChange={(v) => updateFormData('sector', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectorOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Sector name"
                    value={formData.sector}
                    onChange={(e) => updateFormData('sector', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Village / Cell</Label>
                <Input
                  placeholder="Village or cell"
                  value={formData.cell}
                  onChange={(e) => updateFormData('cell', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Health Service
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Program *</Label>
                <Select
                  value={formData.program}
                  onValueChange={(v) => updateFormData('program', v)}
                  required
                  disabled={loadingPrograms}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPrograms ? 'Loading…' : 'Select program'} />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {programAgeLimits && (programAgeLimits.minAge != null || programAgeLimits.maxAge != null) && (
                  <p className="text-xs text-muted-foreground">
                    Eligible age: {programAgeLimits.minAge ?? '—'} – {programAgeLimits.maxAge ?? '—'} years
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={formData.serviceType} onValueChange={(v) => updateFormData('serviceType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="counseling">Counseling</SelectItem>
                    <SelectItem value="distribution">Commodity Distribution</SelectItem>
                    <SelectItem value="education">Health Education</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referral Source</Label>
              <Input
                placeholder="e.g., Community Health Worker, Health Center, Self-referral"
                value={formData.referralSource}
                onChange={(e) => updateFormData('referralSource', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Health Conditions (if applicable)</Label>
              <Textarea
                placeholder="General health notes (no personal identifiers)..."
                value={formData.healthConditions}
                onChange={(e) => updateFormData('healthConditions', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional observations..."
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || submitBlocked}>
              {submitting ? 'Saving…' : beneficiaryToEdit ? 'Save changes' : 'Register Beneficiary'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default RegisterBeneficiaryModal;
