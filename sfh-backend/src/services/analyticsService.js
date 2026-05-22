const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');

const prisma = new PrismaClient();

function rangeForPeriod(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'weekly') {
    start.setDate(now.getDate() - 7);
  } else if (period === 'yearly') {
    start.setFullYear(now.getFullYear() - 1);
  } else {
    start.setMonth(now.getMonth() - 1);
  }
  return { start, end: now };
}

function monthBuckets(period) {
  const count = period === 'weekly' ? 7 : period === 'yearly' ? 12 : 6;
  const buckets = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    if (period === 'weekly') {
      d.setDate(now.getDate() - i);
      buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en', { weekday: 'short' }) });
    } else {
      d.setMonth(now.getMonth() - i);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      });
    }
  }
  return buckets;
}

function bucketKey(date, period) {
  const d = new Date(date);
  if (period === 'weekly') return d.toISOString().slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getAnalytics(period = 'monthly') {
  const { start } = rangeForPeriod(period);
  const buckets = monthBuckets(period);

  const [
    beneficiaries,
    programs,
    tasks,
    reports,
    resources,
    programResources,
    volunteers,
    tasksStarted,
    beneficiariesRegistered,
  ] = await Promise.all([
    prisma.beneficiary.findMany({
      where: { registrationDate: { gte: start } },
      select: { registrationDate: true, district: true },
    }),
    prisma.program.findMany({ select: { startDate: true, endDate: true, programType: true, district: true, sector: true, id: true, title: true } }),
    prisma.task.findMany({
      where: { updatedAt: { gte: start } },
      select: { status: true, updatedAt: true, createdAt: true },
    }),
    prisma.fieldReport.findMany({
      where: { createdAt: { gte: start } },
      select: { status: true, createdAt: true, beneficiariesCount: true, program: { select: { district: true } } },
    }),
    prisma.resource.findMany(),
    prisma.programResource.findMany({ include: { resource: true } }),
    prisma.user.count({ where: { role: 'VOLUNTEER', status: 'ACTIVE' } }),
    prisma.task.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, status: true },
    }),
    prisma.beneficiary.findMany({
      where: { registrationDate: { gte: start } },
      select: { registrationDate: true, registeredById: true },
    }),
  ]);

  const beneficiariesReached = {};
  beneficiaries.forEach((b) => {
    const key = bucketKey(b.registrationDate, period);
    beneficiariesReached[key] = (beneficiariesReached[key] || 0) + 1;
  });

  const programCompletions = programs.filter((p) => computeProgramStatus(p.startDate, p.endDate) === 'COMPLETED').length;
  const programOngoing = programs.filter((p) => computeProgramStatus(p.startDate, p.endDate) === 'ONGOING').length;

  const taskCompletions = tasks.filter((t) => t.status === 'COMPLETED');
  const tasksCompletedInPeriod = taskCompletions.length;

  const reportApprovals = reports.filter((r) => r.status === 'APPROVED').length;
  const reportPending = reports.filter((r) => r.status === 'PENDING').length;
  const approvalRate = reports.length ? Math.round((reportApprovals / reports.length) * 100) : 0;

  const volunteerActivityByBucket = {};
  buckets.forEach((b) => {
    volunteerActivityByBucket[b.key] = 0;
  });

  tasksStarted.forEach((t) => {
    const key = bucketKey(t.createdAt, period);
    if (volunteerActivityByBucket[key] !== undefined) volunteerActivityByBucket[key] += 1;
  });

  taskCompletions.forEach((t) => {
    const key = bucketKey(t.updatedAt, period);
    if (volunteerActivityByBucket[key] !== undefined) volunteerActivityByBucket[key] += 1;
  });

  beneficiariesRegistered.forEach((b) => {
    const key = bucketKey(b.registrationDate, period);
    if (volunteerActivityByBucket[key] !== undefined) volunteerActivityByBucket[key] += 1;
  });

  reports.forEach((r) => {
    const key = bucketKey(r.createdAt, period);
    if (volunteerActivityByBucket[key] !== undefined) volunteerActivityByBucket[key] += 1;
  });

  const districtCoverageMap = {};
  const ensureDistrict = (name) => {
    if (!districtCoverageMap[name]) {
      districtCoverageMap[name] = { programs: 0, reports: 0, beneficiaries: 0, sectors: new Set() };
    }
    return districtCoverageMap[name];
  };

  programs.forEach((p) => {
    const row = ensureDistrict(p.district);
    row.programs += 1;
    if (p.sector) row.sectors.add(p.sector);
  });

  reports.forEach((r) => {
    const district = r.program?.district;
    if (!district) return;
    ensureDistrict(district).reports += 1;
  });

  beneficiaries.forEach((b) => {
    ensureDistrict(b.district).beneficiaries += 1;
  });

  const districtCoverage = Object.entries(districtCoverageMap)
    .map(([district, data]) => ({
      district,
      programs: data.programs,
      reports: data.reports,
      beneficiaries: data.beneficiaries,
      sectors: data.sectors.size,
    }))
    .sort((a, b) => b.programs + b.reports - (a.programs + a.reports))
    .slice(0, 15);

  const totalAssigned = programResources.reduce((s, pr) => s + pr.quantityAssigned, 0);
  const totalUsed = programResources.reduce((s, pr) => s + pr.quantityUsed, 0);
  const utilizationPct = totalAssigned ? Math.round((totalUsed / totalAssigned) * 100) : 0;

  const lowStockCount = resources.filter((r) => r.quantityAvailable <= r.lowStockThreshold).length;

  const totalVolunteerActions =
    tasksStarted.length + tasksCompletedInPeriod + beneficiariesRegistered.length + reports.length;

  return {
    period,
    summary: {
      totalReach: await prisma.beneficiary.count(),
      activeVolunteers: volunteers,
      geographicCoverage: new Set(programs.map((p) => p.district)).size,
      programEffectiveness: programs.length
        ? Math.round((programCompletions / programs.length) * 100)
        : 0,
      ongoingPrograms: programOngoing,
      completedPrograms: programCompletions,
      completedTasks: tasksCompletedInPeriod,
      approvalRate,
      pendingReports: reportPending,
      fieldReportsSubmitted: reports.length,
      resourceUtilization: utilizationPct,
      lowStockAlerts: lowStockCount,
      volunteerOperationalActions: totalVolunteerActions,
    },
    beneficiariesReachedOverTime: buckets.map((b) => ({
      label: b.label,
      value: beneficiariesReached[b.key] || 0,
    })),
    programCompletionTrend: buckets.map((b) => ({
      label: b.label,
      completed: Math.round(programCompletions / buckets.length),
      ongoing: Math.round(programOngoing / buckets.length),
    })),
    volunteerActivityTrend: buckets.map((b) => ({
      label: b.label,
      actions: volunteerActivityByBucket[b.key] || 0,
    })),
    reportApprovalTrend: buckets.map((b) => ({
      label: b.label,
      approved: Math.round(reportApprovals / buckets.length),
      pending: Math.round(reportPending / buckets.length),
    })),
    districtCoverage,
    districtActivity: districtCoverage.map((d) => ({
      name: d.district,
      programs: d.programs,
      reports: d.reports,
      beneficiaries: d.beneficiaries,
      value: d.programs + d.reports + d.beneficiaries,
    })),
    taskCompletionAnalytics: {
      completed: taskCompletions.length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      pending: tasks.filter((t) => t.status === 'PENDING').length,
    },
    resourceUtilization: resources.map((r) => ({
      name: r.name,
      available: r.quantityAvailable,
      assigned: programResources
        .filter((pr) => pr.resourceId === r.id)
        .reduce((s, pr) => s + pr.quantityAssigned, 0),
      used: programResources
        .filter((pr) => pr.resourceId === r.id)
        .reduce((s, pr) => s + pr.quantityUsed, 0),
      lowStock: r.quantityAvailable <= r.lowStockThreshold,
    })),
    programTypes: Object.entries(
      programs.reduce((acc, p) => {
        acc[p.programType] = (acc[p.programType] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
  };
}

module.exports = { getAnalytics };
