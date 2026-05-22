const express = require('express');
const activityController = require('../controllers/activityController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, activityController.listRecent);

module.exports = router;
