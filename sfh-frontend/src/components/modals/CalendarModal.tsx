import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { CalendarIcon, Clock, MapPin, Users } from 'lucide-react';
import { fetchCalendarEvents } from '@/lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  location: string;
  type: string;
  description?: string;
}

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ open, onOpenChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = () => {
    setLoading(true);
    fetchCalendarEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) loadEvents();
  }, [open]);

  const selectedDateEvents = events.filter(
    (event) => selectedDate && isSameDay(event.date, selectedDate)
  );

  const hasEventsOnDay = (date: Date) => events.some((event) => isSameDay(event.date, date));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Activity Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 flex-1 min-h-0 overflow-hidden">
          <div className="space-y-4 flex-shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-xl border p-3 pointer-events-auto"
              modifiers={{ hasEvent: (date) => hasEventsOnDay(date) }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(var(--primary))',
                },
              }}
            />
          </div>

          <div className="space-y-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </h3>
              <Button size="sm" variant="outline" onClick={loadEvents} disabled={loading}>
                Refresh
              </Button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto overscroll-contain min-h-0 pr-1">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading activities…</p>
              ) : selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No scheduled activities for this day
                </p>
              ) : (
                selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn('p-3 rounded-xl border bg-primary/5 border-primary/20')}
                  >
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-2">{event.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarModal;
