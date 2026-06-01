const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');

const prisma = new PrismaClient();

function mapVolunteerSummary(v) {
  const programs = v.programVolunteers || [];
  const activePrograms = programs.filter((pv) => {
    const p = pv.program;
    if (!p) return false;
    const st = computeProgramStatus(p.startDate, p.endDate);
    return st === 'PLANNED' || st === 'ONGOING';
  });
  const completedPrograms = programs.filter((pv) => {
    const p = pv.program;
    if (!p) return false;
    return computeProgramStatus(p.startDate, p.endDate) === 'COMPLETED';
  });
  const completedTasks = (v.assignedTasks || []).filter((t) => t.status === 'COMPLETED').length;
  const pendingTasks = (v.assignedTasks || []).filter((t) =>
    ['PENDING', 'IN_PROGRESS'].includes(t.status)
  ).length;
  const reports = v.fieldReports || [];
  const reportsSubmitted = reports.length;
  const beneficiariesFromReports = reports.reduce(
    (sum, r) => sum + (Number(r.beneficiariesCount) || 0),
    0
  );
  const beneficiariesRegistered = (v.beneficiariesCreated || []).length;
  const currentProgram = activePrograms.find((pv) => pv.program)?.program?.title;

  return {
    id: v.id,
    name: v.name,
    email: v.email,
    phone: v.phone || null,
    phoneNumber: v.phone || null,
    nationalId: v.nationalId || null,
    status: v.status,
    profileImage: v.profileImage,
    skills: v.skills,
    certifications: v.certifications,
    volunteerOpsStatus: v.volunteerOpsStatus,
    volunteerDistrict: v.volunteerDistrict,
    joinDate: v.createdAt,
    registrationDate: v.createdAt,
    assignedProgramsCount: activePrograms.length,
    programsParticipated: programs.length,
    programsCompleted: completedPrograms.length,
    programsAssigned: activePrograms.length,
    tasksCompleted: completedTasks,
    pendingTasks,
    fieldReportsSubmitted: reportsSubmitted,
    beneficiariesRegistered,
    beneficiariesServed: beneficiariesFromReports + beneficiariesRegistered,
    currentProgram: currentProgram || null,
    taskSummary: `${completedTasks} completed, ${pendingTasks} pending`,
    activitySummary: `${reportsSubmitted} reports, ${beneficiariesRegistered} beneficiaries registered`,
  };
}

async function listVolunteers({ search, status, opsStatus } = {}) {
  const where = {
    role: 'VOLUNTEER',
    status: status ? String(status).toUpperCase() : { in: ['ACTIVE', 'INACTIVE'] },
  };

  if (opsStatus) {
    where.volunteerOpsStatus = String(opsStatus).toUpperCase();
  }

  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { volunteerDistrict: { contains: q, mode: 'insensitive' } },
    ];
  }

  const volunteers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationalId: true,
      status: true,
      profileImage: true,
      skills: true,
      certifications: true,
      volunteerOpsStatus: true,
      volunteerDistrict: true,
      createdAt: true,
      programVolunteers: {
        include: {
          program: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
        },
      },
      assignedTasks: {
        select: { id: true, status: true, title: true },
      },
      fieldReports: {
        select: { id: true, status: true, beneficiariesCount: true },
      },
      beneficiariesCreated: {
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return volunteers.map(mapVolunteerSummary);
}

async function getVolunteerDetail(volunteerId) {
  const v = await prisma.user.findFirst({
    where: { id: volunteerId, role: 'VOLUNTEER' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationalId: true,
      status: true,
      profileImage: true,
      skills: true,
      certifications: true,
      volunteerOpsStatus: true,
      volunteerDistrict: true,
      bio: true,
      yearsOfExperience: true,
      createdAt: true,
      programVolunteers: {
        include: {
          program: {
            select: { id: true, title: true, status: true, district: true, startDate: true, endDate: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
      assignedTasks: {
        select: { id: true, title: true, status: true, dueDate: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      },
      fieldReports: {
        select: {
          id: true,
          status: true,
          location: true,
          beneficiariesCount: true,
          notes: true,
          createdAt: true,
          program: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      },
      beneficiariesCreated: {
        select: { id: true, fullName: true, district: true, registrationDate: true },
        orderBy: { registrationDate: 'desc' },
        take: 15,
      },
      activityLogs: {
        select: { actionType: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!v) {
    const err = new Error('Volunteer not found.');
    err.statusCode = 404;
    throw err;
  }

  const summary = mapVolunteerSummary(v);
  const completedTasks = (v.assignedTasks || []).filter((t) => t.status === 'COMPLETED');

  return {
    ...summary,
    bio: v.bio,
    yearsOfExperience: v.yearsOfExperience ?? 0,
    assignedPrograms: (v.programVolunteers || []).filter((pv) => pv.program).map((pv) => ({
      id: pv.program.id,
      title: pv.program.title,
      status: pv.program.status,
      district: pv.program.district,
      assignedAt: pv.assignedAt,
    })),
    completedTasks: completedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.updatedAt,
    })),
    fieldReports: (v.fieldReports || []).map((r) => ({
      id: r.id,
      status: r.status,
      location: r.location,
      programTitle: r.program?.title,
      beneficiariesCount: r.beneficiariesCount,
      notes: r.notes,
      createdAt: r.createdAt,
    })),
    beneficiariesRegistered: v.beneficiariesCreated,
    recentActivities: (v.activityLogs || []).map((a) => ({
      action: a.actionType,
      description: a.description,
      at: a.createdAt,
    })),
  };
}

async function updateVolunteer(volunteerId, data) {
  const v = await prisma.user.findFirst({
    where: { id: volunteerId, role: 'VOLUNTEER' },
    select: { id: true },
  });
  if (!v) {
    const err = new Error('Volunteer not found.');
    err.statusCode = 404;
    throw err;
  }

  const payload = {};
  if (data.phone !== undefined) payload.phone = data.phone ? String(data.phone).trim() : null;
  if (data.nationalId !== undefined) payload.nationalId = data.nationalId ? String(data.nationalId).trim() : null;
  if (data.volunteerDistrict !== undefined) {
    payload.volunteerDistrict = data.volunteerDistrict ? String(data.volunteerDistrict).trim() : null;
  }
  if (data.skills !== undefined) {
    payload.skills = Array.isArray(data.skills) ? data.skills.map(String) : [];
  }
  if (data.certifications !== undefined) {
    payload.certifications = Array.isArray(data.certifications)
      ? data.certifications.map(String)
      : [];
  }
  if (data.volunteerOpsStatus !== undefined) {
    const ops = String(data.volunteerOpsStatus).toUpperCase();
    if (!['AVAILABLE', 'ASSIGNED', 'ON_LEAVE'].includes(ops)) {
      throw new Error('Invalid volunteer ops status.');
    }
    payload.volunteerOpsStatus = ops;
  }

  const updated = await prisma.user.update({
    where: { id: volunteerId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationalId: true,
      status: true,
      profileImage: true,
      skills: true,
      certifications: true,
      volunteerOpsStatus: true,
      volunteerDistrict: true,
      createdAt: true,
      programVolunteers: {
        include: { program: { select: { id: true, title: true, status: true } } },
      },
      assignedTasks: { select: { id: true, status: true, title: true } },
      fieldReports: { select: { id: true, status: true, beneficiariesCount: true } },
      beneficiariesCreated: { select: { id: true } },
    },
  });

  return mapVolunteerSummary(updated);
}

async function deactivateVolunteer(volunteerId) {
  const v = await prisma.user.findFirst({
    where: { id: volunteerId, role: 'VOLUNTEER' },
    select: { id: true, status: true },
  });
  if (!v) {
    const err = new Error('Volunteer not found.');
    err.statusCode = 404;
    throw err;
  }
  await prisma.user.update({
    where: { id: volunteerId },
    data: { status: 'INACTIVE', volunteerOpsStatus: 'ON_LEAVE' },
  });
  return { id: volunteerId, status: 'INACTIVE' };
}

module.exports = {
  listVolunteers,
  getVolunteerDetail,
  updateVolunteer,
  deactivateVolunteer,
};
