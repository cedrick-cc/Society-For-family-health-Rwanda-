const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRIORITIES = new Set(['URGENT', 'NORMAL', 'INFO']);

function mapAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    priority: String(row.priority).toLowerCase(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy
      ? { name: row.createdBy.name, role: String(row.createdBy.role).toLowerCase() }
      : { name: 'System', role: 'admin' },
  };
}

async function listAnnouncements() {
  const rows = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, role: true } } },
  });
  return rows.map(mapAnnouncement);
}

async function createAnnouncement({ title, message, priority, createdById }) {
  const p = String(priority || 'NORMAL').toUpperCase();
  if (!PRIORITIES.has(p)) throw new Error('Invalid priority.');
  const row = await prisma.announcement.create({
    data: {
      title: String(title || '').trim(),
      message: String(message || '').trim(),
      priority: p,
      createdById,
    },
    include: { createdBy: { select: { name: true, role: true } } },
  });
  return mapAnnouncement(row);
}

async function updateAnnouncement(id, { title, message, priority }) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Announcement not found.');
    err.statusCode = 404;
    throw err;
  }
  const data = {};
  if (title !== undefined) data.title = String(title).trim();
  if (message !== undefined) data.message = String(message).trim();
  if (priority !== undefined) {
    const p = String(priority).toUpperCase();
    if (!PRIORITIES.has(p)) throw new Error('Invalid priority.');
    data.priority = p;
  }
  const row = await prisma.announcement.update({
    where: { id },
    data,
    include: { createdBy: { select: { name: true, role: true } } },
  });
  return mapAnnouncement(row);
}

async function deleteAnnouncement(id) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Announcement not found.');
    err.statusCode = 404;
    throw err;
  }
  await prisma.announcement.delete({ where: { id } });
  return { ok: true };
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
