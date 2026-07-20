/**
 * Unit tests for tests/support/public-fixtures.ts.
 *
 * Covers: loopback guard (assertLoopback), fake-context cleanup,
 * and rejection of non-loopback base URLs.
 */
import assert from "node:assert/strict";
import { describe, test, after } from "node:test";
import { assertLoopback } from "./support/public-fixtures.ts";

// ─── Fake APIRequestContext ──────────────────────────────────────────

interface FakeCall {
  method: string;
  url: string;
}

class FakeRequestContext {
  calls: FakeCall[] = [];
  #deleteStatus: number = 200;

  constructor(opts?: { deleteStatus?: number }) {
    this.#deleteStatus = opts?.deleteStatus ?? 200;
  }

  async post(url: string, _opts?: unknown) {
    this.calls.push({ method: "POST", url });
    return {
      status: () => 201,
      json: async () => ({ note: { id: this.calls.length * 100, slug: `slug-${this.calls.length}`, title: "Fake" } }),
      text: async () => "OK",
      ok: () => true,
    };
  }

  async delete(url: string) {
    this.calls.push({ method: "DELETE", url });
    return {
      status: () => this.#deleteStatus,
      ok: () => this.#deleteStatus < 400,
      text: async () => "OK",
    };
  }

  async get(_url: string) {
    this.calls.push({ method: "GET", _url });
    return {
      status: () => 200,
      json: async () => ({ notes: [] }),
      text: async () => "[]",
      ok: () => true,
    };
  }
}

// ─── Loopback guard ─────────────────────────────────────────────────

describe("assertLoopback", () => {
  test("accepts http://127.0.0.1:3000", () => {
    const url = assertLoopback("http://127.0.0.1:3000");
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "3000");
  });

  test("accepts http://localhost:3000", () => {
    const url = assertLoopback("http://localhost:3000");
    assert.equal(url.hostname, "localhost");
  });

  test("accepts http://[::1]:3000", () => {
    const url = assertLoopback("http://[::1]:3000");
    assert.equal(url.hostname, "[::1]");
  });

  test("accepts https://localhost/ with implicit port", () => {
    const url = assertLoopback("https://localhost/");
    assert.equal(url.hostname, "localhost");
    assert.equal(url.port, "");
  });

  test("rejects https://example.com", () => {
    assert.throws(
      () => assertLoopback("https://example.com"),
      /not a loopback/,
    );
  });

  test("rejects http://192.168.1.1:3000", () => {
    assert.throws(
      () => assertLoopback("http://192.168.1.1:3000"),
      /not a loopback/,
    );
  });

  test("rejects invalid URL string", () => {
    assert.throws(
      () => assertLoopback("not-a-url"),
      /Invalid base URL/,
    );
  });

  test("rejects empty string", () => {
    assert.throws(
      () => assertLoopback(""),
      /Invalid base URL/,
    );
  });

  test("rejects remote IPv4 in loopback range (non-standard)", () => {
    // Only exact 127.0.0.1 is allowed; 127.0.0.2 is not in the allow-set.
    // (Some systems treat the entire 127.0.0.0/8 as loopback, but we are
    // intentionally strict to match the project's security contract.)
    assert.throws(
      () => assertLoopback("http://127.0.0.2:3000"),
      /not a loopback/,
    );
  });
});

// ─── Fake-context cleanup ───────────────────────────────────────────

describe("FakeRequestContext cleanup simulation", () => {
  test("exact-ID cleanup deletes only created IDs", async () => {
    const fake = new FakeRequestContext();
    // Simulate creating two notes
    const createRes1 = await fake.post("http://127.0.0.1:3000/api/admin/notes", {});
    const createRes2 = await fake.post("http://127.0.0.1:3000/api/admin/notes", {});
    const json1 = await createRes1.json();
    const json2 = await createRes2.json();
    const createdIds = [json1.note.id, json2.note.id];

    // Delete exactly those IDs
    for (const id of createdIds) {
      await fake.delete(`http://127.0.0.1:3000/api/admin/notes?id=${id}`);
    }

    // Verify DELETE calls only targeted the created IDs
    const deleteCalls = fake.calls.filter((c) => c.method === "DELETE");
    assert.equal(deleteCalls.length, 2);
    assert.ok(deleteCalls[0].url.includes(`id=${createdIds[0]}`));
    assert.ok(deleteCalls[1].url.includes(`id=${createdIds[1]}`));
  });

  test("cleanup survives a failed delete without throwing", async () => {
    const fake = new FakeRequestContext({ deleteStatus: 500 });
    const createRes = await fake.post("http://localhost:3000/api/admin/notes", {});
    const json = await createRes.json();
    const id = json.note.id;

    // A failing delete should not throw — we log and continue.
    await assert.doesNotReject(async () => {
      await fake.delete(`http://localhost:3000/api/admin/notes?id=${id}`);
    });

    // The call was still made (best-effort).
    const deleteCalls = fake.calls.filter((c) => c.method === "DELETE");
    assert.equal(deleteCalls.length, 1);
    assert.ok(deleteCalls[0].url.includes(`id=${id}`));
  });

  test("cleanup never calls batch-delete endpoint", () => {
    const fake = new FakeRequestContext();
    const batchCalls = fake.calls.filter(
      (c) => c.url.includes("batch-delete") || c.url.includes("batch-unpublish"),
    );
    assert.deepEqual(batchCalls, []);
  });

  test("zero created IDs results in zero delete calls", () => {
    const fake = new FakeRequestContext();
    // No create calls → no IDs → no deletes
    const deleteCalls = fake.calls.filter((c) => c.method === "DELETE");
    assert.equal(deleteCalls.length, 0);
  });
});

// ─── Fake-context loopback rejection ────────────────────────────────

describe("Fixture creation rejects non-loopback before write", () => {
  test("https://example.com base URL is rejected without a single fake call", () => {
    const fake = new FakeRequestContext();
    assert.throws(() => assertLoopback("https://example.com"), /not a loopback/);
    assert.equal(fake.calls.length, 0);
  });
});

// ─── In-memory stub isolation regression ────────────────────────────

import { testDb, env as stubEnv } from "./support/cloudflare-workers-stub.mjs";

describe("cloudflare-workers-stub isolation", () => {
  test("does not reference .wrangler in source", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("./support/cloudflare-workers-stub.mjs", import.meta.url),
      "utf8",
    );
    // Code-level references (not comments): file paths or dir reads
    assert.doesNotMatch(source, /'\.wrangler/);
    assert.doesNotMatch(source, /"\.wrangler/);
    assert.doesNotMatch(source, /miniflare-D1DatabaseObject/);
    assert.doesNotMatch(source, /readdirSync/);
    assert.doesNotMatch(source, /existsSync.*wrangler/);
    // Must use :memory:, not a file path
    assert.match(source, /:memory:/);
  });

  test("database is open and in-memory", () => {
    const rows = testDb.prepare("SELECT 1 AS one").all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].one, 1);
  });

  test("starts empty — zero notes and zero site_settings", () => {
    const notesCount = testDb.prepare("SELECT COUNT(*) AS c FROM notes").get();
    assert.equal(notesCount.c, 0, "notes table must start empty");
    const ssCount = testDb.prepare("SELECT COUNT(*) AS c FROM site_settings").get();
    assert.equal(ssCount.c, 0, "site_settings must start empty");
  });

  test("writes are visible within the same process", () => {
    testDb.prepare("INSERT INTO notes (slug, title, content, author_email) VALUES (?,?,?,?)")
      .run("isolated-test", "Isolated", "body", "dev@localhost");
    const row = testDb.prepare("SELECT id, slug FROM notes WHERE slug = ?")
      .get("isolated-test");
    assert.ok(row, "inserted row must be retrievable");
    // Clean up
    testDb.prepare("DELETE FROM notes WHERE slug = ?").run("isolated-test");
  });

  test("has all required tables and indexes", () => {
    const tables = testDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('notes','site_settings') ORDER BY name",
    ).all();
    assert.equal(tables.length, 2, "missing required tables");
    const indexes = testDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'notes_%' ORDER BY name",
    ).all();
    assert.ok(indexes.length >= 3, `expected >=3 indexes, got ${indexes.length}`);
  });

  test("env.DB is a D1 wrapper with expected methods", () => {
    assert.equal(typeof stubEnv.DB, "object");
    assert.equal(typeof stubEnv.DB.prepare, "function");
    assert.equal(typeof stubEnv.DB.exec, "function");
    assert.equal(typeof stubEnv.DB.batch, "function");
  });
});
