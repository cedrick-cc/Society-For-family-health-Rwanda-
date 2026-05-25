const express = require('express');
const announcementController = require('../controllers/announcementController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const allowAdminCoordinator = (req, res, next) => {
  if (!req.user || !['ADMIN', 'COORDINATOR'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  return next();
};

router.get('/', authenticate, announcementController.list);
router.post('/', authenticate, allowAdminCoordinator, announcementController.create);
router.patch('/:id', authenticate, allowAdminCoordinator, announcementController.update);
router.delete('/:id', authenticate, allowAdminCoordinator, announcementController.remove);

module.exports = router;
