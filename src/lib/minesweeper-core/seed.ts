export const MINE_PROBABILITY = 0.15;

/**
 * Deterministic pseudo-random float in [0, 1) from seed + cell coordinates.
 * Uses integer hash mixing via Math.imul to avoid float precision issues.
 */
export function seededRand(seed: number, x: number, y: number): number {
  let h = (seed | 0) + Math.imul(x | 0, 0x9e3779b9) + Math.imul(y | 0, 0x85ebca6b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

export function isMine(seed: number, x: number, y: number): boolean {
  return seededRand(seed, x, y) < MINE_PROBABILITY;
}

export function countAdj(seed: number, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (isMine(seed, x + dx, y + dy)) count++;
    }
  }
  return count;
}
