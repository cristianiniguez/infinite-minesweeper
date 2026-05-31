'use client';

import type { SaveStatus } from '@/lib/hooks/useAutoSave';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saved') return null;
  return (
    <span className="text-xs font-medium">
      {status === 'saving' && <span className="text-yellow-400">Saving…</span>}
      {status === 'unsaved' && <span className="text-red-400">Unsaved</span>}
    </span>
  );
}
