'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { countAdj, isMine, SECTOR_SIZE, getSector, sectorKey, cellKey, canUnblock, canReveal } from '@repo/minesweeper-core';
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
  const touchRef = useRef<{ touches: Touch[]; lastDist: number | null; startX: number; startY: number; longPressTimer: ReturnType<typeof setTimeout> | null; isLongPress: boolean } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [selectedBlockedSector, setSelectedBlockedSector] = useState<[number, number] | null>(null);
  const [notAdjMsg, setNotAdjMsg] = useState(false);
  const notAdjTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMineHitsSize = useRef(state.mineHits.size);
  zoomRef.current = zoom;

  useEffect(() => {
    if (state.mineHits.size > prevMineHitsSize.current) {
      navigator.vibrate?.([80, 40, 80]);
    }
    prevMineHitsSize.current = state.mineHits.size;
  }, [state.mineHits.size]);

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

    // Sector overlays + boundaries
    const startSX = Math.floor(startCX / SECTOR_SIZE);
    const startSY = Math.floor(startCY / SECTOR_SIZE);
    const endSX = Math.ceil(endCX / SECTOR_SIZE);
    const endSY = Math.ceil(endCY / SECTOR_SIZE);

    for (let ssy = startSY; ssy <= endSY; ssy++) {
      for (let ssx = startSX; ssx <= endSX; ssx++) {
        const sk = sectorKey(ssx, ssy);
        const px = ssx * SECTOR_SIZE * CELL;
        const py = ssy * SECTOR_SIZE * CELL;
        const sw = SECTOR_SIZE * CELL;
        if (s.solved.has(sk)) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
          ctx.fillRect(px, py, sw, sw);
        } else if (s.blocked.has(sk)) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
          ctx.fillRect(px, py, sw, sw);
        }
      }
    }

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
        const [sx, sy] = getSector(cx, cy);
        if (stateRef.current.blocked.has(sectorKey(sx, sy))) {
          setSelectedBlockedSector([sx, sy]);
        } else if (canReveal(stateRef.current, cx, cy)) {
          dispatch({ type: 'REVEAL', x: cx, y: cy });
        } else if (stateRef.current.firstReveal) {
          if (notAdjTimer.current) clearTimeout(notAdjTimer.current);
          setNotAdjMsg(true);
          notAdjTimer.current = setTimeout(() => setNotAdjMsg(false), 2000);
        }
      }
      dragRef.current = null;
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      const [cx, cy] = screenToCell(e.clientX, e.clientY, canvas);
      const s = stateRef.current;
      if (s.flagged.has(cellKey(cx, cy)) || canReveal(s, cx, cy)) {
        dispatch({ type: 'FLAG', x: cx, y: cy });
      }
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
        const dx = e.shiftKey ? (e.deltaY || e.deltaX) : e.deltaX;
        const dy = e.shiftKey ? 0 : e.deltaY;
        dispatch({ type: 'PAN', dx: dx / z, dy: dy / z });
      }
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      if (touchRef.current?.longPressTimer) {
        clearTimeout(touchRef.current.longPressTimer);
        touchRef.current.longPressTimer = null;
      }
      if (e.touches.length > 1) {
        if (touchRef.current) touchRef.current.touches = Array.from(e.touches);
        return;
      }
      const t = e.touches[0]!;
      const longPressTimer = setTimeout(() => {
        if (!touchRef.current || touchRef.current.isLongPress) return;
        const [cx, cy] = screenToCell(t.clientX, t.clientY, canvas);
        const s = stateRef.current;
        if (s.flagged.has(cellKey(cx, cy)) || canReveal(s, cx, cy)) {
          touchRef.current.isLongPress = true;
          navigator.vibrate?.(50);
          dispatch({ type: 'FLAG', x: cx, y: cy });
        }
      }, 500);
      touchRef.current = {
        touches: Array.from(e.touches),
        lastDist: null,
        startX: t.clientX,
        startY: t.clientY,
        longPressTimer,
        isLongPress: false,
      };
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!touchRef.current) return;
      const prev = touchRef.current.touches;
      const curr = Array.from(e.touches);

      if (curr.length === 1 && prev.length >= 1) {
        const dx = curr[0]!.clientX - prev[0]!.clientX;
        const dy = curr[0]!.clientY - prev[0]!.clientY;
        const totalDx = curr[0]!.clientX - touchRef.current.startX;
        const totalDy = curr[0]!.clientY - touchRef.current.startY;
        if (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5) {
          if (touchRef.current.longPressTimer) {
            clearTimeout(touchRef.current.longPressTimer);
            touchRef.current.longPressTimer = null;
          }
        }
        const z = zoomRef.current;
        dispatch({ type: 'PAN', dx: -dx / z, dy: -dy / z });
      } else if (curr.length === 2 && prev.length >= 1) {
        if (touchRef.current.longPressTimer) {
          clearTimeout(touchRef.current.longPressTimer);
          touchRef.current.longPressTimer = null;
        }
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

    function onTouchEnd(e: TouchEvent) {
      if (!touchRef.current) return;
      if (touchRef.current.longPressTimer) {
        clearTimeout(touchRef.current.longPressTimer);
        touchRef.current.longPressTimer = null;
      }
      if (!touchRef.current.isLongPress && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]!;
        const totalDx = t.clientX - touchRef.current.startX;
        const totalDy = t.clientY - touchRef.current.startY;
        if (Math.abs(totalDx) <= 5 && Math.abs(totalDy) <= 5) {
          const [cx, cy] = screenToCell(t.clientX, t.clientY, canvas);
          const [sx, sy] = getSector(cx, cy);
          if (stateRef.current.blocked.has(sectorKey(sx, sy))) {
            setSelectedBlockedSector([sx, sy]);
          } else if (canReveal(stateRef.current, cx, cy)) {
            dispatch({ type: 'REVEAL', x: cx, y: cy });
          } else if (stateRef.current.firstReveal) {
            if (notAdjTimer.current) clearTimeout(notAdjTimer.current);
            setNotAdjMsg(true);
            notAdjTimer.current = setTimeout(() => setNotAdjMsg(false), 2000);
          }
        }
      }
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

  useEffect(() => {
    if (!selectedBlockedSector) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedBlockedSector(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBlockedSector]);

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
      {selectedBlockedSector && (() => {
        const [bsx, bsy] = selectedBlockedSector;
        const ready = canUnblock(state, bsx, bsy);
        const solvedCount = [-1, 0, 1].flatMap(dy =>
          [-1, 0, 1].map(dx => {
            if (dx === 0 && dy === 0) return false;
            return state.solved.has(sectorKey(bsx + dx, bsy + dy));
          })
        ).filter(Boolean).length;

        return (
          <div
            className="absolute inset-0 flex items-center justify-center"
            onClick={() => setSelectedBlockedSector(null)}
          >
            <div
              className="bg-gray-900 border border-gray-600 rounded-xl p-5 shadow-2xl w-56 flex flex-col items-center gap-3"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-white text-sm font-semibold text-center leading-tight">
                {ready ? 'This sector is ready to unblock!' : 'Solve neighboring sectors to unblock'}
              </p>

              <div className="grid grid-cols-3 gap-1">
                {[-1, 0, 1].flatMap(dy =>
                  [-1, 0, 1].map(dx => {
                    const key = `${dx},${dy}`;
                    if (dx === 0 && dy === 0) {
                      return (
                        <div key={key} className="w-10 h-10 flex items-center justify-center bg-red-950 border border-red-800 rounded text-base">
                          💣
                        </div>
                      );
                    }
                    const solved = state.solved.has(sectorKey(bsx + dx, bsy + dy));
                    return (
                      <div
                        key={key}
                        className={`w-10 h-10 flex items-center justify-center rounded border text-sm font-bold ${
                          solved
                            ? 'bg-green-900 border-green-600 text-green-300'
                            : 'bg-gray-800 border-gray-600 text-gray-500'
                        }`}
                      >
                        {solved ? '✓' : ''}
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-gray-400 text-xs">
                {solvedCount} / 8 neighbors solved
              </p>

              <button
                onClick={() => setSelectedBlockedSector(null)}
                className="mt-1 px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {notAdjMsg && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-yellow-300 shadow-lg">
            Can only reveal cells adjacent to an uncovered area
          </div>
        </div>
      )}

      <div className="absolute right-4 flex flex-col gap-2" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
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
