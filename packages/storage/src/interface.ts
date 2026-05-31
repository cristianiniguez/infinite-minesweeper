import type { SaveData } from '@repo/minesweeper-core';

export interface IGameStorage {
  listGames(): Promise<SaveData[]>;
  loadGame(id: string): Promise<SaveData | null>;
  saveGame(data: SaveData): Promise<void>;
  deleteGame(id: string): Promise<void>;
}
