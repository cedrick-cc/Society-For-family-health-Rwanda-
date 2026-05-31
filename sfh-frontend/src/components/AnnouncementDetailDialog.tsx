import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

export type AnnouncementDetail = {
  id: string;
  title: string;
  message: string;
  priority: 'urgent' | 'normal' | 'info';
  createdAt: string;
  createdBy?: { name: string; role: string };
};

const priorityClass = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  normal: 'bg-primary/10 text-primary border-primary/20',
  info: 'bg-muted text-muted-foreground',
};

interface AnnouncementDetailDialogProps {
  announcement: AnnouncementDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnnouncementDetailDialog: React.FC<AnnouncementDetailDialogProps> = ({
  announcement,
  open,
  onOpenChange,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md max-w-[95vw]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-6">
          <Bell className="w-5 h-5 text-primary shrink-0" />
          {announcement?.title || 'Announcement'}
        </DialogTitle>
      </DialogHeader>
      {announcement && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`capitalize ${priorityClass[announcement.priority]}`}>
              {announcement.priority}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(announcement.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{announcement.message}</p>
          {announcement.createdBy && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Posted by {announcement.createdBy.name} ({announcement.createdBy.role})
            </p>
          )}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default AnnouncementDetailDialog;
