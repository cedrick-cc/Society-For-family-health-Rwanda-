import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/services/api';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'urgent' | 'normal' | 'info';
  createdAt: string;
  createdBy: { name: string; role: string };
}

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
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal' as Announcement['priority'] });

  const canManage = user?.role === 'admin';

  const load = useCallback(() => {
    getAnnouncements()
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', message: '', priority: 'normal' });
    setOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, message: a.message, priority: a.priority });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    try {
      if (editing) {
        await updateAnnouncement(editing.id, {
          title: form.title,
          message: form.message,
          priority: form.priority.toUpperCase(),
        });
        toast.success('Announcement updated.');
      } else {
        await createAnnouncement({
          title: form.title,
          message: form.message,
          priority: form.priority.toUpperCase(),
        });
        toast.success('Announcement published.');
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAnnouncement(deleteTarget.id);
      toast.success('Announcement removed.');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">Team-wide updates synced across all dashboards</p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Create Announcement
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="sfh-card">
          <CardContent className="p-0">
            <EmptyState icon={Megaphone} title="No announcements yet" description="Important updates will appear here for all users." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card key={a.id} className="sfh-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(a.createdAt).toLocaleString()} · {a.createdBy.name} ({a.createdBy.role})
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {priorityBadge(a.priority)}
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(a)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit announcement' : 'Create announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} />
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
            <Button onClick={handleSave}>{editing ? 'Save changes' : 'Publish'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the announcement for all users immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default AnnouncementsPage;
