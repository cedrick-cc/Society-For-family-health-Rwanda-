const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');
const notificationService = require('./notificationService');
const resourceService = require('./resourceService');
const activityLogService = require('./activityLogService');

const prisma = new PrismaClient();

const VALID_PROGRAM_TYPES = new Set([
  'HIV_AIDS_AWARENESS',
  'MATERNAL_HEALTH',
  'FAMILY_PLANNING',
  'CHILD_NUTRITION',
  'VACCINATION_CAMPAIGN',
]);

const programResourcesInclude = {
  programResources: { include: { resource: true } },
};

const programInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  fieldManager: { select: { id: true, name: true, email: true, role: true } },
  ...programResourcesInclude,
  programVolunteers: {
    include: {
      volunteer: {
        select: {
          id: true,
          name: true,
          email: true,
          skills: true,
          certifications: true,
          volunteerOpsStatus: true,
        },
      },
      assignedBy: { select: { id: true, name: true } },
    },
  },
  _count: { select: { beneficiaries: true } },
};

const programDetailInclude = {
  ...programInclude,
  fieldReports: {
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: {
      volunteer: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  },
  tasks: {
    orderBy: { dueDate: 'asc' },
    take: 50,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  },
};

const parseDate = (value, fieldName) => {
  if (!value) throw new Error(`${fieldName} is required.`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`${fieldName} must be a valid date.`);
  return d;
};

function mapProgram(p) {
  if (!p) return p;
  const status = computeProgramStatus(p.startDate, p.endDate);
  return {
    ...p,
    status,
    beneficiaryCount: p._count?.beneficiaries ?? undefined,
  };
}

async function validateFieldManager(fieldManagerId) {
  if (!fieldManagerId) throw new Error('fieldManagerId is required.');
  const fm = await prisma.user.findFirst({
    where: { id: fieldManagerId, role: 'FIELD_MANAGER', status: 'ACTIVE' },
    select: { id: true },
  });
  if (!fm) throw new Error('fieldManagerId must reference an active user with role FIELD_MANAGER.');
}

const createProgram = async (data, createdById, req) => {
  const {
    title,
    description,
    district,
    sector,
    startDate,
    endDate,
    programType,
    targetBeneficiaries,
    volunteersNeeded,
    progress,
    fieldManagerId,
    resourceAllocations,
  } = data;

  if (!title || !description || !district) {
    throw new Error('title, description, and district are required.');
  }
  if (!programType || !VALID_PROGRAM_TYPES.has(programType)) {
    throw new Error('programType must be a valid ProgramType enum value.');
  }

  await validateFieldManager(fieldManagerId);

  const start = parseDate(startDate, 'startDate');
  const end = parseDate(endDate, 'endDate');
  if (end < start) throw new Error('endDate must be on or after startDate.');

  const status = computeProgramStatus(start, end);

  const row = await prisma.program.create({
    data: {
      title: String(title).trim(),
      description: String(description).trim(),
      district: String(district).trim(),
      sector: sector ? String(sector).trim() : null,
      startDate: start,
      endDate: end,
      status,
      programType,
      targetBeneficiaries: Number(targetBeneficiaries) || 0,
      volunteersNeeded: Number(volunteersNeeded) || 0,
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      createdById,
      fieldManagerId,
    },
    include: programInclude,
  });
  if (row.fieldManagerId) {
    await notificationService.createNotification(row.fieldManagerId, {
      type: 'PROGRAM_ASSIGNED_FM',
      category: 'PROGRAM',
      title: 'Program field assignment',
      body: `You have been assigned as field manager for: ${row.title}.`,
      linkPath: '/dashboard/programs',
      linkTargetId: row.id,
    });
  }
  if (resourceAllocations?.length) {
    await resourceService.syncProgramAllocations(row.id, programType, resourceAllocations, req);
  }
  await activityLogService.logActivity({
    actionType: 'PROGRAM_CREATED',
    description: `Program created: ${row.title}`,
    userId: createdById,
    targetType: 'PROGRAM',
    targetId: row.id,
  });
  const withResources = await getProgramById(row.id);
  return withResources;
};

const listPrograms = async () => {
  const rows = await prisma.program.findMany({
    include: programInclude,
    orderBy: { startDate: 'desc' },
  });
  return rows.map(mapProgram);
};

const listProgramsForFieldManager = async (fieldManagerId) => {
  const rows = await prisma.program.findMany({
    where: { fieldManagerId },
    include: programInclude,
    orderBy: { startDate: 'desc' },
  });
  return rows.map(mapProgram);
};

const listProgramsForVolunteer = async (volunteerId) => {
  const links = await prisma.programVolunteer.findMany({
    where: { volunteerId },
    include: {
      program: { include: programInclude },
    },
    orderBy: { assignedAt: 'desc' },
  });
  return links.map((l) => mapProgram(l.program));
};

const getProgramById = async (id) => {
  const row = await prisma.program.findUnique({
    where: { id },
    include: {
      ...programDetailInclude,
      programResources: { include: { resource: true } },
    },
  });
  if (!row) return null;
  return { ...mapProgram(row), programResources: row.programResources };
};

const updateProgram = async (id, data, req) => {
  const existing = await prisma.program.findUnique({ where: { id } });
  if (!existing) throw new Error('Program not found.');

  const prevFm = existing.fieldManagerId;

  const payload = {};
  if (data.title !== undefined) payload.title = String(data.title).trim();
  if (data.description !== undefined) payload.description = String(data.description).trim();
  if (data.district !== undefined) payload.district = String(data.district).trim();
  if (data.sector !== undefined) payload.sector = data.sector ? String(data.sector).trim() : null;
  if (data.startDate !== undefined) payload.startDate = parseDate(data.startDate, 'startDate');
  if (data.endDate !== undefined) payload.endDate = parseDate(data.endDate, 'endDate');
  if (data.programType !== undefined) {
    if (!VALID_PROGRAM_TYPES.has(data.programType)) throw new Error('Invalid programType.');
    payload.programType = data.programType;
  }
  if (data.targetBeneficiaries !== undefined) payload.targetBeneficiaries = Number(data.targetBeneficiaries) || 0;
  if (data.volunteersNeeded !== undefined) payload.volunteersNeeded = Number(data.volunteersNeeded) || 0;
  if (data.progress !== undefined) payload.progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
  if (data.fieldManagerId !== undefined) {
    if (data.fieldManagerId) await validateFieldManager(data.fieldManagerId);
    payload.fieldManagerId = data.fieldManagerId || null;
  }

  if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
    throw new Error('endDate must be on or after startDate.');
  }
  const start = payload.startDate || existing.startDate;
  const end = payload.endDate || existing.endDate;
  if (end < start) throw new Error('endDate must be on or after startDate.');

  payload.status = computeProgramStatus(start, end);

  const row = await prisma.program.update({
    where: { id },
    data: payload,
    include: programInclude,
  });

  if (
    data.fieldManagerId !== undefined &&
    row.fieldManagerId &&
    String(row.fieldManagerId) !== String(prevFm || '')
  ) {
    await notificationService.createNotification(row.fieldManagerId, {
      type: 'PROGRAM_ASSIGNED_FM',
      title: 'Program field assignment',
      body: `You have been assigned as field manager for: ${row.title}.`,
    });
  }

  if (data.resourceAllocations !== undefined) {
    const programType = payload.programType || existing.programType;
    await resourceService.syncProgramAllocations(id, programType, data.resourceAllocations, req);
  }

  return getProgramById(id);
};

const deleteProgram = async (id) => {
  const existing = await prisma.program.findUnique({
    where: { id },
    include: { _count: { select: { beneficiaries: true } } },
  });
  if (!existing) throw new Error('Program not found.');
  if (existing._count.beneficiaries > 0) {
    throw new Error('Cannot delete program while beneficiaries are assigned. Reassign them first.');
  }
  await prisma.program.delete({ where: { id } });
  return { message: 'Program deleted successfully.' };
};

const listFieldManagers = async () => {
  return prisma.user.findMany({
    where: { role: 'FIELD_MANAGER', status: 'ACTIVE' },
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: 'asc' },
  });
};

module.exports = {
  createProgram,
  listPrograms,
  listProgramsForFieldManager,
  listProgramsForVolunteer,
  getProgramById,
  updateProgram,
  deleteProgram,
  listFieldManagers,
  mapProgram,
  programInclude,
  programDetailInclude,
};
