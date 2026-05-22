const express = require('express');
const volunteerDashboardController = require('../controllers/volunteerDashboardController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', authenticate, volunteerDashboardController.dashboard);

module.exports = router;
