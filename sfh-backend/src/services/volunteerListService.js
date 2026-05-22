const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
      status: true,
      profileImage: true,
      skills: true,
      certifications: true,
      volunteerOpsStatus: true,
      volunteerDistrict: true,
      createdAt: true,
      programVolunteers: {
        include: {
          program: { select: { id: true, title: true, status: true } },
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

  return volunteers.map((v) => {
    const programs = v.programVolunteers || [];
    const completedTasks = (v.assignedTasks || []).filter((t) => t.status === 'COMPLETED').length;
    const pendingTasks = (v.assignedTasks || []).filter((t) =>
      ['PENDING', 'IN_PROGRESS'].includes(t.status)
    ).length;
    const reportsSubmitted = (v.fieldReports || []).length;
    const currentProgram = programs.find((pv) => pv.program)?.program?.title;

    return {
      id: v.id,
      name: v.name,
      email: v.email,
      status: v.status,
      profileImage: v.profileImage,
      skills: v.skills,
      certifications: v.certifications,
      volunteerOpsStatus: v.volunteerOpsStatus,
      volunteerDistrict: v.volunteerDistrict,
      joinDate: v.createdAt,
      assignedProgramsCount: programs.length,
      programsCompleted: programs.filter((pv) => pv.program?.status === 'COMPLETED').length,
      tasksCompleted: completedTasks,
      pendingTasks,
      fieldReportsSubmitted: reportsSubmitted,
      beneficiariesRegistered: (v.beneficiariesCreated || []).length,
      currentProgram: currentProgram || null,
      taskSummary: `${completedTasks} completed, ${pendingTasks} pending`,
      activitySummary: `${reportsSubmitted} reports, ${(v.beneficiariesCreated || []).length} beneficiaries registered`,
    };
  });
}

module.exports = { listVolunteers };
