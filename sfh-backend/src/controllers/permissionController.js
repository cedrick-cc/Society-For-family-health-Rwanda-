const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const modules = [
  'DASHBOARD',
  'PROGRAMS',
  'VOLUNTEERS',
  'BENEFICIARIES',
  'GEOGRAPHIC',
  'ANALYTICS',
  'USER_MANAGEMENT',
  'SYSTEM_SETTINGS',
  'AUDIT_LOGS',
  'ANNOUNCEMENTS',
];

const roles = ['ADMIN', 'COORDINATOR', 'FIELD_MANAGER', 'ANALYST', 'VOLUNTEER'];

const defaultAllowedMap = {
  ADMIN: modules,
  COORDINATOR: ['DASHBOARD', 'PROGRAMS', 'VOLUNTEERS', 'BENEFICIARIES', 'GEOGRAPHIC', 'ANALYTICS', 'ANNOUNCEMENTS'],
  FIELD_MANAGER: ['DASHBOARD', 'PROGRAMS', 'VOLUNTEERS', 'BENEFICIARIES', 'GEOGRAPHIC'],
  ANALYST: ['DASHBOARD', 'PROGRAMS', 'GEOGRAPHIC', 'ANALYTICS'],
  VOLUNTEER: ['DASHBOARD', 'BENEFICIARIES', 'GEOGRAPHIC'],
};

const ensureDefaultPermissions = async () => {
  const operations = [];

  roles.forEach((role) => {
    modules.forEach((moduleName) => {
      operations.push(
        prisma.permission.upsert({
          where: { role_module: { role, module: moduleName } },
          update: {},
          create: {
            role,
            module: moduleName,
            allowed: defaultAllowedMap[role].includes(moduleName),
          },
        })
      );
    });
  });

  await prisma.$transaction(operations);
};

const getPermissions = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { role: 'asc' }],
    });
    return res.status(200).json(permissions);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load permissions.' });
  }
};

const updatePermission = async (req, res) => {
  try {
    const { role, module, allowed } = req.body;

    if (!role || !module || typeof allowed !== 'boolean') {
      return res.status(400).json({ message: 'role, module and allowed are required.' });
    }

    const permission = await prisma.permission.upsert({
      where: { role_module: { role, module } },
      update: { allowed },
      create: { role, module, allowed },
    });

    return res.status(200).json({
      message: 'Permission updated successfully.',
      permission,
    });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update permission.' });
  }
};

module.exports = {
  getPermissions,
  updatePermission,
};
