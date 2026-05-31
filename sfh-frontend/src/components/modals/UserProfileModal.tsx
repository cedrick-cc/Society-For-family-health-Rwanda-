import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth, roleLabels, roleColors, type UserRole } from '@/contexts/AuthContext';
import { 
  User, 
  Mail,
  Building2, 
  Edit,
  Save,
  X,
  Key,
  Upload,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { changeMyPassword, getMyProfile, updateMyProfile, uploadProfilePhoto } from '@/services/api';
import { getProfileImageAbsoluteUrl } from '@/lib/profileImage';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onOpenChange }) => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    role: user?.role || 'volunteer',
    createdAt: '',
    lastLogin: '',
    profileImage: user?.profileImage || '',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [volunteerProfile, setVolunteerProfile] = useState({
    skills: '',
    certifications: '',
    yearsOfExperience: 0,
    volunteerDistrict: '',
    bio: '',
    volunteerOpsStatus: 'AVAILABLE',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile();
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        department: profile.department || '',
        role: String(profile.role || '').toLowerCase(),
        createdAt: profile.createdAt || '',
        lastLogin: profile.lastLogin || '',
        profileImage: profile.profileImage || '',
      });
      setPreviewUrl(null);
      const r = String(profile.role || '').toUpperCase();
      if (r === 'VOLUNTEER') {
        setVolunteerProfile({
          skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
          certifications: Array.isArray(profile.certifications) ? profile.certifications.join(', ') : '',
          yearsOfExperience: Number(profile.yearsOfExperience) || 0,
          volunteerDistrict: profile.volunteerDistrict || '',
          bio: profile.bio || '',
          volunteerOpsStatus: profile.volunteerOpsStatus || 'AVAILABLE',
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load profile.');
    }
  };

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const handleSave = async () => {
    setIsSavingProfile(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        department: formData.department,
      };
      if (String(formData.role).toUpperCase() === 'VOLUNTEER') {
        payload.skills = volunteerProfile.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        payload.certifications = volunteerProfile.certifications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        payload.yearsOfExperience = volunteerProfile.yearsOfExperience;
        payload.volunteerDistrict = volunteerProfile.volunteerDistrict || null;
        payload.bio = volunteerProfile.bio || null;
        payload.volunteerOpsStatus = volunteerProfile.volunteerOpsStatus;
      }

      const response = await updateMyProfile(payload);

      const updatedProfile = response.user;
      updateUser({
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: String(updatedProfile.role || '').toLowerCase(),
        department: updatedProfile.department || '',
        profileImage: updatedProfile.profileImage || undefined,
      });

      setIsEditing(false);
      toast.success(response.message || 'Profile updated successfully.');
      await loadProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please enter current and new password.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(response.message || 'Password changed successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadProfile();
  };

  const displayImageSrc = previewUrl || getProfileImageAbsoluteUrl(formData.profileImage);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller.');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const fd = new FormData();
    fd.append('profileImage', file);

    setIsUploadingPhoto(true);
    try {
      const data = await uploadProfilePhoto(fd);
      const path = data.profileImage as string;
      setFormData((prev) => ({ ...prev, profileImage: path }));
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);

      if (data.user) {
        updateUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: String(data.user.role || '').toLowerCase() as UserRole,
          department: data.user.department || '',
          profileImage: path,
        });
      }

      toast.success(data.message || 'Profile photo updated.');
      await loadProfile();
    } catch (error) {
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            My Profile
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6 space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 shadow-inner">
              <div className="relative flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24 ring-2 ring-primary/20 shadow-lg">
                  {displayImageSrc ? (
                    <AvatarImage src={displayImageSrc} alt={formData.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                    {(formData.name || 'User')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background/60 backdrop-blur-md border-primary/20"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploadingPhoto ? 'Uploading...' : 'Upload photo'}
                </Button>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold">{formData.name}</h3>
                <p className="text-muted-foreground">{formData.email}</p>
                <Badge
                  className={cn(
                    'mt-2',
                    roleColors[formData.role as keyof typeof roleColors]
                  )}
                >
                  {roleLabels[formData.role as keyof typeof roleLabels]}
                </Badge>
              </div>
              <div className="flex-1" />
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSavingProfile}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingProfile ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={cn(!isEditing && 'bg-muted')}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Department
                </Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={!isEditing}
                  className={cn(!isEditing && 'bg-muted')}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Member Since
                </Label>
                <Input
                  value={formData.createdAt ? new Date(formData.createdAt).toLocaleDateString() : 'N/A'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {String(formData.role).toUpperCase() === 'VOLUNTEER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2 sm:col-span-2">
                  <Label>About / bio</Label>
                  <Textarea
                    value={volunteerProfile.bio}
                    onChange={(e) => setVolunteerProfile((v) => ({ ...v, bio: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                    className={cn(!isEditing && 'bg-muted')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Home district</Label>
                  <Input
                    value={volunteerProfile.volunteerDistrict}
                    onChange={(e) => setVolunteerProfile((v) => ({ ...v, volunteerDistrict: e.target.value }))}
                    disabled={!isEditing}
                    className={cn(!isEditing && 'bg-muted')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years of experience</Label>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    value={volunteerProfile.yearsOfExperience}
                    onChange={(e) =>
                      setVolunteerProfile((v) => ({ ...v, yearsOfExperience: Number(e.target.value) || 0 }))
                    }
                    disabled={!isEditing}
                    className={cn(!isEditing && 'bg-muted')}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input
                    value={volunteerProfile.skills}
                    onChange={(e) => setVolunteerProfile((v) => ({ ...v, skills: e.target.value }))}
                    disabled={!isEditing}
                    className={cn(!isEditing && 'bg-muted')}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Certifications (comma-separated)</Label>
                  <Input
                    value={volunteerProfile.certifications}
                    onChange={(e) => setVolunteerProfile((v) => ({ ...v, certifications: e.target.value }))}
                    disabled={!isEditing}
                    className={cn(!isEditing && 'bg-muted')}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Operational availability</Label>
                  <Select
                    value={volunteerProfile.volunteerOpsStatus}
                    onValueChange={(val) => setVolunteerProfile((v) => ({ ...v, volunteerOpsStatus: val }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className={cn(!isEditing && 'bg-muted')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="ON_LEAVE">On leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <div className="p-6 border rounded-xl space-y-4">
              <h4 className="font-medium">Change Password</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
                <Button variant="outline" onClick={handlePasswordChange} disabled={isChangingPassword}>
                  <Key className="w-4 h-4 mr-2" />
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>

            <div className="p-6 border rounded-xl">
              <h4 className="font-medium mb-4">Recent Sessions</h4>
              <p className="text-sm text-muted-foreground">No recent sessions available</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
