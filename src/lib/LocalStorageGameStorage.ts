import type { SaveData } from '@/lib/minesweeper-core';

export interface IGameStorage {
  listGames(): Promise<SaveData[]>;
  loadGame(id: string): Promise<SaveData | null>;
  saveGame(data: SaveData): Promise<void>;
  deleteGame(id: string): Promise<void>;
}

export class LocalStorageGameStorage implements IGameStorage {
  private prefix = 'ms:game:';
  private indexKey = 'ms:index';

  async listGames(): Promise<SaveData[]> {
    const ids = this._getIndex();
    const games = ids
      .map(id => {
        const raw = localStorage.getItem(this.prefix + id);
        return raw ? (JSON.parse(raw) as SaveData) : null;
      })
      .filter((g): g is SaveData => g !== null);
    return games.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async loadGame(id: string): Promise<SaveData | null> {
    const raw = localStorage.getItem(this.prefix + id);
    return raw ? (JSON.parse(raw) as SaveData) : null;
  }

  async saveGame(data: SaveData): Promise<void> {
    localStorage.setItem(this.prefix + data.id, JSON.stringify(data));
    const ids = this._getIndex();
    if (!ids.includes(data.id)) {
      ids.push(data.id);
      this._setIndex(ids);
    }
  }

  async deleteGame(id: string): Promise<void> {
    localStorage.removeItem(this.prefix + id);
    const ids = this._getIndex().filter(i => i !== id);
    this._setIndex(ids);
  }

  private _getIndex(): string[] {
    const raw = localStorage.getItem(this.indexKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  }

  private _setIndex(ids: string[]): void {
    localStorage.setItem(this.indexKey, JSON.stringify(ids));
  }
}
