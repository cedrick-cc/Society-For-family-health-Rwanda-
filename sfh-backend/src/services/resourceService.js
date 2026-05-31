const { PrismaClient } = require('@prisma/client');
const { DEFAULT_RESOURCES } = require('../utils/defaultResources');
const notificationService = require('./notificationService');
const activityLogService = require('./activityLogService');
const auditLogService = require('./auditLogService');

const prisma = new PrismaClient();

const VALID_CATEGORIES = new Set([
  'HIV_AIDS_AWARENESS',
  'MATERNAL_HEALTH',
  'FAMILY_PLANNING',
  'CHILD_NUTRITION',
  'VACCINATION_CAMPAIGN',
]);

async function ensureDefaultResources() {
  for (const r of DEFAULT_RESOURCES) {
    await prisma.resource.upsert({
      where: { resourceKey: r.resourceKey },
      create: {
        name: r.name,
        category: r.category,
        resourceKey: r.resourceKey,
        quantityAvailable: 100,
        unit: r.unit,
        lowStockThreshold: 20,
      },
      update: { name: r.name, category: r.category, unit: r.unit },
    });
  }
}

async function listResources({ category } = {}) {
  await ensureDefaultResources();
  const where = category ? { category } : {};
  return prisma.resource.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
}

async function listByProgramType(programType) {
  if (!VALID_CATEGORIES.has(programType)) return [];
  return listResources({ category: programType });
}

async function createResource(data, req) {
  const { name, category, quantityAvailable, unit, lowStockThreshold, resourceKey } = data;
  if (!name || !category || !VALID_CATEGORIES.has(category)) {
    throw new Error('name and valid category are required.');
  }
  const row = await prisma.resource.create({
    data: {
      name: String(name).trim(),
      category,
      resourceKey: resourceKey ? String(resourceKey).trim() : null,
      quantityAvailable: Math.max(0, Number(quantityAvailable) || 0),
      unit: unit ? String(unit).trim() : 'units',
      lowStockThreshold: Math.max(0, Number(lowStockThreshold) ?? 10),
    },
  });
  await activityLogService.logActivity({
    actionType: 'INVENTORY_RESTOCK',
    description: `Resource created: ${row.name}`,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: row.id,
  });
  await auditLogService.logAudit(req, {
    action: 'RESOURCE_CREATE',
    module: 'INVENTORY',
    description: `Created resource ${row.name}`,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: row.id,
  });
  return row;
}

async function updateResource(id, data, req) {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) throw new Error('Resource not found.');
  const payload = {};
  if (data.name !== undefined) payload.name = String(data.name).trim();
  if (data.category !== undefined) {
    if (!VALID_CATEGORIES.has(data.category)) throw new Error('Invalid category.');
    payload.category = data.category;
  }
  if (data.quantityAvailable !== undefined) payload.quantityAvailable = Math.max(0, Number(data.quantityAvailable) || 0);
  if (data.unit !== undefined) payload.unit = String(data.unit).trim();
  if (data.lowStockThreshold !== undefined) payload.lowStockThreshold = Math.max(0, Number(data.lowStockThreshold) || 0);

  const row = await prisma.resource.update({ where: { id }, data: payload });
  await checkLowStock(row, req);
  await auditLogService.logAudit(req, {
    action: 'RESOURCE_UPDATE',
    module: 'INVENTORY',
    description: `Updated resource ${row.name}`,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: row.id,
  });
  return row;
}

async function deleteResource(id, req) {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) throw new Error('Resource not found.');
  await prisma.programResource.deleteMany({ where: { resourceId: id } });
  await prisma.resource.delete({ where: { id } });
  await auditLogService.logAudit(req, {
    action: 'RESOURCE_DELETE',
    module: 'INVENTORY',
    severity: 'WARNING',
    description: `Deleted resource ${existing.name}`,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: id,
  });
  return { message: 'Resource deleted.' };
}

async function restockResource(id, quantity, req) {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) throw new Error('Resource not found.');
  const add = Math.max(0, Number(quantity) || 0);
  const row = await prisma.resource.update({
    where: { id },
    data: { quantityAvailable: existing.quantityAvailable + add },
  });
  await activityLogService.logActivity({
    actionType: 'INVENTORY_RESTOCK',
    description: `Restocked ${row.name} (+${add} ${row.unit})`,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: row.id,
  });
  await auditLogService.logAudit(req, {
    action: 'INVENTORY_RESTOCK',
    module: 'INVENTORY',
    description: `Restocked ${row.name} by ${add}`,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: row.id,
  });
  return row;
}

async function checkLowStock(resource, req) {
  if (resource.quantityAvailable > resource.lowStockThreshold) return;
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'COORDINATOR'] }, status: 'ACTIVE' },
    select: { id: true },
  });
  const title = 'Low stock alert';
  const body = `${resource.name} is low (${resource.quantityAvailable} ${resource.unit} remaining).`;
  await notificationService.notifyMany(
    admins.map((u) => u.id),
    {
      type: 'LOW_STOCK',
      category: 'INVENTORY',
      title,
      body,
      linkPath: '/dashboard/resources',
      linkTargetId: resource.id,
    }
  );
  await activityLogService.logActivity({
    actionType: 'LOW_STOCK',
    description: body,
    userId: req?.user?.userId,
    targetType: 'RESOURCE',
    targetId: resource.id,
  });
}

async function countLowStockSimple() {
  const all = await prisma.resource.findMany();
  return all.filter((r) => r.quantityAvailable <= r.lowStockThreshold).length;
}

async function allocateToProgram(programId, allocations, req) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new Error('Program not found.');

  for (const item of allocations || []) {
    const resourceId = item.resourceId;
    const qty = Math.max(0, Number(item.quantityAssigned) || 0);
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new Error(`Resource ${resourceId} not found.`);
    if (resource.category !== program.programType) {
      throw new Error(`${resource.name} does not match program type.`);
    }
    if (qty > resource.quantityAvailable) {
      throw new Error(`Insufficient stock for ${resource.name}.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id: resourceId },
        data: { quantityAvailable: { decrement: qty } },
      });
      await tx.programResource.upsert({
        where: { programId_resourceId: { programId, resourceId } },
        create: { programId, resourceId, quantityAssigned: qty, quantityUsed: 0 },
        update: { quantityAssigned: { increment: qty } },
      });
    });

    const updated = await prisma.resource.findUnique({ where: { id: resourceId } });
    await checkLowStock(updated, req);

    await activityLogService.logActivity({
      actionType: 'RESOURCE_ALLOCATION',
      description: `Allocated ${qty} ${resource.unit} of ${resource.name} to ${program.title}`,
      userId: req?.user?.userId,
      targetType: 'PROGRAM',
      targetId: programId,
    });
  }
}

async function syncProgramAllocations(programId, programType, allocations, req) {
  await prisma.programResource.deleteMany({ where: { programId } });
  if (!allocations?.length) return [];
  await allocateToProgram(programId, allocations, req);
  return listProgramResources(programId);
}

async function listProgramResources(programId) {
  return prisma.programResource.findMany({
    where: { programId },
    include: { resource: true },
  });
}

async function recordUsage(programId, resourceId, quantityUsed, req) {
  const pr = await prisma.programResource.findUnique({
    where: { programId_resourceId: { programId, resourceId } },
    include: { resource: true, program: true },
  });
  if (!pr) throw new Error('Resource not assigned to this program.');
  const qty = Math.max(0, Number(quantityUsed) || 0);
  const remaining = pr.quantityAssigned - pr.quantityUsed;
  if (qty > remaining) throw new Error('Usage exceeds assigned quantity.');

  const updated = await prisma.programResource.update({
    where: { programId_resourceId: { programId, resourceId } },
    data: { quantityUsed: { increment: qty } },
    include: { resource: true },
  });

  await activityLogService.logActivity({
    actionType: 'RESOURCE_USAGE',
    description: `Used ${qty} ${pr.resource.unit} of ${pr.resource.name} in ${pr.program.title}`,
    userId: req?.user?.userId,
    targetType: 'PROGRAM',
    targetId: programId,
  });

  return updated;
}

async function listForFieldManager(userId) {
  const programs = await prisma.program.findMany({
    where: { fieldManagerId: userId },
    select: { id: true, startDate: true, endDate: true },
  });
  const { computeProgramStatus } = require('../utils/programStatus');
  const ids = programs
    .filter((p) => {
      const st = computeProgramStatus(p.startDate, p.endDate);
      return st === 'PLANNED' || st === 'ONGOING';
    })
    .map((p) => p.id);
  if (!ids.length) return [];
  return prisma.programResource.findMany({
    where: { programId: { in: ids } },
    include: { resource: true, program: { select: { id: true, title: true, programType: true, startDate: true, endDate: true } } },
  });
}

module.exports = {
  ensureDefaultResources,
  listResources,
  listByProgramType,
  createResource,
  updateResource,
  deleteResource,
  restockResource,
  countLowStockSimple,
  allocateToProgram,
  syncProgramAllocations,
  listProgramResources,
  recordUsage,
  listForFieldManager,
};
