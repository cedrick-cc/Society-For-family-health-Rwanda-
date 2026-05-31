const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

function resolveEvidencePath(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath).trim();
  const relative = raw.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
  const full = path.join(UPLOADS_ROOT, relative);
  if (!full.startsWith(UPLOADS_ROOT)) return null;
  return full;
}

function readJpegForPdf(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    if (!isJpeg && !isPng) return null;
    return { buffer: buf, filter: isJpeg ? 'DCTDecode' : 'FlateDecode', isJpeg, isPng };
  } catch {
    return null;
  }
}

module.exports = { resolveEvidencePath, readJpegForPdf, UPLOADS_ROOT };
