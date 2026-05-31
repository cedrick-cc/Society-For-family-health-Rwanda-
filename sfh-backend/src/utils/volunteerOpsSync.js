const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('./programStatus');

const prisma = new PrismaClient();

/** Count program assignments that are PLANNED or ONGOING (not COMPLETED). */
async function countActiveProgramAssignments(volunteerId) {
  const links = await prisma.programVolunteer.findMany({
    where: { volunteerId },
    include: { program: { select: { startDate: true, endDate: true } } },
  });
  return links.filter((l) => {
    const status = computeProgramStatus(l.program.startDate, l.program.endDate);
    return status === 'PLANNED' || status === 'ONGOING';
  }).length;
}

async function syncVolunteerOpsStatus(volunteerId) {
  const user = await prisma.user.findUnique({
    where: { id: volunteerId },
    select: { id: true, role: true, volunteerOpsStatus: true },
  });
  if (!user || user.role !== 'VOLUNTEER') return;
  if (user.volunteerOpsStatus === 'ON_LEAVE') return;

  const activeCount = await countActiveProgramAssignments(volunteerId);
  await prisma.user.update({
    where: { id: volunteerId },
    data: { volunteerOpsStatus: activeCount > 0 ? 'ASSIGNED' : 'AVAILABLE' },
  });
}

async function releaseVolunteersFromCompletedPrograms() {
  const links = await prisma.programVolunteer.findMany({
    include: { program: { select: { startDate: true, endDate: true } } },
  });
  const completedVolunteerIds = new Set();
  links.forEach((l) => {
    const status = computeProgramStatus(l.program.startDate, l.program.endDate);
    if (status === 'COMPLETED') completedVolunteerIds.add(l.volunteerId);
  });
  await Promise.all([...completedVolunteerIds].map((id) => syncVolunteerOpsStatus(id)));
}

module.exports = {
  countActiveProgramAssignments,
  syncVolunteerOpsStatus,
  releaseVolunteersFromCompletedPrograms,
};
