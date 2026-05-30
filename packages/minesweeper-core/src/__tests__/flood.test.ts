import { describe, it, expect } from 'vitest';
import { createInitialState, cellKey } from '../state.js';
import { floodReveal } from '../flood.js';
import { isMine, countAdj } from '../seed.js';

const SEED = 42;

function findSafeZeroCell(seed: number, searchLimit = 500): [number, number] {
  for (let x = 0; x < searchLimit; x++) {
    for (let y = 0; y < searchLimit; y++) {
      if (!isMine(seed, x, y) && countAdj(seed, x, y) === 0) return [x, y];
    }
  }
  throw new Error('No zero-adj safe cell found in search area');
}

function findSafeNumberedCell(seed: number, searchLimit = 500): [number, number] {
  for (let x = 0; x < searchLimit; x++) {
    for (let y = 0; y < searchLimit; y++) {
      if (!isMine(seed, x, y) && countAdj(seed, x, y) > 0) return [x, y];
    }
  }
  throw new Error('No numbered safe cell found');
}

describe('floodReveal', () => {
  it('reveals a safe cell', () => {
    const [x, y] = findSafeNumberedCell(SEED);
    const state = createInitialState(SEED);
    const next = floodReveal(state, x, y);
    expect(next.revealed.has(cellKey(x, y))).toBe(true);
  });

  it('does not reveal a mine cell', () => {
    const state = createInitialState(SEED);
    // Find a mine cell
    let mx = 0, my = 0;
    outer: for (let x = 0; x < 200; x++) {
      for (let y = 0; y < 200; y++) {
        if (isMine(SEED, x, y)) { mx = x; my = y; break outer; }
      }
    }
    const next = floodReveal(state, mx, my);
    expect(next.revealed.has(cellKey(mx, my))).toBe(false);
  });

  it('expands from a zero-adj cell', () => {
    const [x, y] = findSafeZeroCell(SEED);
    const state = createInitialState(SEED);
    const next = floodReveal(state, x, y);
    expect(next.revealed.size).toBeGreaterThan(1);
  });

  it('does not expand from a numbered cell', () => {
    const [x, y] = findSafeNumberedCell(SEED);
    const state = createInitialState(SEED);
    const next = floodReveal(state, x, y);
    expect(next.revealed.size).toBe(1);
  });

  it('does not cross into a blocked sector', () => {
    const [x, y] = findSafeZeroCell(SEED);
    const state = createInitialState(SEED);
    // Block the adjacent sector to the right
    const blockedSectors = new Set<string>();
    blockedSectors.add('1,0');
    const stateWithBlock = { ...state, blocked: blockedSectors };
    const next = floodReveal(stateWithBlock, x, y);
    // No cell in sector 1,0 (x in [16,31]) should be revealed
    for (const key of next.revealed) {
      const [cx] = key.split(',').map(Number);
      expect(cx).toBeLessThan(16);
    }
  });

  it('does not reveal flagged cells', () => {
    const [x, y] = findSafeZeroCell(SEED);
    const state = createInitialState(SEED);
    // Flag a neighbour
    const flagged = new Set<string>([cellKey(x + 1, y)]);
    const stateWithFlag = { ...state, flagged };
    const next = floodReveal(stateWithFlag, x, y);
    expect(next.revealed.has(cellKey(x + 1, y))).toBe(false);
  });

  it('returns a new state object', () => {
    const [x, y] = findSafeNumberedCell(SEED);
    const state = createInitialState(SEED);
    const next = floodReveal(state, x, y);
    expect(next).not.toBe(state);
    expect(next.revealed).not.toBe(state.revealed);
  });
});
