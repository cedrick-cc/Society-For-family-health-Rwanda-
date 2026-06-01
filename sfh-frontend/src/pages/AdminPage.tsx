import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '@/lib/api';
import { getUsers, getPendingUsers, approveUser, rejectUser, deactivateUser, activateUser, resetUserPassword, updateUser } from '@/services/api';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Calendar,
  Clock,
  FileText,
  Bell,
  Settings,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import AddUserModal from '@/components/modals/AddUserModal';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt: string;
  volunteerOpsStatus?: string;
  skills?: string[];
  volunteerDistrict?: string;
}

interface AuditLog {
  id: number;
  user: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string | null;
  createdAt: string;
  lastLogin?: string | null;
  volunteerOpsStatus?: string;
  skills?: string[];
  volunteerDistrict?: string | null;
}

const roleTabConfig = [
  { key: 'administrators', role: 'admin', label: 'Administrators' },
  { key: 'coordinators', role: 'coordinator', label: 'Coordinators' },
  { key: 'field_managers', role: 'field_manager', label: 'Field Managers' },
  { key: 'volunteers', role: 'volunteer', label: 'Volunteers' },
  { key: 'analysts', role: 'analyst', label: 'Analysts' },
] as const;

type RoleTabKey = (typeof roleTabConfig)[number]['key'];
const roleValueOptions = ['ADMIN', 'COORDINATOR', 'FIELD_MANAGER', 'ANALYST', 'VOLUNTEER'] as const;
const statusValueOptions = ['ACTIVE', 'PENDING', 'INACTIVE'] as const;

const toBackendRole = (role: string) => role.toUpperCase();
const toBackendStatus = (status: string) => status.toUpperCase();

const formatRoleLabel = (role: string) =>
  role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatLastLogin = (value?: string | null) => {
  if (!value) return 'Never logged in';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never logged in';
  return date.toLocaleString();
};

const AdminPage: React.FC = () => {
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleUserTab, setRoleUserTab] = useState<RoleTabKey>('administrators');
  const [showAddUser, setShowAddUser] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; email: string; password: string }>({ open: false, email: '', password: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState('COORDINATOR');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editVolunteerOps, setEditVolunteerOps] = useState('AVAILABLE');
  const [editSkills, setEditSkills] = useState('');
  const [editVolunteerDistrict, setEditVolunteerDistrict] = useState('');

  const normalizeUser = (user: BackendUser): SystemUser => ({
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: String(user.role || '').toLowerCase(),
    department: user.department || '',
    status: String(user.status || '').toLowerCase() as SystemUser['status'],
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt,
    volunteerOpsStatus: user.volunteerOpsStatus,
    skills: user.skills,
    volunteerDistrict: user.volunteerDistrict || undefined,
  });

  const loadUsers = async () => {
    try {
      const users = await getUsers();
      setSystemUsers((users || []).map(normalizeUser));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users.');
    }
  };

  const loadPendingUsers = async () => {
    try {
      const pendingUsers = await getPendingUsers();
      setPendingApprovals((pendingUsers || []).map(normalizeUser));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load pending users.');
    }
  };

  const refreshUsersData = async () => {
    await Promise.all([loadUsers(), loadPendingUsers()]);
  };

  useEffect(() => {
    refreshUsersData();
    fetchAuditLogs().then((data) => setAuditLogs(data as AuditLog[]));
  }, []);

  const [pendingApprovals, setPendingApprovals] = useState<SystemUser[]>([]);

  const handleApprove = async (id: string) => {
    try {
      const response = await approveUser(id);
      toast.success(response.message || 'User approved successfully.');
      await refreshUsersData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve user.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await rejectUser(id);
      toast.success(response.message || 'User rejected successfully.');
      await refreshUsersData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject user.');
    }
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditDepartment(user.department || '');
    setEditRole(toBackendRole(user.role));
    setEditStatus(toBackendStatus(user.status));
    if (user.role === 'volunteer') {
      setEditVolunteerOps(user.volunteerOpsStatus || 'AVAILABLE');
      setEditSkills((user.skills || []).join(', '));
      setEditVolunteerDistrict(user.volunteerDistrict || '');
    } else {
      setEditVolunteerOps('AVAILABLE');
      setEditSkills('');
      setEditVolunteerDistrict('');
    }
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;

    try {
      const payload: Record<string, unknown> = {
        name: editName,
        department: editDepartment,
        role: editRole,
        status: editStatus,
      };
      if (editRole === 'VOLUNTEER') {
        payload.volunteerOpsStatus = editVolunteerOps;
        payload.skills = editSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        payload.volunteerDistrict = editVolunteerDistrict.trim() || null;
      }
      const response = await updateUser(editingUserId, payload);
      toast.success(response.message || 'User updated successfully.');
      setEditModalOpen(false);
      await refreshUsersData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user.');
    }
  };

  const handleDeactivate = async (user: SystemUser) => {
    try {
      const response = await deactivateUser(user.id);
      toast.success(response.message || `${user.name} deactivated.`);
      await refreshUsersData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user.');
    }
  };

  const handleActivate = async (user: SystemUser) => {
    try {
      const response = await activateUser(user.id);
      toast.success(response.message || `${user.name} activated.`);
      await refreshUsersData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate user.');
    }
  };

  const handleResetPassword = async (user: SystemUser) => {
    try {
      const response = await resetUserPassword(user.id);
      setResetPasswordModal({
        open: true,
        email: user.email,
        password: response.temporaryPassword || '',
      });
      toast.success(response.message || 'Password reset successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20 border">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-muted text-muted-foreground border">Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning border-warning/20 border">Pending</Badge>;
      default:
        return null;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info':
        return <Info className="w-4 h-4 text-info" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'critical':
        return <ShieldAlert className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const searchActive = searchQuery.trim().length > 0;
  const searchLower = searchQuery.trim().toLowerCase();

  const userMatchesSearch = (user: SystemUser) =>
    user.name.toLowerCase().includes(searchLower) ||
    user.email.toLowerCase().includes(searchLower) ||
    user.role.toLowerCase().includes(searchLower) ||
    formatRoleLabel(user.role).toLowerCase().includes(searchLower);

  const globalSearchResults = searchActive ? systemUsers.filter(userMatchesSearch) : [];

  const filteredUsersForTab = (tabRole: string) => {
    if (searchActive) return globalSearchResults;
    return systemUsers.filter((user) => user.role === tabRole);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">System Administration</h1>
          <p className="text-muted-foreground mt-1">
            Manage users and system settings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{systemUsers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{systemUsers.filter((u) => u.status === 'active').length}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{systemUsers.filter((u) => u.status === 'pending').length}</p>
            </div>
          </div>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Security Alerts</p>
              <p className="text-2xl font-bold">{auditLogs.filter((l) => l.severity === 'critical').length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search all users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button className="gap-2" onClick={() => setShowAddUser(true)}>
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </div>

          <AddUserModal open={showAddUser} onOpenChange={setShowAddUser} onUserCreated={refreshUsersData} />

          {searchActive ? (
            <Card className="sfh-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Search results ({globalSearchResults.length})
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Login</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalSearchResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No users match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      globalSearchResults.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                  {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{formatRoleLabel(user.role)}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.department}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatLastLogin(user.lastLogin)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                  <Key className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                {user.status === 'inactive' ? (
                                  <DropdownMenuItem onClick={() => handleActivate(user)}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeactivate(user)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <Tabs value={roleUserTab} onValueChange={(v) => setRoleUserTab(v as RoleTabKey)} className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
                {roleTabConfig.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="text-xs sm:text-sm">
                    {tab.label}
                    <span className="ml-1.5 text-muted-foreground">
                      ({systemUsers.filter((u) => u.role === tab.role).length})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {roleTabConfig.map((tab) => {
                const tabUsers = filteredUsersForTab(tab.role);
                return (
                  <TabsContent key={tab.key} value={tab.key} className="mt-4">
                    <Card className="sfh-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-semibold">User</TableHead>
                              <TableHead className="font-semibold">Department</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="font-semibold">Last Login</TableHead>
                              <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tabUsers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                  No {tab.label.toLowerCase()} found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              tabUsers.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30">
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{user.department}</TableCell>
                                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{formatLastLogin(user.lastLogin)}</TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModal(user)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                          <Key className="w-4 h-4 mr-2" />
                                          Reset Password
                                        </DropdownMenuItem>
                                        {user.status === 'inactive' ? (
                                          <DropdownMenuItem onClick={() => handleActivate(user)}>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Activate
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeactivate(user)}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Deactivate
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          <Card className="sfh-card">
            <CardHeader>
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending users.</p>
              ) : (
                pendingApprovals.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Role: {user.role} {user.department ? `• ${user.department}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleApprove(user.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(user.id)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
      </div>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModal.open} onOpenChange={(open) => setResetPasswordModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <DialogTitle className="text-lg">Password Reset Successful</DialogTitle>
            </div>
            <DialogDescription>A new temporary password has been generated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{resetPasswordModal.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">New Temporary Password</p>
                  <p className="font-mono font-medium text-sm">{resetPasswordModal.password}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(resetPasswordModal.password); toast.success('Copied'); }}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
              <ShieldAlert className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">Share this password securely. The user should change it upon first login.</p>
            </div>
            <Button className="w-full" onClick={() => setResetPasswordModal({ open: false, email: '', password: '' })}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and save changes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Name</p>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Department</p>
              <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Role</p>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleValueOptions.map((roleOption) => (
                      <SelectItem key={roleOption} value={roleOption}>
                        {formatRoleLabel(roleOption)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusValueOptions.map((statusOption) => (
                      <SelectItem key={statusOption} value={statusOption}>
                        {formatRoleLabel(statusOption)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editRole === 'VOLUNTEER' && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Volunteer operations</p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <Select value={editVolunteerOps} onValueChange={setEditVolunteerOps}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="ON_LEAVE">On leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Skills (comma-separated)</p>
                  <Input value={editSkills} onChange={(e) => setEditSkills(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Home district</p>
                  <Input value={editVolunteerDistrict} onChange={(e) => setEditVolunteerDistrict(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminPage;
