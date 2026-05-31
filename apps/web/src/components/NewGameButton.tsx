'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { storage } from '@/lib/storageInstance';
import { createInitialState, serialise } from '@repo/minesweeper-core';
import type { SaveData } from '@repo/minesweeper-core';

export function NewGameButton({ onCreated }: { onCreated?: (game: SaveData) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const id = crypto.randomUUID();
      const seed = Math.floor(Math.random() * 2 ** 31);
      const name = `Game ${new Date().toLocaleDateString()}`;
      const now = Date.now();
      const saveData: SaveData = {
        id,
        name,
        createdAt: now,
        updatedAt: now,
        ...serialise(createInitialState(seed)),
      };
      await storage.saveGame(saveData);
      onCreated?.(saveData);
      router.push(`/game/${id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
    >
      {loading ? 'Creating…' : 'New Game'}
    </button>
  );
}
