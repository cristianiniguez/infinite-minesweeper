'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MinesweeperCanvas } from './MinesweeperCanvas';
import { SaveIndicator } from './SaveIndicator';
import { useGameState } from '@/lib/hooks/useGameState';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { storage } from '@/lib/storageInstance';
import type { SaveData } from '@repo/minesweeper-core';

function StatChip({ label, value, title, color }: { label: string; value: number; title: string; color?: 'green' }) {
  return (
    <div
      title={title}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        color === 'green' ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-300'
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function GameView({ saveData }: { saveData: SaveData }) {
  const [state, dispatch] = useGameState(saveData);
  const saveStatus = useAutoSave(saveData, state, storage);
  const [showMines, setShowMines] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex flex-col bg-gray-900" style={{ height: '100dvh' }}>
      <header className="flex items-center gap-2 border-b border-gray-700/60 bg-gray-900 px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <span className="text-base leading-none">←</span>
          <span className="hidden text-xs sm:inline">Dashboard</span>
        </Link>

        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {saveData.name}
        </h1>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatChip label="🚩" value={state.flagged.size} title="Flags" />
          <StatChip label="🔒" value={state.blocked.size} title="Blocked" />
          <StatChip label="✓" value={state.solved.size} title="Solved" color="green" />
          <SaveIndicator status={saveStatus} />
          {isDev && (
            <button
              onClick={() => setShowMines(v => !v)}
              disabled={!state.firstReveal}
              className={`rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${showMines ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              💣
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <MinesweeperCanvas state={state} dispatch={dispatch} showMines={showMines} />
      </div>
    </div>
  );
}
