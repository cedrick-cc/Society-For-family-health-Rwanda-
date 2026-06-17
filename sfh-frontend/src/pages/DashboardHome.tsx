import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  HeartHandshake,
  MapPin,
  TrendingUp,
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDashboardStats, fetchPrograms, type DashboardStats, type Program } from '@/lib/api';
import CoordinatorDashboard from '@/pages/dashboards/CoordinatorDashboard';
import FieldManagerDashboard from '@/pages/dashboards/FieldManagerDashboard';
import AnalystDashboard from '@/pages/dashboards/AnalystDashboard';
import VolunteerDashboard from '@/pages/dashboards/VolunteerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Import modals
import CalendarModal from '@/components/modals/CalendarModal';
import CreateProgramModal from '@/components/modals/CreateProgramModal';
import RegisterBeneficiaryModal from '@/components/modals/RegisterBeneficiaryModal';
import ScheduleActivityModal from '@/components/modals/ScheduleActivityModal';
import GenerateReportModal from '@/components/modals/GenerateReportModal';
import ActivityFeed from '@/components/ActivityFeed';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();

  // Modal states (must be before early returns for hooks rules)
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [showRegisterBeneficiary, setShowRegisterBeneficiary] = useState(false);
  const [showScheduleActivity, setShowScheduleActivity] = useState(false);
  const [showGenerateReport, setShowGenerateReport] = useState(false);

  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [recentPrograms, setRecentPrograms] = useState<Program[]>([]);

  const reloadDashboardData = useCallback(async () => {
    if (!user) return;
    if (['coordinator', 'field_manager', 'analyst', 'volunteer'].includes(user.role)) return;
    try {
      const [dash, progs] = await Promise.all([fetchDashboardStats(), fetchPrograms()]);
      setDashStats(dash);
      setRecentPrograms(progs.slice(0, 5));
    } catch {
      setDashStats(null);
      setRecentPrograms([]);
    }
  }, [user]);

  useEffect(() => {
    reloadDashboardData();
  }, [reloadDashboardData]);

  // Admin KPI cards — must run on every render (before any early return) so hook order stays stable
  // when user.role updates after /profile/me hydration.
  const stats = useMemo(() => {
    if (user?.role !== 'admin') {
      return [] as Array<{
        title: string;
        value: string;
        change: string;
        changeType: 'positive' | 'negative';
        icon: typeof Calendar;
        color: string;
        bgColor: string;
      }>;
    }
    return [
      {
        title: 'Active Programs',
        value: String(dashStats?.activePrograms ?? dashStats?.ongoingPrograms ?? 0),
        change: `${dashStats?.completedPrograms ?? 0} completed`,
        changeType: 'positive' as const,
        icon: Calendar,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Pending Reports',
        value: String(dashStats?.pendingReports ?? dashStats?.pendingFieldReports ?? 0),
        change: `${dashStats?.completedTasks ?? 0} tasks done`,
        changeType: 'positive' as const,
        icon: Clock,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
      {
        title: 'Volunteers Assigned',
        value: String(dashStats?.volunteersAssigned ?? dashStats?.activeVolunteers ?? 0),
        change: `${dashStats?.beneficiariesReached ?? dashStats?.totalBeneficiaries ?? 0} reached`,
        changeType: 'positive' as const,
        icon: Users,
        color: 'text-secondary',
        bgColor: 'bg-secondary/10',
      },
      {
        title: 'Low Stock Alerts',
        value: String(dashStats?.lowStockAlerts ?? 0),
        change: 'Inventory',
        changeType: 'positive' as const,
        icon: (dashStats?.lowStockAlerts ?? 0) > 0 ? AlertTriangle : Package,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      },
    ];
  }, [dashStats, user?.role]);

  const upcomingActivities: Array<{ id: number; title: string; date: string; type: string }> = [];

  // Route to role-specific dashboards (after all hooks)
  if (user?.role === 'coordinator') return <CoordinatorDashboard />;
  if (user?.role === 'field_manager') return <FieldManagerDashboard />;
  if (user?.role === 'analyst') return <AnalystDashboard />;
  if (user?.role === 'volunteer') return <VolunteerDashboard />;

  // Admin dashboard (default) continues below

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return (
          <span className="status-ongoing px-2 py-1 rounded-full text-xs font-medium border">
            Ongoing
          </span>
        );
      case 'planned':
        return (
          <span className="status-planned px-2 py-1 rounded-full text-xs font-medium border">
            Planned
          </span>
        );
      case 'completed':
        return (
          <span className="status-completed px-2 py-1 rounded-full text-xs font-medium border">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Welcome back, {(() => {
                const first = user?.name?.split(' ')[0];
                if (!first) return 'Admin';
                if (first.toLowerCase() === 'system') return 'Admin';
                return first;
              })()}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your outreach programs today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setShowCalendar(true)}>
              <Calendar className="w-4 h-4" />
              View Calendar
            </Button>
            <Button className="gap-2" onClick={() => setShowCreateProgram(true)}>
              <Target className="w-4 h-4" />
              New Program
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="kpi-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-3xl font-display font-bold mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        stat.changeType === 'positive' ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">live</span>
                  </div>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Programs */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="sfh-card">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-display font-semibold">Recent Programs</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary" asChild>
                  <Link to="/dashboard/programs">
                    View All
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentPrograms.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="No programs yet"
                    description="Create a program or open Outreach Programs to see activity here."
                  />
                ) : (
                  <div className="space-y-4">
                    {recentPrograms.map((program) => (
                      <div
                        key={program.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-sm truncate">{program.name}</h3>
                            {getStatusBadge(program.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {program.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {program.volunteers} volunteers
                            </span>
                            <span className="flex items-center gap-1">
                              <HeartHandshake className="w-3 h-3" />
                              {program.beneficiaries.toLocaleString()} reached
                            </span>
                          </div>
                          {program.status !== 'planned' && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{program.progress}%</span>
                              </div>
                              <Progress value={program.progress} className="h-2" />
                            </div>
                          )}
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Activities */}
          <motion.div variants={itemVariants}>
            <Card className="sfh-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-display font-semibold">Upcoming Activities</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingActivities.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No upcoming activities"
                    description="Scheduled activities will appear here."
                    compact
                  />
                ) : (
                  <div className="space-y-4">
                    {upcomingActivities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                            index === 0 ? 'bg-primary/10' : 'bg-muted'
                          )}
                        >
                          {activity.type === 'training' && (
                            <Activity className={cn('w-5 h-5', index === 0 ? 'text-primary' : 'text-muted-foreground')} />
                          )}
                          {activity.type === 'visit' && (
                            <MapPin className={cn('w-5 h-5', index === 0 ? 'text-primary' : 'text-muted-foreground')} />
                          )}
                          {activity.type === 'meeting' && (
                            <Users className={cn('w-5 h-5', index === 0 ? 'text-primary' : 'text-muted-foreground')} />
                          )}
                          {activity.type === 'distribution' && (
                            <HeartHandshake className={cn('w-5 h-5', index === 0 ? 'text-primary' : 'text-muted-foreground')} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full mt-4" onClick={() => setShowCalendar(true)}>
                  View Full Schedule
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <ActivityFeed />
        </motion.div>

        {/* Quick Actions & Alerts */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="sfh-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-display font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setShowRegisterBeneficiary(true)}
                >
                  <HeartHandshake className="w-5 h-5 text-secondary" />
                  <span className="text-sm">Register Beneficiary</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setShowScheduleActivity(true)}
                >
                  <Calendar className="w-5 h-5 text-accent" />
                  <span className="text-sm">Schedule Activity</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setShowGenerateReport(true)}
                >
                  <TrendingUp className="w-5 h-5 text-info" />
                  <span className="text-sm">Generate Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card className="sfh-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-display font-semibold">System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={AlertCircle}
                title="No alerts"
                description="System alerts will appear here when triggered."
                compact
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Modals */}
      <CalendarModal open={showCalendar} onOpenChange={setShowCalendar} />
      <CreateProgramModal
        open={showCreateProgram}
        onOpenChange={setShowCreateProgram}
        onCompleted={reloadDashboardData}
      />
      <RegisterBeneficiaryModal
        open={showRegisterBeneficiary}
        onOpenChange={setShowRegisterBeneficiary}
        onSaved={reloadDashboardData}
      />
      <ScheduleActivityModal open={showScheduleActivity} onOpenChange={setShowScheduleActivity} />
      <GenerateReportModal open={showGenerateReport} onOpenChange={setShowGenerateReport} />
    </>
  );
};

export default DashboardHome;
