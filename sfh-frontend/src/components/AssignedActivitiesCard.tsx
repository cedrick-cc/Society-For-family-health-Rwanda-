import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { getScheduledActivities } from '@/services/api';

type ScheduledActivity = {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  district: string;
  programTitle?: string | null;
};

const AssignedActivitiesCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [items, setItems] = useState<ScheduledActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getScheduledActivities()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const sorted = [...list].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setItems(compact ? sorted.slice(0, 4) : sorted.slice(0, 8));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [compact]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="sfh-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Assigned Activities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled activities"
            description="Activities assigned to you will appear here."
            compact
          />
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="rounded-lg border p-3 space-y-1.5">
                <p className="text-sm font-semibold">{a.title}</p>
                {a.programTitle && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {a.programTitle}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(a.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {a.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {a.district}
                  </span>
                </div>
                {a.description && !compact && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignedActivitiesCard;
