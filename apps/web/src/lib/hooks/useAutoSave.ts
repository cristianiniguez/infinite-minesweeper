'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { serialise } from '@repo/minesweeper-core';
import type { GameState } from '@repo/minesweeper-core';
import type { TypedSupabaseClient } from '@repo/supabase';
import { upsertGameState } from '@repo/supabase';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export function useAutoSave(
  gameId: string,
  state: GameState,
  client: TypedSupabaseClient,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBlockedSize = useRef(state.blocked.size);
  const prevSolvedSize = useRef(state.solved.size);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const save = useCallback(async (s: GameState) => {
    if (!isMounted.current) return;
    setStatus('saving');
    try {
      await upsertGameState(client, gameId, serialise(s));
      if (isMounted.current) setStatus('saved');
    } catch {
      if (isMounted.current) setStatus('unsaved');
    }
  }, [client, gameId]);

  useEffect(() => {
    const mineHit = state.blocked.size > prevBlockedSize.current;
    const sectorSolved = state.solved.size > prevSolvedSize.current;
    prevBlockedSize.current = state.blocked.size;
    prevSolvedSize.current = state.solved.size;

    setStatus('unsaved');

    if (timerRef.current) clearTimeout(timerRef.current);

    if (mineHit || sectorSolved) {
      save(state);
    } else {
      timerRef.current = setTimeout(() => save(state), 2000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, save]);

  return status;
}
