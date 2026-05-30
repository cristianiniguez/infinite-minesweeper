import { describe, it, expect } from 'vitest';
import { seededRand, isMine, countAdj, MINE_PROBABILITY } from '../seed.js';

describe('seededRand', () => {
  it('returns a value in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const v = seededRand(42, i, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same inputs', () => {
    expect(seededRand(12345, 7, -3)).toBe(seededRand(12345, 7, -3));
  });

  it('produces different values for different seeds', () => {
    expect(seededRand(1, 0, 0)).not.toBe(seededRand(2, 0, 0));
  });

  it('produces different values for different coords', () => {
    expect(seededRand(42, 0, 0)).not.toBe(seededRand(42, 1, 0));
    expect(seededRand(42, 0, 0)).not.toBe(seededRand(42, 0, 1));
  });

  it('handles negative coordinates', () => {
    const v = seededRand(1, -100, -200);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe('isMine', () => {
  it('is deterministic', () => {
    expect(isMine(99, 5, 5)).toBe(isMine(99, 5, 5));
  });

  it('mine density is near MINE_PROBABILITY over a large sample', () => {
    let mines = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      if (isMine(42, i, 0)) mines++;
    }
    const density = mines / N;
    expect(density).toBeGreaterThan(MINE_PROBABILITY * 0.5);
    expect(density).toBeLessThan(MINE_PROBABILITY * 1.5);
  });
});

describe('countAdj', () => {
  it('returns a value between 0 and 8', () => {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const c = countAdj(42, x, y);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(8);
      }
    }
  });

  it('is deterministic', () => {
    expect(countAdj(7, 3, 3)).toBe(countAdj(7, 3, 3));
  });
});
