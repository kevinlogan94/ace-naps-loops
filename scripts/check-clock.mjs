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

function crossedBeat(prev, now, atMs, loopMs = LOOP_MS) {
  let best = -1;
  let bestDist = loopMs;
  for (let i = 0; i < atMs.length; i++) {
    const at = atMs[i];
    const hit = now >= prev ? prev < at && now >= at : at > prev || at <= now;
    if (!hit) continue;
    const dist = (now - at + loopMs) % loopMs;
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
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
assert(formatTime(420_000) === '07:00', 'format 07:00');

const crowA = [10_000, 16_000];
const witch = [0, 7_000];

assert(isActive(10_000, ...crowA), 'crow window');
assert(!isActive(0, ...crowA), 'no crow at seam');
assert(isActive(0, ...witch) && !isActive(7_000, ...witch), 'witch at seam');

function ghostSheetAlpha(p, durSec) {
  if (durSec <= 0) return 0;
  const fade = durSec < 4 ? durSec / 2 : 2;
  const t = p * durSec;
  if (t < fade) return (t / fade) * 0.5;
  if (t > durSec - fade) return ((durSec - t) / fade) * 0.5;
  return 0.5;
}
assert(ghostSheetAlpha(0, 64) === 0, 'ghost start');
assert(Math.abs(ghostSheetAlpha(2 / 64, 64) - 0.5) < 1e-9, 'ghost after fade in');
assert(ghostSheetAlpha(1, 64) === 0, 'ghost end');
assert(ghostSheetAlpha(0.5, 2) > 0 && ghostSheetAlpha(0.5, 2) <= 0.5, 'short window mid');

const beats = [60, 240, 420, 510, 690, 870].map((s) => s * 1000);
assert(crossedBeat(0, 16, beats) === -1, 'quiet open');
assert(crossedBeat(59_999, 60_000, beats) === 0, 'spider at 1:00');
assert(crossedBeat(60_000, 60_016, beats) === -1, 'spider once');
assert(crossedBeat(0, 250_000, beats) === 1, 'jump keeps the latest beat');
assert(crossedBeat(869_000, 1_000, beats) === 5, 'witches across the seam');
assert(crossedBeat(899_000, 1_000, beats) === -1, 'quiet across the seam');

console.log('check-clock ok');
