import { describe, it, expect } from 'vitest';
import { createInitialState, cellKey, sectorKey } from '../state.js';
import { isMine } from '../seed.js';
import {
  SECTOR_SIZE,
  getSector,
  getSectorCells,
  checkSectorSolved,
  blockSector,
  canUnblock,
  tryUnblockNeighbors,
  findBlockedGroup,
  canGroupUnblock,
  getOuterSectors,
} from '../sectors.js';

const SEED = 42;

describe('getSector', () => {
  it('maps (0,0) to sector (0,0)', () => expect(getSector(0, 0)).toEqual([0, 0]));
  it('maps (7,7) to sector (0,0)', () => expect(getSector(7, 7)).toEqual([0, 0]));
  it('maps (8,0) to sector (1,0)', () => expect(getSector(8, 0)).toEqual([1, 0]));
  it('handles negative coords', () => expect(getSector(-1, -1)).toEqual([-1, -1]));
  it('maps (-8,-8) to sector (-1,-1)', () => expect(getSector(-8, -8)).toEqual([-1, -1]));
});

describe('getSectorCells', () => {
  it(`returns exactly SECTOR_SIZE² cells`, () => {
    expect(getSectorCells(0, 0).length).toBe(SECTOR_SIZE * SECTOR_SIZE);
  });

  it('all cells belong to the correct sector', () => {
    for (const [cx, cy] of getSectorCells(2, 3)) {
      expect(getSector(cx, cy)).toEqual([2, 3]);
    }
  });
});

describe('checkSectorSolved', () => {
  it('returns false when no cells are revealed', () => {
    const state = createInitialState(SEED);
    expect(checkSectorSolved(state, 0, 0)).toBe(false);
  });

  it('returns true when all non-mine cells are revealed', () => {
    const state = createInitialState(SEED);
    const revealed = new Set<string>();
    for (const [cx, cy] of getSectorCells(0, 0)) {
      if (!isMine(SEED, cx, cy)) revealed.add(cellKey(cx, cy));
    }
    const full = { ...state, revealed };
    expect(checkSectorSolved(full, 0, 0)).toBe(true);
  });

  it('returns false when one non-mine cell is missing', () => {
    const state = createInitialState(SEED);
    const cells = getSectorCells(0, 0);
    const revealed = new Set<string>();
    let skipped = false;
    for (const [cx, cy] of cells) {
      if (!isMine(SEED, cx, cy)) {
        if (!skipped) { skipped = true; continue; }
        revealed.add(cellKey(cx, cy));
      }
    }
    const partial = { ...state, revealed };
    expect(checkSectorSolved(partial, 0, 0)).toBe(false);
  });
});

describe('blockSector', () => {
  it('adds the sector to blocked', () => {
    const state = createInitialState(SEED);
    const next = blockSector(state, 1, 2, 16, 32);
    expect(next.blocked.has(sectorKey(1, 2))).toBe(true);
  });

  it('does not mutate the original state', () => {
    const state = createInitialState(SEED);
    blockSector(state, 0, 0, 0, 0);
    expect(state.blocked.size).toBe(0);
  });
});

describe('canUnblock', () => {
  it('returns false when no neighbours are solved', () => {
    const state = createInitialState(SEED);
    expect(canUnblock(state, 0, 0)).toBe(false);
  });

  it('returns true when all 8 neighbours are solved', () => {
    const state = createInitialState(SEED);
    const solved = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        solved.add(sectorKey(dx, dy));
      }
    }
    const full = { ...state, solved };
    expect(canUnblock(full, 0, 0)).toBe(true);
  });

  it('returns false when one neighbour is missing from solved', () => {
    const state = createInitialState(SEED);
    const solved = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        solved.add(sectorKey(dx, dy));
      }
    }
    solved.delete(sectorKey(1, 1)); // remove one corner
    const partial = { ...state, solved };
    expect(canUnblock(partial, 0, 0)).toBe(false);
  });
});

describe('tryUnblockNeighbors', () => {
  it('unblocks a neighbour that satisfies canUnblock', () => {
    const state = createInitialState(SEED);
    // Solve all neighbours of (1,1) and block (1,1)
    const solved = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        solved.add(sectorKey(1 + dx, 1 + dy));
      }
    }
    const blocked = new Set<string>([sectorKey(1, 1)]);
    const setup = { ...state, solved, blocked };
    // Solving (0,0) should trigger tryUnblockNeighbors — but we call it directly
    const next = tryUnblockNeighbors(setup, 0, 0);
    expect(next.blocked.has(sectorKey(1, 1))).toBe(false);
  });

  it('does not mutate original state', () => {
    const state = createInitialState(SEED);
    tryUnblockNeighbors(state, 0, 0);
    expect(state.blocked.size).toBe(0);
  });
});

describe('findBlockedGroup', () => {
  it('returns single-sector group when no blocked neighbors', () => {
    const state = createInitialState(SEED);
    const blocked = new Set([sectorKey(0, 0)]);
    const group = findBlockedGroup({ ...state, blocked }, 0, 0);
    expect(group.size).toBe(1);
    expect(group.has(sectorKey(0, 0))).toBe(true);
  });

  it('returns both sectors when two adjacent blocked sectors exist', () => {
    const state = createInitialState(SEED);
    const blocked = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const group = findBlockedGroup({ ...state, blocked }, 0, 0);
    expect(group.size).toBe(2);
    expect(group.has(sectorKey(0, 0))).toBe(true);
    expect(group.has(sectorKey(1, 0))).toBe(true);
  });

  it('does not include non-adjacent blocked sectors', () => {
    const state = createInitialState(SEED);
    const blocked = new Set([sectorKey(0, 0), sectorKey(5, 5)]);
    const group = findBlockedGroup({ ...state, blocked }, 0, 0);
    expect(group.size).toBe(1);
    expect(group.has(sectorKey(5, 5))).toBe(false);
  });
});

describe('canGroupUnblock', () => {
  it('returns false when no external neighbours are solved', () => {
    const state = createInitialState(SEED);
    const group = new Set([sectorKey(0, 0)]);
    expect(canGroupUnblock(state, group)).toBe(false);
  });

  it('returns true when all external neighbours of a single sector are solved', () => {
    const state = createInitialState(SEED);
    const group = new Set([sectorKey(0, 0)]);
    const solved = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        solved.add(sectorKey(dx, dy));
      }
    }
    expect(canGroupUnblock({ ...state, solved }, group)).toBe(true);
  });

  it('requires only external (non-group) neighbours for a 2-sector group', () => {
    const state = createInitialState(SEED);
    const group = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const solved = new Set<string>();
    // Add all external neighbors of both sectors
    for (const [gsx, gsy] of [[0, 0], [1, 0]] as [number, number][]) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nsk = sectorKey(gsx + dx, gsy + dy);
          if (!group.has(nsk)) solved.add(nsk);
        }
      }
    }
    expect(canGroupUnblock({ ...state, solved }, group)).toBe(true);
  });

  it('returns false for 2-sector group when one external neighbour is missing', () => {
    const state = createInitialState(SEED);
    const group = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const solved = new Set<string>();
    for (const [gsx, gsy] of [[0, 0], [1, 0]] as [number, number][]) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nsk = sectorKey(gsx + dx, gsy + dy);
          if (!group.has(nsk)) solved.add(nsk);
        }
      }
    }
    solved.delete(sectorKey(-1, -1));
    expect(canGroupUnblock({ ...state, solved }, group)).toBe(false);
  });
});

describe('getOuterSectors', () => {
  it('returns the single sector as outer for a group of 1', () => {
    const group = new Set([sectorKey(0, 0)]);
    expect(getOuterSectors(group)).toEqual([sectorKey(0, 0)]);
  });

  it('returns both sectors as outer for a 2-sector group', () => {
    const group = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const outer = getOuterSectors(group);
    expect(outer).toHaveLength(2);
    expect(outer).toContain(sectorKey(0, 0));
    expect(outer).toContain(sectorKey(1, 0));
  });
});

describe('canUnblock with adjacent blocked sectors (deadlock prevention)', () => {
  it('two adjacent blocked sectors can each be unblocked without requiring the other to be solved', () => {
    const state = createInitialState(SEED);
    const blocked = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    // Build solved set with all external neighbors of the group
    const group = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const solved = new Set<string>();
    for (const [gsx, gsy] of [[0, 0], [1, 0]] as [number, number][]) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nsk = sectorKey(gsx + dx, gsy + dy);
          if (!group.has(nsk)) solved.add(nsk);
        }
      }
    }
    const ready = { ...state, blocked, solved };
    expect(canUnblock(ready, 0, 0)).toBe(true);
    expect(canUnblock(ready, 1, 0)).toBe(true);
  });
});

describe('tryUnblockNeighbors with blocked group', () => {
  it('unblocks both outer sectors of a 2-sector group when external neighbours are solved', () => {
    const state = createInitialState(SEED);
    const blocked = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const group = new Set([sectorKey(0, 0), sectorKey(1, 0)]);
    const solved = new Set<string>();
    for (const [gsx, gsy] of [[0, 0], [1, 0]] as [number, number][]) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nsk = sectorKey(gsx + dx, gsy + dy);
          if (!group.has(nsk)) solved.add(nsk);
        }
      }
    }
    // Mark (0,-1) as the newly solved sector that triggers tryUnblockNeighbors
    const setup = { ...state, blocked, solved };
    const next = tryUnblockNeighbors(setup, 0, -1);
    expect(next.blocked.has(sectorKey(0, 0))).toBe(false);
    expect(next.blocked.has(sectorKey(1, 0))).toBe(false);
  });
});
