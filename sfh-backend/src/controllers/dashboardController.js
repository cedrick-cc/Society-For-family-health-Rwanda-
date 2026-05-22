const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');
const dashboardService = require('../services/dashboardService');
const activityLogService = require('../services/activityLogService');
const programsAttentionService = require('../services/programsAttentionService');

const prisma = new PrismaClient();

const getStats = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role === 'ADMIN') {
      const admin = await dashboardService.getAdminStats();
      const [totalUsers, activeUsers, pendingUsers, activeVolunteers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { role: 'VOLUNTEER', status: 'ACTIVE' } }),
      ]);
      return res.status(200).json({
        ...admin,
        totalUsers,
        activeUsers,
        pendingUsers,
        activeVolunteers,
        totalPrograms: admin.activePrograms + admin.completedPrograms,
        ongoingPrograms: admin.activePrograms,
        totalBeneficiaries: admin.beneficiariesReached,
        pendingFieldReports: admin.pendingReports,
      });
    }
    if (role === 'COORDINATOR') {
      return res.status(200).json(await dashboardService.getCoordinatorStats(req.user.userId));
    }
    if (role === 'FIELD_MANAGER') {
      return res.status(200).json(await dashboardService.getFieldManagerStats(req.user.userId));
    }
    if (role === 'VOLUNTEER') {
      return res.status(200).json(await dashboardService.getVolunteerStats(req.user.userId));
    }

    const [allPrograms, totalUsers, activeUsers, pendingUsers, activeVolunteers, totalPrograms, totalBeneficiaries, pendingFieldReports] =
      await Promise.all([
        prisma.program.findMany({ select: { startDate: true, endDate: true } }),
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { role: 'VOLUNTEER', status: 'ACTIVE' } }),
        prisma.program.count(),
        prisma.beneficiary.count(),
        prisma.fieldReport.count({ where: { status: 'PENDING' } }),
      ]);

    const ongoingPrograms = allPrograms.filter(
      (p) => computeProgramStatus(p.startDate, p.endDate) === 'ONGOING'
    ).length;

    return res.status(200).json({
      totalUsers,
      activeUsers,
      pendingUsers,
      activeVolunteers,
      totalPrograms,
      ongoingPrograms,
      totalBeneficiaries,
      pendingFieldReports,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load dashboard stats.' });
  }
};

const getActivity = async (req, res) => {
  try {
    const items = await activityLogService.listRecent({ take: Number(req.query.take) || 20 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load activity feed.' });
  }
};

const getProgramsAttention = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!['ADMIN', 'COORDINATOR', 'FIELD_MANAGER'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    const items = await programsAttentionService.getProgramsRequiringAttention(
      req.user.userId,
      role
    );
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load programs requiring attention.' });
  }
};

module.exports = { getStats, getActivity, getProgramsAttention };
