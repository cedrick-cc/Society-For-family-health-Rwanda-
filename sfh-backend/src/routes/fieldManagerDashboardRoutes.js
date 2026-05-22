const express = require('express');
const fieldManagerDashboardController = require('../controllers/fieldManagerDashboardController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', authenticate, fieldManagerDashboardController.dashboard);

module.exports = router;
