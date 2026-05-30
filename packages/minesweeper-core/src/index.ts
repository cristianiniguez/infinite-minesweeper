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
 * Pure reducer: apply one player action to the current state and return the next state.
 *
 * REVEAL: flood-reveal if safe; block sector if mine; skip if blocked/already-revealed/flagged.
 *         First click on a mine is safe — the sector is not blocked and the cell is revealed solo.
 * FLAG:   toggle flag on unrevealed cells.
 * PAN:    translate the camera.
 */
export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'REVEAL': {
      const { x, y } = action;
      const key = cellKey(x, y);
      if (state.revealed.has(key) || state.flagged.has(key)) return state;

      const [sx, sy] = getSector(x, y);
      if (state.blocked.has(sectorKey(sx, sy))) return state;

      const firstClick = !state.firstReveal;
      let newState: GameState = { ...state, firstReveal: true };

      if (isMine(state.seed, x, y)) {
        if (firstClick) {
          // Safe first click: reveal this single cell without triggering mine logic
          const newRevealed = new Set(newState.revealed);
          newRevealed.add(key);
          newState = { ...newState, revealed: newRevealed };
        } else {
          return blockSector(newState, sx, sy);
        }
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
