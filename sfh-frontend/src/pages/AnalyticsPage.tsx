import React, { useEffect, useMemo, useState } from 'react';
import { fetchAnalytics, AnalyticsSummary, emptyAnalytics } from '@/lib/api';
import { EmptyChartOverlay } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Calendar,
  MapPin,
  Users,
  HeartHandshake,
  Target,
  LineChart as LineChartIcon,
  Package,
  ClipboardList,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import GenerateReportModal from '@/components/modals/GenerateReportModal';

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [timeRange, setTimeRange] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  const [showGenerateReport, setShowGenerateReport] = useState(false);

  useEffect(() => {
    fetchAnalytics(timeRange).then(setAnalytics);
  }, [timeRange]);

  const monthlyData = analytics.monthlyTrend;
  const provinceData = analytics.provinceDistribution;
  const programTypeData = analytics.programTypes;
  const resourceData = analytics.resourceUtilization || [];
  const taskStats = analytics.taskCompletionAnalytics;

  const mostUsedResources = useMemo(
    () => [...resourceData].sort((a, b) => b.used - a.used).slice(0, 8),
    [resourceData]
  );

  const lowStockResources = useMemo(
    () => resourceData.filter((r) => r.available <= 20).slice(0, 8),
    [resourceData]
  );

  const kpis = [
    { title: 'Beneficiaries Reached', value: analytics.totalReach.toLocaleString(), icon: HeartHandshake, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Active Programs', value: String(analytics.ongoingPrograms), icon: Target, color: 'text-success', bgColor: 'bg-success/10' },
    { title: 'Completed Programs', value: String(analytics.completedPrograms), icon: ClipboardList, color: 'text-accent', bgColor: 'bg-accent/10' },
    { title: 'Active Volunteers', value: analytics.activeVolunteers.toLocaleString(), icon: Users, color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { title: 'Field Reports Submitted', value: String(analytics.fieldReportsSubmitted), icon: FileText, color: 'text-info', bgColor: 'bg-info/10' },
  ];

  const taskChartData = taskStats
    ? [
        { name: 'Completed', value: taskStats.completed },
        { name: 'In Progress', value: taskStats.inProgress },
        { name: 'Pending', value: taskStats.pending },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Practical NGO operational insights from live data</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => setShowGenerateReport(true)}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <GenerateReportModal open={showGenerateReport} onOpenChange={setShowGenerateReport} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="sfh-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                    <p className="text-2xl font-display font-bold mt-1">{kpi.value}</p>
                  </div>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', kpi.bgColor)}>
                    <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="sfh-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-primary" />
                  Beneficiary Reach Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorBeneficiaries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="beneficiaries" stroke="#22c55e" strokeWidth={2} fill="url(#colorBeneficiaries)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  {monthlyData.length === 0 && <EmptyChartOverlay />}
                </div>
              </CardContent>
            </Card>

            <Card className="sfh-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-secondary" />
                  Programs by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={programTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                      <YAxis dataKey="type" type="category" stroke="#9ca3af" fontSize={11} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {programTypeData.length === 0 && <EmptyChartOverlay />}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="sfh-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Monthly Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="volunteers" stroke="#8b5cf6" strokeWidth={2} name="Volunteer actions" />
                    <Line type="monotone" dataKey="programs" stroke="#f97316" strokeWidth={2} name="Active programs" />
                    <Line type="monotone" dataKey="beneficiaries" stroke="#22c55e" strokeWidth={2} name="Beneficiaries" />
                  </LineChart>
                </ResponsiveContainer>
                {monthlyData.length === 0 && <EmptyChartOverlay />}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="sfh-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" />
                  Volunteer Operational Activity
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Tasks started/completed, beneficiaries registered, field reports submitted
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [`${v} actions`, 'Activity']} />
                      <Bar dataKey="volunteers" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Actions" />
                    </BarChart>
                  </ResponsiveContainer>
                  {monthlyData.length === 0 && <EmptyChartOverlay />}
                </div>
              </CardContent>
            </Card>

            <Card className="sfh-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Task Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                {taskChartData.length === 0 ? (
                  <EmptyChartOverlay />
                ) : (
                  <div className="space-y-4">
                    {taskChartData.map((t) => (
                      <div key={t.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t.name}</span>
                          <span className="font-semibold">{t.value}</span>
                        </div>
                        <Progress
                          value={
                            (taskStats?.completed || 0) + (taskStats?.inProgress || 0) + (taskStats?.pending || 0) > 0
                              ? (t.value / ((taskStats?.completed || 0) + (taskStats?.inProgress || 0) + (taskStats?.pending || 0))) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="sfh-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-warning" />
                  Most Used Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostUsedResources}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={70} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="used" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {mostUsedResources.length === 0 && <EmptyChartOverlay />}
                </div>
              </CardContent>
            </Card>

            <Card className="sfh-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-destructive" />
                  Low Stock Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lowStockResources}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={70} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="available" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {lowStockResources.length === 0 && <EmptyChartOverlay />}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geographic" className="mt-6 space-y-6">
          <Card className="sfh-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                District Operational Coverage
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                Clear counts by district: programs, field reports, and beneficiaries
              </p>
            </CardHeader>
            <CardContent>
              {(analytics.districtCoverage || []).length === 0 ? (
                <EmptyChartOverlay />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">District</th>
                        <th className="py-2 pr-4 font-medium">Programs</th>
                        <th className="py-2 pr-4 font-medium">Reports</th>
                        <th className="py-2 font-medium">Beneficiaries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.districtCoverage || []).map((row) => (
                        <tr key={row.district} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{row.district}</td>
                          <td className="py-3 pr-4">
                            {row.programs} {row.programs === 1 ? 'Program' : 'Programs'}
                          </td>
                          <td className="py-3 pr-4">
                            {row.reports} {row.reports === 1 ? 'Report' : 'Reports'}
                          </td>
                          <td className="py-3">{row.beneficiaries.toLocaleString()} Beneficiaries</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AnalyticsPage;
