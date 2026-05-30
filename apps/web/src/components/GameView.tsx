'use client';

import Link from 'next/link';
import { MinesweeperCanvas } from './MinesweeperCanvas';
import { SaveIndicator } from './SaveIndicator';
import { useGameState } from '@/lib/hooks/useGameState';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { createClient } from '@/lib/supabase-client';
import { useMemo } from 'react';
import type { Game, GameState as DbGameState } from '@repo/supabase';

export function GameView({ game, dbState }: { game: Game; dbState: DbGameState | null }) {
  const client = useMemo(() => createClient(), []);
  const [state, dispatch] = useGameState(game.seed, dbState);
  const saveStatus = useAutoSave(game.id, state, client);

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
          <span className="text-sm text-gray-400">
            Flags: {state.flagged.size} | Blocked: {state.blocked.size} | Solved: {state.solved.size}
          </span>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <MinesweeperCanvas state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}
