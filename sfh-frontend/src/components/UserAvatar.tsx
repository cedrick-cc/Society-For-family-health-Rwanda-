import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, type User } from '@/contexts/AuthContext';
import { getProfileImageAbsoluteUrl } from '@/lib/profileImage';
import { cn } from '@/lib/utils';

function initialsFromName(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface UserAvatarProps {
  user?: User | null;
  className?: string;
  sizeClass?: string;
  fallbackClassName?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user: userProp,
  className,
  sizeClass = 'h-9 w-9',
  fallbackClassName,
}) => {
  const { user: ctxUser } = useAuth();
  const user = userProp ?? ctxUser;
  const name = user?.name || 'User';
  const src = getProfileImageAbsoluteUrl(user?.profileImage);

  return (
    <Avatar className={cn(sizeClass, className)}>
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-sm',
          fallbackClassName
        )}
      >
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
