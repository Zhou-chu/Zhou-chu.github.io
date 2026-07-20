// ─── Root Loading Skeleton — Timber Field Notes (DESIGN.md §5.14) ──
// Provides a minimal skeleton for the public shell while route data
// resolves. Respects reduced-motion preference (static opacity).

export default function RootLoading() {
  return (
    <div className="route-loading">
      <div className="route-loading__pulse" aria-hidden="true">
        <span className="route-loading__bar route-loading__bar--title" />
        <span className="route-loading__bar route-loading__bar--body" />
        <span className="route-loading__bar route-loading__bar--short" />
      </div>
      <span className="sr-only">加载中…</span>
    </div>
  );
}
