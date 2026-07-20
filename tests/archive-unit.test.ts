// ─── Archive Unit Tests ──────────────────────────────────────────
// Tests for archive-specific formatting helpers and integration
// patterns. Pure model functions (groupByYear, filterEntries,
// aggregateCategoryCounts) are already covered by public-note-model
// and public-note-model-search test suites.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { e } from "./test-helpers/public-note-fixture.ts";
import { groupByYear, filterEntries, normalizeDisplayDate, aggregateCategoryCounts } from "../app/lib/public-note-model.ts";
import type { PublicNoteIndexEntry } from "../app/lib/public-note-model.ts";

// ─── formatLogId (inline test) ────────────────────────────────────

function formatLogId(id: number): string {
  return `LOG-${String(id).padStart(3, "0")}`;
}

describe("formatLogId", () => {
  test("formats single-digit id with leading zeros", () => {
    assert.strictEqual(formatLogId(1), "LOG-001");
  });

  test("formats double-digit id", () => {
    assert.strictEqual(formatLogId(42), "LOG-042");
  });

  test("formats triple-digit id", () => {
    assert.strictEqual(formatLogId(298), "LOG-298");
  });

  test("formats large id", () => {
    assert.strictEqual(formatLogId(12345), "LOG-12345");
  });

  test("formats zero id", () => {
    assert.strictEqual(formatLogId(0), "LOG-000");
  });
});

// ─── Archive empty state (model-level) ────────────────────────────

describe("Archive: empty state", () => {
  test("zero notes produces empty groups and counts", () => {
    const entries: readonly PublicNoteIndexEntry[] = [];
    assert.deepStrictEqual(groupByYear(entries), []);
    assert.deepStrictEqual(aggregateCategoryCounts(entries), []);
    assert.strictEqual(filterEntries(entries, "", "").length, 0);
  });

  test("empty groups has no year rails", () => {
    const entries: readonly PublicNoteIndexEntry[] = [];
    const groups = groupByYear(entries);
    assert.strictEqual(groups.length, 0);
  });
});

// ─── Archive: populated state ─────────────────────────────────────

describe("Archive: populated state", () => {
  test("groups notes across 3 years in descending order", () => {
    const entries = [
      e({ publishedAt: "2024-03-15", id: 1, title: "Note 2024" }),
      e({ publishedAt: "2025-06-20", id: 2, title: "Note 2025a" }),
      e({ publishedAt: "2025-08-10", id: 3, title: "Note 2025b" }),
      e({ publishedAt: "2026-01-05", id: 4, title: "Note 2026" }),
    ];
    const groups = groupByYear(entries);
    assert.strictEqual(groups.length, 3);
    assert.strictEqual(groups[0].year, 2026);
    assert.strictEqual(groups[1].year, 2025);
    assert.strictEqual(groups[2].year, 2024);
  });

  test("entries within same year sorted by date descending", () => {
    const entries = [
      e({ publishedAt: "2025-01-15", id: 1 }),
      e({ publishedAt: "2025-06-01", id: 2 }),
      e({ publishedAt: "2025-03-10", id: 3 }),
    ];
    const groups = groupByYear(entries);
    const ids = groups[0].entries.map((n) => n.id);
    assert.deepStrictEqual(ids, [2, 3, 1]);
  });

  test("aggregates categories across years", () => {
    const entries = [
      e({ category: "工程", publishedAt: "2024-01-01", id: 1 }),
      e({ category: "工程", publishedAt: "2025-01-01", id: 2 }),
      e({ category: "随想", publishedAt: "2025-01-01", id: 3 }),
    ];
    const counts = aggregateCategoryCounts(entries);
    const eng = counts.find((c) => c.category === "工程");
    assert.ok(eng);
    assert.strictEqual(eng.count, 2);
    const sui = counts.find((c) => c.category === "随想");
    assert.ok(sui);
    assert.strictEqual(sui.count, 1);
  });
});

// ─── Archive: search/filter ───────────────────────────────────────

describe("Archive: search/filter", () => {
  test("search by title across years", () => {
    const entries = [
      e({ title: "木材研究", publishedAt: "2025-01-01", id: 1 }),
      e({ title: "Engineering 101", publishedAt: "2024-01-01", id: 2 }),
      e({ title: "木材可持续性", publishedAt: "2026-01-01", id: 3 }),
    ];
    const result = filterEntries(entries, "木材", "");
    assert.strictEqual(result.length, 2);
    // Both 木材 entries found
    const ids = result.map((n) => n.id).sort();
    assert.deepStrictEqual(ids, [1, 3]);
  });

  test("filter by material (exact category match)", () => {
    const entries = [
      e({ category: "工程", id: 1 }),
      e({ category: "工程", id: 2 }),
      e({ category: "随想", id: 3 }),
    ];
    const result = filterEntries(entries, "", "工程");
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(
      result.map((n) => n.id).sort(),
      [1, 2],
    );
  });

  test("unknown material returns empty", () => {
    const entries = [e({ category: "工程", id: 1 })];
    const result = filterEntries(entries, "", "non-existent");
    assert.strictEqual(result.length, 0);
  });

  test("blank query and material returns all entries", () => {
    const entries = [
      e({ id: 1 }),
      e({ id: 2 }),
    ];
    const result = filterEntries(entries, "", "");
    assert.strictEqual(result.length, 2);
  });

  test("combined search and material filter (AND)", () => {
    const entries = [
      e({ title: "Hello", category: "工程", id: 1 }),
      e({ title: "Hello", category: "随想", id: 2 }),
      e({ title: "World", category: "工程", id: 3 }),
    ];
    const result = filterEntries(entries, "hello", "工程");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("filtered-empty: search returns no results", () => {
    const entries = [e({ title: "Hello", id: 1 })];
    const result = filterEntries(entries, "zzznomatch", "");
    assert.strictEqual(result.length, 0);
  });
});

// ─── Archive: invalid date fallback ───────────────────────────────

describe("Archive: invalid date fallback", () => {
  test("null publishedAt falls back to createdAt", () => {
    const entry = e({ publishedAt: null, createdAt: "2025-06-15" });
    assert.strictEqual(normalizeDisplayDate(entry), "2025-06-15");
  });

  test("invalid publishedAt falls back to createdAt", () => {
    const entry = e({ publishedAt: "bad-date", createdAt: "2025-03-20" });
    assert.strictEqual(normalizeDisplayDate(entry), "2025-03-20");
  });

  test("both invalid produces epoch sentinel", () => {
    const entry = e({ publishedAt: null, createdAt: "" });
    assert.strictEqual(normalizeDisplayDate(entry), "1970-01-01");
  });

  test("bad dates still groupable (year 1970)", () => {
    const entries = [
      e({ publishedAt: null, createdAt: "bad", id: 1 }),
      e({ publishedAt: "2025-01-01", createdAt: "2025-01-01", id: 2 }),
    ];
    const groups = groupByYear(entries);
    // 2025 before 1970
    assert.strictEqual(groups[0].year, 2025);
    assert.strictEqual(groups[1].year, 1970);
  });
});

// ─── Archive: large dataset (298 entries) ─────────────────────────

describe("Archive: 298 entries", () => {
  test("groups 298 entries across years without error", () => {
    const entries: PublicNoteIndexEntry[] = [];
    for (let i = 1; i <= 298; i++) {
      const year = 2020 + (i % 5); // spread across 5 years
      const month = String((i % 12) + 1).padStart(2, "0");
      const day = String((i % 28) + 1).padStart(2, "0");
      entries.push(
        e({
          id: i,
          publishedAt: `${year}-${month}-${day}`,
          title: `Note ${i}`,
          category: i % 3 === 0 ? "工程" : i % 3 === 1 ? "随想" : "阅读",
        }),
      );
    }
    const groups = groupByYear(entries);
    const totalEntries = groups.reduce((sum, g) => sum + g.entries.length, 0);
    assert.strictEqual(totalEntries, 298);

    // Years are descending
    for (let i = 1; i < groups.length; i++) {
      assert.ok(groups[i - 1].year > groups[i].year);
    }

    // Categories present
    const counts = aggregateCategoryCounts(entries);
    assert.ok(counts.length >= 3);

    // Search works across 298 entries
    const filtered = filterEntries(entries, "Note 1", "");
    assert.ok(filtered.length > 0);
    // "Note 1" matches Note 1, Note 10-19, Note 100-199, etc.
    assert.ok(filtered.length >= 11);
  });
});
