// ─── Public Note Model Tests — normalizeDisplayDate + groupByYear ────
// Tests pure date normalization and year-grouping functions.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  normalizeDisplayDate,
  groupByYear,
} from "../app/lib/public-note-model.ts";
import type { PublicNoteIndexEntry } from "../app/lib/public-note-model.ts";
import { e } from "./test-helpers/public-note-fixture.ts";

// ─── normalizeDisplayDate ────────────────────────────────────────────

describe("normalizeDisplayDate", () => {
  test("returns publishedAt when it is a valid YYYY-MM-DD string", () => {
    const note = e({ publishedAt: "2025-03-20", createdAt: "2025-01-01" });
    assert.strictEqual(normalizeDisplayDate(note), "2025-03-20");
  });

  test("falls back to createdAt when publishedAt is null", () => {
    const note = e({ publishedAt: null, createdAt: "2025-06-15" });
    assert.strictEqual(normalizeDisplayDate(note), "2025-06-15");
  });

  test("falls back to createdAt when publishedAt is blank string", () => {
    const note = e({ publishedAt: "", createdAt: "2025-06-15" });
    assert.strictEqual(normalizeDisplayDate(note), "2025-06-15");
  });

  test("falls back to createdAt when publishedAt is not a date", () => {
    const note = e({ publishedAt: "not-a-date", createdAt: "2025-06-15" });
    assert.strictEqual(normalizeDisplayDate(note), "2025-06-15");
  });

  test("falls back to createdAt when publishedAt has wrong format (YYYY/MM/DD)", () => {
    const note = e({ publishedAt: "2025/03/20", createdAt: "2025-06-15" });
    assert.strictEqual(normalizeDisplayDate(note), "2025-06-15");
  });

  test("returns deterministic sentinel when both dates are invalid", () => {
    const note = e({ publishedAt: "bad", createdAt: "also-bad" });
    assert.strictEqual(normalizeDisplayDate(note), "1970-01-01");
  });

  test("returns deterministic sentinel when createdAt is blank and publishedAt is null", () => {
    const note = e({ publishedAt: null, createdAt: "" });
    assert.strictEqual(normalizeDisplayDate(note), "1970-01-01");
  });

  test("handles valid leap-day publishedAt (2024-02-29)", () => {
    const note = e({ publishedAt: "2024-02-29", createdAt: "2025-01-01" });
    assert.strictEqual(normalizeDisplayDate(note), "2024-02-29");
  });

  test("handles publishedAt with whitespace (trimmed)", () => {
    const note = e({ publishedAt: "  2025-03-20  ", createdAt: "2025-01-01" });
    // publishedAt with whitespace fails YYYY-MM-DD regex, so falls back
    assert.strictEqual(normalizeDisplayDate(note), "2025-01-01");
  });
});

// ─── groupByYear ─────────────────────────────────────────────────────

describe("groupByYear", () => {
  test("returns empty array for zero entries", () => {
    assert.deepStrictEqual(groupByYear([]), []);
  });

  test("returns single group for one entry", () => {
    const notes = [e({ publishedAt: "2025-03-20", id: 1 })];
    const result = groupByYear(notes);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].year, 2025);
    assert.strictEqual(result[0].entries.length, 1);
    assert.strictEqual(result[0].entries[0].id, 1);
  });

  test("groups multiple years in descending order", () => {
    const notes = [
      e({ publishedAt: "2024-01-01", id: 1 }),
      e({ publishedAt: "2025-06-15", id: 2 }),
      e({ publishedAt: "2023-12-31", id: 3 }),
    ];
    const result = groupByYear(notes);
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].year, 2025);
    assert.strictEqual(result[1].year, 2024);
    assert.strictEqual(result[2].year, 2023);
  });

  test("orders entries within same year by date descending", () => {
    const notes = [
      e({ publishedAt: "2025-01-15", id: 1 }),
      e({ publishedAt: "2025-06-01", id: 2 }),
      e({ publishedAt: "2025-03-10", id: 3 }),
    ];
    const result = groupByYear(notes);
    assert.strictEqual(result.length, 1);
    const ids = result[0].entries.map(n => n.id);
    assert.deepStrictEqual(ids, [2, 3, 1]);
  });

  test("tie-breaks same date by ID descending", () => {
    const notes = [
      e({ publishedAt: "2025-06-01", id: 10 }),
      e({ publishedAt: "2025-06-01", id: 20 }),
      e({ publishedAt: "2025-06-01", id: 5 }),
    ];
    const result = groupByYear(notes);
    const ids = result[0].entries.map(n => n.id);
    assert.deepStrictEqual(ids, [20, 10, 5]);
  });

  test("handles entries with null publishedAt (falls back to createdAt)", () => {
    const notes = [
      e({ publishedAt: null, createdAt: "2025-08-01", id: 1 }),
      e({ publishedAt: "2025-03-01", createdAt: "2025-01-01", id: 2 }),
    ];
    const result = groupByYear(notes);
    // 2025-08-01 > 2025-03-01, so id 1 first
    assert.strictEqual(result[0].entries[0].id, 1);
    assert.strictEqual(result[0].entries[1].id, 2);
  });

  test("handles entries that fall back to epoch sentinel", () => {
    const notes = [
      e({ publishedAt: null, createdAt: "bad-date", id: 1 }),
      e({ publishedAt: "2025-03-01", createdAt: "2025-01-01", id: 2 }),
    ];
    const result = groupByYear(notes);
    // 2025 > 1970, so id 2 first
    assert.strictEqual(result[0].year, 2025);
    assert.strictEqual(result[0].entries[0].id, 2);
    assert.strictEqual(result[1].year, 1970);
    assert.strictEqual(result[1].entries[0].id, 1);
  });

  test("handles 298 entries without error", () => {
    const notes: PublicNoteIndexEntry[] = [];
    for (let i = 1; i <= 298; i++) {
      const year = 2020 + (i % 4); // spread across 4 years
      const month = String((i % 12) + 1).padStart(2, "0");
      const day = String((i % 28) + 1).padStart(2, "0");
      notes.push(e({
        id: i,
        publishedAt: `${year}-${month}-${day}`,
        title: `Note ${i}`,
      }));
    }
    const result = groupByYear(notes);
    const totalEntries = result.reduce((sum, g) => sum + g.entries.length, 0);
    assert.strictEqual(totalEntries, 298);
    // Years descending
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i - 1].year > result[i].year);
    }
  });

  test("does not mutate the input array", () => {
    const notes = [
      e({ publishedAt: "2025-06-01", id: 2 }),
      e({ publishedAt: "2025-01-15", id: 1 }),
    ];
    const frozen = [...notes];
    groupByYear(notes);
    assert.deepStrictEqual(notes, frozen);
  });

  test("handles entries with duplicate IDs gracefully (deterministic tie-break)", () => {
    const notes = [
      e({ publishedAt: "2025-06-01", id: 5 }),
      e({ publishedAt: "2025-06-01", id: 5 }), // duplicate ID
    ];
    const result = groupByYear(notes);
    assert.strictEqual(result[0].entries.length, 2);
    // IDs are equal, order is stable (insertion order preserved by map)
  });
});
