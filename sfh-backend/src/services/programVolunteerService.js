const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { programInclude, mapProgram } = require('./programService');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

async function syncVolunteerOpsStatus(volunteerId) {
  const user = await prisma.user.findUnique({
    where: { id: volunteerId },
    select: { id: true, role: true, volunteerOpsStatus: true },
  });
  if (!user || user.role !== 'VOLUNTEER') return;
  if (user.volunteerOpsStatus === 'ON_LEAVE') return;

  const count = await prisma.programVolunteer.count({ where: { volunteerId } });
  await prisma.user.update({
    where: { id: volunteerId },
    data: { volunteerOpsStatus: count > 0 ? 'ASSIGNED' : 'AVAILABLE' },
  });
}

async function assignVolunteers(programId, volunteerIds, assignedById) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, fieldManagerId: true },
  });
  if (!program) throw new Error('Program not found.');

  const ids = Array.isArray(volunteerIds) ? volunteerIds : [];
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length === 0) throw new Error('volunteerIds must be a non-empty array.');

  const volunteers = await prisma.user.findMany({
    where: {
      id: { in: unique },
      role: 'VOLUNTEER',
      status: 'ACTIVE',
      volunteerOpsStatus: { not: 'ON_LEAVE' },
    },
    select: { id: true },
  });
  if (volunteers.length !== unique.length) {
    throw new Error('One or more volunteers are invalid, inactive, on leave, or not volunteers.');
  }

  const existing = await prisma.programVolunteer.findMany({
    where: { programId, volunteerId: { in: unique } },
    select: { volunteerId: true },
  });
  const existingSet = new Set(existing.map((e) => e.volunteerId));
  const toCreate = unique.filter((id) => !existingSet.has(id));

  if (toCreate.length) {
    await prisma.programVolunteer.createMany({
      data: toCreate.map((volunteerId) => ({
        id: randomUUID(),
        programId,
        volunteerId,
        assignedById,
      })),
    });
    const prog = await prisma.program.findUnique({
      where: { id: programId },
      select: { title: true, fieldManagerId: true },
    });
    const title = prog?.title || 'a program';
    await Promise.all(
      toCreate.map((volunteerId) =>
        notificationService.createNotification(volunteerId, {
          type: 'PROGRAM_ASSIGNED',
          title: 'Program assignment',
          body: `You have been assigned to: ${title}.`,
        })
      )
    );
    if (prog?.fieldManagerId) {
      await notificationService.createNotification(prog.fieldManagerId, {
        type: 'VOLUNTEER_JOINED_PROGRAM',
        title: 'Volunteer deployment',
        body: `${toCreate.length} volunteer(s) added to ${title}.`,
      });
    }
  }

  await Promise.all(unique.map((vid) => syncVolunteerOpsStatus(vid)));

  const full = await prisma.program.findUnique({
    where: { id: programId },
    include: programInclude,
  });
  return mapProgram(full);
}

async function unassignVolunteer(programId, volunteerId) {
  const row = await prisma.programVolunteer.findUnique({
    where: { programId_volunteerId: { programId, volunteerId } },
  });
  if (!row) throw new Error('Assignment not found.');

  await prisma.programVolunteer.delete({
    where: { programId_volunteerId: { programId, volunteerId } },
  });
  await syncVolunteerOpsStatus(volunteerId);
  return { message: 'Volunteer removed from program.' };
}

async function listAvailableVolunteers(programId) {
  const assigned = await prisma.programVolunteer.findMany({
    where: { programId },
    select: { volunteerId: true },
  });
  const assignedIds = assigned.map((a) => a.volunteerId);

  const where = {
    role: 'VOLUNTEER',
    status: 'ACTIVE',
  };
  if (assignedIds.length) where.id = { notIn: assignedIds };

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      skills: true,
      certifications: true,
      volunteerOpsStatus: true,
      volunteerDistrict: true,
      _count: { select: { programVolunteers: true } },
    },
    orderBy: { name: 'asc' },
  });
}

module.exports = {
  assignVolunteers,
  unassignVolunteer,
  listAvailableVolunteers,
  syncVolunteerOpsStatus,
};
