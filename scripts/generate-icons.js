const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 512;
const H = 512;
const BG = [32, 33, 35];
const FG = [255, 255, 255];
const DOT = [32, 33, 35];

const px = new Uint8Array(W * H * 4);

function set(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = 255;
}

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x >= x0 + r && x <= x1 - r) return y >= y0 && y <= y1;
  if (y >= y0 + r && y <= y1 - r) return x >= x0 && x <= x1;
  const cx = x < x0 + r ? x0 + r : x1 - r;
  const cy = y < y0 + r ? y0 + r : y1 - r;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inTri(x, y, ax, ay, bx, by, cx, cy) {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
  const b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
  const c = 1 - a - b;
  return a >= 0 && b >= 0 && c >= 0;
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    set(x, y, BG);
  }
}

const R = 56;
const bx0 = 96;
const by0 = 144;
const bx1 = 416;
const by1 = 336;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (
      inRoundedRect(x, y, bx0, by0, bx1, by1, R) ||
      inTri(x, y, 176, 332, 212, 332, 164, 408)
    ) {
      set(x, y, FG);
    }
  }
}

for (const [cx, cy] of [
  [192, 240],
  [256, 240],
  [320, 240],
]) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inEllipse(x, y, cx, cy, 20, 20)) {
        set(x, y, DOT);
      }
    }
  }
}

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encode(size) {
  const scale = W / size;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const sx = Math.min(W - 1, Math.round(x * scale));
      const sy = Math.min(H - 1, Math.round(y * scale));
      const i = (sy * W + sx) * 4;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = px[i];
      raw[o + 1] = px[i + 1];
      raw[o + 2] = px[i + 2];
      raw[o + 3] = px[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [512, 192, 180]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, encode(size));
  console.log(`wrote ${file} (${fs.statSync(file).size} bytes)`);
}