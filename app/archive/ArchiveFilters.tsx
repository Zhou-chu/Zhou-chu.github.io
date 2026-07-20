"use client";

// ─── Archive Filters — Client Leaf ──────────────────────────────────
// Only this component uses "use client". Search input and material
// filter pills. Reads URL search params for initial values, updates
// URL via router.replace() for shareable state. Debounced search.
// Category counts and placeholder text come from the server.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryCount } from "../lib/public-note-model";

type Props = {
  readonly counts: readonly CategoryCount[];
  readonly placeholder: string;
  readonly featuredTitle: string;
  readonly initialQuery: string;
  readonly initialMaterial: string;
};

export function ArchiveFilters({
  counts,
  placeholder,
  featuredTitle,
  initialQuery,
  initialMaterial,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Local search state for responsive typing before URL sync
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const hasMounted = useRef(false);

  // On mount, sync any URL params that may have changed
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const q = searchParams.get("q") ?? "";
    setLocalQuery(q);
  }, [searchParams]);

  // ─── URL push helper ────────────────────────────────────────────

  const updateUrl = useCallback(
    (q: string, material: string) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (material) params.set("material", material);

      const search = params.toString();
      const newUrl = search ? `/archive?${search}` : "/archive";

      router.replace(newUrl, { scroll: false });
    },
    [router],
  );

  // ─── Search handler (debounced) ─────────────────────────────────

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const material = searchParams.get("material") ?? "";
        updateUrl(value.trim(), material);
      }, 300);
    },
    [searchParams, updateUrl],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ─── Material filter handler ────────────────────────────────────

  const handleMaterialClick = useCallback(
    (category: string) => {
      const currentMaterial = searchParams.get("material") ?? "";
      const q = searchParams.get("q") ?? "";
      // Toggle: clicking the active material clears the filter
      const nextMaterial =
        currentMaterial.toLowerCase() === category.toLowerCase() ? "" : category;
      updateUrl(q, nextMaterial);
    },
    [searchParams, updateUrl],
  );

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="archive-filters">
      <input
        type="search"
        className="archive-search"
        placeholder={placeholder}
        value={localQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        aria-label={placeholder}
        autoComplete="off"
      />

      <div className="archive-material-pills">
        {counts.length > 0 && (
          <span className="archive-material-label-heading">{featuredTitle}</span>
        )}
        {counts.map(({ category, count }) => {
          const isActive =
            initialMaterial.toLowerCase() === category.toLowerCase();
          return (
            <button
              key={category}
              type="button"
              className="archive-material-pill"
              data-active={isActive ? "true" : undefined}
              onClick={() => handleMaterialClick(category)}
              aria-pressed={isActive}
            >
              {category}
              <span className="archive-material-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
