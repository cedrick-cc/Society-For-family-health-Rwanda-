const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, notificationController.listMine);
router.get('/unread-count', authenticate, notificationController.unread);
router.patch('/read-all', authenticate, notificationController.markAll);
router.patch('/:id/read', authenticate, notificationController.markOne);

module.exports = router;
