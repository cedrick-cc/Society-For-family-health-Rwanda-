import React, { useEffect, useState } from 'react';
import { fetchVolunteers } from '@/lib/api';
import { deactivateVolunteer } from '@/services/api';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Eye,
  Edit,
  UserX,
  Award,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AddVolunteerModal from '@/components/modals/AddVolunteerModal';
import VolunteerProfileModal from '@/components/modals/VolunteerProfileModal';
import EditVolunteerModal from '@/components/modals/EditVolunteerModal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Volunteer {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  location: string;
  district: string;
  status: 'active' | 'inactive' | 'on_leave';
  skills: string[];
  certifications: string[];
  joinDate: string;
  programsCompleted: number;
  beneficiariesServed: number;
  currentProgram?: string;
  volunteerOpsStatus?: string;
  assignedProgramsCount?: number;
  taskSummary?: string;
  activitySummary?: string;
}

const VolunteersPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'coordinator';
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editVolunteer, setEditVolunteer] = useState<Volunteer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Volunteer | null>(null);

  const loadVolunteers = () => {
    setLoading(true);
    fetchVolunteers()
      .then((data) => setVolunteers(data as Volunteer[]))
      .catch(() => setVolunteers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVolunteers();
  }, []);

  const openProfile = (v: Volunteer) => {
    setProfileId(String(v.id));
    setProfileOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20 border">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-muted text-muted-foreground border">Inactive</Badge>;
      case 'on_leave':
        return <Badge className="bg-warning/10 text-warning border-warning/20 border">On Leave</Badge>;
      default:
        return null;
    }
  };

  const filteredVolunteers = volunteers.filter((volunteer) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      volunteer.name.toLowerCase().includes(q) ||
      volunteer.email.toLowerCase().includes(q) ||
      volunteer.district.toLowerCase().includes(q) ||
      (volunteer.skills || []).some((s) => s.toLowerCase().includes(q)) ||
      (volunteer.certifications || []).some((c) => c.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || volunteer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: volunteers.length,
    active: volunteers.filter((v) => v.status === 'active').length,
    totalServed: volunteers.reduce((acc, v) => acc + v.beneficiariesServed, 0),
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateVolunteer(String(deactivateTarget.id));
      toast.success(`${deactivateTarget.name} has been deactivated.`);
      setDeactivateTarget(null);
      loadVolunteers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deactivate failed.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Volunteer Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage community health volunteers and track their contributions
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddVolunteer(true)}>
          <Plus className="w-4 h-4" />
          Add Volunteer
        </Button>
      </div>

      <AddVolunteerModal open={showAddVolunteer} onOpenChange={setShowAddVolunteer} />
      <VolunteerProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        volunteerId={profileId}
      />
      <EditVolunteerModal
        open={editOpen}
        onOpenChange={setEditOpen}
        volunteer={editVolunteer}
        onSaved={loadVolunteers}
      />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate volunteer?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.name} will be set to inactive and will no longer be assignable to programs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Volunteers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Served</p>
              <p className="text-2xl font-bold text-primary">{stats.totalServed.toLocaleString()}</p>
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
                placeholder="Search volunteers by name, email, or district..."
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
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVolunteers.map((volunteer, index) => (
          <motion.div
            key={volunteer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="sfh-card h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={volunteer.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {volunteer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base font-semibold">{volunteer.name}</CardTitle>
                      <div className="mt-1">{getStatusBadge(volunteer.status)}</div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openProfile(volunteer)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      {canManage && (
                        <DropdownMenuItem
                          onClick={() => {
                            setEditVolunteer(volunteer);
                            setEditOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                      )}
                      {canManage && volunteer.status !== 'inactive' && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeactivateTarget(volunteer)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{volunteer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{volunteer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{volunteer.location}, {volunteer.district}</span>
                  </div>
                </div>

                {volunteer.volunteerOpsStatus && (
                  <p className="text-xs text-muted-foreground">
                    Ops status:{' '}
                    <span className="font-medium capitalize">
                      {volunteer.volunteerOpsStatus.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    {volunteer.assignedProgramsCount != null && (
                      <> · {volunteer.assignedProgramsCount} program(s)</>
                    )}
                  </p>
                )}

                {volunteer.currentProgram && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground">Currently assigned to</p>
                    <p className="text-sm font-medium text-primary mt-0.5">{volunteer.currentProgram}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {volunteer.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs font-normal">
                        {skill}
                      </Badge>
                    ))}
                    {volunteer.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{volunteer.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-1">
                    {volunteer.certifications.map((cert) => (
                      <Badge
                        key={cert}
                        className="bg-accent/10 text-accent border-accent/20 border text-xs font-normal gap-1"
                      >
                        <Award className="w-3 h-3" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{volunteer.programsCompleted}</p>
                    <p className="text-xs text-muted-foreground">Programs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{volunteer.beneficiariesServed}</p>
                    <p className="text-xs text-muted-foreground">Served</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => openProfile(volunteer)}>
                  View Full Profile
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {!loading && filteredVolunteers.length === 0 && (
        <EmptyState
          icon={Users}
          title={volunteers.length === 0 ? 'No volunteers available' : 'No matching volunteers'}
          description={
            volunteers.length === 0
              ? 'Volunteers will appear here once registered and approved in the system.'
              : 'Try adjusting your search or status filter.'
          }
        />
      )}
    </motion.div>
  );
};

export default VolunteersPage;
