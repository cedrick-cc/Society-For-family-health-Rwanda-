import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TrendingUp, FileText, Download, Loader2 } from 'lucide-react';
import { downloadExport } from '@/services/api';
import { toast } from 'sonner';

interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reportTypes = [
  { value: 'program_summary', label: 'Program Summary Report', entity: 'programs' },
  { value: 'volunteer_activity', label: 'Volunteer Activity Report', entity: 'tasks' },
  { value: 'beneficiary_reach', label: 'Beneficiary Reach Report', entity: 'beneficiaries' },
  { value: 'geographic_coverage', label: 'Geographic Coverage Report', entity: 'programs' },
  { value: 'resource_usage', label: 'Resource Usage Report', entity: 'inventory' },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({ open, onOpenChange }) => {
  const [reportType, setReportType] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [month, setMonth] = useState(String(new Date().getMonth()));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  const handleGenerate = async () => {
    const selected = reportTypes.find((r) => r.value === reportType);
    if (!selected) {
      toast.error('Select a report type.');
      return;
    }
    setLoading(true);
    try {
      await downloadExport(selected.entity, format, period, selected.value, month, year);
      toast.success(`${selected.label} downloaded.`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <TrendingUp className="w-5 h-5 text-info" />
            Generate Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Report Type *
            </Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'pdf')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV File</SelectItem>
                <SelectItem value="pdf">PDF Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={!reportType || loading}>
              {loading ? (
                <><Loader2 className={cn('w-4 h-4 mr-2 animate-spin')} /> Generating…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Download Report</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateReportModal;
