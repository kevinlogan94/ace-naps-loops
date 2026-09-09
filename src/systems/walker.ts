export type Vec = { x: number; y: number };

/** Move `pos` toward `target`. `dt` is seconds. Returns true if arrived. */
export function stepToward(pos: Vec, target: Vec, speed: number, dt: number, arrive = 2): boolean {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= arrive || speed * dt >= dist) {
    pos.x = target.x;
    pos.y = target.y;
    return true;
  }
  pos.x += (dx / dist) * speed * dt;
  pos.y += (dy / dist) * speed * dt;
  return false;
}
