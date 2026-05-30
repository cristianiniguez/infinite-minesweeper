export { createClient } from './client.js';
export type { TypedSupabaseClient } from './client.js';
export type { Game, GameState } from './queries.js';
export {
  listGames,
  getGameWithState,
  createGame,
  upsertGameState,
  deleteGame,
} from './queries.js';
export type { Database, Tables, TablesInsert, TablesUpdate } from './types.js';
