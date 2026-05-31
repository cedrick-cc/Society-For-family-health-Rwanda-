import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  LogOut,
  User,
  ChevronDown,
  Sun,
  Moon,
  MessageSquare,
} from 'lucide-react';
import { useAuth, roleLabels, roleColors } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MessagesModal from '@/components/modals/MessagesModal';
import UserProfileModal from '@/components/modals/UserProfileModal';
import { fetchNotifications } from '@/lib/api';
import {
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  getMessageUnreadTotal,
} from '@/services/api';
import UserAvatar from '@/components/UserAvatar';

const TopHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [notifications, setNotifications] = useState<
    Array<{
      id: number | string;
      title: string;
      message: string;
      time: string;
      unread: boolean;
      linkPath?: string;
      category?: string;
    }>
  >([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const [headerNotifUnread, setHeaderNotifUnread] = useState(0);
  const [headerMsgUnread, setHeaderMsgUnread] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const [n, m] = await Promise.all([getUnreadNotificationCount(), getMessageUnreadTotal()]);
      setHeaderNotifUnread(typeof n?.count === 'number' ? n.count : 0);
      setHeaderMsgUnread(typeof m?.count === 'number' ? m.count : 0);
    } catch {
      setHeaderNotifUnread(0);
      setHeaderMsgUnread(0);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setNotifications(list);
    } catch {
      setNotifications([]);
    }
    await refreshBadges();
  }, [refreshBadges]);

  useEffect(() => {
    refreshBadges();
    const t = window.setInterval(refreshBadges, 12000);
    return () => window.clearInterval(t);
  }, [refreshBadges]);

  useEffect(() => {
    if (showNotifications) refreshNotifications();
  }, [showNotifications, refreshNotifications]);

  useEffect(() => {
    if (!showMessages) refreshBadges();
  }, [showMessages, refreshBadges]);

  const handleNotifClick = async (
    id: string | number,
    linkPath?: string
  ) => {
    try {
      await markNotificationRead(String(id));
      if (linkPath) {
        navigate(linkPath);
        setShowNotifications(false);
      }
      await refreshNotifications();
    } catch {
      /* ignore */
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'unread' && !n.unread) return false;
    const q = notifSearch.trim().toLowerCase();
    if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await refreshNotifications();
      setShowNotifications(false);
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6">
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative group"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <Sun className={cn(
            "h-5 w-5 transition-all",
            theme === 'dark' ? "rotate-0 scale-100" : "rotate-90 scale-0"
          )} />
          <Moon className={cn(
            "absolute h-5 w-5 transition-all",
            theme === 'light' ? "rotate-0 scale-100" : "-rotate-90 scale-0"
          )} />
        </Button>

        {/* Messages */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-primary/10 transition-colors"
          onClick={() => setShowMessages(true)}
        >
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          {headerMsgUnread > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
          )}
          {headerMsgUnread > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-0.5 -right-0.5 h-5 min-w-[1.25rem] px-1 text-[10px] bg-success text-success-foreground border-0 pointer-events-none"
            >
              {headerMsgUnread > 99 ? '99+' : headerMsgUnread}
            </Badge>
          )}
        </Button>

        <MessagesModal open={showMessages} onOpenChange={setShowMessages} />

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-primary/10 transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {headerNotifUnread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
            )}
            {headerNotifUnread > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-5 min-w-[1.25rem] px-1 text-[10px] pointer-events-none"
              >
                {headerNotifUnread > 99 ? '99+' : headerNotifUnread}
              </Badge>
            )}
          </Button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5 flex items-center gap-3">
                    <UserAvatar sizeClass="h-10 w-10" className="ring-2 ring-background shadow-md" />
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                  </div>
                  <div className="px-4 py-2 border-b space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search notifications…"
                        className="pl-8 h-8 text-xs"
                        value={notifSearch}
                        onChange={(e) => setNotifSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={notifFilter === 'all' ? 'secondary' : 'ghost'}
                        onClick={() => setNotifFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant={notifFilter === 'unread' ? 'secondary' : 'ghost'}
                        onClick={() => setNotifFilter('unread')}
                      >
                        Unread
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      filteredNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotifClick(notif.id, notif.linkPath)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleNotifClick(notif.id, notif.linkPath)
                          }
                          className={cn(
                            'p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors text-left w-full border-l-4',
                            notif.unread ? 'bg-primary/5 border-l-primary' : 'border-l-transparent'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {notif.unread && (
                              <span className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0 animate-pulse" />
                            )}
                            <div className={cn(!notif.unread && 'ml-5')}>
                              <p className="text-sm font-medium text-foreground">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t bg-muted/30">
                    <Button
                      variant="ghost"
                      className="w-full text-sm text-primary hover:text-primary hover:bg-primary/10"
                      onClick={handleMarkAll}
                    >
                      Mark all as read
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-2" />

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 hover:bg-primary/10 rounded-xl px-3 py-2 transition-colors"
          >
            <UserAvatar sizeClass="h-9 w-9" className="shadow-md ring-2 ring-background" />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user && roleLabels[user.role]}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-secondary/10">
                    <div className="flex items-center gap-3">
                      <UserAvatar sizeClass="h-12 w-12" className="shadow-lg ring-2 ring-background" />
                      <div>
                        <p className="font-semibold text-foreground">{user?.name}</p>
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-xs font-medium border mt-1',
                            user && roleColors[user.role]
                          )}
                        >
                          {user && roleLabels[user.role]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowProfile(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-primary/10 transition-colors text-left text-foreground"
                    >
                      <User className="w-4 h-4 text-primary" />
                      My Profile
                    </button>
                  </div>
                  <div className="p-2 border-t">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <UserProfileModal open={showProfile} onOpenChange={setShowProfile} />
    </header>
  );
};

export default TopHeader;
