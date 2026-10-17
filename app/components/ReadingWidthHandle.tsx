"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const STORAGE_KEY = "komorebi:reading-width";
const DEFAULT_WIDTH = 860;
const MIN_WIDTH = 560;
const MAX_WIDTH = 1280;
const KEY_STEP = 40;

const clamp = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));

function readStoredWidth(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored) : null;
  } catch {
    return null;
  }
}

function storeWidth(width: number | null) {
  try {
    if (width === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Private mode / blocked storage: the width just won't be remembered.
  }
}

/**
 * Desktop-only drag handle on the right edge of the article column that lets
 * readers choose their own line length. Drives `--reading-width` on
 * `.note-page`; the choice is remembered per browser. Double-click resets.
 * Keyboard: focus the handle, ←/→ to adjust, Home/End for min/max.
 */
export function ReadingWidthHandle() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const [charsPerLine, setCharsPerLine] = useState<number | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const apply = useCallback((next: number) => {
    const page = handleRef.current?.closest<HTMLElement>(".note-page");
    page?.style.setProperty("--reading-width", `${next}px`);
    setWidth(next);
  }, []);

  const measure = useCallback(() => {
    const body = handleRef.current?.closest(".note-article")?.querySelector<HTMLElement>(".note-body");
    if (!body) return;
    const fontSize = parseFloat(getComputedStyle(body).fontSize) || 16;
    setCharsPerLine(Math.round(body.clientWidth / fontSize));
  }, []);

  // Restore the saved width before paint to avoid a visible jump.
  // localStorage is unavailable during SSR, so this must run after mount.
  useLayoutEffect(() => {
    const stored = readStoredWidth();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store (localStorage) on mount
    if (stored !== null) apply(stored);
  }, [apply]);

  useEffect(() => {
    if (!dragging) return;
    document.documentElement.classList.add("is-resizing-reading-width");
    return () => document.documentElement.classList.remove("is-resizing-reading-width");
  }, [dragging]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const article = handleRef.current?.closest<HTMLElement>(".note-article");
    if (!article) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startWidth: article.getBoundingClientRect().width };
    setDragging(true);
    measure();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // The column is centred, so its right edge moves half as far as its width
    // changes; doubling keeps the handle under the pointer.
    apply(clamp(drag.startWidth + (event.clientX - drag.startX) * 2));
    measure();
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    storeWidth(width);
  };

  const reset = () => {
    apply(DEFAULT_WIDTH);
    storeWidth(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowLeft" ? width - KEY_STEP
      : event.key === "ArrowRight" ? width + KEY_STEP
      : event.key === "Home" ? MIN_WIDTH
      : event.key === "End" ? MAX_WIDTH
      : null;
    if (next === null) return;
    event.preventDefault();
    const clamped = clamp(next);
    apply(clamped);
    storeWidth(clamped);
  };

  return (
    <div
      ref={handleRef}
      className="reading-width-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整正文宽度（左右方向键调节，双击恢复默认）"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={width}
      aria-valuetext={`正文宽度 ${width} 像素`}
      tabIndex={0}
      title="拖动调整正文宽度 · 双击恢复默认"
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={reset}
      onKeyDown={onKeyDown}
    >
      <span className="reading-width-handle__grip" aria-hidden="true">
        {dragging && charsPerLine !== null && (
          <span className="reading-width-handle__hint">每行约 {charsPerLine} 字</span>
        )}
      </span>
    </div>
  );
}
