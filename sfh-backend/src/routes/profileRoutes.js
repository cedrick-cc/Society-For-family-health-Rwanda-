const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadProfileImage } = require('../middleware/uploadProfileImage');

const router = express.Router();

router.get('/me', authenticate, profileController.getMyProfile);
router.patch('/update', authenticate, profileController.updateProfile);
router.patch(
  '/upload-photo',
  authenticate,
  (req, res, next) => {
    uploadProfileImage.single('profileImage')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ message: err.message || 'Upload failed.' });
      }
      return next();
    });
  },
  profileController.uploadPhoto
);
router.patch('/change-password', authenticate, profileController.changePassword);

module.exports = router;
