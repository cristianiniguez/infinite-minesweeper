'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { GameView } from './GameView';
import { storage } from '@/lib/storageInstance';
import type { SaveData } from '@repo/minesweeper-core';

export function GameLoader({ id }: { id: string }) {
  const [saveData, setSaveData] = useState<SaveData | null | undefined>(undefined);

  useEffect(() => {
    storage.loadGame(id).then(setSaveData);
  }, [id]);

  if (saveData === undefined) return null;
  if (saveData === null) notFound();

  return <GameView saveData={saveData} />;
}
