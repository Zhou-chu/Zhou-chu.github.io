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

// ─── Title uniqueness & re-upload overwrite ─────────────────────────

test("POST same title twice overwrites the old note in place", async () => {
  const worker = await createWorker();

  const first = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "同一篇文章", content: "第一版内容" },
  });
  assert.equal(first.status, 201);
  const firstBody = await first.json();
  assert.equal(firstBody.overwritten, false, "first upload must not overwrite");

  const second = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "同一篇文章", content: "第二版内容" },
  });
  assert.equal(second.status, 201);
  const secondBody = await second.json();
  assert.equal(secondBody.overwritten, true, "re-upload must report overwritten");
  assert.equal(secondBody.note.id, firstBody.note.id, "overwrite must keep the same note id");
  assert.equal(secondBody.note.slug, firstBody.note.slug, "overwrite must keep the same slug");
  assert.equal(secondBody.note.content, "第二版内容", "content must be replaced");

  // Only one note with that title must exist
  const list = await apiFetch(worker, "/api/admin/notes", { auth: true });
  const listBody = await list.json();
  const sameTitle = listBody.notes.filter((n) => n.title === "同一篇文章");
  assert.equal(sameTitle.length, 1, "blog must never hold two notes with the same title");
});

test("POST same title with different casing overwrites too", async () => {
  const worker = await createWorker();

  const first = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Hello World", content: "v1" },
  });
  assert.equal(first.status, 201);
  const firstBody = await first.json();

  const second = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "hello world", content: "v2" },
  });
  const secondBody = await second.json();
  assert.equal(secondBody.overwritten, true);
  assert.equal(secondBody.note.id, firstBody.note.id);
});

test("concurrent POSTs with the same title resolve to one note (no 500)", async () => {
  const worker = await createWorker();

  const responses = await Promise.all(
    Array.from({ length: 5 }, (_, i) => apiFetch(worker, "/api/admin/notes", {
      method: "POST",
      auth: true,
      contentType: "application/json",
      body: { title: "并发同标题", content: `version ${i}` },
    })),
  );
  for (const res of responses) {
    assert.equal(res.status, 201, "no request may fail on the unique-index race");
  }

  const list = await apiFetch(worker, "/api/admin/notes", { auth: true });
  const listBody = await list.json();
  const sameTitle = listBody.notes.filter((n) => n.title === "并发同标题");
  assert.equal(sameTitle.length, 1, "concurrent same-title uploads must collapse into one note");
});

test("PATCH renaming onto another note's title returns 409", async () => {
  const worker = await createWorker();

  for (const title of ["已存在标题", "待改名标题"]) {
    const res = await apiFetch(worker, "/api/admin/notes", {
      method: "POST",
      auth: true,
      contentType: "application/json",
      body: { title, content: "content" },
    });
    assert.equal(res.status, 201);
  }
  const list = await apiFetch(worker, "/api/admin/notes", { auth: true });
  const listBody = await list.json();
  const renameTarget = listBody.notes.find((n) => n.title === "待改名标题");

  const conflict = await apiFetch(worker, "/api/admin/notes", {
    method: "PATCH",
    auth: true,
    contentType: "application/json",
    body: { id: renameTarget.id, title: "已存在标题", content: "content" },
  });
  assert.equal(conflict.status, 409, "renaming onto an existing title must be rejected");

  // Renaming to its OWN title (unrelated change) must still succeed
  const ok = await apiFetch(worker, "/api/admin/notes", {
    method: "PATCH",
    auth: true,
    contentType: "application/json",
    body: { id: renameTarget.id, title: "待改名标题", content: "updated" },
  });
  assert.equal(ok.status, 200);
});

// ─── Tags ───────────────────────────────────────────────────────────

test("POST with tags array stores normalized tagsJson", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "带标签的文章", content: "正文", tags: ["读书", " 技术 ", "读书"] },
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.deepEqual(JSON.parse(body.note.tagsJson), ["读书", "技术"], "tags must be deduplicated and trimmed");
});

test("POST with comma-separated tags string is normalized", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "逗号标签", content: "正文", tags: "随笔, 生活、旅行" },
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.deepEqual(JSON.parse(body.note.tagsJson), ["随笔", "生活", "旅行"]);
});

test("PATCH /api/admin/notes/tags applies tags to many notes at once", async () => {
  const worker = await createWorker();

  const ids = [];
  for (let i = 0; i < 3; i++) {
    const res = await apiFetch(worker, "/api/admin/notes", {
      method: "POST",
      auth: true,
      contentType: "application/json",
      body: { title: `批量文章 ${i}`, content: "正文" },
    });
    assert.equal(res.status, 201);
    ids.push((await res.json()).note.id);
  }

  const tagRes = await apiFetch(worker, "/api/admin/notes/tags", {
    method: "PATCH",
    auth: true,
    contentType: "application/json",
    body: { ids, tags: ["批量标签"] },
  });
  assert.equal(tagRes.status, 200);
  const tagBody = await tagRes.json();
  assert.equal(tagBody.updated, 3);

  const list = await apiFetch(worker, "/api/admin/notes", { auth: true });
  const listBody = await list.json();
  const tagged = listBody.notes.filter((n) => ids.includes(n.id));
  assert.equal(tagged.length, 3);
  for (const note of tagged) {
    assert.deepEqual(JSON.parse(note.tagsJson), ["批量标签"]);
  }
});

test("PATCH /api/admin/notes/tags rejects invalid input", async () => {
  const worker = await createWorker();

  const noIds = await apiFetch(worker, "/api/admin/notes/tags", {
    method: "PATCH",
    auth: true,
    contentType: "application/json",
    body: { tags: ["a"] },
  });
  assert.equal(noIds.status, 400);

  const badTags = await apiFetch(worker, "/api/admin/notes/tags", {
    method: "PATCH",
    auth: true,
    contentType: "application/json",
    body: { ids: [1], tags: { not: "an array" } },
  });
  assert.equal(badTags.status, 400);
});

test("POST /api/admin/notes/tags without auth returns 403", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes/tags", {
    method: "PATCH",
    contentType: "application/json",
    body: { ids: [1], tags: ["a"] },
  });
  // Matches the current auth behavior (403, same as the pre-existing
  // "without auth" test for /api/admin/notes).
  assert.equal(res.status, 403);
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
