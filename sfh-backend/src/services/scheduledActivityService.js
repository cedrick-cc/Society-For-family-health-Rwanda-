const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

const activityInclude = {
  program: { select: { id: true, title: true, district: true } },
  createdBy: { select: { id: true, name: true } },
  assignments: {
    include: { volunteer: { select: { id: true, name: true, email: true } } },
  },
};

function mapActivity(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    district: row.district,
    programId: row.programId,
    programTitle: row.program?.title || null,
    createdById: row.createdById,
    createdByName: row.createdBy?.name,
    volunteerIds: row.assignments.map((a) => a.volunteerId),
    volunteers: row.assignments.map((a) => ({
      id: a.volunteer.id,
      name: a.volunteer.name,
      email: a.volunteer.email,
    })),
  };
}

async function createActivity(creatorId, payload) {
  const { title, description, date, time, district, programId, volunteerIds } = payload;
  if (!title?.trim() || !date || !time?.trim() || !district?.trim()) {
    throw new Error('Title, date, time, and district are required.');
  }

  const activityDate = new Date(date);
  if (Number.isNaN(activityDate.getTime())) {
    throw new Error('Invalid date.');
  }

  const ids = [...new Set((volunteerIds || []).filter(Boolean))];
  if (ids.length) {
    const count = await prisma.user.count({
      where: { id: { in: ids }, role: 'VOLUNTEER', status: 'ACTIVE' },
    });
    if (count !== ids.length) {
      throw new Error('One or more assigned volunteers are invalid.');
    }
  }

  const row = await prisma.scheduledActivity.create({
    data: {
      title: title.trim(),
      description: description?.trim() || '',
      date: activityDate,
      time: String(time).trim(),
      district: district.trim(),
      programId: programId || null,
      createdById: creatorId,
      assignments: ids.length
        ? { create: ids.map((volunteerId) => ({ volunteerId })) }
        : undefined,
    },
    include: activityInclude,
  });

  if (ids.length) {
    await notificationService.notifyMany(ids, {
      type: 'SCHEDULED_ACTIVITY',
      category: 'SCHEDULE',
      title: 'New scheduled activity',
      body: `${row.title} on ${activityDate.toLocaleDateString()} at ${row.time} (${row.district})`,
      linkPath: '/dashboard',
    });
  }

  return mapActivity(row);
}

async function listActivities(user) {
  const where = {};

  if (user.role === 'VOLUNTEER') {
    where.assignments = { some: { volunteerId: user.userId } };
  } else if (user.role === 'FIELD_MANAGER') {
    const programIds = (
      await prisma.program.findMany({
        where: { fieldManagerId: user.userId },
        select: { id: true },
      })
    ).map((p) => p.id);
    if (programIds.length) {
      where.OR = [{ createdById: user.userId }, { programId: { in: programIds } }];
    } else {
      where.createdById = user.userId;
    }
  } else if (user.role === 'COORDINATOR') {
    const programIds = (
      await prisma.program.findMany({
        where: { createdById: user.userId },
        select: { id: true },
      })
    ).map((p) => p.id);
    where.OR = [{ createdById: user.userId }];
    if (programIds.length) {
      where.OR.push({ programId: { in: programIds } });
    }
  }

  const rows = await prisma.scheduledActivity.findMany({
    where,
    include: activityInclude,
    orderBy: { date: 'asc' },
  });

  return rows.map(mapActivity);
}

async function getActivity(id, user) {
  const row = await prisma.scheduledActivity.findUnique({
    where: { id },
    include: activityInclude,
  });
  if (!row) throw new Error('Scheduled activity not found.');

  if (user.role === 'VOLUNTEER') {
    const assigned = row.assignments.some((a) => a.volunteerId === user.userId);
    if (!assigned) throw new Error('Forbidden.');
  }

  return mapActivity(row);
}

async function updateActivity(id, user, payload) {
  const existing = await prisma.scheduledActivity.findUnique({ where: { id } });
  if (!existing) throw new Error('Scheduled activity not found.');

  const canEdit =
    user.role === 'ADMIN' ||
    user.role === 'COORDINATOR' ||
    existing.createdById === user.userId;
  if (!canEdit) throw new Error('Forbidden.');

  const data = {};
  if (payload.title !== undefined) data.title = String(payload.title).trim();
  if (payload.description !== undefined) data.description = String(payload.description).trim();
  if (payload.date !== undefined) data.date = new Date(payload.date);
  if (payload.time !== undefined) data.time = String(payload.time).trim();
  if (payload.district !== undefined) data.district = String(payload.district).trim();
  if (payload.programId !== undefined) data.programId = payload.programId || null;

  const volunteerIds = payload.volunteerIds;
  if (volunteerIds !== undefined) {
    const ids = [...new Set((volunteerIds || []).filter(Boolean))];
    await prisma.scheduledActivityVolunteer.deleteMany({ where: { scheduledActivityId: id } });
    if (ids.length) {
      await prisma.scheduledActivityVolunteer.createMany({
        data: ids.map((volunteerId) => ({ scheduledActivityId: id, volunteerId })),
      });
      await notificationService.notifyMany(ids, {
        type: 'SCHEDULED_ACTIVITY_UPDATED',
        category: 'SCHEDULE',
        title: 'Activity schedule updated',
        body: data.title || existing.title,
        linkPath: '/dashboard',
      });
    }
  }

  const row = await prisma.scheduledActivity.update({
    where: { id },
    data,
    include: activityInclude,
  });

  return mapActivity(row);
}

async function deleteActivity(id, user) {
  const existing = await prisma.scheduledActivity.findUnique({ where: { id } });
  if (!existing) throw new Error('Scheduled activity not found.');
  const canDelete =
    user.role === 'ADMIN' ||
    user.role === 'COORDINATOR' ||
    existing.createdById === user.userId;
  if (!canDelete) throw new Error('Forbidden.');
  await prisma.scheduledActivity.delete({ where: { id } });
  return { message: 'Deleted.' };
}

module.exports = {
  createActivity,
  listActivities,
  getActivity,
  updateActivity,
  deleteActivity,
};
