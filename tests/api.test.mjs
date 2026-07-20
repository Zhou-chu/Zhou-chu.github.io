import assert from "node:assert/strict";
import test from "node:test";
import { getTestEnv } from "./support/cloudflare-workers-stub.mjs";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);

const ADMIN_AUTH_HEADER = "oai-authenticated-user-email";
const ADMIN_EMAIL = "test@example.com";

async function createWorker() {
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

/** Build a miniflare-style env with a static-assets fetcher and isolated DB. */
function makeEnv() {
  return getTestEnv({
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  });
}

function makeCtx() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

/**
 * Thin wrapper around worker.fetch that automatically supplies env and ctx.
 * Set options.auth to inject the admin auth header.
 */
async function apiFetch(worker, path, options = {}) {
  const headers = {};
  if (options.auth) {
    headers[ADMIN_AUTH_HEADER] = typeof options.auth === "string" ? options.auth : ADMIN_EMAIL;
  }
  if (options.contentType) {
    headers["content-type"] = options.contentType;
  }

  const request = new Request(`http://localhost${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return worker.fetch(request, makeEnv(), makeCtx());
}

// ─── Public /api/notes ─────────────────────────────────────────────

test("GET /api/notes returns 200 with notes array", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/notes");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.notes), "body.notes should be an array");
});

test("GET /api/notes?after=X returns paginated results", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/notes?after=999999");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.notes), "body.notes should be an array");
});

test("GET /api/notes?limit=5 returns at most 5 notes", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/notes?limit=5");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.notes.length <= 5, `expected ≤5 notes, got ${body.notes.length}`);
});

// ─── Admin /api/admin/notes ────────────────────────────────────────

test("POST /api/admin/notes with valid body returns 201", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Test Note", content: "Hello from API test" },
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.note, "response should contain a note object");
  assert.ok(body.note.id > 0, "note should have an id");
});

test("POST /api/admin/notes without auth returns 401", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    contentType: "application/json",
    body: { title: "Unauth Note", content: "Should fail" },
  });
  assert.equal(res.status, 401);
});

test("POST /api/admin/notes with oversized body returns 413", async () => {
  const worker = await createWorker();
  // Send a request whose content-length exceeds the 1 MB limit
  const headers = {
    [ADMIN_AUTH_HEADER]: ADMIN_EMAIL,
    "content-type": "application/json",
    "content-length": "2000000",
  };
  const request = new Request("http://localhost/api/admin/notes", {
    method: "POST",
    headers,
    body: "",
  });
  const res = await worker.fetch(request, makeEnv(), makeCtx());
  assert.equal(res.status, 413);
});

test("POST /api/admin/notes with empty title returns 400", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "", content: "Has content but no title" },
  });
  assert.equal(res.status, 400);
});

test("POST /api/admin/notes with invalid status returns 400", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Bad status", content: "Content", status: "archived" },
  });
  assert.equal(res.status, 400);
});

// ─── Admin PATCH /api/admin/notes ──────────────────────────────────

test("PATCH /api/admin/notes with valid body returns 200", async () => {
  const worker = await createWorker();

  // Create a note first so we have an id to patch
  const createRes = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Patch Target", content: "Original content" },
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  const patchRes = await apiFetch(worker, "/api/admin/notes", {
    method: "PATCH",
    auth: true,
    contentType: "application/json",
    body: { id: created.note.id, title: "Patched Title", content: "Updated content" },
  });
  assert.equal(patchRes.status, 200);
  const patched = await patchRes.json();
  assert.equal(patched.note.title, "Patched Title");
});

// ─── Admin DELETE /api/admin/notes ─────────────────────────────────

test("DELETE /api/admin/notes?id=X returns 200", async () => {
  const worker = await createWorker();

  // Create a note first
  const createRes = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Delete Target", content: "To be deleted" },
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  const deleteRes = await apiFetch(worker, `/api/admin/notes?id=${created.note.id}`, {
    method: "DELETE",
    auth: true,
  });
  assert.equal(deleteRes.status, 200);
});

test("DELETE /api/admin/notes without id returns 400", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "DELETE",
    auth: true,
  });
  assert.equal(res.status, 400);
});

// ─── Admin /api/admin/site-copy ────────────────────────────────────

test("PUT /api/admin/site-copy with valid body returns 200", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/site-copy", {
    method: "PUT",
    auth: true,
    contentType: "application/json",
    body: { copy: { siteName: "Test Site", tagline: "A test site" } },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.copy, "response should contain copy");
  assert.equal(body.copy.siteName, "Test Site");
});

// ─── Public /api/site-copy ─────────────────────────────────────────

test("GET /api/site-copy returns 200", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/site-copy");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok("copy" in body, "response should have a copy field");
});

// ─── RSS and Sitemap ───────────────────────────────────────────────

test("GET /rss.xml returns 200 with application/rss+xml", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/rss.xml");
  assert.equal(res.status, 200);
  const contentType = res.headers.get("content-type") ?? "";
  assert.match(contentType, /application\/rss\+xml/i);
});

test("GET /sitemap.xml returns 200 with application/xml", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/sitemap.xml");
  assert.equal(res.status, 200);
  const contentType = res.headers.get("content-type") ?? "";
  assert.match(contentType, /application\/xml/i);
});
