import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, MapPin, Users, Calendar, Camera, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldReport } from '@/types/fieldReport';

interface RecentFieldReportsProps {
  reports: FieldReport[];
  onViewReport: (report: FieldReport) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  partial: { label: 'Partial', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const RecentFieldReports: React.FC<RecentFieldReportsProps> = ({ reports, onViewReport }) => {
  return (
    <Card className="sfh-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Recent Field Reports
          <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {reports.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No field reports submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const sc = statusConfig[report.status] || statusConfig.completed;
              return (
                <div key={report.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.taskName}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{report.submittedAt}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{report.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{report.beneficiariesServed} served</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-xs flex-shrink-0', sc.className)}>{sc.label}</Badge>
                  </div>

                  {report.photos.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {report.photos.slice(0, 3).map((src, i) => (
                        <img key={i} src={src} alt="" className="w-10 h-10 rounded-md object-cover border border-border" />
                      ))}
                      {report.photos.length > 3 && (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border">
                          +{report.photos.length - 3}
                        </div>
                      )}
                      <Camera className="w-3 h-3 text-muted-foreground self-end ml-1" />
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onViewReport(report)}>
                      <Eye className="w-3 h-3" /> View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentFieldReports;
