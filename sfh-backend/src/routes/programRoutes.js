const express = require('express');
const programController = require('../controllers/programController');
const { authenticate, requireProgramEditor } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/field-managers', authenticate, requireProgramEditor, programController.listFieldManagers);
router.get('/as-field-manager', authenticate, programController.listAsFieldManager);
router.get('/as-volunteer', authenticate, programController.listAsVolunteer);
router.get('/', authenticate, programController.list);
router.get('/:id/available-volunteers', authenticate, programController.listAvailableVolunteers);
router.get('/:id', authenticate, programController.getOne);
router.post('/', authenticate, requireProgramEditor, programController.create);
router.patch('/:id', authenticate, requireProgramEditor, programController.update);
router.delete('/:id', authenticate, requireProgramEditor, programController.remove);
router.post('/:id/volunteers', authenticate, programController.assignVolunteersToProgram);
router.delete('/:id/volunteers/:volunteerId', authenticate, programController.removeVolunteerFromProgram);

module.exports = router;
