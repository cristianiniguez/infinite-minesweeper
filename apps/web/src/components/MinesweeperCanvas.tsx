'use client';

import { useEffect, useRef, useCallback } from 'react';
import { countAdj, isMine, SECTOR_SIZE, getSector, sectorKey, cellKey } from '@repo/minesweeper-core';
import type { GameState, Action } from '@repo/minesweeper-core';

const CELL = 32;

const NUM_COLORS = ['', '#3B82F6', '#22C55E', '#EF4444', '#1D4ED8', '#991B1B', '#0D9488', '#111827', '#6B7280'];

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: GameState,
  showMines: boolean,
) {
  const key = cellKey(x, y);
  const [sx, sy] = getSector(x, y);
  const sk = sectorKey(sx, sy);
  const isBlocked = state.blocked.has(sk);
  const isRevealed = state.revealed.has(key);
  const isFlagged = state.flagged.has(key);
  const isSolved = state.solved.has(sk);
  const mine = isMine(state.seed, x, y);

  const px = x * CELL - state.camX;
  const py = y * CELL - state.camY;

  if (isRevealed) {
    ctx.fillStyle = isSolved ? '#14532D' : '#1F2937';
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = '#374151';
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);

    if (!mine) {
      const n = countAdj(state.seed, x, y);
      if (n > 0) {
        ctx.fillStyle = NUM_COLORS[n] ?? '#fff';
        ctx.font = `bold ${CELL * 0.5}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n), px + CELL / 2, py + CELL / 2);
      }
    }
  } else if (isBlocked) {
    ctx.fillStyle = '#7F1D1D';
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = '#991B1B';
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
    ctx.font = `${CELL * 0.55}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (state.mineHits.has(key)) {
      ctx.fillText('💣', px + CELL / 2, py + CELL / 2);
    } else if (isFlagged) {
      ctx.fillText('🚩', px + CELL / 2, py + CELL / 2);
      if (!mine) {
        ctx.fillStyle = '#EF4444';
        ctx.font = `bold ${CELL * 0.65}px monospace`;
        ctx.fillText('✕', px + CELL / 2, py + CELL / 2);
      }
    }
  } else {
    const highlightMine = showMines && mine;
    ctx.fillStyle = highlightMine ? '#7C1D1D' : isSolved ? '#166534' : '#374151';
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = highlightMine ? '#991B1B' : '#4B5563';
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);

    ctx.font = `${CELL * 0.55}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isFlagged) {
      ctx.fillStyle = '#FCD34D';
      ctx.fillText('🚩', px + CELL / 2, py + CELL / 2);
    } else if (isSolved && mine) {
      ctx.fillText('🚩', px + CELL / 2, py + CELL / 2);
    }
  }
}

export function MinesweeperCanvas({
  state,
  dispatch,
  showMines = false,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  showMines?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const render = useCallback((s: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startCX = Math.floor(s.camX / CELL) - 1;
    const startCY = Math.floor(s.camY / CELL) - 1;
    const endCX = startCX + Math.ceil(canvas.width / CELL) + 2;
    const endCY = startCY + Math.ceil(canvas.height / CELL) + 2;

    for (let cy = startCY; cy <= endCY; cy++) {
      for (let cx = startCX; cx <= endCX; cx++) {
        drawCell(ctx, cx, cy, s, showMines);
      }
    }

    // Sector boundaries
    const startSX = Math.floor(startCX / SECTOR_SIZE);
    const startSY = Math.floor(startCY / SECTOR_SIZE);
    const endSX = Math.ceil(endCX / SECTOR_SIZE);
    const endSY = Math.ceil(endCY / SECTOR_SIZE);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let ssy = startSY; ssy <= endSY; ssy++) {
      for (let ssx = startSX; ssx <= endSX; ssx++) {
        const px = ssx * SECTOR_SIZE * CELL - s.camX;
        const py = ssy * SECTOR_SIZE * CELL - s.camY;
        ctx.strokeRect(px, py, SECTOR_SIZE * CELL, SECTOR_SIZE * CELL);
      }
    }
    ctx.lineWidth = 1;
  }, [showMines]);

  useEffect(() => {
    render(state);
  }, [state, render]);

  // Resize canvas to fill parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      render(state);
    });
    observer.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => observer.disconnect();
  }, [render, state]);

  function screenToCell(e: MouseEvent, canvas: HTMLCanvasElement | null): [number, number] {
  if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    return [
      Math.floor((mx + state.camX) / CELL),
      Math.floor((my + state.camY) / CELL),
    ];
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        dispatch({ type: 'PAN', dx: -dx, dy: -dy });
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (!dragRef.current) return;
      if (!dragRef.current.moved) {
        const [cx, cy] = screenToCell(e, canvas);
        dispatch({ type: 'REVEAL', x: cx, y: cy });
      }
      dragRef.current = null;
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      const [cx, cy] = screenToCell(e, canvas);
      dispatch({ type: 'FLAG', x: cx, y: cy });
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      dispatch({ type: 'PAN', dx: e.deltaX, dy: e.deltaY });
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel', onWheel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.camX, state.camY]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-crosshair"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
