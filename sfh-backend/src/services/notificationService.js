const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createNotification(userId, { type, title, body, category, linkPath, linkTargetId }) {
  if (!userId) return null;
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      category: category || null,
      linkPath: linkPath || null,
      linkTargetId: linkTargetId || null,
    },
  });
}

async function notifyMany(userIds, { type, title, body, category, linkPath, linkTargetId }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type,
      title,
      body,
      category: category || null,
      linkPath: linkPath || null,
      linkTargetId: linkTargetId || null,
    })),
  });
}

async function listForUser(userId, { take = 50 } = {}) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

async function unreadCount(userId) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

async function markRead(userId, notificationId) {
  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!n) return null;
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

module.exports = {
  createNotification,
  notifyMany,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
};
