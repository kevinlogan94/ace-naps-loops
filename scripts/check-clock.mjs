// Duplicates src/systems/storyClock.ts so we can assert without a compile step.
const LOOP_MS = 900_000;

function wrap(t, loopMs = LOOP_MS) {
  return ((t % loopMs) + loopMs) % loopMs;
}

function isActive(t, startMs, endMs, loopMs = LOOP_MS) {
  const w = wrap(t, loopMs);
  return w >= startMs && w < endMs;
}

function formatTime(t, loopMs = LOOP_MS) {
  const s = Math.floor(wrap(t, loopMs) / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function assert(ok, msg) {
  if (!ok) {
    console.error(msg);
    process.exit(1);
  }
}

assert(wrap(0) === 0, 'wrap(0)');
assert(wrap(900_000) === 0, 'wrap(900000)===0');
assert(wrap(900_001) === 1, 'wrap past seam');
assert(wrap(-1) === 899_999, 'wrap negative');
assert(formatTime(0) === '00:00', 'format seam 0');
assert(formatTime(900_000) === '00:00', 'format seam 15:00');
assert(formatTime(420_000) === '07:00', 'format sit start');

const lantern = [240_000, 540_000];
const sit = [420_000, 450_000];
const crowA = [120_000, 160_000];
const crowB = [600_000, 640_000];
const witch = [680_000, 715_000];

assert(!isActive(0, ...lantern), 'no lantern at seam');
assert(!isActive(900_000, ...lantern), 'no lantern at wrap');
assert(isActive(240_000, ...lantern), 'lantern start');
assert(!isActive(540_000, ...lantern), 'lantern exclusive end');
assert(isActive(420_000, ...sit), 'sit window');
assert(!isActive(0, ...sit), 'no sit at seam');
assert(isActive(120_000, ...crowA) && isActive(600_000, ...crowB), 'crow windows');
assert(!isActive(0, ...crowA) && !isActive(0, ...crowB), 'no crow at seam');
assert(isActive(680_000, ...witch) && !isActive(0, ...witch), 'witch not at seam');

console.log('check-clock ok');
