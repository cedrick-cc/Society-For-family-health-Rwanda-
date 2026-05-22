const express = require('express');
const fieldReportController = require('../controllers/fieldReportController');
const { authenticate, requireCoordinatorOrAdmin } = require('../middleware/authMiddleware');
const { uploadFieldReportImages } = require('../middleware/uploadFieldReport');

const router = express.Router();

const uploadMw = (req, res, next) => {
  uploadFieldReportImages.array('photos', 5)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Each image must be 5MB or smaller.' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed.' });
    }
    return next();
  });
};

router.post('/', authenticate, uploadMw, fieldReportController.submit);
router.get('/mine', authenticate, fieldReportController.listMine);
router.get('/pending', authenticate, requireCoordinatorOrAdmin, fieldReportController.listPending);
router.get('/recent', authenticate, requireCoordinatorOrAdmin, fieldReportController.listRecent);
router.patch('/:id/review', authenticate, requireCoordinatorOrAdmin, fieldReportController.review);

module.exports = router;
