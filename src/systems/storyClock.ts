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
