import type { Tables, Json } from './types';
import type { TypedSupabaseClient } from './client';
import type { Serialised } from '@repo/minesweeper-core';

export type Game = Tables<'games'>;
export type GameState = Tables<'game_states'>;

export async function listGames(client: TypedSupabaseClient, userId: string): Promise<Game[]> {
  const { data, error } = await client
    .from('games')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGameWithState(
  client: TypedSupabaseClient,
  gameId: string,
): Promise<{ game: Game; state: GameState | null }> {
  const [gameRes, stateRes] = await Promise.all([
    client.from('games').select('*').eq('id', gameId).single(),
    client.from('game_states').select('*').eq('game_id', gameId).maybeSingle(),
  ]);
  if (gameRes.error) throw gameRes.error;
  if (stateRes.error) throw stateRes.error;
  return { game: gameRes.data, state: stateRes.data };
}

export async function createGame(
  client: TypedSupabaseClient,
  userId: string,
  seed: number,
  name: string,
): Promise<Game> {
  const { data, error } = await client
    .from('games')
    .insert({ user_id: userId, seed, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertGameState(
  client: TypedSupabaseClient,
  gameId: string,
  serialised: Serialised,
): Promise<void> {
  const { error } = await client.from('game_states').upsert(
    {
      game_id: gameId,
      cam_x: serialised.camX,
      cam_y: serialised.camY,
      flag_count: serialised.flagged.length,
      revealed_cells: serialised.revealed as unknown as Json,
      flagged_cells: serialised.flagged as unknown as Json,
      blocked_sectors: serialised.blocked as unknown as Json,
      solved_sectors: serialised.solved as unknown as Json,
      saved_at: new Date().toISOString(),
    },
    { onConflict: 'game_id' },
  );
  if (error) throw error;
}

export async function deleteGame(client: TypedSupabaseClient, gameId: string): Promise<void> {
  const { error } = await client.from('games').delete().eq('id', gameId);
  if (error) throw error;
}
