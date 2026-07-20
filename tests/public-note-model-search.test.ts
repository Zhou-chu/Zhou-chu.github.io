// ─── Public Note Model Tests — categoryCounts + filterEntries ───────
// Tests category aggregation and search/filter functions.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  aggregateCategoryCounts,
  filterEntries,
} from "../app/lib/public-note-model.ts";
import { e } from "./test-helpers/public-note-fixture.ts";

// ─── aggregateCategoryCounts ─────────────────────────────────────────

describe("aggregateCategoryCounts", () => {
  test("returns empty array for zero entries", () => {
    assert.deepStrictEqual(aggregateCategoryCounts([]), []);
  });

  test("counts single category correctly", () => {
    const notes = [e({ category: "工程" })];
    const result = aggregateCategoryCounts(notes);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].category, "工程");
    assert.strictEqual(result[0].count, 1);
  });

  test("aggregates duplicate categories", () => {
    const notes = [
      e({ category: "工程", id: 1 }),
      e({ category: "工程", id: 2 }),
      e({ category: "随想", id: 3 }),
    ];
    const result = aggregateCategoryCounts(notes);
    const eng = result.find(c => c.category === "工程");
    const sui = result.find(c => c.category === "随想");
    assert.ok(eng);
    assert.ok(sui);
    assert.strictEqual(eng.count, 2);
    assert.strictEqual(sui.count, 1);
  });

  test("maps blank category to 未分类", () => {
    const notes = [e({ category: "" })];
    const result = aggregateCategoryCounts(notes);
    assert.strictEqual(result[0].category, "未分类");
    assert.strictEqual(result[0].count, 1);
  });

  test("maps whitespace-only category to 未分类", () => {
    const notes = [e({ category: "   " })];
    const result = aggregateCategoryCounts(notes);
    assert.strictEqual(result[0].category, "未分类");
  });

  test("sorts by count descending", () => {
    const notes = [
      e({ category: "A", id: 1 }),
      e({ category: "B", id: 2 }),
      e({ category: "B", id: 3 }),
      e({ category: "C", id: 4 }),
      e({ category: "C", id: 5 }),
      e({ category: "C", id: 6 }),
    ];
    const result = aggregateCategoryCounts(notes);
    assert.strictEqual(result[0].category, "C");
    assert.strictEqual(result[1].category, "B");
    assert.strictEqual(result[2].category, "A");
  });

  test("tie-breaks equal counts by category name ascending", () => {
    const notes = [
      e({ category: "工程", id: 1 }),
      e({ category: "随想", id: 2 }),
    ];
    const result = aggregateCategoryCounts(notes);
    // Both count 1, so alphabetical: 工程 < 随想 (in Unicode order)
    assert.strictEqual(result[0].category, "工程");
    assert.strictEqual(result[1].category, "随想");
  });

  test("handles mixed Chinese and Latin categories", () => {
    const notes = [
      e({ category: "工程", id: 1 }),
      e({ category: "Engineering", id: 2 }),
      e({ category: "工程", id: 3 }),
    ];
    const result = aggregateCategoryCounts(notes);
    const engCat = result.find(c => c.category === "工程");
    const latCat = result.find(c => c.category === "Engineering");
    assert.ok(engCat);
    assert.ok(latCat);
    assert.strictEqual(engCat.count, 2);
    assert.strictEqual(latCat.count, 1);
  });

  test("trims whitespace from categories before counting", () => {
    const notes = [
      e({ category: "  工程  ", id: 1 }),
      e({ category: "工程", id: 2 }),
    ];
    const result = aggregateCategoryCounts(notes);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].category, "工程");
    assert.strictEqual(result[0].count, 2);
  });

  test("does not mutate the input array", () => {
    const notes = [e({ category: "工程" }), e({ category: "随想" })];
    const frozen = [...notes];
    aggregateCategoryCounts(notes);
    assert.deepStrictEqual(notes, frozen);
  });
});

// ─── filterEntries ───────────────────────────────────────────────────

describe("filterEntries", () => {
  test("returns all entries when query and material are empty", () => {
    const notes = [e({ id: 1 }), e({ id: 2 })];
    const result = filterEntries(notes, "", "");
    assert.strictEqual(result.length, 2);
  });

  test("returns all entries when query and material are whitespace-only", () => {
    const notes = [e({ id: 1 }), e({ id: 2 })];
    const result = filterEntries(notes, "   ", "\t");
    assert.strictEqual(result.length, 2);
  });

  test("filters by title case-insensitively", () => {
    const notes = [
      e({ title: "Hello World", id: 1 }),
      e({ title: "Goodbye", id: 2 }),
    ];
    const result = filterEntries(notes, "hello", "");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("filters by summary case-insensitively", () => {
    const notes = [
      e({ summary: "Some IMPORTANT text", id: 1 }),
      e({ summary: "nothing here", id: 2 }),
    ];
    const result = filterEntries(notes, "important", "");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("filters by category case-insensitively in query", () => {
    const notes = [
      e({ category: "工程", id: 1 }),
      e({ category: "随想", id: 2 }),
    ];
    const result = filterEntries(notes, "工程", "");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("filters by exact material match (case-insensitive)", () => {
    const notes = [
      e({ category: "工程", id: 1 }),
      e({ category: "随想", id: 2 }),
    ];
    const result = filterEntries(notes, "", "工程");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("material match is case-insensitive", () => {
    const notes = [
      e({ category: "Engineering", id: 1 }),
      e({ category: "随想", id: 2 }),
    ];
    const result = filterEntries(notes, "", "engineering");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("material match trims whitespace", () => {
    const notes = [
      e({ category: "工程", id: 1 }),
    ];
    const result = filterEntries(notes, "", "  工程  ");
    assert.strictEqual(result.length, 1);
  });

  test("unknown material returns empty", () => {
    const notes = [e({ category: "工程", id: 1 })];
    const result = filterEntries(notes, "", "unknown-material");
    assert.strictEqual(result.length, 0);
  });

  test("combines query and material as AND", () => {
    const notes = [
      e({ title: "Hello", category: "工程", id: 1 }),
      e({ title: "Hello", category: "随想", id: 2 }),
      e({ title: "World", category: "工程", id: 3 }),
    ];
    const result = filterEntries(notes, "hello", "工程");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 1);
  });

  test("handles mixed Chinese and Latin case-insensitive search", () => {
    const notes = [
      e({ title: "木材研究", summary: "Wood study", id: 1 }),
      e({ title: "Engineering", summary: "工程笔记", id: 2 }),
    ];
    // Chinese search
    const cn = filterEntries(notes, "木材", "");
    assert.strictEqual(cn.length, 1);
    assert.strictEqual(cn[0].id, 1);
    // Latin search
    const en = filterEntries(notes, "engineering", "");
    assert.strictEqual(en.length, 1);
    assert.strictEqual(en[0].id, 2);
  });

  test("q=木材 finds entry with 木材 in summary", () => {
    const notes = [
      e({ title: "Other", summary: "讨论木材的可持续性", id: 1 }),
    ];
    const result = filterEntries(notes, "木材", "");
    assert.strictEqual(result.length, 1);
  });

  test("handles empty entries array", () => {
    assert.strictEqual(filterEntries([], "any", "").length, 0);
    assert.strictEqual(filterEntries([], "", "any").length, 0);
  });

  test("does not mutate the input array", () => {
    const notes = [e({ id: 1 }), e({ id: 2 })];
    const frozen = [...notes];
    filterEntries(notes, "some", "");
    assert.deepStrictEqual(notes, frozen);
  });

  test("returns empty when query matches nothing", () => {
    const notes = [e({ title: "Hello", summary: "World", category: "工程", id: 1 })];
    const result = filterEntries(notes, "zzznotfound", "");
    assert.strictEqual(result.length, 0);
  });
});
