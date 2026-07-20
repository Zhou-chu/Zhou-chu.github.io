// ─── Public Note Model ───────────────────────────────────────────────
// Pure functions operating on PublicNoteIndexEntry metadata.
// No database imports, no side effects, no mutation of inputs.

export interface PublicNoteIndexEntry {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly featured: boolean;
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface YearGroup {
  readonly year: number;
  readonly entries: readonly PublicNoteIndexEntry[];
}

export interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const FALLBACK_DATE = "1970-01-01";
const BLANK_CATEGORY = "未分类";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ─── Helpers ─────────────────────────────────────────────────────────

function isValidDateString(s: string): boolean {
  return DATE_PATTERN.test(s) && !isNaN(Date.parse(s));
}

function extractYear(dateStr: string): number {
  return parseInt(dateStr.slice(0, 4), 10);
}

// ─── normalizeDisplayDate ────────────────────────────────────────────

/**
 * Returns the effective display date for a public note index entry.
 * Prefers `publishedAt` when it is a valid YYYY-MM-DD date.
 * Falls back to `createdAt` (always present in the schema).
 * If both are invalid or blank, returns the deterministic epoch sentinel
 * `1970-01-01` so callers always receive a parseable date string.
 */
export function normalizeDisplayDate(entry: PublicNoteIndexEntry): string {
  const published = entry.publishedAt;
  if (typeof published === "string" && published.length > 0 && isValidDateString(published)) {
    return published;
  }
  const created = entry.createdAt;
  if (typeof created === "string" && created.length > 0 && isValidDateString(created)) {
    return created;
  }
  return FALLBACK_DATE;
}

// ─── groupByYear ─────────────────────────────────────────────────────

/**
 * Groups entries into descending-year buckets.
 *
 * Each bucket is sorted by effective display date descending, with
 * ID descending as a deterministic tie-break for entries sharing
 * the same date.
 *
 * Accepts and returns `readonly` arrays — input is never mutated.
 */
export function groupByYear(
  entries: readonly PublicNoteIndexEntry[],
): readonly YearGroup[] {
  const map = new Map<number, PublicNoteIndexEntry[]>();

  for (const entry of entries) {
    const date = normalizeDisplayDate(entry);
    const year = extractYear(date);
    const group = map.get(year);
    if (group) {
      group.push(entry);
    } else {
      map.set(year, [entry]);
    }
  }

  const years = Array.from(map.keys()).sort((a, b) => b - a);

  return years.map((year) => {
    const groupEntries = map.get(year)!;
    groupEntries.sort((a, b) => {
      const dateA = normalizeDisplayDate(a);
      const dateB = normalizeDisplayDate(b);
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      return b.id - a.id;
    });
    return { year, entries: groupEntries };
  });
}

// ─── aggregateCategoryCounts ─────────────────────────────────────────

/**
 * Counts entries per category.
 *
 * Trims whitespace from every category value.
 * Blank or whitespace-only categories are mapped to the sentinel `未分类`.
 *
 * Results are sorted by count descending, with ascending category name
 * as a deterministic tie-break for equal counts.
 *
 * Does not mutate the input array.
 */
export function aggregateCategoryCounts(
  entries: readonly PublicNoteIndexEntry[],
): readonly CategoryCount[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const raw = (entry.category ?? "").trim();
    const category = raw.length > 0 ? raw : BLANK_CATEGORY;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.category.localeCompare(b.category);
    });
}

// ─── filterEntries ───────────────────────────────────────────────────

/**
 * Filters a readonly list of entries.
 *
 * `query` performs a case-insensitive substring search across title,
 * summary, and category — matching any of the three.
 *
 * `material` performs an exact (case-insensitive, trimmed) match on
 * category. Unlike the query, it must match the full category value,
 * not merely appear as a substring.
 *
 * When both `query` and `material` are empty (after trimming), all
 * entries are returned unchanged.
 *
 * The two filters combine with AND semantics: an entry must satisfy
 * both a non-empty material constraint AND a non-empty query constraint.
 *
 * Does not mutate the input array.
 */
export function filterEntries(
  entries: readonly PublicNoteIndexEntry[],
  query: string,
  material: string,
): readonly PublicNoteIndexEntry[] {
  const q = (query ?? "").trim().toLowerCase();
  const m = (material ?? "").trim().toLowerCase();

  if (q.length === 0 && m.length === 0) {
    return entries;
  }

  return entries.filter((entry) => {
    if (m.length > 0) {
      const entryCategory = (entry.category ?? "").trim().toLowerCase();
      if (entryCategory !== m) {
        return false;
      }
    }

    if (q.length > 0) {
      const titleLower = (entry.title ?? "").toLowerCase();
      const summaryLower = (entry.summary ?? "").toLowerCase();
      const categoryLower = (entry.category ?? "").toLowerCase();
      if (
        !titleLower.includes(q) &&
        !summaryLower.includes(q) &&
        !categoryLower.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });
}
