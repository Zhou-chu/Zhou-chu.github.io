"use client";

// ─── Archive Error Boundary ───────────────────────────────────────

import { useCallback } from "react";

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function ArchiveError({ error, reset }: Props) {
  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="archive-error">
      <h1 className="archive-error__heading">
        页面加载出错
      </h1>
      <p className="archive-error__body">
        请检查网络连接后重试。
      </p>
      <button
        type="button"
        className="archive-retry-btn"
        onClick={handleRetry}
      >
        重试
      </button>
    </div>
  );
}
