import { isMine } from './seed';
import { GameState, SectorKey, cellKey, sectorKey, parseSector } from './state';

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

/** BFS through blocked sectors to find the connected group containing (sx, sy). */
export function findBlockedGroup(state: GameState, sx: number, sy: number): Set<SectorKey> {
  const group = new Set<SectorKey>();
  const queue: Array<[number, number]> = [[sx, sy]];
  group.add(sectorKey(sx, sy));
  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nsk = sectorKey(cx + dx, cy + dy);
        if (state.blocked.has(nsk) && !group.has(nsk)) {
          group.add(nsk);
          queue.push([cx + dx, cy + dy]);
        }
      }
    }
  }
  return group;
}

/** Returns true when all sectors adjacent to the group (but not in it) are solved. */
export function canGroupUnblock(state: GameState, group: Set<SectorKey>): boolean {
  for (const sk of group) {
    const [cx, cy] = parseSector(sk);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nsk = sectorKey(cx + dx, cy + dy);
        if (!group.has(nsk) && !state.solved.has(nsk)) return false;
      }
    }
  }
  return true;
}

/**
 * Returns the subset of group sectors that have at least one neighbor outside the group.
 * Inner sectors (all 8 neighbors are also in the group) are excluded.
 */
export function getOuterSectors(group: Set<SectorKey>): SectorKey[] {
  const outer: SectorKey[] = [];
  for (const sk of group) {
    const [cx, cy] = parseSector(sk);
    let isOuter = false;
    for (let dy = -1; dy <= 1 && !isOuter; dy++) {
      for (let dx = -1; dx <= 1 && !isOuter; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (!group.has(sectorKey(cx + dx, cy + dy))) isOuter = true;
      }
    }
    if (isOuter) outer.push(sk);
  }
  return outer;
}

/**
 * A blocked sector can be unblocked when all sectors adjacent to its connected
 * blocked group (but not in the group) are solved.
 */
export function canUnblock(state: GameState, sx: number, sy: number): boolean {
  return canGroupUnblock(state, findBlockedGroup(state, sx, sy));
}

/**
 * After sector (sx, sy) is solved, check each adjacent blocked group.
 * If a group's external neighbours are all solved, unblock its outer sectors.
 */
export function tryUnblockNeighbors(state: GameState, sx: number, sy: number): GameState {
  let current = state;
  const processedGroups = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nsx = sx + dx;
      const nsy = sy + dy;
      const nsk = sectorKey(nsx, nsy);
      if (!current.blocked.has(nsk)) continue;
      const group = findBlockedGroup(current, nsx, nsy);
      const groupId = [...group].sort().join('|');
      if (processedGroups.has(groupId)) continue;
      processedGroups.add(groupId);
      if (canGroupUnblock(current, group)) {
        const outerSectors = getOuterSectors(group);
        const newBlocked = new Set(current.blocked);
        for (const sk of outerSectors) newBlocked.delete(sk);
        current = { ...current, blocked: newBlocked };
      }
    }
  }
  return current;
}
