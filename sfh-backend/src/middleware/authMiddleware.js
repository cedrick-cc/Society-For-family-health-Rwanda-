const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
    }

    return next();
  };
};

const requireProgramEditor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const allowed = req.user.role === 'ADMIN' || req.user.role === 'COORDINATOR';
  if (!allowed) {
    return res.status(403).json({ message: 'Only administrators and coordinators can create or modify programs.' });
  }
  return next();
};

const requireBeneficiaryCreator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const allowed = ['ADMIN', 'COORDINATOR', 'FIELD_MANAGER', 'VOLUNTEER'].includes(req.user.role);
  if (!allowed) {
    return res.status(403).json({ message: 'You do not have permission to register beneficiaries.' });
  }
  return next();
};

const requireBeneficiaryEditor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const allowed = req.user.role === 'ADMIN' || req.user.role === 'COORDINATOR';
  if (!allowed) {
    return res.status(403).json({ message: 'Only administrators and coordinators can modify beneficiaries.' });
  }
  return next();
};

const requirePermission = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    try {
      const permission = await prisma.permission.findUnique({
        where: {
          role_module: {
            role: req.user.role,
            module: moduleName,
          },
        },
      });

      if (!permission || !permission.allowed) {
        return res.status(403).json({ message: 'Forbidden. Permission denied.' });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Failed to verify permissions.' });
    }
  };
};

const requireCoordinatorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  if (req.user.role === 'ADMIN' || req.user.role === 'COORDINATOR') {
    return next();
  }
  return res.status(403).json({ message: 'Only coordinators and administrators can perform this action.' });
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized.' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Administrators only.' });
  return next();
};

const requireResourceManager = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized.' });
  if (req.user.role === 'ADMIN' || req.user.role === 'COORDINATOR') return next();
  return res.status(403).json({ message: 'Only administrators and coordinators can manage inventory.' });
};

module.exports = {
  authenticate,
  requireRole,
  requireProgramEditor,
  requireBeneficiaryCreator,
  requireBeneficiaryEditor,
  requirePermission,
  requireCoordinatorOrAdmin,
  requireAdmin,
  requireResourceManager,
};
