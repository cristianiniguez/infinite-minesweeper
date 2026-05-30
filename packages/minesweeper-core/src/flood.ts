import { isMine, countAdj } from './seed.js';
import { GameState, cellKey, sectorKey } from './state.js';
import { getSector } from './sectors.js';

function cachedIsMine(state: GameState, x: number, y: number): boolean {
  const key = cellKey(x, y);
  if (!state.mineCache.has(key)) {
    state.mineCache.set(key, isMine(state.seed, x, y));
  }
  return state.mineCache.get(key)!;
}

function cachedCountAdj(state: GameState, x: number, y: number): number {
  const key = cellKey(x, y);
  if (!state.numberCache.has(key)) {
    state.numberCache.set(key, countAdj(state.seed, x, y));
  }
  return state.numberCache.get(key)!;
}

/**
 * BFS flood-reveal from (x, y).
 * Reveals the cell and expands into neighbours when adj-mine count is 0.
 * Stops at mines and blocked-sector boundaries.
 * Returns a new state with an updated revealed set.
 */
export function floodReveal(state: GameState, x: number, y: number): GameState {
  const newRevealed = new Set(state.revealed);
  const queue: Array<[number, number]> = [[x, y]];

  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    const key = cellKey(cx, cy);

    if (newRevealed.has(key)) continue;
    if (state.flagged.has(key)) continue;

    const [sx, sy] = getSector(cx, cy);
    if (state.blocked.has(sectorKey(sx, sy))) continue;

    if (cachedIsMine(state, cx, cy)) continue;

    newRevealed.add(key);

    if (cachedCountAdj(state, cx, cy) === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nkey = cellKey(cx + dx, cy + dy);
          if (!newRevealed.has(nkey)) {
            queue.push([cx + dx, cy + dy]);
          }
        }
      }
    }
  }

  return { ...state, revealed: newRevealed };
}
