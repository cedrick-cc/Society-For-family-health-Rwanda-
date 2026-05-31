import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, PieChart, Download, ArrowUpRight, ArrowDownRight,
  Filter, Database, MapPin, Users, HeartHandshake, Target,
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

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

interface DataQuality { label: string; value: number; status: 'good' | 'warning' }

const AnalystDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [dataQuality] = useState<DataQuality[]>([]);

  useEffect(() => {
    fetchAnalytics().then(setAnalytics);
  }, []);

  const monthlyTrend = analytics.monthlyTrend;
  const districtData: Array<{ district: string; reached: number; target: number }> = [];
  const serviceBreakdown = analytics.programTypes.map((p, i) => ({
    name: p.type,
    value: p.beneficiaries,
    color: ['hsl(222,72%,42%)', 'hsl(120,70%,45%)', 'hsl(24,95%,55%)', 'hsl(200,80%,50%)'][i % 4],
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
              {user?.name?.split(' ')[0] || 'User'}, awaiting backend data sync.
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
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <RPieChart>
                    <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {serviceBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                  </RPieChart>
                </ResponsiveContainer>
                {serviceBreakdown.length === 0 && <EmptyChartOverlay />}
              </div>
              <div className="space-y-1.5 mt-2">
                {serviceBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No service categories yet.</p>
                ) : (
                  serviceBreakdown.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">District Coverage vs Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={districtData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="district" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="target" fill="hsl(222,72%,42%)" opacity={0.3} radius={[4, 4, 0, 0]} name="Target" />
                    <Bar dataKey="reached" fill="hsl(120,70%,45%)" radius={[4, 4, 0, 0]} name="Reached" />
                  </BarChart>
                </ResponsiveContainer>
                {districtData.length === 0 && <EmptyChartOverlay />}
              </div>
            </CardContent>
          </Card>

          <Card className="sfh-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Data Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataQuality.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data quality metrics available yet.</p>
              ) : (
                dataQuality.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{d.label}</span>
                      <span className={cn('font-bold', d.status === 'good' ? 'text-success' : 'text-warning')}>{d.value}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all', d.status === 'good' ? 'bg-success' : 'bg-warning')}
                        style={{ width: `${d.value}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              <Button className="w-full mt-2" size="sm" onClick={() => setShowReport(true)}>
                <Download className="w-4 h-4" /> Generate Full Report
              </Button>
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
