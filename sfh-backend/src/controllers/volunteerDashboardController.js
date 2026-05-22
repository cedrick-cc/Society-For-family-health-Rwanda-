const { PrismaClient } = require('@prisma/client');
const programService = require('../services/programService');
const fieldReportService = require('../services/fieldReportService');

const prisma = new PrismaClient();

const dashboard = async (req, res) => {
  try {
    if (req.user.role !== 'VOLUNTEER') {
      return res.status(403).json({ message: 'Volunteers only.' });
    }
    const userId = req.user.userId;
    const [programs, tasks, reports] = await Promise.all([
      programService.listProgramsForVolunteer(userId),
      prisma.task.findMany({
        where: { assignedToId: userId },
        orderBy: { dueDate: 'asc' },
        include: {
          assignedBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          program: { select: { id: true, title: true, district: true, sector: true } },
        },
      }),
      fieldReportService.listMine(userId),
    ]);
    return res.status(200).json({ programs, tasks, reports });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load volunteer dashboard.' });
  }
};

module.exports = { dashboard };
