import { isMine } from './seed';
import { GameState, cellKey, sectorKey } from './state';

export const SECTOR_SIZE = 8;

export function getSector(x: number, y: number): [number, number] {
  return [Math.floor(x / SECTOR_SIZE), Math.floor(y / SECTOR_SIZE)];
}

export function getSectorCells(sx: number, sy: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let dy = 0; dy < SECTOR_SIZE; dy++) {
    for (let dx = 0; dx < SECTOR_SIZE; dx++) {
      cells.push([sx * SECTOR_SIZE + dx, sy * SECTOR_SIZE + dy]);
    }
  }
  return cells;
}

export function checkSectorSolved(state: GameState, sx: number, sy: number): boolean {
  for (const [cx, cy] of getSectorCells(sx, sy)) {
    if (!isMine(state.seed, cx, cy) && !state.revealed.has(cellKey(cx, cy))) {
      return false;
    }
  }
  return true;
}

export function blockSector(state: GameState, sx: number, sy: number, hitX: number, hitY: number): GameState {
  const newBlocked = new Set(state.blocked);
  newBlocked.add(sectorKey(sx, sy));
  const newMineHits = new Set(state.mineHits);
  newMineHits.add(cellKey(hitX, hitY));
  return { ...state, blocked: newBlocked, mineHits: newMineHits };
}

/** A blocked sector can be unblocked once all 8 surrounding sectors are solved. */
export function canUnblock(state: GameState, sx: number, sy: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (!state.solved.has(sectorKey(sx + dx, sy + dy))) return false;
    }
  }
  return true;
}

/**
 * After sector (sx, sy) is solved, check each of its 8 neighbours.
 * If a neighbour is blocked and now satisfies canUnblock, remove it from blocked.
 */
export function tryUnblockNeighbors(state: GameState, sx: number, sy: number): GameState {
  let current = state;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nsx = sx + dx;
      const nsy = sy + dy;
      const nsk = sectorKey(nsx, nsy);
      if (current.blocked.has(nsk) && canUnblock(current, nsx, nsy)) {
        const newBlocked = new Set(current.blocked);
        newBlocked.delete(nsk);
        current = { ...current, blocked: newBlocked };
      }
    }
  }
  return current;
}
