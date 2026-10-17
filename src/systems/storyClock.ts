export const LOOP_MS = 900_000;

export function wrap(t: number, loopMs = LOOP_MS): number {
  return ((t % loopMs) + loopMs) % loopMs;
}

/** Inclusive start, exclusive end, after wrap. Seam t=0 is never inside a mid-loop window. */
export function isActive(t: number, startMs: number, endMs: number, loopMs = LOOP_MS): boolean {
  const w = wrap(t, loopMs);
  return w >= startMs && w < endMs;
}

export function formatTime(t: number, loopMs = LOOP_MS): string {
  const s = Math.floor(wrap(t, loopMs) / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Index of the beat this step entered, or -1.
 * A jump that passes several beats keeps the latest one.
 * prev and now are already wrapped.
 */
export function crossedBeat(prev: number, now: number, atMs: readonly number[], loopMs = LOOP_MS): number {
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
