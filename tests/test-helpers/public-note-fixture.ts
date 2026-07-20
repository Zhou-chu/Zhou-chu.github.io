// ─── Shared Public Note Test Fixture ─────────────────────────────────
// Factory function `e()` for constructing PublicNoteIndexEntry values.
// Keeps an auto-incrementing ID counter so callers can omit the id field
// and still get unique values.

import type { PublicNoteIndexEntry } from "../../app/lib/public-note-model.ts";

let _autoId = 0;

export function e(overrides: Partial<PublicNoteIndexEntry> = {}): PublicNoteIndexEntry {
  _autoId++;
  return {
    id: overrides.id ?? _autoId,
    slug: overrides.slug ?? `note-${overrides.id ?? _autoId}`,
    title: overrides.title ?? "Test Note",
    summary: overrides.summary ?? "A test note summary.",
    category: overrides.category ?? "工程",
    featured: overrides.featured ?? false,
    publishedAt: overrides.publishedAt ?? null,
    createdAt: overrides.createdAt ?? "2025-06-15",
    updatedAt: overrides.updatedAt ?? "2025-06-15",
  };
}
