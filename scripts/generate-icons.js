import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal pure Node PNG generator with no external dependencies
function createPng(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * bytesPerPixel);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (((crc ^ byte) & 1) ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Brand icon drawing function: Dark background (#101114) with circular orange ring and green inner ring
function drawBrandIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded squircle / circle
  const maxR = w * 0.46;
  if (dist > maxR) {
    return [0, 0, 0, 0]; // transparent outside
  }

  // Base background
  let r = 16, g = 17, b = 20, a = 255;

  // Outer ring (Orange ~ #FF7628)
  const ring1R = w * 0.32;
  const ring1Thick = w * 0.055;
  if (Math.abs(dist - ring1R) < ring1Thick) {
    // Angle cut: leave opening in top left quadrant
    const angle = Math.atan2(dy, dx); // -pi to pi
    if (!(angle < -1.8 && angle > -2.8)) {
      return [255, 118, 40, 255];
    }
  }

  // Inner ring (Green ~ #22C58B)
  const ring2R = w * 0.20;
  const ring2Thick = w * 0.04;
  if (Math.abs(dist - ring2R) < ring2Thick) {
    const angle = Math.atan2(dy, dx);
    if (!(angle > 1.2 && angle < 2.2)) {
      return [34, 197, 139, 255];
    }
  }

  // Center dot
  if (dist < w * 0.065) {
    return [247, 247, 248, 255];
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, drawBrandIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, drawBrandIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => {
  // Safe zone for maskable icon
  const [r, g, b, a] = drawBrandIcon(x, y, w, h);
  return a === 0 ? [16, 17, 20, 255] : [r, g, b, a];
}));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, drawBrandIcon));

console.log('PWA PNG Icons successfully generated!');
