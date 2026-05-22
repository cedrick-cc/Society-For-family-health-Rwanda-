import React, { useCallback, useState } from 'react';
import type { Program } from '@/lib/api';
import type { ApiProgram } from '@/lib/entityMappers';
import { mapApiProgramToUI } from '@/lib/entityMappers';
import { getPrograms, deleteProgram } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  HeartHandshake,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Clock,
  Target,
  ArrowUpRight,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import CreateProgramModal from '@/components/modals/CreateProgramModal';
import { toast } from '@/hooks/use-toast';

const ProgramsPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  const [programs, setPrograms] = useState<Program[]>([]);
  const [rawPrograms, setRawPrograms] = useState<ApiProgram[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ApiProgram | null>(null);
  const [viewProgram, setViewProgram] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const raw = await getPrograms();
      const list = Array.isArray(raw) ? (raw as ApiProgram[]) : [];
      setRawPrograms(list);
      setPrograms(list.map((p) => mapApiProgramToUI(p) as Program));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load programs.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setPrograms([]);
      setRawPrograms([]);
    }
  }, []);

  React.useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Badge className="status-ongoing border">Ongoing</Badge>;
      case 'planned':
        return <Badge className="status-planned border">Planned</Badge>;
      case 'completed':
        return <Badge className="status-completed border">Completed</Badge>;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
    const matchesTab = activeTab === 'all' || program.status === activeTab;
    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: programs.length,
    ongoing: programs.filter((p) => p.status === 'ongoing').length,
    planned: programs.filter((p) => p.status === 'planned').length,
    completed: programs.filter((p) => p.status === 'completed').length,
  };

  const openCreate = () => {
    setProgramToEdit(null);
    setShowCreateProgram(true);
  };

  const openEdit = (id: string) => {
    const raw = rawPrograms.find((p) => p.id === id);
    if (!raw) return;
    setProgramToEdit(raw);
    setShowCreateProgram(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProgram(deleteTarget.id);
      toast({ title: 'Program deleted', description: deleteTarget.title });
      setDeleteTarget(null);
      await loadPrograms();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete program.';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Outreach Programs</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all community health outreach initiatives
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Create Program
          </Button>
        )}
      </div>

      <CreateProgramModal
        open={showCreateProgram}
        onOpenChange={(o) => {
          setShowCreateProgram(o);
          if (!o) setProgramToEdit(null);
        }}
        programToEdit={programToEdit}
        onCompleted={loadPrograms}
      />

      <Dialog open={!!viewProgram} onOpenChange={(o) => !o && setViewProgram(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewProgram?.name}</DialogTitle>
          </DialogHeader>
          {viewProgram && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{viewProgram.description}</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {viewProgram.district}
                {viewProgram.sector ? `, ${viewProgram.sector}` : ''}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(viewProgram.startDate).toLocaleDateString()} —{' '}
                {new Date(viewProgram.endDate).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Type: <span className="text-foreground font-medium">{viewProgram.type}</span>
              </p>
              {viewProgram.fieldManagerName && (
                <p className="text-xs text-muted-foreground">
                  Field manager: <span className="text-foreground font-medium">{viewProgram.fieldManagerName}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Volunteers</p>
                  <p className="font-semibold">
                    {viewProgram.assignedVolunteerCount ?? 0} / {viewProgram.volunteersNeeded ?? viewProgram.volunteers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Beneficiaries</p>
                  <p className="font-semibold">{viewProgram.beneficiaries}</p>
                </div>
              </div>
              {viewProgram.programResources && viewProgram.programResources.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Resources</p>
                  {viewProgram.programResources.map((pr, i) => {
                    const remaining = Math.max(0, pr.quantityAssigned - (pr.quantityUsed || 0));
                    return (
                      <p key={i} className="text-xs text-muted-foreground">
                        {pr.resource?.name}: {pr.quantityAssigned} assigned · {pr.quantityUsed || 0} used · {remaining} left
                      </p>
                    );
                  })}
                </div>
              )}
              {viewProgram.status !== 'planned' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Progress {viewProgram.progress}%</p>
                  <Progress value={viewProgram.progress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot;. Programs with assigned beneficiaries cannot be deleted until they are reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Programs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ongoing</p>
              <p className="text-2xl font-bold text-success">{stats.ongoing}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planned</p>
              <p className="text-2xl font-bold text-info">{stats.planned}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-accent">{stats.completed}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="sfh-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search programs by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="planned">Planned</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="sfh-card h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {getStatusBadge(program.status)}
                        <CardTitle className="text-lg font-semibold mt-2 line-clamp-1">
                          {program.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewProgram(program)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => openEdit(String(program.id))}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Program
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                const raw = rawPrograms.find((p) => p.id === program.id);
                                if (raw) setDeleteTarget(raw);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {program.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{program.district}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(program.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(program.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {program.status !== 'planned' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{program.progress}%</span>
                        </div>
                        <Progress value={program.progress} className="h-2" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Users className="w-3 h-3" />
                          Volunteers
                        </div>
                        <p className="text-lg font-semibold mt-0.5">
                          {program.assignedVolunteerCount ?? 0}/{program.volunteersNeeded ?? program.volunteers}
                        </p>
                        <p className="text-[10px] text-muted-foreground">assigned / needed</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <HeartHandshake className="w-3 h-3" />
                          Beneficiaries
                        </div>
                        <p className="text-lg font-semibold mt-0.5">
                          {program.beneficiaries.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {program.programResources && program.programResources.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1 flex-wrap">
                        <Package className="w-3 h-3 shrink-0" />
                        {program.programResources
                          .slice(0, 3)
                          .map((pr) => {
                            const left = Math.max(0, pr.quantityAssigned - (pr.quantityUsed || 0));
                            return `${pr.resource?.name} (${pr.quantityAssigned}/${pr.quantityUsed || 0}, ${left} left)`;
                          })
                          .join(' · ')}
                      </p>
                    ) : null}
                    {program.fieldManagerName && (
                      <p className="text-xs text-muted-foreground mt-1">FM: {program.fieldManagerName}</p>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Resources allocated</span>
                        <span className="font-medium">
                          {program.programResources?.reduce((s, pr) => s + pr.quantityAssigned, 0) ?? 0}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="mt-4 w-full gap-2"
                      onClick={() => setViewProgram(program)}
                    >
                      View Details
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredPrograms.length === 0 && (
            <EmptyState
              icon={Calendar}
              title="No programs yet"
              description="Create a program to see it listed here, or adjust your search and filters."
            />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ProgramsPage;
