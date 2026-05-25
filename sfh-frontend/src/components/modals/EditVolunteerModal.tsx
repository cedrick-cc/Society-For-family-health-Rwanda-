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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { updateVolunteer } from '@/services/api';
import { toast } from 'sonner';

interface EditVolunteerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: {
    id: string | number;
    name: string;
    phone?: string;
    district: string;
    skills: string[];
    certifications: string[];
    volunteerOpsStatus?: string;
  } | null;
  onSaved: () => void;
}

const EditVolunteerModal: React.FC<EditVolunteerModalProps> = ({
  open,
  onOpenChange,
  volunteer,
  onSaved,
}) => {
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [certsText, setCertsText] = useState('');
  const [opsStatus, setOpsStatus] = useState('AVAILABLE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !volunteer) return;
    setPhone(volunteer.phone && volunteer.phone !== '—' ? volunteer.phone : '');
    setDistrict(volunteer.district || '');
    setSkillsText((volunteer.skills || []).join(', '));
    setCertsText((volunteer.certifications || []).join(', '));
    setOpsStatus(String(volunteer.volunteerOpsStatus || 'AVAILABLE').toUpperCase());
  }, [open, volunteer]);

  const handleSave = async () => {
    if (!volunteer) return;
    setSaving(true);
    try {
      await updateVolunteer(String(volunteer.id), {
        phone: phone.trim() || null,
        volunteerDistrict: district.trim() || null,
        skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
        certifications: certsText.split(',').map((s) => s.trim()).filter(Boolean),
        volunteerOpsStatus: opsStatus,
      });
      toast.success('Volunteer updated.');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit volunteer — {volunteer?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250..." />
          </div>
          <div className="space-y-2">
            <Label>District</Label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Skills (comma-separated)</Label>
            <Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Certifications (comma-separated)</Label>
            <Input value={certsText} onChange={(e) => setCertsText(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Operational status</Label>
            <Select value={opsStatus} onValueChange={setOpsStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="ON_LEAVE">On leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditVolunteerModal;
