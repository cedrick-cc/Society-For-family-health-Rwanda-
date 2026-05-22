const express = require('express');
const scheduledActivityController = require('../controllers/scheduledActivityController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const allowScheduler = (req, res, next) => {
  const allowed = ['ADMIN', 'COORDINATOR', 'FIELD_MANAGER'];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  return next();
};

router.get('/', authenticate, scheduledActivityController.list);
router.get('/:id', authenticate, scheduledActivityController.getOne);
router.post('/', authenticate, allowScheduler, scheduledActivityController.create);
router.patch('/:id', authenticate, allowScheduler, scheduledActivityController.update);
router.delete('/:id', authenticate, allowScheduler, scheduledActivityController.remove);

module.exports = router;
