const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

const taskInclude = {
  program: { select: { id: true, title: true, district: true, sector: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignedBy: { select: { id: true, name: true, email: true } },
};

function progressForStatus(status) {
  switch (status) {
    case 'IN_PROGRESS':
      return 50;
    case 'COMPLETED':
      return 100;
    case 'PENDING':
    case 'CANCELLED':
    default:
      return 0;
  }
}

function parseHistory(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function assertCanManageTasks(actorId, actorRole, programId) {
  if (actorRole === 'ADMIN' || actorRole === 'COORDINATOR') return;
  if (actorRole !== 'FIELD_MANAGER') {
    const err = new Error('Only field managers and coordinators may manage tasks for programs.');
    err.statusCode = 403;
    throw err;
  }
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { fieldManagerId: true },
  });
  if (!program) {
    const err = new Error('Program not found.');
    err.statusCode = 404;
    throw err;
  }
  if (program.fieldManagerId !== actorId) {
    const err = new Error('You may only create tasks for programs assigned to you as field manager.');
    err.statusCode = 403;
    throw err;
  }
}

async function assertVolunteerOnProgram(programId, volunteerId) {
  const link = await prisma.programVolunteer.findUnique({
    where: { programId_volunteerId: { programId, volunteerId } },
    select: { id: true },
  });
  if (!link) {
    const err = new Error('Selected volunteer is not assigned to this program.');
    err.statusCode = 400;
    throw err;
  }
}

async function createTask(payload, createdById, createdByRole) {
  const {
    title,
    description,
    programId,
    assignedVolunteerId,
    dueDate,
    location,
    priority,
    status,
  } = payload;

  if (!title || !programId || !assignedVolunteerId || !dueDate) {
    throw new Error('title, programId, assignedVolunteerId, and dueDate are required.');
  }

  await assertCanManageTasks(createdById, createdByRole, programId);

  const volunteer = await prisma.user.findFirst({
    where: {
      id: assignedVolunteerId,
      role: 'VOLUNTEER',
      status: 'ACTIVE',
      volunteerOpsStatus: { not: 'ON_LEAVE' },
    },
    select: { id: true },
  });
  if (!volunteer) {
    throw new Error('Volunteer is not available for assignment.');
  }

  await assertVolunteerOnProgram(programId, assignedVolunteerId);

  const allowedPriority = new Set(['LOW', 'MEDIUM', 'HIGH']);
  const pr = allowedPriority.has(priority) ? priority : 'MEDIUM';

  const allowedStatus = new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  const st = allowedStatus.has(status) ? status : 'PENDING';
  const prog = progressForStatus(st);

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) throw new Error('dueDate must be valid.');

  const creator = await prisma.user.findUnique({
    where: { id: createdById },
    select: { name: true },
  });

  const row = await prisma.task.create({
    data: {
      title: String(title).trim(),
      description: description !== undefined ? String(description).trim() : '',
      programId,
      assignedToId: assignedVolunteerId,
      assignedById: createdById,
      status: st,
      priority: pr,
      dueDate: due,
      location: location !== undefined ? String(location).trim() : '',
      progress: prog,
      progressHistory: [
        {
          at: new Date().toISOString(),
          status: st,
          progress: prog,
          note: 'Task created',
          userId: createdById,
          userName: creator?.name || 'Coordinator',
        },
      ],
    },
    include: taskInclude,
  });

  await notificationService.createNotification(assignedVolunteerId, {
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    body: `You were assigned: ${row.title} (${row.program?.title || 'Program'}).`,
  });

  return row;
}

async function listMine(userId) {
  return prisma.task.findMany({
    where: { assignedToId: userId },
    orderBy: { dueDate: 'asc' },
    include: taskInclude,
  });
}

async function listCreatedByFieldManager(userId, role) {
  if (role === 'ADMIN' || role === 'COORDINATOR') {
    return prisma.task.findMany({
      where: {},
      orderBy: { dueDate: 'desc' },
      take: 150,
      include: taskInclude,
    });
  }
  if (role === 'FIELD_MANAGER') {
    return prisma.task.findMany({
      where: {
        OR: [{ assignedById: userId }, { program: { fieldManagerId: userId } }],
      },
      orderBy: { dueDate: 'desc' },
      take: 150,
      include: taskInclude,
    });
  }
  return [];
}

async function notifyCoordinatorsTaskCompleted(title, volunteerName) {
  const coordinators = await prisma.user.findMany({
    where: { role: 'COORDINATOR', status: 'ACTIVE' },
    select: { id: true },
  });
  await notificationService.notifyMany(
    coordinators.map((c) => c.id),
    {
      type: 'TASK_COMPLETED',
      title: 'Task completed',
      body: `${volunteerName} completed task: ${title}.`,
    }
  );
}

async function updateTask(taskId, body, actorId, actorRole) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { program: { select: { fieldManagerId: true, title: true } }, assignedTo: true, assignedBy: true },
  });
  if (!task) {
    const err = new Error('Task not found.');
    err.statusCode = 404;
    throw err;
  }

  const isAssignee = task.assignedToId === actorId;
  const isFmOnProgram =
    actorRole === 'FIELD_MANAGER' && task.program && task.program.fieldManagerId === actorId;
  const isElevated = actorRole === 'ADMIN' || actorRole === 'COORDINATOR';

  if (!isAssignee && !isFmOnProgram && !isElevated) {
    const err = new Error('Not allowed to update this task.');
    err.statusCode = 403;
    throw err;
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { name: true },
  });
  const actorName = actor?.name || 'User';

  const payload = {};
  if (body.completionNotes !== undefined && (isAssignee || isFmOnProgram || isElevated)) {
    payload.completionNotes = String(body.completionNotes || '').trim();
  }
  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.description !== undefined) payload.description = String(body.description ?? '');
  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid dueDate.');
    payload.dueDate = d;
  }
  if (body.location !== undefined) payload.location = String(body.location ?? '');
  if (body.priority !== undefined) {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(body.priority)) throw new Error('Invalid priority.');
    payload.priority = body.priority;
  }

  let nextStatus = task.status;
  if (body.status !== undefined) {
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
      throw new Error('Invalid status.');
    }
    if (isAssignee && !isElevated && !isFmOnProgram) {
      const allowedVolunteer = new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
      if (!allowedVolunteer.has(body.status)) {
        const err = new Error('Volunteers may set status to pending, in progress, completed, or cancelled.');
        err.statusCode = 403;
        throw err;
      }
    }
    nextStatus = body.status;
    payload.status = body.status;
  }

  const history = parseHistory(task.progressHistory);
  const statusChanged = body.status !== undefined && body.status !== task.status;

  if (statusChanged || body.completionNotes !== undefined) {
    const autoProgress = progressForStatus(nextStatus);
    payload.progress = autoProgress;

    if (nextStatus === 'COMPLETED' && body.completionNotes !== undefined) {
      payload.completionNotes = String(body.completionNotes || '').trim();
    }

    if (statusChanged) {
      const note =
        nextStatus === 'COMPLETED' && body.completionNotes
          ? String(body.completionNotes).trim()
          : nextStatus === 'COMPLETED'
            ? 'Marked complete'
            : nextStatus === 'IN_PROGRESS'
              ? 'Started task'
              : nextStatus === 'CANCELLED'
                ? 'Task cancelled'
                : 'Status updated';
      history.push({
        at: new Date().toISOString(),
        status: nextStatus,
        progress: autoProgress,
        note,
        userId: actorId,
        userName: actorName,
      });
      payload.progressHistory = history;
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: payload,
    include: taskInclude,
  });

  if (statusChanged && isAssignee) {
    const fmId = task.assignedById;
    const volName = task.assignedTo?.name || 'Volunteer';
    const title = task.title;

    if (nextStatus === 'COMPLETED') {
      await notificationService.createNotification(fmId, {
        type: 'TASK_COMPLETED',
        title: 'Task completed',
        body: `${volName} completed: ${title}.`,
      });
      await notifyCoordinatorsTaskCompleted(title, volName);
    } else if (nextStatus === 'IN_PROGRESS' || nextStatus === 'CANCELLED' || nextStatus === 'PENDING') {
      await notificationService.createNotification(fmId, {
        type: 'TASK_UPDATED',
        title: 'Task status updated',
        body: `${volName} set "${title}" to ${nextStatus.replace('_', ' ')}.`,
      });
    }
  }

  if (statusChanged && !isAssignee && (isFmOnProgram || isElevated)) {
    await notificationService.createNotification(task.assignedToId, {
      type: 'TASK_UPDATED',
      title: 'Your task was updated',
      body: `"${task.title}" is now ${nextStatus.replace('_', ' ')} (${actorName}).`,
    });
  }

  return updated;
}

module.exports = {
  createTask,
  listMine,
  listCreatedByFieldManager,
  updateTask,
  taskInclude,
};
