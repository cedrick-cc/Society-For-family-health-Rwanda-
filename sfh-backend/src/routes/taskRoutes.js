const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', authenticate, taskController.listMine);
router.get('/managed', authenticate, taskController.listManaged);
router.post('/', authenticate, taskController.create);
router.patch('/:id', authenticate, taskController.update);

module.exports = router;
