import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Building, Phone, Clock, Users } from 'lucide-react';

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const districts = [
  'Kigali City', 'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana',
  'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo', 'Gisagara', 'Huye', 'Kamonyi',
  'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango', 'Karongi', 'Ngororero',
  'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro',
];

const locationTypes = [
  { value: 'health_center', label: 'Health Center' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'community_center', label: 'Community Center' },
  { value: 'school', label: 'School' },
  { value: 'church', label: 'Church/Mosque' },
  { value: 'market', label: 'Market' },
  { value: 'mobile_clinic', label: 'Mobile Clinic Site' },
  { value: 'outreach_point', label: 'Outreach Point' },
];

const AddLocationModal: React.FC<AddLocationModalProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    latitude: '',
    longitude: '',
    contactPerson: '',
    contactPhone: '',
    capacity: '',
    operatingHours: '',
    facilities: '',
    notes: '',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Location added:', formData);
    onOpenChange(false);
    setFormData({
      name: '', type: '', district: '', sector: '', cell: '', village: '',
      latitude: '', longitude: '', contactPerson: '', contactPhone: '',
      capacity: '', operatingHours: '', facilities: '', notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <MapPin className="w-5 h-5 text-accent" />
            Add New Location
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Building className="w-4 h-4" />
              Location Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location Name *</Label>
                <Input
                  placeholder="e.g., Gasabo Health Center"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location Type *</Label>
                <Select value={formData.type} onValueChange={(v) => updateFormData('type', v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Administrative Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Administrative Location
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>District *</Label>
                <Select value={formData.district} onValueChange={(v) => updateFormData('district', v)} required>
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
              <div className="space-y-2">
                <Label>Sector</Label>
                <Input
                  placeholder="Sector name"
                  value={formData.sector}
                  onChange={(e) => updateFormData('sector', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cell</Label>
                <Input
                  placeholder="Cell name"
                  value={formData.cell}
                  onChange={(e) => updateFormData('cell', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Village</Label>
                <Input
                  placeholder="Village name"
                  value={formData.village}
                  onChange={(e) => updateFormData('village', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              GPS Coordinates (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="-1.9403"
                  value={formData.latitude}
                  onChange={(e) => updateFormData('latitude', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="29.8739"
                  value={formData.longitude}
                  onChange={(e) => updateFormData('longitude', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter coordinates if available, or leave blank to add later via map interface.
            </p>
          </div>

          {/* Contact & Operations */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact & Operations
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  placeholder="Name of contact"
                  value={formData.contactPerson}
                  onChange={(e) => updateFormData('contactPerson', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData('contactPhone', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Capacity
                </Label>
                <Input
                  type="number"
                  placeholder="Maximum people"
                  value={formData.capacity}
                  onChange={(e) => updateFormData('capacity', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Operating Hours
                </Label>
                <Input
                  placeholder="e.g., 8:00 AM - 5:00 PM"
                  value={formData.operatingHours}
                  onChange={(e) => updateFormData('operatingHours', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div className="space-y-2">
            <Label>Available Facilities</Label>
            <Textarea
              placeholder="e.g., Meeting room, Electricity, Water supply, Waiting area..."
              value={formData.facilities}
              onChange={(e) => updateFormData('facilities', e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional information..."
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Location
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLocationModal;
