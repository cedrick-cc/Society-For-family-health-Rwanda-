const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, requireRole('ADMIN'), userController.getAllUsers);
router.get('/pending', authenticate, requireRole('ADMIN'), userController.getPendingUsers);
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), userController.approveUser);
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), userController.rejectUser);
router.patch('/:id/deactivate', authenticate, requireRole('ADMIN'), userController.deactivateUser);
router.patch('/:id/reset-password', authenticate, requireRole('ADMIN'), userController.resetUserPassword);
router.patch('/:id', authenticate, requireRole('ADMIN'), userController.updateUser);

module.exports = router;
