import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'public');
const scale = 512;
const samples = 4;
const palette = {
  canvas: [24, 33, 28],
  paper: [255, 255, 255],
  accent: [116, 182, 154]
};

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii');
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, name, data, checksum]);
}

function roundedRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(right - radius, x));
  const cy = Math.max(top + radius, Math.min(bottom - radius, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function distanceToSegment(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function colorAt(x, y) {
  const stem = x >= 128 && x <= 202 && y >= 100 && y <= 408;
  const loop = roundedRect(x, y, 150, 100, 410, 330, 88);
  const counter = roundedRect(x, y, 210, 160, 324, 258, 38);
  if (distanceToSegment(x, y, 356, 402, 428, 254) <= 17) return palette.accent;
  if (stem || (loop && !counter)) return palette.paper;
  return palette.canvas;
}

function makePng(size) {
  const stride = size * 4 + 1;
  const pixels = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    pixels[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const totals = [0, 0, 0];
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const point = colorAt(((x + (sx + 0.5) / samples) * scale) / size, ((y + (sy + 0.5) / samples) * scale) / size);
          totals[0] += point[0];
          totals[1] += point[1];
          totals[2] += point[2];
        }
      }
      const offset = row + 1 + x * 4;
      pixels[offset] = Math.round(totals[0] / (samples * samples));
      pixels[offset + 1] = Math.round(totals[1] / (samples * samples));
      pixels[offset + 2] = Math.round(totals[2] / (samples * samples));
      pixels[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND')
  ]);
}

mkdirSync(outputDir, { recursive: true });
for (const [filename, size] of [['pwa-192x192.png', 192], ['pwa-512x512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(resolve(outputDir, filename), makePng(size));
  process.stdout.write('Created public/' + filename + ' (' + size + 'x' + size + ')\n');
}