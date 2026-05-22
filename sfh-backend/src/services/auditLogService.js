const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req?.ip || req?.socket?.remoteAddress || null;
}

async function logAudit(req, { action, module, severity = 'INFO', description, userId, userName, targetType, targetId }) {
  return prisma.auditLog.create({
    data: {
      action: String(action),
      module: String(module),
      severity,
      description: String(description),
      userId: userId || null,
      userName: userName || null,
      ipAddress: req ? getClientIp(req) : null,
      targetType: targetType || null,
      targetId: targetId || null,
    },
  });
}

async function listAuditLogs({ take = 500, module, severity, dateFrom, dateTo } = {}) {
  const where = {};
  if (module) where.module = module;
  if (severity) where.severity = String(severity).toUpperCase();
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      where.createdAt.gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
}

module.exports = { logAudit, listAuditLogs, getClientIp };
