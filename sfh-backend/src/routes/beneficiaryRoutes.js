const express = require('express');
const beneficiaryController = require('../controllers/beneficiaryController');
const {
  authenticate,
  requireBeneficiaryCreator,
  requireBeneficiaryEditor,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, beneficiaryController.list);
router.get('/:id', authenticate, beneficiaryController.getOne);
router.post('/', authenticate, requireBeneficiaryCreator, beneficiaryController.create);
router.patch('/:id', authenticate, requireBeneficiaryEditor, beneficiaryController.update);
router.delete('/:id', authenticate, requireBeneficiaryEditor, beneficiaryController.remove);

module.exports = router;
