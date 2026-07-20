"use client";

// ─── Root Error Boundary — Timber Field Notes (DESIGN.md §5.14) ──
// Catches server errors on root-level routes.
// Distinct from 404 — this is a genuine server failure.

import { useCallback } from "react";

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function RootError({ error, reset }: Props) {
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
