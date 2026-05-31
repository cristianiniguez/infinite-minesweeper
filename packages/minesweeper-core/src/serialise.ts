import { GameState, CellKey, SectorKey } from './state';

export interface Serialised {
  seed: number;
  firstReveal: boolean;
  camX: number;
  camY: number;
  revealed: CellKey[];
  flagged: CellKey[];
  blocked: SectorKey[];
  solved: SectorKey[];
  mineHits: CellKey[];
}

export interface SaveData extends Serialised {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

/** Convert a GameState to a plain object safe for JSON/Supabase storage. */
export function serialise(state: GameState): Serialised {
  return {
    seed: state.seed,
    firstReveal: state.firstReveal,
    camX: state.camX,
    camY: state.camY,
    revealed: Array.from(state.revealed),
    flagged: Array.from(state.flagged),
    blocked: Array.from(state.blocked),
    solved: Array.from(state.solved),
    mineHits: Array.from(state.mineHits),
  };
}

/** Rebuild a GameState from a stored SaveData. Caches start empty. */
export function fromSaveData(data: SaveData): GameState {
  return deserialise(data);
}

/** Rebuild a GameState from a stored Serialised snapshot. Caches start empty. */
export function deserialise(data: Serialised): GameState {
  return {
    seed: data.seed,
    firstReveal: data.firstReveal,
    camX: data.camX,
    camY: data.camY,
    revealed: new Set(data.revealed),
    flagged: new Set(data.flagged),
    blocked: new Set(data.blocked),
    solved: new Set(data.solved),
    mineHits: new Set(data.mineHits),
    mineCache: new Map(),
    numberCache: new Map(),
  };
}
