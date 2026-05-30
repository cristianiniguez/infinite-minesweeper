import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getGameWithState } from '@repo/supabase';
import { GameView } from '@/components/GameView';

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let gameData: Awaited<ReturnType<typeof getGameWithState>>;
  try {
    gameData = await getGameWithState(supabase, id);
  } catch {
    notFound();
  }

  const { game, state: dbState } = gameData!;
  if (game.user_id !== user.id) notFound();

  return <GameView game={game} dbState={dbState} />;
}
