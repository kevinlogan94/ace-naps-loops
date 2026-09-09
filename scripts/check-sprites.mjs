import { readFileSync } from 'node:fs';

function pngSize(path) {
  const buf = readFileSync(path);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function assert(ok, msg) {
  if (!ok) {
    console.error(msg);
    process.exit(1);
  }
}

const checks = [
  ['public/assets/custom/witch-walk.png', 256, 256],
  ['public/assets/custom/trees.png', 256, 288],
  ['public/assets/custom/leaves.png', 64, 16],
  ['public/assets/custom/ace-nap.png', 176, 38],
  ['public/assets/custom/hunt.png', 160, 32],
];

for (const [path, w, h] of checks) {
  const size = pngSize(path);
  assert(size.w === w && size.h === h, `${path} ${size.w}x${size.h} != ${w}x${h}`);
}

console.log('check-sprites ok');
