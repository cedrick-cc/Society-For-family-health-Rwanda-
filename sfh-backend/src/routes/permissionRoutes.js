const express = require('express');
const permissionController = require('../controllers/permissionController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, requireRole('ADMIN'), permissionController.getPermissions);
router.patch('/', authenticate, requireRole('ADMIN'), permissionController.updatePermission);

module.exports = router;
