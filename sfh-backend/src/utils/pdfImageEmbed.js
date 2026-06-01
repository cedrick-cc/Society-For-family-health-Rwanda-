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

/** Read intrinsic pixel size from JPEG bitstream (SOF markers). */
function getJpegDimensions(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd8) {
      i += 2;
      continue;
    }
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb;
    if (isSof) {
      return {
        width: buf.readUInt16BE(i + 7),
        height: buf.readUInt16BE(i + 5),
      };
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}

/** Read intrinsic size from PNG IHDR chunk. */
function getPngDimensions(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function getImageDimensions(buf, isJpeg) {
  if (isJpeg) return getJpegDimensions(buf);
  return getPngDimensions(buf);
}

function readJpegForPdf(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    if (!isJpeg && !isPng) return null;

    const dims = getImageDimensions(buf, isJpeg);
    if (!dims?.width || !dims?.height) return null;

    return {
      buffer: buf,
      filter: isJpeg ? 'DCTDecode' : 'DCTDecode',
      isJpeg,
      isPng,
      width: dims.width,
      height: dims.height,
    };
  } catch {
    return null;
  }
}

module.exports = {
  resolveEvidencePath,
  readJpegForPdf,
  getImageDimensions,
  UPLOADS_ROOT,
};
