import React, { useCallback, useState } from 'react';
import type { Beneficiary } from '@/lib/api';
import type { ApiBeneficiary } from '@/lib/entityMappers';
import { mapApiBeneficiaryToUI } from '@/lib/entityMappers';
import { getBeneficiaries, getBeneficiary, deleteBeneficiary } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Phone,
  MapPin,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Users,
  HeartHandshake,
  ShieldCheck,
  Clock,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import RegisterBeneficiaryModal from '@/components/modals/RegisterBeneficiaryModal';
import ScheduleActivityModal from '@/components/modals/ScheduleActivityModal';
import { toast } from '@/hooks/use-toast';

const BeneficiariesPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [rawBeneficiaries, setRawBeneficiaries] = useState<ApiBeneficiary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRegisterBeneficiary, setShowRegisterBeneficiary] = useState(false);
  const [beneficiaryToEdit, setBeneficiaryToEdit] = useState<ApiBeneficiary | null>(null);
  const [showScheduleFollowUp, setShowScheduleFollowUp] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileDetail, setProfileDetail] = useState<ApiBeneficiary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiBeneficiary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBeneficiaries = useCallback(async () => {
    try {
      const raw = await getBeneficiaries();
      const list = Array.isArray(raw) ? (raw as ApiBeneficiary[]) : [];
      setRawBeneficiaries(list);
      setBeneficiaries(list.map((b) => mapApiBeneficiaryToUI(b) as Beneficiary));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load beneficiaries.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setBeneficiaries([]);
      setRawBeneficiaries([]);
    }
  }, []);

  React.useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  const openProfile = async (id: string) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileDetail(null);
    try {
      const d = await getBeneficiary(id);
      setProfileDetail(d as ApiBeneficiary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load profile.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setProfileOpen(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const openRegister = () => {
    setBeneficiaryToEdit(null);
    setShowRegisterBeneficiary(true);
  };

  const openEdit = (id: string) => {
    const raw = rawBeneficiaries.find((b) => b.id === id);
    if (raw) {
      setBeneficiaryToEdit(raw);
      setShowRegisterBeneficiary(true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBeneficiary(deleteTarget.id);
      toast({ title: 'Removed', description: deleteTarget.fullName });
      setDeleteTarget(null);
      await loadBeneficiaries();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete beneficiary.';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20 border">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-muted text-muted-foreground border">Inactive</Badge>;
      case 'completed':
        return <Badge className="bg-accent/10 text-accent border-accent/20 border">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge className="bg-success/10 text-success border-success/20 border text-xs">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-warning border-warning/20 border text-xs">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 border text-xs">High Risk</Badge>;
      default:
        return null;
    }
  };

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.phone && b.phone.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: beneficiaries.length,
    active: beneficiaries.filter((b) => b.status === 'active').length,
    highRisk: beneficiaries.filter((b) => b.riskLevel === 'high').length,
    households: beneficiaries.reduce((acc, b) => acc + b.householdSize, 0),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Beneficiary Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage beneficiary profiles and track health services
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={openRegister}>
            <Plus className="w-4 h-4" />
            Register Beneficiary
          </Button>
        )}
      </div>

      <RegisterBeneficiaryModal
        open={showRegisterBeneficiary}
        onOpenChange={(o) => {
          setShowRegisterBeneficiary(o);
          if (!o) setBeneficiaryToEdit(null);
        }}
        beneficiaryToEdit={beneficiaryToEdit}
        onSaved={loadBeneficiaries}
      />
      <ScheduleActivityModal open={showScheduleFollowUp} onOpenChange={setShowScheduleFollowUp} />

      <Dialog open={profileOpen} onOpenChange={(o) => !o && setProfileOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Beneficiary profile</DialogTitle>
          </DialogHeader>
          {profileLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!profileLoading && profileDetail && (
            <div className="space-y-3 text-sm">
              <p className="text-lg font-semibold">{profileDetail.fullName}</p>
              <p className="text-muted-foreground">
                {profileDetail.age} yrs • {profileDetail.gender} • Household {profileDetail.householdSize}
              </p>
              {profileDetail.phone && (
                <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{profileDetail.phone}</p>
              )}
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {[profileDetail.village, profileDetail.sector, profileDetail.district].filter(Boolean).join(', ')}
              </p>
              {profileDetail.assignedProgram && (
                <p className="text-muted-foreground">
                  Program: <span className="text-foreground font-medium">{profileDetail.assignedProgram.title}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Registered {new Date(profileDetail.registrationDate).toLocaleString()}
              </p>
              {profileDetail.servicesReceived && profileDetail.servicesReceived.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profileDetail.servicesReceived.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove beneficiary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for {deleteTarget?.fullName}. This action cannot be undone.
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
              <HeartHandshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Beneficiaries</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <User className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Cases</p>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High Risk</p>
              <p className="text-2xl font-bold text-destructive">{stats.highRisk}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Household Members</p>
              <p className="text-2xl font-bold">{stats.households}</p>
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
                placeholder="Search by name, phone, or district..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="sfh-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Beneficiary</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Services</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Risk</TableHead>
              <TableHead className="font-semibold">Last Visit</TableHead>
              <TableHead className="font-semibold">Follow-up</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBeneficiaries.map((beneficiary) => (
              <TableRow key={beneficiary.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {beneficiary.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{beneficiary.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {beneficiary.age}y • {beneficiary.gender} • HH: {beneficiary.householdSize}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span>{beneficiary.location}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{beneficiary.district}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-48">
                    {beneficiary.services.slice(0, 2).map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs font-normal">
                        {service}
                      </Badge>
                    ))}
                    {beneficiary.services.length > 2 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{beneficiary.services.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(beneficiary.status)}</TableCell>
                <TableCell>{getRiskBadge(beneficiary.riskLevel)}</TableCell>
                <TableCell>
                  {beneficiary.lastVisit ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {new Date(beneficiary.lastVisit).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {beneficiary.followUpScheduled ? (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <Clock className="w-3 h-3" />
                      {new Date(beneficiary.followUpScheduled).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openProfile(String(beneficiary.id))}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => openEdit(String(beneficiary.id))}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => toast({ title: 'Service record', description: 'Coming soon.' })}>
                        <FileText className="w-4 h-4 mr-2" />
                        Add Service Record
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowScheduleFollowUp(true)}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Follow-up
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            const raw = rawBeneficiaries.find((b) => b.id === beneficiary.id);
                            if (raw) setDeleteTarget(raw);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredBeneficiaries.length === 0 && (
          <EmptyState
            icon={HeartHandshake}
            title="No beneficiaries yet"
            description="Register a beneficiary or adjust your search to see records here."
          />
        )}
      </Card>

      <Card className="sfh-card bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Data Privacy & Protection</p>
              <p className="text-xs text-muted-foreground mt-1">
                All beneficiary data is protected in compliance with Rwanda&apos;s Data Protection Law.
                Access is logged and monitored.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BeneficiariesPage;
