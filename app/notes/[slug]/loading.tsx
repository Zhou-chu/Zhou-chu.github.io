// ─── Article Loading Skeleton — Timber Field Notes (DESIGN.md §5.14) ──
// Renders a reading-column skeleton while the server resolves
// the note from D1. Respects reduced-motion.

export default function NoteLoading() {
  return (
    <div className="route-loading route-loading--article">
      <div className="route-loading__pulse" aria-hidden="true">
        {/* Ruler bar */}
        <span className="route-loading__bar route-loading__bar--ruler" />
        {/* Title bar */}
        <span className="route-loading__bar route-loading__bar--title" />
        {/* Summary bar */}
        <span className="route-loading__bar route-loading__bar--body" />
        {/* Content bars */}
        <span className="route-loading__bar route-loading__bar--body" />
        <span className="route-loading__bar route-loading__bar--body" />
        <span className="route-loading__bar route-loading__bar--body" />
        <span className="route-loading__bar route-loading__bar--short" />
      </div>
      <span className="sr-only">加载中…</span>
    </div>
  );
}
