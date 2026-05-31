import { describe, it, expect } from 'vitest';
import { createInitialState, cellKey, sectorKey } from '../state.js';
import { serialise, deserialise } from '../serialise.js';

describe('serialise / deserialise', () => {
  it('round-trips an empty initial state', () => {
    const state = createInitialState(12345);
    const data = serialise(state);
    const restored = deserialise(data);

    expect(restored.seed).toBe(state.seed);
    expect(restored.firstReveal).toBe(state.firstReveal);
    expect(restored.camX).toBe(state.camX);
    expect(restored.camY).toBe(state.camY);
    expect(restored.revealed.size).toBe(0);
    expect(restored.flagged.size).toBe(0);
    expect(restored.blocked.size).toBe(0);
    expect(restored.solved.size).toBe(0);
  });

  it('preserves Sets across round-trip', () => {
    const state = createInitialState(99);
    state.revealed.add(cellKey(1, 2));
    state.flagged.add(cellKey(3, 4));
    state.blocked.add(sectorKey(0, 0));
    state.solved.add(sectorKey(1, 1));

    const restored = deserialise(serialise(state));
    expect(restored.revealed.has(cellKey(1, 2))).toBe(true);
    expect(restored.flagged.has(cellKey(3, 4))).toBe(true);
    expect(restored.blocked.has(sectorKey(0, 0))).toBe(true);
    expect(restored.solved.has(sectorKey(1, 1))).toBe(true);
  });

  it('serialises to plain arrays (JSON-safe)', () => {
    const state = createInitialState(7);
    state.revealed.add(cellKey(0, 0));
    const data = serialise(state);

    expect(Array.isArray(data.revealed)).toBe(true);
    expect(Array.isArray(data.flagged)).toBe(true);
    expect(Array.isArray(data.blocked)).toBe(true);
    expect(Array.isArray(data.solved)).toBe(true);
  });

  it('strips caches — restored caches start empty', () => {
    const state = createInitialState(3);
    state.mineCache.set('0,0', true);
    state.numberCache.set('0,0', 3);
    const restored = deserialise(serialise(state));
    expect(restored.mineCache.size).toBe(0);
    expect(restored.numberCache.size).toBe(0);
  });

  it('is a stable JSON round-trip', () => {
    const state = createInitialState(55);
    state.revealed.add(cellKey(-5, 10));
    state.camX = 128;
    state.camY = -64;
    const json = JSON.stringify(serialise(state));
    const restored = deserialise(JSON.parse(json));
    expect(restored.camX).toBe(128);
    expect(restored.camY).toBe(-64);
    expect(restored.revealed.has(cellKey(-5, 10))).toBe(true);
  });
});
