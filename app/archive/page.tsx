// ─── Archive Page — Timber Field Notes (DESIGN.md §5.9, §6.2) ─────
// Async server component. Reads metadata-only note index, groups by
// year, computes category counts, and renders year rails with log rows.
// Client filter leaf handles search/filter UI and URL param sync.
// No `content` fetched. No images. No infinite scroll.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listPublicNoteIndex } from "../lib/public-note-index";
import {
  aggregateCategoryCounts,
  filterEntries,
  groupByYear,
  normalizeDisplayDate,
} from "../lib/public-note-model";
import type { PublicNoteIndexEntry } from "../lib/public-note-model";
import { defaultSiteCopy } from "../lib/site-copy";
import { readSiteCopy } from "../../db/site-copy";
import { ArchiveFilters } from "./ArchiveFilters";
import "./archive.css";

// Force dynamic because we read site-copy from D1
export const dynamic = "force-dynamic";

// ─── Metadata ──────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "归档 — 木漏",
  description: "按年份归档的公开笔记，支持搜索与主题筛选。",
  alternates: {
    canonical: "https://gm-2.zhou-chu.workers.dev/archive",
  },
};

// ─── Page Props ────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ q?: string; material?: string }>;
};

// ─── Helpers ───────────────────────────────────────────────────────

function formatMonthDay(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    if (isNaN(date.getTime())) {
      return dateStr.slice(5, 10);
    }
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${month}-${day}`;
  } catch {
    return dateStr.slice(5, 10);
  }
}

function formatLogId(id: number): string {
  return `LOG-${String(id).padStart(3, "0")}`;
}

// ─── ArchiveLogRow ─────────────────────────────────────────────────

function ArchiveLogRow({ entry }: { readonly entry: PublicNoteIndexEntry }) {
  const displayDate = normalizeDisplayDate(entry);
  return (
    <div className="archive-log-row">
      <span className="archive-log-id">{formatLogId(entry.id)}</span>
      <time className="archive-log-date" dateTime={displayDate}>
        {formatMonthDay(displayDate)}
      </time>
      <div className="archive-log-content">
        <Link
          href={`/notes/${entry.slug}`}
          className="archive-log-title"
        >
          {entry.title}
        </Link>
        {entry.summary && (
          <p className="archive-log-summary">{entry.summary}</p>
        )}
      </div>
      <span className="archive-material-label">{entry.category}</span>
    </div>
  );
}

// ─── ArchiveEmpty ──────────────────────────────────────────────────

function ArchiveEmpty() {
  return (
    <div className="archive-state">
      <p className="archive-state__empty">
        档案尚空
        <br />
        公开笔记会按年份在这里归档。
      </p>
    </div>
  );
}

// ─── ArchiveFilteredEmpty ──────────────────────────────────────────

function ArchiveFilteredEmpty() {
  return (
    <div className="archive-state">
      <h2 className="archive-state__heading">没有匹配的笔记</h2>
      <p className="archive-state__body">
        试试调整筛选条件或搜索关键词。
      </p>
      <Link href="/archive" className="archive-clear-btn">
        清除筛选
      </Link>
    </div>
  );
}

// ─── ArchiveBody ───────────────────────────────────────────────────

function ArchiveBody({
  entries,
  hasActiveFilters,
}: {
  readonly entries: readonly PublicNoteIndexEntry[];
  readonly hasActiveFilters: boolean;
}) {
  if (entries.length === 0) {
    return hasActiveFilters ? <ArchiveFilteredEmpty /> : <ArchiveEmpty />;
  }

  const groups = groupByYear(entries);

  return (
    <div className="archive-body">
      {groups.map((group) => (
        <section key={group.year} className="archive-year-section">
          <div className="archive-year-heading">
            <h2>{group.year}</h2>
            <span>{group.entries.length} 本藏书</span>
          </div>
          <div className="archive-year-group">
            {group.entries.map((entry) => (
              <ArchiveLogRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Resolve site copy ─────────────────────────────────────────────

async function resolveCopy(): Promise<{
  cSearchPlaceholder: string;
  cBrowseTitle: string;
  cFeaturedTitle: string;
}> {
  try {
    const stored = await readSiteCopy();
    if (stored?.copyJson) {
      const copy = { ...defaultSiteCopy, ...JSON.parse(stored.copyJson) };
      return {
        cSearchPlaceholder: copy.cSearchPlaceholder,
        cBrowseTitle: copy.cBrowseTitle,
        cFeaturedTitle: copy.cFeaturedTitle,
      };
    }
  } catch {
    // fall through to defaults
  }
  return {
    cSearchPlaceholder: defaultSiteCopy.cSearchPlaceholder,
    cBrowseTitle: defaultSiteCopy.cBrowseTitle,
    cFeaturedTitle: defaultSiteCopy.cFeaturedTitle,
  };
}

// ─── Page Component ────────────────────────────────────────────────

export default async function ArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const material = params.material ?? "";

  const [entries, copy] = await Promise.all([
    listPublicNoteIndex(),
    resolveCopy(),
  ]);

  // Category counts computed from ALL entries (not filtered)
  const counts = aggregateCategoryCounts(entries);

  // Filter entries by query and material if specified
  const hasActiveFilters = query.length > 0 || material.length > 0;
  const filtered = hasActiveFilters
    ? filterEntries(entries, query, material)
    : entries;

  return (
    <div className="archive-shell">
      <h1 className="archive-title">{copy.cBrowseTitle}</h1>
      <p className="archive-subtitle">ARCHIVE</p>

      {/* Suspense boundary for client filter leaf using useSearchParams */}
      <Suspense
        fallback={
          <div className="archive-filters">
            <div
              className="archive-search"
              style={{ background: "var(--line)", opacity: 0.3 }}
            />
          </div>
        }
      >
        <ArchiveFilters
          counts={counts}
          placeholder={copy.cSearchPlaceholder}
          featuredTitle={copy.cFeaturedTitle}
          initialQuery={query}
          initialMaterial={material}
        />
      </Suspense>

      <ArchiveBody entries={filtered} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
