'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { deleteGame } from '@repo/supabase';
import type { Game } from '@repo/supabase';

export function GameCard({ game }: { game: Game }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${game.name}"?`)) return;
    setDeleting(true);
    try {
      const client = createClient();
      await deleteGame(client, game.id);
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div>
        <p className="font-medium text-white">{game.name}</p>
        <p className="text-sm text-gray-400">
          {new Date(game.updated_at).toLocaleString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/game/${game.id}`}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
        >
          Continue
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
