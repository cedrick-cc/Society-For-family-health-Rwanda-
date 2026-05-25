const express = require('express');
const volunteerListController = require('../controllers/volunteerListController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const allowStaff = (req, res, next) => {
  const allowed = ['ADMIN', 'COORDINATOR', 'FIELD_MANAGER', 'ANALYST'];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  return next();
};

const allowAdminCoordinator = (req, res, next) => {
  if (!req.user || !['ADMIN', 'COORDINATOR'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  return next();
};

router.get('/', authenticate, allowStaff, volunteerListController.listVolunteers);
router.get('/:id', authenticate, allowStaff, volunteerListController.getVolunteer);
router.patch('/:id', authenticate, allowAdminCoordinator, volunteerListController.updateVolunteer);
router.patch('/:id/deactivate', authenticate, allowAdminCoordinator, volunteerListController.deactivateVolunteer);

module.exports = router;
