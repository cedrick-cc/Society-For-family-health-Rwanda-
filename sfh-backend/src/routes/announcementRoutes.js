const express = require('express');
const announcementController = require('../controllers/announcementController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const allowAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden. Admin only.' });
  }
  return next();
};

router.get('/', authenticate, announcementController.list);
router.post('/', authenticate, allowAdminOnly, announcementController.create);
router.patch('/:id', authenticate, allowAdminOnly, announcementController.update);
router.delete('/:id', authenticate, allowAdminOnly, announcementController.remove);

module.exports = router;
