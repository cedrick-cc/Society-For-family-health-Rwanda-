import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Megaphone } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { getAnnouncements } from '@/services/api';
import { Link } from 'react-router-dom';

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: 'urgent' | 'normal' | 'info';
  createdAt: string;
};

const priorityClass = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  normal: 'bg-primary/10 text-primary border-primary/20',
  info: 'bg-muted text-muted-foreground',
};

const AnnouncementsCard: React.FC<{ compact?: boolean; showLink?: boolean }> = ({
  compact,
  showLink,
}) => {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    getAnnouncements()
      .then((rows) => setItems(Array.isArray(rows) ? rows.slice(0, compact ? 3 : 5) : []))
      .catch(() => setItems([]));
  }, [compact]);

  return (
    <Card className="sfh-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Announcements
        </CardTitle>
        {showLink && (
          <Link to="/dashboard/announcements" className="text-xs text-primary hover:underline">
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent className={compact ? 'space-y-2' : 'space-y-3'}>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="No announcements" description="Updates from your team will appear here." compact />
        ) : (
          items.map((a) => (
            <div key={a.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">{a.title}</p>
                <Badge variant="outline" className={`text-[10px] shrink-0 capitalize ${priorityClass[a.priority]}`}>
                  {a.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsCard;
