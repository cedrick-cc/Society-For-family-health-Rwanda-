import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, PieChart, Download, ArrowUpRight, ArrowDownRight,
  Filter, MapPin, Users, HeartHandshake, Target,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart as RPieChart, Pie, Cell, Legend,
} from 'recharts';
import { EmptyChartOverlay } from '@/components/ui/empty-state';
import GenerateReportModal from '@/components/modals/GenerateReportModal';
import AnnouncementsCard from '@/components/AnnouncementsCard';
import { fetchAnalytics, type AnalyticsSummary, emptyAnalytics } from '@/lib/api';
import { PROGRAM_TYPE_LABELS, type ProgramTypeKey } from '@/lib/programResources';

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

const CHART_COLORS = [
  'hsl(222,72%,42%)',
  'hsl(120,70%,45%)',
  'hsl(24,95%,55%)',
  'hsl(200,80%,50%)',
  'hsl(280,65%,50%)',
];

function programTypeLabel(raw: string) {
  const key = raw.toUpperCase().replace(/\s+/g, '_') as ProgramTypeKey;
  return PROGRAM_TYPE_LABELS[key] || raw.replace(/_/g, ' ');
}

const AnalystDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);

  useEffect(() => {
    fetchAnalytics().then(setAnalytics);
  }, []);

  const monthlyTrend = analytics.monthlyTrend;
  const serviceBreakdown = analytics.programTypes
    .filter((p) => p.count > 0)
    .map((p, i) => ({
      name: programTypeLabel(p.type),
      value: p.count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const districtOps = (analytics.districtCoverage || []).slice(0, 10).map((d) => ({
    district: d.district.length > 12 ? `${d.district.slice(0, 11)}…` : d.district,
    fullDistrict: d.district,
    programs: d.programs,
    reports: d.reports,
    beneficiaries: d.beneficiaries,
  }));

  const kpis = [
    { label: 'Total Beneficiaries YTD', value: analytics.totalReach.toLocaleString(), change: '—', up: true, icon: HeartHandshake, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Program Coverage Rate', value: `${analytics.programEffectiveness}%`, change: '—', up: true, icon: Target, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Active Volunteers', value: String(analytics.activeVolunteers), change: '—', up: true, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Districts Covered', value: String(analytics.geographicCoverage), change: '—', up: true, icon: MapPin, color: 'text-info', bg: 'bg-info/10' },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={item} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Data Analyst
              </span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Analytics Intelligence Center</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.name?.split(' ')[0] || 'Analyst'} — live data from programs, reports, and beneficiaries.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" /> Filter Data
            </Button>
            <Button size="sm" onClick={() => setShowReport(true)}>
              <Download className="w-4 h-4" /> Export Report
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <motion.div key={k.label} whileHover={{ y: -4 }} className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium leading-tight">{k.label}</p>
                  <p className="text-3xl font-display font-bold mt-2">{k.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {k.up ? <ArrowUpRight className="w-3.5 h-3.5 text-success" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                    <span className={cn('text-xs font-medium', k.up ? 'text-success' : 'text-destructive')}>{k.change}</span>
                  </div>
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', k.bg)}>
                  <k.icon className={cn('w-5 h-5', k.color)} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="sfh-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Beneficiary Trend (6 months)</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => setShowReport(true)}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="gbene" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(222,72%,42%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(222,72%,42%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="beneficiaries" stroke="hsl(222,72%,42%)" fill="url(#gbene)" strokeWidth={2.5} name="Beneficiaries" />
                  </AreaChart>
                </ResponsiveContainer>
                {monthlyTrend.length === 0 && <EmptyChartOverlay />}
              </div>
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-accent" /> Service Distribution
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">Programs by type (from database)</p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <RPieChart>
                    <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                      {serviceBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </RPieChart>
                </ResponsiveContainer>
                {serviceBreakdown.length === 0 && <EmptyChartOverlay />}
              </div>
              <div className="space-y-1.5 mt-2">
                {serviceBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No programs in the system yet.</p>
                ) : (
                  serviceBreakdown.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-muted-foreground truncate">{s.name}</span>
                      </div>
                      <span className="font-semibold shrink-0 ml-2">{s.value} programs</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-info" /> District Operations Coverage
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Programs, field reports, and beneficiaries registered per district
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={districtOps} barGap={4} margin={{ bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="district" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-25} textAnchor="end" height={56} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDistrict || ''}
                    />
                    <Legend />
                    <Bar dataKey="programs" fill="hsl(222,72%,42%)" radius={[4, 4, 0, 0]} name="Programs" />
                    <Bar dataKey="reports" fill="hsl(24,95%,55%)" radius={[4, 4, 0, 0]} name="Field reports" />
                    <Bar dataKey="beneficiaries" fill="hsl(120,70%,45%)" radius={[4, 4, 0, 0]} name="Beneficiaries" />
                  </BarChart>
                </ResponsiveContainer>
                {districtOps.length === 0 && <EmptyChartOverlay />}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <AnnouncementsCard showLink />
        </motion.div>
      </motion.div>

      <GenerateReportModal open={showReport} onOpenChange={setShowReport} />
    </>
  );
};

export default AnalystDashboard;
