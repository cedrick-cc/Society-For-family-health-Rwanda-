const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/create-user', authenticate, requireRole('ADMIN'), authController.createUser);

module.exports = router;
