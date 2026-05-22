import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Megaphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Announcement {
  id: string | number;
  title: string;
  message: string;
  priority: 'urgent' | 'normal' | 'info';
  createdAt: string;
  createdBy: { name: string; role: string };
}

const fetchAnnouncements = (): Promise<Announcement[]> =>
  new Promise((res) => setTimeout(() => res([]), 0));

const priorityBadge = (p: Announcement['priority']) => {
  const map = {
    urgent: 'bg-destructive/10 text-destructive border-destructive/20',
    normal: 'bg-primary/10 text-primary border-primary/20',
    info: 'bg-muted text-muted-foreground',
  } as const;
  return <Badge variant="outline" className={map[p]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
};

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal' as Announcement['priority'] });

  const canCreate = user?.role === 'admin' || user?.role === 'coordinator';

  useEffect(() => {
    fetchAnnouncements().then(setItems);
  }, []);

  const handleCreate = () => {
    if (!form.title || !form.message) {
      toast.error('Please fill in title and message');
      return;
    }
    toast.success('Announcement created (UI only)');
    setOpen(false);
    setForm({ title: '', message: '', priority: 'normal' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">Stay updated with important updates and communications</p>
        </div>
        {canCreate && (
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Create Announcement
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="sfh-card">
          <CardContent className="p-0">
            <EmptyState icon={Megaphone} title="No announcements yet" description="Important updates will appear here." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card key={a.id} className="sfh-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {a.createdAt} • {a.createdBy.name} ({a.createdBy.role})
                      </p>
                    </div>
                  </div>
                  {priorityBadge(a.priority)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Send a message to your team. (UI only — backend not connected)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Write your message..." />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v: Announcement['priority']) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AnnouncementsPage;
