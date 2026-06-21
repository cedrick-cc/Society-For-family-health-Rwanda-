import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  HeartHandshake,
  MapPin,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Shield,
  Bell,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useState } from 'react';
import sfhLogo from '@/assets/sfh-logo.png';
import UserAvatar from '@/components/UserAvatar';

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
  badge?: string;
}

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['admin', 'coordinator', 'field_manager', 'analyst', 'volunteer'],
  },
  {
    title: 'Outreach Programs',
    icon: CalendarRange,
    path: '/dashboard/programs',
    roles: ['admin', 'coordinator', 'field_manager', 'analyst'],
  },
  {
    title: 'Volunteers',
    icon: Users,
    path: '/dashboard/volunteers',
    roles: ['admin', 'coordinator', 'field_manager'],
  },
  {
    title: 'Beneficiaries',
    icon: HeartHandshake,
    path: '/dashboard/beneficiaries',
    roles: ['admin', 'coordinator', 'field_manager', 'volunteer'],
  },
  {
    title: 'Geographic Tracking',
    icon: MapPin,
    path: '/dashboard/geographic',
    roles: ['admin', 'coordinator', 'field_manager', 'analyst', 'volunteer'],
    badge: 'Map',
  },
  {
    title: 'Reports & Analytics',
    icon: BarChart3,
    path: '/dashboard/analytics',
    roles: ['admin', 'coordinator', 'analyst'],
  },
  {
    title: 'Resources',
    icon: Package,
    path: '/dashboard/resources',
    roles: ['admin', 'coordinator'],
  },
];

const systemNavItems: NavItem[] = [
  {
    title: 'User Management',
    icon: Shield,
    path: '/dashboard/users',
    roles: ['admin'],
  },
  {
    title: 'Audit Logs',
    icon: FileText,
    path: '/dashboard/audit',
    roles: ['admin'],
  },
  {
    title: 'Announcements',
    icon: Bell,
    path: '/dashboard/announcements',
    roles: ['admin', 'coordinator', 'field_manager', 'analyst', 'volunteer'],
  },
];

const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = user?.role || 'volunteer';

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => item.roles.includes(userRole));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen sticky top-0 flex flex-col border-r border-sidebar-border"
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
            <img src={sfhLogo} alt="SFH Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-sm font-display font-bold text-sidebar-foreground whitespace-nowrap">
                SFH Rwanda
              </h1>
              <p className="text-xs text-sidebar-muted whitespace-nowrap">OMS</p>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider px-3 mb-2">
              Main Menu
            </p>
          )}
          {filterByRole(mainNavItems).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active || isActive(item.path)
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1 whitespace-nowrap">{item.title}</span>
              )}
              {!collapsed && item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* System Navigation */}
        {filterByRole(systemNavItems).length > 0 && (
          <div className="mt-6 space-y-1">
            {!collapsed && (
              <p className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider px-3 mb-2">
                System
              </p>
            )}
            {filterByRole(systemNavItems).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="flex-1 whitespace-nowrap">{item.title}</span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Signed-in user */}
      {user && (
        <div className="p-3 border-t border-sidebar-border">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50 backdrop-blur-sm',
              collapsed && 'justify-center px-2'
            )}
          >
            <UserAvatar
              sizeClass="h-9 w-9"
              className="ring-2 ring-sidebar-border shrink-0"
              fallbackClassName="from-primary/80 to-primary text-primary-foreground text-xs"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-muted truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default AppSidebar;
