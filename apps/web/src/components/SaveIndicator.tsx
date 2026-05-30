'use client';

import type { SaveStatus } from '@/lib/hooks/useAutoSave';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span className="text-sm">
      {status === 'saved' && <span className="text-green-400">Saved</span>}
      {status === 'saving' && <span className="text-yellow-400">Saving…</span>}
      {status === 'unsaved' && <span className="text-red-400">Unsaved changes</span>}
    </span>
  );
}
