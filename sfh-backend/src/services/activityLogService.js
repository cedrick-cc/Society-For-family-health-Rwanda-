const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function logActivity({ actionType, description, userId, targetType, targetId }) {
  if (!actionType || !description) return null;
  return prisma.activityLog.create({
    data: {
      actionType: String(actionType),
      description: String(description),
      userId: userId || null,
      targetType: targetType || null,
      targetId: targetId || null,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

async function listRecent({ take = 30, actionType } = {}) {
  const where = actionType ? { actionType } : {};
  return prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

module.exports = { logActivity, listRecent };
