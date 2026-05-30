import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { listGames } from '@repo/supabase';
import { GameCard } from '@/components/GameCard';
import { NewGameButton } from '@/components/NewGameButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const games = await listGames(supabase, user.id);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Games</h1>
          <NewGameButton userId={user.id} />
        </div>

        {games.length === 0 ? (
          <p className="text-center text-gray-400">No games yet. Create one to start playing!</p>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
