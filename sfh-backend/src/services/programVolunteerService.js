const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { programInclude, mapProgram } = require('./programService');
const { computeProgramStatus } = require('../utils/programStatus');
const notificationService = require('./notificationService');
const { syncVolunteerOpsStatus } = require('../utils/volunteerOpsSync');

const prisma = new PrismaClient();

const NON_BLOCKING_PROGRAM_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CLOSED']);

/** Block only when the program is effectively PLANNED or ONGOING (date-based), not stale DB status. */
function isProgramBlockingAssignment(statusFromDb, startDate, endDate) {
  const db = (statusFromDb || '').toUpperCase();
  if (NON_BLOCKING_PROGRAM_STATUSES.has(db)) return false;

  const computed = computeProgramStatus(startDate, endDate);
  return computed === 'PLANNED' || computed === 'ONGOING';
}

async function assignVolunteers(programId, volunteerIds, assignedById) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, fieldManagerId: true, startDate: true, endDate: true, title: true },
  });
  if (!program) throw new Error('Program not found.');

  const programStatus = computeProgramStatus(program.startDate, program.endDate);
  if (programStatus === 'COMPLETED') {
    throw new Error('Cannot assign volunteers to a completed program.');
  }

  const ids = Array.isArray(volunteerIds) ? volunteerIds : [];
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length === 0) throw new Error('volunteerIds must be a non-empty array.');

  const volunteers = await prisma.user.findMany({
    where: {
      id: { in: unique },
      role: 'VOLUNTEER',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      volunteerOpsStatus: true,
      programVolunteers: {
        include: {
          program: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
    },
  });
  if (volunteers.length !== unique.length) {
    throw new Error('One or more volunteers are invalid, inactive, or not volunteers.');
  }

  // Validate that none of the volunteers are already assigned to a PLANNED, ACTIVE, or ONGOING program, or ON LEAVE
  for (const volunteer of volunteers) {
    if (volunteer.volunteerOpsStatus === 'ON_LEAVE') {
      throw new Error('This volunteer is currently on leave and cannot be assigned.');
    }

    const assignments = volunteer.programVolunteers || [];
    for (const assignment of assignments) {
      const prog = assignment.program;
      if (!prog) continue;
      if (prog.id === programId) continue; // Exclude the program being assigned to

      if (isProgramBlockingAssignment(prog.status, prog.startDate, prog.endDate)) {
        throw new Error('This volunteer is already assigned to another planned or active program and cannot be assigned again.');
      }
    }
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
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { district: true, districts: true, startDate: true, endDate: true },
  });
  if (!program) throw new Error('Program not found.');

  const programStatus = computeProgramStatus(program.startDate, program.endDate);
  if (programStatus === 'COMPLETED') {
    throw new Error('Cannot assign volunteers to a completed program.');
  }

  const programDistricts = new Set(
    [program.district, ...(program.districts || [])].filter(Boolean).map((d) => d.toLowerCase())
  );

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

  const rows = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      skills: true,
      certifications: true,
      volunteerOpsStatus: true,
      volunteerDistrict: true,
      programVolunteers: {
        include: {
          program: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      _count: { select: { programVolunteers: true } },
    },
  });

  const sorted = rows.sort((a, b) => {
    const aLocal = programDistricts.has((a.volunteerDistrict || '').toLowerCase()) ? 0 : 1;
    const bLocal = programDistricts.has((b.volunteerDistrict || '').toLowerCase()) ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    return a.name.localeCompare(b.name);
  });

  return sorted.map(({ _count, programVolunteers, ...rest }) => {
    // Determine availability
    let isAvailable = true;
    let unavailableReason = null;

    if (rest.volunteerOpsStatus === 'ON_LEAVE') {
      isAvailable = false;
      unavailableReason = 'Currently on leave';
    } else {
      const assignments = programVolunteers || [];
      for (const assignment of assignments) {
        const prog = assignment.program;
        if (!prog) continue;

        if (!isProgramBlockingAssignment(prog.status, prog.startDate, prog.endDate)) continue;

        const statusComputed = computeProgramStatus(prog.startDate, prog.endDate);
        if (statusComputed === 'ONGOING') {
          isAvailable = false;
          unavailableReason = 'Assigned to active program';
          break;
        }
        if (statusComputed === 'PLANNED') {
          isAvailable = false;
          unavailableReason = 'Assigned to planned program';
        }
      }
    }

    return {
      ...rest,
      isLocalVolunteer: programDistricts.has((rest.volunteerDistrict || '').toLowerCase()),
      programCount: _count?.programVolunteers ?? 0,
      isAvailable,
      unavailableReason,
    };
  });
}

module.exports = {
  assignVolunteers,
  unassignVolunteer,
  listAvailableVolunteers,
  syncVolunteerOpsStatus,
};
