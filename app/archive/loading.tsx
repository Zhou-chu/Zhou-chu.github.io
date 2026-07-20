// ─── Archive Loading Skeleton ────────────────────────────────────

export default function ArchiveLoading() {
  return (
    <div className="archive-skeleton">
      <div className="archive-skeleton__title" />
      <div className="archive-skeleton__subtitle" />
      <div className="archive-skeleton__search" />
      <div className="archive-skeleton__year" />

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="archive-skeleton__row"
          style={{ width: `${70 + ((i * 17) % 30)}%` }}
        />
      ))}
    </div>
  );
}
