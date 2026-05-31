import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Target, CalendarIcon, MapPin, Users, FileText, CheckCircle2, ChevronRight, ChevronLeft, Package } from 'lucide-react';
import { createProgram, updateProgram, getFieldManagers, getResources } from '@/services/api';
import type { ApiProgram } from '@/lib/entityMappers';
import {
  HEALTH_RESOURCES_BY_TYPE,
  PROGRAM_TYPE_LABELS,
  type ProgramTypeKey,
} from '@/lib/programResources';
import {
  RWANDA_DISTRICTS,
  BENEFICIARY_CATEGORIES,
  getSectorsForDistricts,
} from '@/lib/rwandaDistricts';
import { toast } from '@/hooks/use-toast';

export interface CreateProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programToEdit?: ApiProgram | null;
  onCompleted?: () => void;
}

const steps = [
  { id: 1, title: 'Basic Info', icon: FileText },
  { id: 2, title: 'Schedule', icon: CalendarIcon },
  { id: 3, title: 'Location', icon: MapPin },
  { id: 4, title: 'Team & Resources', icon: Users },
  { id: 5, title: 'Review', icon: CheckCircle2 },
];

const PROGRAM_TYPE_KEYS = Object.keys(PROGRAM_TYPE_LABELS) as ProgramTypeKey[];

const emptyForm = () => ({
  name: '',
  programType: '' as ProgramTypeKey | '',
  description: '',
  objectives: '',
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
  selectedDistricts: [] as string[],
  selectedSectors: [] as string[],
  targetBeneficiaries: '',
  targetBeneficiaryCategory: '',
  minAge: '',
  maxAge: '',
  fieldManagerId: '',
  teamLead: '',
  volunteersNeeded: '',
  otherResources: '',
});

function buildDescription(formData: ReturnType<typeof emptyForm>) {
  const chunks: string[] = [];
  if (formData.description.trim()) chunks.push(formData.description.trim());
  if (formData.objectives.trim()) chunks.push(`Objectives:\n${formData.objectives.trim()}`);
  if (formData.teamLead.trim()) chunks.push(`Team lead: ${formData.teamLead.trim()}`);
  if (formData.otherResources.trim()) chunks.push(`Other resources: ${formData.otherResources.trim()}`);
  return chunks.join('\n\n') || 'No description provided.';
}

function suggestResourceQty(targetBeneficiaries: number): number {
  const target = Number(targetBeneficiaries) || 0;
  if (target <= 0) return 0;
  return Math.max(1, target);
}

const CreateProgramModal: React.FC<CreateProgramModalProps> = ({
  open,
  onOpenChange,
  programToEdit,
  onCompleted,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [resourceQty, setResourceQty] = useState<Record<string, string>>({});
  const [manualQtyKeys, setManualQtyKeys] = useState<Set<string>>(new Set());
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; resourceKey?: string; name: string }>>([]);
  const [fieldManagers, setFieldManagers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const availableSectors = useMemo(
    () => getSectorsForDistricts(formData.selectedDistricts),
    [formData.selectedDistricts]
  );

  const resourceOptions = useMemo(() => {
    if (!formData.programType) return [];
    return HEALTH_RESOURCES_BY_TYPE[formData.programType as ProgramTypeKey] || [];
  }, [formData.programType]);

  const targetBeneficiariesNum = Number(formData.targetBeneficiaries) || 0;

  const updateFormData = (field: string, value: string | Date | undefined | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const raw = await getFieldManagers({ availableOnly: true });
        const list = Array.isArray(raw) ? raw : [];
        setFieldManagers(list.map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })));
      } catch {
        setFieldManagers([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!formData.programType) return;
    const allowed = new Set(
      (HEALTH_RESOURCES_BY_TYPE[formData.programType as ProgramTypeKey] || []).map((r) => r.key)
    );
    setSelectedResources((prev) => prev.filter((k) => allowed.has(k)));
    (async () => {
      try {
        const raw = await getResources({ programType: formData.programType });
        setInventoryItems(Array.isArray(raw) ? raw : []);
      } catch {
        setInventoryItems([]);
      }
    })();
  }, [formData.programType]);

  useEffect(() => {
    if (targetBeneficiariesNum <= 0) return;
    setResourceQty((prev) => {
      const next = { ...prev };
      selectedResources.forEach((key) => {
        if (!manualQtyKeys.has(key)) {
          next[key] = String(suggestResourceQty(targetBeneficiariesNum));
        }
      });
      return next;
    });
  }, [targetBeneficiariesNum, selectedResources, manualQtyKeys]);

  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setSubmitting(false);
      setManualQtyKeys(new Set());
      return;
    }
    if (programToEdit) {
      setCurrentStep(1);
      const districts = Array.isArray((programToEdit as ApiProgram & { districts?: string[] }).districts)
        ? (programToEdit as ApiProgram & { districts?: string[] }).districts!
        : programToEdit.district
          ? [programToEdit.district]
          : [];
      const sectors = Array.isArray((programToEdit as ApiProgram & { sectorsList?: string[] }).sectorsList)
        ? (programToEdit as ApiProgram & { sectorsList?: string[] }).sectorsList!
        : programToEdit.sector
          ? programToEdit.sector.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      setFormData({
        name: programToEdit.title || '',
        programType: (programToEdit.programType as ProgramTypeKey) || '',
        description: programToEdit.description || '',
        objectives: '',
        startDate: programToEdit.startDate ? new Date(programToEdit.startDate) : undefined,
        endDate: programToEdit.endDate ? new Date(programToEdit.endDate) : undefined,
        selectedDistricts: districts,
        selectedSectors: sectors,
        targetBeneficiaries: String(programToEdit.targetBeneficiaries ?? ''),
        targetBeneficiaryCategory: (programToEdit as ApiProgram & { targetBeneficiaryCategory?: string }).targetBeneficiaryCategory || '',
        minAge: String((programToEdit as ApiProgram & { minAge?: number }).minAge ?? ''),
        maxAge: String((programToEdit as ApiProgram & { maxAge?: number }).maxAge ?? ''),
        fieldManagerId: programToEdit.fieldManagerId || '',
        teamLead: '',
        volunteersNeeded: String(programToEdit.volunteersNeeded ?? programToEdit.volunteersRequired ?? ''),
        otherResources: '',
      });
      const pr = Array.isArray(programToEdit.programResources) ? programToEdit.programResources : [];
      setSelectedResources(
        pr.map((x: { resource?: { resourceKey?: string } }) => x.resource?.resourceKey).filter(Boolean) as string[]
      );
      const qtyMap: Record<string, string> = {};
      pr.forEach((x: { resource?: { resourceKey?: string }; quantityAssigned?: number }) => {
        if (x.resource?.resourceKey) qtyMap[x.resource.resourceKey] = String(x.quantityAssigned ?? 0);
      });
      setResourceQty(qtyMap);
      setManualQtyKeys(new Set(Object.keys(qtyMap)));
    } else {
      setFormData(emptyForm());
      setSelectedResources([]);
      setResourceQty({});
      setManualQtyKeys(new Set());
      setCurrentStep(1);
    }
  }, [open, programToEdit]);

  const progress = (currentStep / steps.length) * 100;

  const toggleDistrict = (district: string) => {
    setFormData((prev) => {
      const next = prev.selectedDistricts.includes(district)
        ? prev.selectedDistricts.filter((d) => d !== district)
        : [...prev.selectedDistricts, district];
      const validSectors = getSectorsForDistricts(next);
      return {
        ...prev,
        selectedDistricts: next,
        selectedSectors: prev.selectedSectors.filter((s) => validSectors.includes(s)),
      };
    });
  };

  const toggleSector = (sector: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSectors: prev.selectedSectors.includes(sector)
        ? prev.selectedSectors.filter((s) => s !== sector)
        : [...prev.selectedSectors, sector],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return Boolean(formData.name && formData.programType);
      case 2:
        return Boolean(formData.startDate && formData.endDate);
      case 3:
        return formData.selectedDistricts.length > 0;
      case 4: {
        const n = Number(formData.volunteersNeeded);
        return Boolean(
          formData.fieldManagerId &&
            formData.volunteersNeeded !== '' &&
            !Number.isNaN(n) &&
            n >= 0
        );
      }
      default:
        return true;
    }
  };

  const toggleResource = (key: string) => {
    setSelectedResources((prev) => {
      const adding = !prev.includes(key);
      const next = adding ? [...prev, key] : prev.filter((k) => k !== key);
      if (adding && targetBeneficiariesNum > 0 && !manualQtyKeys.has(key)) {
        setResourceQty((q) => ({ ...q, [key]: String(suggestResourceQty(targetBeneficiariesNum)) }));
      }
      return next;
    });
  };

  const buildPayload = () => {
    const resourceAllocations = selectedResources
      .map((key) => {
        const inv = inventoryItems.find((r) => r.resourceKey === key);
        const qty = Number(resourceQty[key]) || 0;
        if (!inv || qty <= 0) return null;
        return { resourceId: inv.id, quantityAssigned: qty };
      })
      .filter(Boolean);
    return {
      title: formData.name.trim(),
      description: buildDescription(formData),
      district: formData.selectedDistricts[0]?.trim() || '',
      districts: formData.selectedDistricts,
      sector: formData.selectedSectors.join(', ') || null,
      sectorsList: formData.selectedSectors,
      startDate: formData.startDate!.toISOString(),
      endDate: formData.endDate!.toISOString(),
      programType: formData.programType,
      fieldManagerId: formData.fieldManagerId,
      targetBeneficiaries: Number(formData.targetBeneficiaries) || 0,
      targetBeneficiaryCategory: formData.targetBeneficiaryCategory.trim() || null,
      minAge: formData.minAge !== '' ? Number(formData.minAge) : null,
      maxAge: formData.maxAge !== '' ? Number(formData.maxAge) : null,
      volunteersNeeded: Math.max(0, Number(formData.volunteersNeeded) || 0),
      resourceAllocations,
    };
  };

  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate) {
      toast({
        title: 'Dates required',
        description: 'Please set both start and end dates.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (programToEdit) {
        await updateProgram(programToEdit.id, payload);
        toast({ title: 'Program updated', description: 'Changes were saved successfully.' });
      } else {
        await createProgram(payload);
        toast({ title: 'Program created', description: 'The new program is now available in the list.' });
      }
      onCompleted?.();
      onOpenChange(false);
      setFormData(emptyForm());
      setSelectedResources([]);
      setCurrentStep(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save program.';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length && canProceed()) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const fmName = fieldManagers.find((f) => f.id === formData.fieldManagerId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden p-0">
        <div className="px-6 pt-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display">
              <Target className="w-5 h-5 text-primary" />
              {programToEdit ? 'Edit Program' : 'Create New Program'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    'flex flex-col items-center gap-1 text-xs cursor-pointer',
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                  onClick={() => {
                    if (step.id < currentStep || canProceed()) setCurrentStep(step.id);
                  }}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                      currentStep > step.id
                        ? 'bg-primary border-primary text-primary-foreground'
                        : currentStep === step.id
                        ? 'border-primary text-primary'
                        : 'border-muted text-muted-foreground'
                    )}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Program Name *</Label>
                <Input
                  placeholder="e.g., Maternal Health Outreach - Kigali"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Program Type *</Label>
                <Select
                  value={formData.programType}
                  onValueChange={(v) => updateFormData('programType', v as ProgramTypeKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAM_TYPE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROGRAM_TYPE_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the program's purpose and activities..."
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Objectives</Label>
                <Textarea
                  placeholder="List the main objectives..."
                  value={formData.objectives}
                  onChange={(e) => updateFormData('objectives', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => updateFormData('startDate', date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => updateFormData('endDate', date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  <strong>Duration:</strong>{' '}
                  {formData.startDate && formData.endDate
                    ? `${Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`
                    : 'Not set'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Program status (planned / ongoing / completed) is set automatically from these dates.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Districts *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {RWANDA_DISTRICTS.map((district) => (
                    <label key={district} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={formData.selectedDistricts.includes(district)}
                        onCheckedChange={() => toggleDistrict(district)}
                      />
                      {district}
                    </label>
                  ))}
                </div>
              </div>
              {formData.selectedDistricts.length > 0 && (
                <div className="space-y-2">
                  <Label>Sectors / Areas</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {availableSectors.length === 0 ? (
                      <p className="text-xs text-muted-foreground col-span-2">No sectors listed for selected districts.</p>
                    ) : (
                      availableSectors.map((sector) => (
                        <label key={sector} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={formData.selectedSectors.includes(sector)}
                            onCheckedChange={() => toggleSector(sector)}
                          />
                          {sector}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Target Beneficiaries</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Estimated number of beneficiaries"
                  value={formData.targetBeneficiaries}
                  onChange={(e) => updateFormData('targetBeneficiaries', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Target beneficiary category</Label>
                <Select
                  value={formData.targetBeneficiaryCategory}
                  onValueChange={(v) => updateFormData('targetBeneficiaryCategory', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFICIARY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum age</Label>
                  <Input
                    type="number"
                    min={0}
                    max={130}
                    placeholder="e.g., 18"
                    value={formData.minAge}
                    onChange={(e) => updateFormData('minAge', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum age</Label>
                  <Input
                    type="number"
                    min={0}
                    max={130}
                    placeholder="e.g., 49"
                    value={formData.maxAge}
                    onChange={(e) => updateFormData('maxAge', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Field Manager *</Label>
                <Select value={formData.fieldManagerId} onValueChange={(v) => updateFormData('fieldManagerId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldManagers.map((fm) => (
                      <SelectItem key={fm.id} value={fm.id}>
                        {fm.name} ({fm.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only field managers not currently assigned to an active program are shown.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Volunteers needed *</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="How many volunteers should the field manager assign?"
                  value={formData.volunteersNeeded}
                  onChange={(e) => updateFormData('volunteersNeeded', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Program coordinator / team lead (optional)</Label>
                <Input
                  placeholder="Name for reporting context"
                  value={formData.teamLead}
                  onChange={(e) => updateFormData('teamLead', e.target.value)}
                />
              </div>

              <div className="pt-4 mt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Health resources (select all that apply)
                </h4>
                {!formData.programType ? (
                  <p className="text-sm text-muted-foreground">Choose a program type in step 1 to see resource options.</p>
                ) : (
                  <>
                    {targetBeneficiariesNum > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Quantities are suggested as 1 unit per target beneficiary ({targetBeneficiariesNum.toLocaleString()}).
                        You can override any value manually.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                      {resourceOptions.map((opt) => (
                        <label
                          key={opt.key}
                          className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 text-sm"
                        >
                          <Checkbox
                            checked={selectedResources.includes(opt.key)}
                            onCheckedChange={() => toggleResource(opt.key)}
                          />
                          <span className="flex-1">{opt.label}</span>
                          {selectedResources.includes(opt.key) ? (
                            <Input
                              type="number"
                              min={1}
                              className="w-20 h-8"
                              placeholder="Qty"
                              value={resourceQty[opt.key] || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setManualQtyKeys((prev) => new Set(prev).add(opt.key));
                                setResourceQty((prev) => ({ ...prev, [opt.key]: e.target.value }));
                              }}
                            />
                          ) : null}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Other notes (optional)</Label>
                <Input
                  placeholder="e.g., tents, educational materials"
                  value={formData.otherResources}
                  onChange={(e) => updateFormData('otherResources', e.target.value)}
                />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review Program Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Program Name</p>
                  <p className="font-medium">{formData.name || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {formData.programType ? PROGRAM_TYPE_LABELS[formData.programType as ProgramTypeKey] : '-'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formData.startDate ? format(formData.startDate, 'PPP') : '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Districts</p>
                  <p className="font-medium">{formData.selectedDistricts.join(', ') || '-'}</p>
                </div>
                {formData.targetBeneficiaryCategory && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Beneficiary category</p>
                    <p className="font-medium">{formData.targetBeneficiaryCategory}</p>
                  </div>
                )}
                {(formData.minAge || formData.maxAge) && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Age range</p>
                    <p className="font-medium">
                      {formData.minAge || '—'} – {formData.maxAge || '—'}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Field manager</p>
                  <p className="font-medium">{fmName || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Volunteers needed</p>
                  <p className="font-medium">{formData.volunteersNeeded || '-'}</p>
                </div>
              </div>
              {selectedResources.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-sm mb-1">Resources</p>
                  <p className="text-sm">{resourceOptions.filter((r) => selectedResources.includes(r.key)).map((r) => r.label).join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between px-6 py-4 border-t bg-background shrink-0">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1 || submitting}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={handleNext} disabled={!canProceed() || submitting}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {submitting ? 'Saving…' : programToEdit ? 'Save Changes' : 'Create Program'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProgramModal;
