const express = require('express');
const auditController = require('../controllers/auditController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, requireAdmin, auditController.list);

module.exports = router;
