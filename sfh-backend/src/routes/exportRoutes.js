const express = require('express');
const exportController = require('../controllers/exportController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:entity', authenticate, exportController.exportEntity);

module.exports = router;
