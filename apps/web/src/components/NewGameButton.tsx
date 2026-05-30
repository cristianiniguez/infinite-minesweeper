'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { createGame } from '@repo/supabase';

export function NewGameButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const client = createClient();
      const seed = Math.floor(Math.random() * 2 ** 31);
      const name = `Game ${new Date().toLocaleDateString()}`;
      const game = await createGame(client, userId, seed, name);
      router.push(`/game/${game.id}`);
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
