const { PrismaClient } = require('@prisma/client');
const programService = require('../services/programService');
const taskService = require('../services/taskService');
const resourceService = require('../services/resourceService');

const prisma = new PrismaClient();

function mapProgramResources(rows) {
  return (rows || []).map((pr) => ({
    programId: pr.programId,
    resourceId: pr.resourceId,
    resourceName: pr.resource?.name || 'Resource',
    programTitle: pr.program?.title || '',
    quantityAssigned: pr.quantityAssigned,
    quantityUsed: pr.quantityUsed,
    remaining: Math.max(0, pr.quantityAssigned - pr.quantityUsed),
  }));
}

const dashboard = async (req, res) => {
  try {
    if (req.user.role !== 'FIELD_MANAGER') {
      return res.status(403).json({ message: 'Field managers only.' });
    }
    const userId = req.user.userId;
    const [programs, tasksCreated, volunteerIds, resourceRows] = await Promise.all([
      programService.listProgramsForFieldManager(userId),
      taskService.listCreatedByFieldManager(userId, req.user.role),
      prisma.programVolunteer.findMany({
        where: { program: { fieldManagerId: userId } },
        select: { volunteerId: true },
      }),
      resourceService.listForFieldManager(userId),
    ]);
    const uniqueVolunteers = new Set(volunteerIds.map((v) => v.volunteerId));
    return res.status(200).json({
      programs,
      tasksCreated,
      assignedVolunteerCount: uniqueVolunteers.size,
      programResources: mapProgramResources(resourceRows),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load field manager dashboard.' });
  }
};

module.exports = { dashboard };
