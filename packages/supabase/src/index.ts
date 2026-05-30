export { createClient } from './client';
export type { TypedSupabaseClient } from './client';
export type { Game, GameState } from './queries';
export {
  listGames,
  getGameWithState,
  createGame,
  upsertGameState,
  deleteGame,
} from './queries';
export type { Database, Tables, TablesInsert, TablesUpdate } from './types';
