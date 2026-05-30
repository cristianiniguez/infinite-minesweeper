'use client';

import Link from 'next/link';
import { MinesweeperCanvas } from './MinesweeperCanvas';
import { SaveIndicator } from './SaveIndicator';
import { useGameState } from '@/lib/hooks/useGameState';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { createClient } from '@/lib/supabase-client';
import { useMemo, useState, useEffect, useRef } from 'react';
import type { Game, GameState as DbGameState } from '@repo/supabase';
import { updateGameSeed } from '@repo/supabase';

export function GameView({ game, dbState }: { game: Game; dbState: DbGameState | null }) {
  const client = useMemo(() => createClient(), []);
  const [state, dispatch] = useGameState(game.seed, dbState);
  const saveStatus = useAutoSave(game.id, state, client);
  const [showMines, setShowMines] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  // When first click adjusts the seed, persist the new seed to the games table
  const seedPersistedRef = useRef(false);
  useEffect(() => {
    if (state.firstReveal && !seedPersistedRef.current && state.seed !== game.seed) {
      seedPersistedRef.current = true;
      updateGameSeed(client, game.id, state.seed).catch(console.error);
    }
  }, [state.firstReveal, state.seed, game.seed, game.id, client]);

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
            ← Dashboard
          </Link>
          <h1 className="font-medium text-white">{game.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          {isDev && (
            <button
              onClick={() => setShowMines(v => !v)}
              disabled={!state.firstReveal}
              className={`rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${showMines ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {showMines ? '💣 Hide Mines' : '💣 Show Mines'}
            </button>
          )}
          <span className="text-sm text-gray-400">
            Flags: {state.flagged.size} | Blocked: {state.blocked.size} | Solved: {state.solved.size}
          </span>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <MinesweeperCanvas state={state} dispatch={dispatch} showMines={showMines} />
      </div>
    </div>
  );
}
