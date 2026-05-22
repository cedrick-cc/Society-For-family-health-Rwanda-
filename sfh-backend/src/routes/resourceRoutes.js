const express = require('express');
const resourceController = require('../controllers/resourceController');
const {
  authenticate,
  requireResourceManager,
  requireRole,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, resourceController.list);
router.get('/field-manager/inventory', authenticate, requireRole('FIELD_MANAGER'), resourceController.fieldManagerInventory);
router.get('/program/:programId', authenticate, resourceController.programResources);
router.post('/', authenticate, requireResourceManager, resourceController.create);
router.patch('/:id', authenticate, requireResourceManager, resourceController.update);
router.delete('/:id', authenticate, requireResourceManager, resourceController.remove);
router.post('/:id/restock', authenticate, requireResourceManager, resourceController.restock);
router.post('/program/:programId/usage', authenticate, requireRole('FIELD_MANAGER'), resourceController.recordUsage);

module.exports = router;
