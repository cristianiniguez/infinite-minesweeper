'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { countAdj, isMine, SECTOR_SIZE, getSector, sectorKey, cellKey } from '@repo/minesweeper-core';
import type { GameState, Action } from '@repo/minesweeper-core';

const CELL = 32;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

const NUM_COLORS = ['', '#3B82F6', '#22C55E', '#EF4444', '#1D4ED8', '#991B1B', '#0D9488', '#111827', '#6B7280'];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

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

  // World-space coordinates — transform applied via ctx.setTransform
  const px = x * CELL;
  const py = y * CELL;

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
  const touchRef = useRef<{ touches: Touch[]; lastDist: number | null } | null>(null);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  // Keep zoomRef in sync each render
  zoomRef.current = zoom;

  const render = useCallback((s: GameState, z: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(z, 0, 0, z, -s.camX * z, -s.camY * z);
    ctx.clearRect(s.camX, s.camY, canvas.width / z, canvas.height / z);

    const viewW = canvas.width / z;
    const viewH = canvas.height / z;

    const startCX = Math.floor(s.camX / CELL) - 1;
    const startCY = Math.floor(s.camY / CELL) - 1;
    const endCX = startCX + Math.ceil(viewW / CELL) + 2;
    const endCY = startCY + Math.ceil(viewH / CELL) + 2;

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
        const px = ssx * SECTOR_SIZE * CELL;
        const py = ssy * SECTOR_SIZE * CELL;
        ctx.strokeRect(px, py, SECTOR_SIZE * CELL, SECTOR_SIZE * CELL);
      }
    }
    ctx.lineWidth = 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [showMines]);

  useEffect(() => {
    render(state, zoom);
  }, [state, zoom, render]);

  // Resize canvas to fill parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      render(state, zoomRef.current);
    });
    observer.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => observer.disconnect();
  // render and state are intentionally excluded — ResizeObserver re-runs on size change only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function screenToCell(clientX: number, clientY: number, canvas: HTMLCanvasElement | null): [number, number] {
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const z = zoomRef.current;
    return [
      Math.floor((mx / z + state.camX) / CELL),
      Math.floor((my / z + state.camY) / CELL),
    ];
  }

  // Mouse + touch event handlers
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
        const z = zoomRef.current;
        dispatch({ type: 'PAN', dx: -dx / z, dy: -dy / z });
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (!dragRef.current) return;
      if (!dragRef.current.moved) {
        const [cx, cy] = screenToCell(e.clientX, e.clientY, canvas);
        dispatch({ type: 'REVEAL', x: cx, y: cy });
      }
      dragRef.current = null;
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      const [cx, cy] = screenToCell(e.clientX, e.clientY, canvas);
      dispatch({ type: 'FLAG', x: cx, y: cy });
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
        const oldZoom = zoomRef.current;
        const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
        const rect = canvas!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dCamX = mx * (1 / oldZoom - 1 / newZoom);
        const dCamY = my * (1 / oldZoom - 1 / newZoom);
        zoomRef.current = newZoom;
        setZoom(newZoom);
        dispatch({ type: 'PAN', dx: dCamX, dy: dCamY });
      } else {
        const z = zoomRef.current;
        dispatch({ type: 'PAN', dx: e.deltaX / z, dy: e.deltaY / z });
      }
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      touchRef.current = { touches: Array.from(e.touches), lastDist: null };
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!touchRef.current) return;
      const prev = touchRef.current.touches;
      const curr = Array.from(e.touches);

      if (curr.length === 1 && prev.length >= 1) {
        const dx = curr[0]!.clientX - prev[0]!.clientX;
        const dy = curr[0]!.clientY - prev[0]!.clientY;
        const z = zoomRef.current;
        dispatch({ type: 'PAN', dx: -dx / z, dy: -dy / z });
      } else if (curr.length === 2 && prev.length >= 1) {
        const dist = Math.hypot(
          curr[0]!.clientX - curr[1]!.clientX,
          curr[0]!.clientY - curr[1]!.clientY,
        );
        if (touchRef.current.lastDist !== null) {
          const factor = dist / touchRef.current.lastDist;
          const oldZoom = zoomRef.current;
          const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
          const rect = canvas!.getBoundingClientRect();
          const mx = (curr[0]!.clientX + curr[1]!.clientX) / 2 - rect.left;
          const my = (curr[0]!.clientY + curr[1]!.clientY) / 2 - rect.top;
          const dCamX = mx * (1 / oldZoom - 1 / newZoom);
          const dCamY = my * (1 / oldZoom - 1 / newZoom);
          zoomRef.current = newZoom;
          setZoom(newZoom);
          dispatch({ type: 'PAN', dx: dCamX, dy: dCamY });
        }
        touchRef.current.lastDist = dist;
      }
      touchRef.current.touches = curr;
    }

    function onTouchEnd() {
      touchRef.current = null;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.camX, state.camY]);

  function zoomTowardCenter(factor: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const oldZoom = zoomRef.current;
    const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
    const mx = canvas.width / 2;
    const my = canvas.height / 2;
    const dCamX = mx * (1 / oldZoom - 1 / newZoom);
    const dCamY = my * (1 / oldZoom - 1 / newZoom);
    zoomRef.current = newZoom;
    setZoom(newZoom);
    dispatch({ type: 'PAN', dx: dCamX, dy: dCamY });
  }

  function handleCenter() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const z = zoomRef.current;
    dispatch({
      type: 'PAN',
      dx: -canvas.width / (2 * z) - state.camX,
      dy: -canvas.height / (2 * z) - state.camY,
    });
  }

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        style={{ imageRendering: 'pixelated', touchAction: 'none' }}
      />
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => zoomTowardCenter(1.5)}
          className="flex h-9 w-9 items-center justify-center rounded bg-gray-800 text-lg font-bold text-white shadow hover:bg-gray-700 active:bg-gray-600"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomTowardCenter(1 / 1.5)}
          className="flex h-9 w-9 items-center justify-center rounded bg-gray-800 text-lg font-bold text-white shadow hover:bg-gray-700 active:bg-gray-600"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleCenter}
          className="flex h-9 w-9 items-center justify-center rounded bg-gray-800 text-lg text-white shadow hover:bg-gray-700 active:bg-gray-600"
          title="Center view"
        >
          ⊕
        </button>
      </div>
    </div>
  );
}
