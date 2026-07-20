"use client";

// ─── Article Error Boundary — Timber Field Notes (DESIGN.md §5.14) ──
// Catches genuine DB/server failures when resolving a note.
// Distinct from 404 (missing slug) — this means the fetch itself failed,
// not that the note doesn't exist. (DESIGN.md §6.4)

import { useCallback } from "react";

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function NoteError({ error, reset }: Props) {
  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="route-error">
      <h1 className="route-error__heading">页面加载出错</h1>
      <p className="route-error__body">请检查网络连接后重试。</p>
      <button
        type="button"
        className="route-error__btn"
        onClick={handleRetry}
      >
        重试
      </button>
    </div>
  );
}
