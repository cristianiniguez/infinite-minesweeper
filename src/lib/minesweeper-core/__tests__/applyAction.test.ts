import { describe, it, expect } from 'vitest';
import { createInitialState, cellKey, sectorKey } from '../state.js';
import { isMine, countAdj } from '../seed.js';
import { getSector, SECTOR_SIZE, getSectorCells } from '../sectors.js';
import { applyAction } from '../index.js';

const SEED = 42;

function findSafeCell(seed: number): [number, number] {
  for (let x = 0; x < 500; x++) {
    for (let y = 0; y < 500; y++) {
      if (!isMine(seed, x, y)) return [x, y];
    }
  }
  throw new Error('No safe cell found');
}

function findMineCell(seed: number): [number, number] {
  for (let x = 0; x < 500; x++) {
    for (let y = 0; y < 500; y++) {
      if (isMine(seed, x, y)) return [x, y];
    }
  }
  throw new Error('No mine cell found');
}

describe('applyAction — REVEAL', () => {
  it('reveals a safe cell', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    const next = applyAction(state, { type: 'REVEAL', x, y });
    expect(next.revealed.has(cellKey(x, y))).toBe(true);
  });

  it('sets firstReveal to true', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    expect(state.firstReveal).toBe(false);
    const next = applyAction(state, { type: 'REVEAL', x, y });
    expect(next.firstReveal).toBe(true);
  });

  it('blocks the sector on mine hit (not first click)', () => {
    const [mx, my] = findMineCell(SEED);
    const [sx, sy] = getSector(mx, my);
    const state = { ...createInitialState(SEED), firstReveal: true };
    const next = applyAction(state, { type: 'REVEAL', x: mx, y: my });
    expect(next.blocked.has(sectorKey(sx, sy))).toBe(true);
  });

  it('safe first click on a mine — reveals cell, does not block sector', () => {
    const [mx, my] = findMineCell(SEED);
    const [sx, sy] = getSector(mx, my);
    const state = createInitialState(SEED); // firstReveal = false
    const next = applyAction(state, { type: 'REVEAL', x: mx, y: my });
    expect(next.blocked.has(sectorKey(sx, sy))).toBe(false);
    expect(next.revealed.has(cellKey(mx, my))).toBe(true);
    expect(next.firstReveal).toBe(true);
  });

  it('ignores reveal on already-revealed cell', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    const after1 = applyAction(state, { type: 'REVEAL', x, y });
    const after2 = applyAction(after1, { type: 'REVEAL', x, y });
    expect(after2).toBe(after1);
  });

  it('ignores reveal on a flagged cell', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    const flagged = applyAction(state, { type: 'FLAG', x, y });
    const next = applyAction(flagged, { type: 'REVEAL', x, y });
    expect(next.revealed.has(cellKey(x, y))).toBe(false);
  });

  it('ignores reveal on a cell in a blocked sector', () => {
    const [x, y] = findSafeCell(SEED);
    const [sx, sy] = getSector(x, y);
    const state = createInitialState(SEED);
    const blocked = new Set<string>([sectorKey(sx, sy)]);
    const withBlock = { ...state, blocked };
    const next = applyAction(withBlock, { type: 'REVEAL', x, y });
    expect(next.revealed.has(cellKey(x, y))).toBe(false);
  });

  it('marks sector solved when all non-mine cells revealed', () => {
    // Fully reveal a sector manually then verify solved flag
    const state = createInitialState(SEED);
    const sx = 0, sy = 0;
    const cells = getSectorCells(sx, sy);
    let current = { ...state, firstReveal: true };

    // Reveal each safe cell one by one
    for (const [cx, cy] of cells) {
      if (!isMine(SEED, cx, cy) && countAdj(SEED, cx, cy) > 0) {
        current = applyAction(current, { type: 'REVEAL', x: cx, y: cy });
      }
    }
    // Trigger a zero-adj reveal that can flood the rest
    for (const [cx, cy] of cells) {
      if (!isMine(SEED, cx, cy)) {
        current = applyAction(current, { type: 'REVEAL', x: cx, y: cy });
      }
    }
    expect(current.solved.has(sectorKey(sx, sy))).toBe(true);
  });
});

describe('applyAction — FLAG', () => {
  it('adds a flag to an unrevealed cell', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    const next = applyAction(state, { type: 'FLAG', x, y });
    expect(next.flagged.has(cellKey(x, y))).toBe(true);
  });

  it('toggles flag off when already flagged', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    const flagged = applyAction(state, { type: 'FLAG', x, y });
    const unflagged = applyAction(flagged, { type: 'FLAG', x, y });
    expect(unflagged.flagged.has(cellKey(x, y))).toBe(false);
  });

  it('ignores flag on a revealed cell', () => {
    const [x, y] = findSafeCell(SEED);
    const state = createInitialState(SEED);
    const revealed = applyAction(state, { type: 'REVEAL', x, y });
    const next = applyAction(revealed, { type: 'FLAG', x, y });
    expect(next).toBe(revealed);
  });
});

describe('applyAction — PAN', () => {
  it('shifts camX and camY', () => {
    const state = createInitialState(SEED);
    const next = applyAction(state, { type: 'PAN', dx: 10, dy: -5 });
    expect(next.camX).toBe(10);
    expect(next.camY).toBe(-5);
  });

  it('accumulates pan across multiple actions', () => {
    const state = createInitialState(SEED);
    const a = applyAction(state, { type: 'PAN', dx: 3, dy: 4 });
    const b = applyAction(a, { type: 'PAN', dx: -1, dy: 2 });
    expect(b.camX).toBe(2);
    expect(b.camY).toBe(6);
  });
});
