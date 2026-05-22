const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '../../uploads');
const reportDir = path.join(uploadRoot, 'field-reports');

fs.mkdirSync(reportDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, reportDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.match(/^\.(jpe?g|png|gif|webp)$/i) ? ext.toLowerCase() : '';
    const finalExt = safeExt || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${finalExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (allowed) return cb(null, true);
  return cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP).'));
};

const uploadFieldReportImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = { uploadFieldReportImages, reportDir };
