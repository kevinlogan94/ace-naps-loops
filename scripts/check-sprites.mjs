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
  ['src/scenes/loops/fall-yard/leaves.png', 64, 16],
  ['src/scenes/loops/fall-yard/crow-sheet.png', 1024, 1024],
  ['src/scenes/loops/fall-yard/tree-fall.png', 425, 1024],
  ['src/scenes/loops/fall-yard/witch.png', 192, 177],
];

for (const [path, w, h] of checks) {
  const size = pngSize(path);
  assert(size.w === w && size.h === h, `${path} ${size.w}x${size.h} != ${w}x${h}`);
}

console.log('check-sprites ok');
