import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 32;
const N = 5;

function blank() {
  return Array.from({ length: W * W }, () => [0, 0, 0, 0]);
}

function idx(x, y) {
  return y * W + x;
}

function set(px, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  px[idx(x, y)] = c;
}

function get(px, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= W) return [0, 0, 0, 0];
  return px[idx(x, y)];
}

function fillEllipse(px, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(px, x, y, c);
    }
  }
}

function fillRect(px, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(px, x, y, c);
}

function outline(px, ink) {
  const out = px.map((c) => c.slice());
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (get(px, x, y)[3] === 0) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (get(px, x + dx, y + dy)[3] === 0) set(out, x + dx, y + dy, ink);
      }
    }
  }
  return out;
}

const INK = [58, 32, 18, 255];

function pumpkin() {
  const px = blank();
  fillEllipse(px, 16, 19, 12, 10, [230, 118, 36, 255]);
  fillEllipse(px, 13, 16, 8, 7, [242, 154, 58, 255]);
  fillEllipse(px, 11, 15, 3, 3, [255, 196, 110, 255]);
  for (const x of [8, 12, 16, 20, 24]) {
    for (let y = 11; y < 29; y++) {
      const t = Math.abs(x - 16) / 12;
      const half = Math.sqrt(Math.max(0, 1 - ((y - 19) / 10) ** 2)) * 12;
      if (Math.abs(x - 16) < half - 0.2 && get(px, x, y)[3]) {
        set(px, x, y, t > 0.55 ? [168, 72, 22, 255] : [196, 88, 24, 255]);
      }
    }
  }
  fillRect(px, 15, 6, 17, 11, [110, 68, 28, 255]);
  set(px, 17, 5, [110, 68, 28, 255]);
  set(px, 18, 5, [86, 140, 48, 255]);
  set(px, 19, 6, [86, 140, 48, 255]);
  return outline(px, INK);
}

function mushroom() {
  const px = blank();
  fillEllipse(px, 16, 14, 13, 8, [188, 42, 42, 255]);
  fillEllipse(px, 13, 12, 8, 5, [220, 64, 58, 255]);
  fillRect(px, 4, 16, 27, 18, [154, 32, 36, 255]);
  for (const [x, y] of [
    [8, 11],
    [14, 9],
    [20, 11],
    [11, 14],
    [18, 14],
    [24, 13],
  ]) {
    fillRect(px, x, y, x + 1, y + 1, [246, 236, 220, 255]);
  }
  fillRect(px, 13, 19, 19, 28, [236, 226, 204, 255]);
  fillRect(px, 14, 19, 16, 24, [255, 246, 230, 255]);
  fillRect(px, 17, 23, 19, 28, [210, 190, 160, 255]);
  fillRect(px, 12, 28, 20, 29, [210, 190, 160, 255]);
  return outline(px, INK);
}

function scarecrow() {
  const px = blank();
  fillRect(px, 15, 24, 16, 30, [120, 78, 36, 255]);
  fillRect(px, 10, 16, 21, 24, [168, 72, 42, 255]);
  set(px, 12, 18, [120, 48, 28, 255]);
  set(px, 19, 21, [120, 48, 28, 255]);
  fillRect(px, 13, 19, 18, 19, [196, 96, 52, 255]);
  fillRect(px, 5, 17, 9, 18, [120, 78, 36, 255]);
  fillRect(px, 22, 17, 26, 18, [120, 78, 36, 255]);
  fillRect(px, 4, 16, 6, 17, [168, 72, 42, 255]);
  fillRect(px, 25, 16, 27, 17, [168, 72, 42, 255]);
  fillRect(px, 12, 10, 19, 15, [214, 176, 120, 255]);
  set(px, 14, 12, INK);
  set(px, 17, 12, INK);
  set(px, 15, 14, [168, 96, 64, 255]);
  set(px, 16, 14, [168, 96, 64, 255]);
  fillRect(px, 10, 8, 21, 10, [110, 68, 28, 255]);
  fillRect(px, 13, 5, 18, 8, [110, 68, 28, 255]);
  fillRect(px, 14, 5, 16, 6, [148, 96, 44, 255]);
  return outline(px, INK);
}

function ball() {
  const px = blank();
  fillEllipse(px, 16, 17, 10, 10, [168, 196, 36, 255]);
  fillEllipse(px, 13, 14, 6, 6, [206, 226, 64, 255]);
  fillEllipse(px, 11, 12, 2, 2, [236, 246, 150, 255]);
  const seam = [246, 244, 230, 255];
  for (let y = 9; y <= 25; y++) {
    const t = (y - 9) / 16;
    const wave = Math.round(Math.sin(t * Math.PI) * 6);
    set(px, 10 + wave, y, seam);
    set(px, 22 - wave, y, seam);
  }
  return outline(px, [48, 64, 16, 255]);
}

function letter() {
  const px = blank();
  fillRect(px, 4, 12, 27, 25, [236, 226, 200, 255]);
  fillRect(px, 5, 13, 14, 20, [248, 240, 220, 255]);
  for (let x = 5; x <= 26; x++) {
    const y = 13 + Math.round((x - 16) * 0.45);
    if (y >= 13 && y <= 24) set(px, x, y, [186, 168, 132, 255]);
  }
  for (let x = 5; x <= 26; x++) {
    const y = 13 + Math.round((16 - x) * 0.45);
    if (y >= 13 && y <= 24) set(px, x, y, [186, 168, 132, 255]);
  }
  fillRect(px, 15, 18, 17, 20, [176, 36, 40, 255]);
  set(px, 16, 19, [220, 56, 52, 255]);
  return outline(px, INK);
}

function crc(buf) {
  let c = ~0;
  const table = crc.table ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    return v >>> 0;
  });
  for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgba[y * width + x];
      const o = y * (width * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const frames = [pumpkin(), mushroom(), scarecrow(), ball(), letter()];
const rgba = [];
for (let y = 0; y < W; y++) {
  for (let i = 0; i < N; i++) {
    for (let x = 0; x < W; x++) rgba.push(frames[i][idx(x, y)]);
  }
}

const dest = new URL('../public/assets/custom/hunt.png', import.meta.url);
writeFileSync(dest, png(W * N, W, rgba));

for (const [i, name] of ['pumpkin', 'mushroom', 'scarecrow', 'ball', 'letter'].entries()) {
  const n = frames[i].filter((p) => p[3] > 0).length;
  if (n < 80) throw new Error(`${name} too empty (${n})`);
}
console.log('wrote hunt.png', W * N, 'x', W);
