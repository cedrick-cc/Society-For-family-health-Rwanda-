import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Copy, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { createUser } from '@/services/api';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => Promise<void> | void;
}

const departments = [
  'IT Administration',
  'Program Management',
  'Field Operations',
  'M&E',
  'Finance',
  'Human Resources',
];

const roleOptions = [
  { label: 'System Administrator', value: 'ADMIN' },
  { label: 'Program Coordinator', value: 'COORDINATOR' },
  { label: 'Field Manager', value: 'FIELD_MANAGER' },
  { label: 'Data Analyst', value: 'ANALYST' },
];

const AddUserModal: React.FC<AddUserModalProps> = ({ open, onOpenChange, onUserCreated }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('active');
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole('');
    setDepartment('');
    setStatus('active');
    setShowCredentials(false);
    setGeneratedPassword('');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!fullName || !email || !role || !department) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createUser({
        name: fullName,
        email,
        role,
        department,
      });

      setGeneratedPassword(response.password || '');
      setShowCredentials(true);
      toast.success('User created successfully.');
      if (onUserCreated) {
        await onUserCreated();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (showCredentials) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <DialogTitle className="text-lg">User Created Successfully</DialogTitle>
            </div>
            <DialogDescription>
              Share these credentials securely with the user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(email)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Temporary Password</p>
                  <p className="font-mono font-medium text-sm">{generatedPassword}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(generatedPassword)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
              <ShieldAlert className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Please share these credentials securely with the user. They should change their password upon first login.
              </p>
            </div>

            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Add System User</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Create a new staff account with role-based access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g., Jean-Baptiste Uwimana" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Email Address <span className="text-destructive">*</span></Label>
            <Input type="email" placeholder="e.g., user@sfh.org.rw" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Department <span className="text-destructive">*</span></Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/50 border p-3">
            <p className="text-xs text-muted-foreground">
              Only system staff accounts are created by administrators. Volunteers must register via the public signup page.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1 gap-2" onClick={handleCreate} disabled={isSubmitting}>
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
