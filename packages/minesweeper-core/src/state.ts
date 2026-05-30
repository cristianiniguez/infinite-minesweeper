export type CellKey = string;    // "x,y"
export type SectorKey = string;  // "sx,sy"

export interface GameState {
  seed: number;
  /** True after the player's first reveal action — used to start the timer etc. */
  firstReveal: boolean;
  camX: number;
  camY: number;
  revealed: Set<CellKey>;
  flagged: Set<CellKey>;
  /** Sectors where a mine was hit; cells inside are uninteractable until unblocked */
  blocked: Set<SectorKey>;
  /** Sectors where all non-mine cells have been revealed */
  solved: Set<SectorKey>;
  /** Cached mine results — derived from seed, not persisted */
  mineCache: Map<CellKey, boolean>;
  /** Cached adjacent-mine counts — derived from seed, not persisted */
  numberCache: Map<CellKey, number>;
}

export type Action =
  | { type: 'REVEAL'; x: number; y: number }
  | { type: 'FLAG';   x: number; y: number }
  | { type: 'PAN';    dx: number; dy: number };

export function cellKey(x: number, y: number): CellKey {
  return `${x},${y}`;
}

export function sectorKey(sx: number, sy: number): SectorKey {
  return `${sx},${sy}`;
}

export function parseCell(key: CellKey): [number, number] {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}

export function parseSector(key: SectorKey): [number, number] {
  const [sx, sy] = key.split(',').map(Number);
  return [sx, sy];
}

export function createInitialState(seed: number): GameState {
  return {
    seed,
    firstReveal: false,
    camX: 0,
    camY: 0,
    revealed: new Set(),
    flagged: new Set(),
    blocked: new Set(),
    solved: new Set(),
    mineCache: new Map(),
    numberCache: new Map(),
  };
}
