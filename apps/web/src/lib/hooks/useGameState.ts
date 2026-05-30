'use client';

import { useReducer } from 'react';
import { applyAction, createInitialState, deserialise } from '@repo/minesweeper-core';
import type { Action, GameState } from '@repo/minesweeper-core';
import type { GameState as DbGameState } from '@repo/supabase';

function initState(args: { seed: number; dbState: DbGameState | null }): GameState {
  if (args.dbState) {
    return deserialise({
      seed: args.seed,
      firstReveal: ((args.dbState.revealed_cells as string[]) ?? []).length > 0,
      camX: args.dbState.cam_x,
      camY: args.dbState.cam_y,
      revealed: (args.dbState.revealed_cells as string[]) ?? [],
      flagged: (args.dbState.flagged_cells as string[]) ?? [],
      blocked: (args.dbState.blocked_sectors as string[]) ?? [],
      solved: (args.dbState.solved_sectors as string[]) ?? [],
      mineHits: (args.dbState.mine_hits as string[]) ?? [],
    });
  }
  return createInitialState(args.seed);
}

export function useGameState(seed: number, dbState: DbGameState | null) {
  const [state, dispatch] = useReducer(
    (s: GameState, action: Action) => applyAction(s, action),
    { seed, dbState },
    initState,
  );
  return [state, dispatch] as const;
}
