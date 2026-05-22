const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');
const resourceService = require('./resourceService');

const prisma = new PrismaClient();

async function getAdminStats() {
  const [programs, pendingReports, completedTasks, volunteersAssigned, beneficiaries, lowStock] =
    await Promise.all([
      prisma.program.findMany({ select: { startDate: true, endDate: true } }),
      prisma.fieldReport.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.programVolunteer.count(),
      prisma.beneficiary.count(),
      resourceService.countLowStockSimple(),
    ]);

  const activePrograms = programs.filter((p) => computeProgramStatus(p.startDate, p.endDate) === 'ONGOING').length;
  const completedPrograms = programs.filter((p) => computeProgramStatus(p.startDate, p.endDate) === 'COMPLETED').length;

  return {
    activePrograms,
    completedPrograms,
    pendingReports,
    completedTasks,
    volunteersAssigned,
    beneficiariesReached: beneficiaries,
    lowStockAlerts: lowStock,
    totalPrograms: programs.length,
  };
}

async function getCoordinatorStats(userId) {
  const programs = await prisma.program.findMany({
    where: { createdById: userId },
    select: { id: true, startDate: true, endDate: true },
  });
  const programIds = programs.map((p) => p.id);
  const [pendingReports, approved, rejected, fieldManagers, lowStock] = await Promise.all([
    prisma.fieldReport.count({
      where: programIds.length ? { programId: { in: programIds }, status: 'PENDING' } : { status: 'PENDING' },
    }),
    prisma.fieldReport.count({ where: { status: 'APPROVED' } }),
    prisma.fieldReport.count({ where: { status: 'REJECTED' } }),
    prisma.user.count({ where: { role: 'FIELD_MANAGER', status: 'ACTIVE' } }),
    resourceService.countLowStockSimple(),
  ]);
  const totalReviewed = approved + rejected;
  return {
    reportsAwaitingReview: pendingReports,
    programsUnderManagement: programs.length,
    approvalRate: totalReviewed ? Math.round((approved / totalReviewed) * 100) : 0,
    activeFieldManagers: fieldManagers,
    lowStockAlerts: lowStock,
  };
}

async function getFieldManagerStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const programIds = (
    await prisma.program.findMany({ where: { fieldManagerId: userId }, select: { id: true } })
  ).map((p) => p.id);

  const programFilter = programIds.length ? { programId: { in: programIds } } : null;

  const [assignedVolunteers, activeTasks, completedToday, pendingReports, totalTasks] = await Promise.all([
    programFilter
      ? prisma.programVolunteer.count({ where: programFilter })
      : Promise.resolve(0),
    programFilter
      ? prisma.task.count({ where: { ...programFilter, status: { in: ['PENDING', 'IN_PROGRESS'] } } })
      : Promise.resolve(0),
    programFilter
      ? prisma.task.count({
          where: { ...programFilter, status: 'COMPLETED', updatedAt: { gte: today } },
        })
      : Promise.resolve(0),
    programFilter
      ? prisma.fieldReport.count({ where: { ...programFilter, status: 'PENDING' } })
      : Promise.resolve(0),
    programFilter ? prisma.task.count({ where: programFilter }) : Promise.resolve(0),
  ]);
  const utilizationPct = totalTasks ? Math.round((assignedVolunteers / Math.max(totalTasks, 1)) * 100) : 0;

  return {
    assignedVolunteers,
    activeFieldTasks: activeTasks,
    completedTasksToday: completedToday,
    pendingReports,
    volunteerUtilization: Math.min(100, utilizationPct),
  };
}

async function getVolunteerStats(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [assigned, completed, pending, beneficiaries] = await Promise.all([
    prisma.task.count({ where: { assignedToId: userId } }),
    prisma.task.count({ where: { assignedToId: userId, status: 'COMPLETED' } }),
    prisma.task.count({
      where: { assignedToId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    }),
    prisma.beneficiary.count({ where: { registeredById: userId } }),
  ]);

  const monthlyTasks = await prisma.task.count({
    where: { assignedToId: userId, updatedAt: { gte: startOfMonth } },
  });
  const monthlyCompleted = await prisma.task.count({
    where: { assignedToId: userId, status: 'COMPLETED', updatedAt: { gte: startOfMonth } },
  });
  const monthlyProgress = monthlyTasks ? Math.round((monthlyCompleted / monthlyTasks) * 100) : 0;

  return {
    assignedTasks: assigned,
    completedTasks: completed,
    pendingTasks: pending,
    beneficiariesReached: beneficiaries,
    monthlyProgress,
  };
}

module.exports = {
  getAdminStats,
  getCoordinatorStats,
  getFieldManagerStats,
  getVolunteerStats,
};
