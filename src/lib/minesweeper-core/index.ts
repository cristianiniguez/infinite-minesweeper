export * from './seed';
export * from './state';
export * from './flood';
export * from './sectors';
export * from './serialise';

import { isMine } from './seed';
import { GameState, Action, cellKey, sectorKey, parseCell, parseSector } from './state';
import { floodReveal } from './flood';
import {
  getSector,
  blockSector,
  checkSectorSolved,
  tryUnblockNeighbors,
} from './sectors';

/**
 * Returns true if the player may reveal (x, y):
 * - always on the very first click
 * - otherwise only when at least one of the 8 neighbors is already revealed and mine-free
 */
export function canReveal(state: GameState, x: number, y: number): boolean {
  if (!state.firstReveal) return true;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nk = cellKey(x + dx, y + dy);
      if (state.revealed.has(nk) && !isMine(state.seed, x + dx, y + dy)) return true;
    }
  }
  return false;
}

/**
 * Pure reducer: apply one player action to the current state and return the next state.
 *
 * REVEAL: flood-reveal if safe; block sector if mine; skip if blocked/already-revealed/flagged.
 *         First click adjusts the seed so the 3×3 zone around the click is mine-free.
 * FLAG:   toggle flag on unrevealed cells.
 * PAN:    translate the camera.
 */
export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'REVEAL': {
      const { x, y } = action;
      const key = cellKey(x, y);
      if (state.revealed.has(key) || state.flagged.has(key)) return state;
      if (!canReveal(state, x, y)) return state;

      const [sx, sy] = getSector(x, y);
      if (state.blocked.has(sectorKey(sx, sy))) return state;

      const firstClick = !state.firstReveal;
      let newState: GameState = { ...state, firstReveal: true };

      if (firstClick) {
        // Shift seed until the 3×3 zone around the first click is entirely mine-free
        let seed = newState.seed;
        while (!_isSafeZone(seed, x, y)) seed++;
        if (seed !== newState.seed) {
          newState = { ...newState, seed, mineCache: new Map(), numberCache: new Map() };
        }
        newState = floodReveal(newState, x, y);
      } else if (isMine(newState.seed, x, y)) {
        return blockSector(newState, sx, sy, x, y);
      } else {
        newState = floodReveal(newState, x, y);
      }

      // Check every sector touched by the reveal for a solved transition
      newState = _markSolvedSectors(newState, state.revealed);
      return newState;
    }

    case 'FLAG': {
      const { x, y } = action;
      const key = cellKey(x, y);
      if (state.revealed.has(key)) return state;
      const [fsx, fsy] = getSector(x, y);
      if (state.blocked.has(sectorKey(fsx, fsy))) return state;
      const newFlagged = new Set(state.flagged);
      if (newFlagged.has(key)) {
        newFlagged.delete(key);
      } else {
        newFlagged.add(key);
      }
      return { ...state, flagged: newFlagged };
    }

    case 'PAN': {
      return { ...state, camX: state.camX + action.dx, camY: state.camY + action.dy };
    }
  }
}

/** Returns true when the 3×3 zone centered on (x,y) contains no mines for the given seed. */
function _isSafeZone(seed: number, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (isMine(seed, x + dx, y + dy)) return false;
    }
  }
  return true;
}

/** Find newly revealed cells, group by sector, and mark any that are now fully solved. */
function _markSolvedSectors(state: GameState, prevRevealed: Set<string>): GameState {
  const touchedSectors = new Set<string>();
  for (const key of state.revealed) {
    if (!prevRevealed.has(key)) {
      const [cx, cy] = parseCell(key);
      const [tsx, tsy] = getSector(cx, cy);
      touchedSectors.add(sectorKey(tsx, tsy));
    }
  }

  let current = state;
  for (const sk of touchedSectors) {
    if (current.solved.has(sk)) continue;
    const [tsx, tsy] = parseSector(sk);
    if (checkSectorSolved(current, tsx, tsy)) {
      const newSolved = new Set(current.solved);
      newSolved.add(sk);
      current = { ...current, solved: newSolved };
      current = tryUnblockNeighbors(current, tsx, tsy);
    }
  }
  return current;
}
