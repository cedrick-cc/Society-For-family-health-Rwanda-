import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  MapPin,
  Users,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  HeartHandshake,
  Navigation,
  FileText,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProfileImageAbsoluteUrl } from '@/lib/profileImage';
import type { FieldReport } from '@/types/fieldReport';

interface ViewFieldReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: FieldReport | null;
}

const activityStatus: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  partial: { label: 'Partially completed', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const reviewBadge: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending review', className: 'bg-muted text-muted-foreground border-border' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const ViewFieldReportModal: React.FC<ViewFieldReportModalProps> = ({ open, onOpenChange, report }) => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setLightbox(null);
  }, [open, report?.id]);

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const goPrev = useCallback(() => {
    if (!report?.photos.length || lightbox === null) return;
    setLightbox((i) => (i === null ? null : (i - 1 + report.photos.length) % report.photos.length));
  }, [lightbox, report?.photos.length]);
  const goNext = useCallback(() => {
    if (!report?.photos.length || lightbox === null) return;
    setLightbox((i) => (i === null ? null : (i + 1) % report.photos.length));
  }, [lightbox, report?.photos.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, closeLightbox, goPrev, goNext]);

  if (!report) return null;

  const act = activityStatus[report.status] || activityStatus.completed;
  const rev = reviewBadge[report.reviewStatus || 'pending'] || reviewBadge.pending;

  const urls = report.photos.map((src) => getProfileImageAbsoluteUrl(src) || src);

  const lightboxNode =
    lightbox !== null &&
    urls[lightbox] &&
    createPortal(
      <div
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/92 p-4"
        role="presentation"
        onClick={closeLightbox}
      >
        <button
          type="button"
          className="absolute top-4 right-4 z-[310] rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          aria-label="Close preview"
          onClick={(e) => {
            e.stopPropagation();
            closeLightbox();
          }}
        >
          <X className="w-6 h-6" />
        </button>
        {urls.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-[310] rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-[310] rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}
        <img
          src={urls[lightbox]}
          alt={`Evidence ${lightbox + 1}`}
          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <p className="mt-4 text-sm text-white/70">
          {lightbox + 1} / {urls.length}
        </p>
      </div>,
      document.body
    );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-display pr-8">
              <ClipboardList className="w-6 h-6 text-primary" />
              Field report details
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn('text-xs font-semibold', rev.className)}>
                <Shield className="w-3 h-3 mr-1 inline" />
                {rev.label}
              </Badge>
              <Badge variant="outline" className={cn('text-xs font-semibold', act.className)}>
                Activity: {act.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3" /> Volunteer
                </p>
                <p className="text-sm font-semibold">{report.volunteerName || 'Volunteer'}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mt-3">
                  <FileText className="w-3 h-3" /> Program
                </p>
                <p className="text-sm font-medium">{report.program}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Submitted
                </p>
                <p className="text-sm">{report.submittedAt}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mt-3">
                  <MapPin className="w-3 h-3" /> Location
                </p>
                <p className="text-sm">{report.location}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-2 md:col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> GPS coordinates
                </p>
                <p className="text-sm font-mono bg-muted/50 rounded-lg px-3 py-2">
                  {report.latitude != null && report.longitude != null
                    ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
                    : 'Not recorded'}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <HeartHandshake className="w-3 h-3" /> Beneficiaries served
                </p>
                <p className="text-2xl font-display font-bold mt-1">{report.beneficiariesServed}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked task</p>
                <p className="text-sm font-medium mt-1">{report.taskName}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Field notes</p>
              <div className="rounded-xl bg-muted/40 border p-4 text-sm leading-relaxed">{report.description}</div>
            </div>

            {report.activityOutcome ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Activity outcome (volunteer)
                </p>
                <div className="rounded-xl border p-4 text-sm">{report.activityOutcome}</div>
              </div>
            ) : null}

            {(report.reviewStatus === 'rejected' || report.reviewStatus === 'approved') &&
            (report.reviewNotes || report.reviewerName) ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Coordinator review
                </p>
                {report.reviewerName ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reviewer:</span>{' '}
                    <span className="font-medium">{report.reviewerName}</span>
                  </p>
                ) : null}
                {report.reviewNotes ? (
                  <p className="text-sm leading-relaxed">
                    <span className="text-muted-foreground">Notes:</span> {report.reviewNotes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {urls.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Uploaded photos — tap to enlarge
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {urls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all group"
                      onClick={() => setLightbox(i)}
                    >
                      <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No photos attached to this report.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {lightboxNode}
    </>
  );
};

export default ViewFieldReportModal;
