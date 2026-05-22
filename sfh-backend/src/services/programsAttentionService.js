const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');

const prisma = new PrismaClient();

async function getProgramsRequiringAttention(userId, role) {
  let programWhere = {};
  if (role === 'COORDINATOR') {
    programWhere = { createdById: userId };
  } else if (role === 'FIELD_MANAGER') {
    programWhere = { fieldManagerId: userId };
  }

  const programs = await prisma.program.findMany({
    where: programWhere,
    include: {
      programVolunteers: true,
      fieldReports: { where: { status: 'PENDING' }, select: { id: true } },
      tasks: {
        select: { id: true, status: true, dueDate: true, title: true },
      },
      programResources: {
        include: { resource: { select: { name: true, lowStockThreshold: true } } },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  const now = new Date();
  const items = [];

  for (const program of programs) {
    const status = computeProgramStatus(program.startDate, program.endDate);
    if (status === 'COMPLETED') continue;

    const reasons = [];

    if (program.fieldReports.length > 0) {
      reasons.push({
        type: 'pending_reports',
        label: `${program.fieldReports.length} pending field report(s)`,
        severity: 'warning',
      });
    }

    if (program.programVolunteers.length === 0) {
      reasons.push({
        type: 'no_volunteers',
        label: 'No volunteers assigned',
        severity: 'critical',
      });
    }

    const overdueTasks = program.tasks.filter(
      (t) => t.status !== 'COMPLETED' && new Date(t.dueDate) < now
    );
    if (overdueTasks.length > 0) {
      reasons.push({
        type: 'overdue_tasks',
        label: `${overdueTasks.length} overdue task(s)`,
        severity: 'warning',
      });
    }

    const lowResources = program.programResources.filter((pr) => {
      const remaining = pr.quantityAssigned - pr.quantityUsed;
      const threshold = Math.max(1, Math.floor(pr.quantityAssigned * 0.2));
      return pr.quantityAssigned > 0 && remaining <= threshold;
    });
    if (lowResources.length > 0) {
      reasons.push({
        type: 'low_resources',
        label: `${lowResources.length} resource(s) running low`,
        severity: 'warning',
      });
    }

    if (reasons.length > 0) {
      items.push({
        programId: program.id,
        programTitle: program.title,
        district: program.district,
        status: status.toLowerCase(),
        reasons,
      });
    }
  }

  return items.sort((a, b) => {
    const aCrit = a.reasons.some((r) => r.severity === 'critical');
    const bCrit = b.reasons.some((r) => r.severity === 'critical');
    if (aCrit !== bCrit) return aCrit ? -1 : 1;
    return b.reasons.length - a.reasons.length;
  });
}

module.exports = { getProgramsRequiringAttention };
