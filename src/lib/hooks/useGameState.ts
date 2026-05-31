'use client';

import { useReducer } from 'react';
import { applyAction, fromSaveData, createInitialState } from '@/lib/minesweeper-core';
import type { Action, GameState, SaveData } from '@/lib/minesweeper-core';

function initState(saveData: SaveData | null): GameState {
  if (saveData) return fromSaveData(saveData);
  return createInitialState(Math.floor(Math.random() * 2 ** 31));
}

export function useGameState(saveData: SaveData | null) {
  const [state, dispatch] = useReducer(
    (s: GameState, action: Action) => applyAction(s, action),
    saveData,
    initState,
  );
  return [state, dispatch] as const;
}
