'use client';

import { useEffect, useState } from 'react';
import { GameCard } from '@/components/GameCard';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NewGameButton } from '@/components/NewGameButton';
import { storage } from '@/lib/storageInstance';
import type { SaveData } from '@/lib/minesweeper-core';

export default function DashboardPage() {
  const [games, setGames] = useState<SaveData[]>([]);

  useEffect(() => {
    storage.listGames().then(setGames);
  }, []);

  function onDelete(id: string) {
    setGames(prev => prev.filter(g => g.id !== id));
  }

  function onCreated(game: SaveData) {
    setGames(prev => [game, ...prev]);
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <InstallPrompt />
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Games</h1>
          <NewGameButton onCreated={onCreated} />
        </div>

        {games.length === 0 ? (
          <p className="text-center text-gray-400">No games yet. Create one to start playing!</p>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <GameCard key={game.id} game={game} onDelete={() => onDelete(game.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
