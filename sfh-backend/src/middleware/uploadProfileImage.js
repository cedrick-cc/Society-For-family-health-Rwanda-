const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '../../uploads');
const profileDir = path.join(uploadRoot, 'profile-images');

fs.mkdirSync(profileDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.match(/^\.(jpe?g|png|gif|webp)$/i) ? ext.toLowerCase() : '';
    const finalExt = safeExt || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${finalExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (allowed) {
    return cb(null, true);
  }
  return cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP).'));
};

const uploadProfileImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = {
  uploadProfileImage,
  profileDir,
  uploadRoot,
};
