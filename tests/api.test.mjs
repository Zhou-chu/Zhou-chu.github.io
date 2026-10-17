import assert from "node:assert/strict";
import test from "node:test";
import { getTestEnv } from "./support/cloudflare-workers-stub.mjs";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);

const ADMIN_AUTH_HEADER = "oai-authenticated-user-email";
const ADMIN_EMAIL = "test@example.com";

// The built worker runs with NODE_ENV=production, so admin routes require the
// email allowlist. Header-based identity is the OpenAI Sites mode (no password).
process.env.ADMIN_EMAILS = ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;

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

test("POST /api/admin/notes without auth returns 403", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    contentType: "application/json",
    body: { title: "Unauth Note", content: "Should fail" },
  });
  assert.equal(res.status, 403);
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

// ─── Security: standalone mode must ignore forgeable identity headers ──

test("standalone mode (ADMIN_PASSWORD set) rejects a forged identity header", async () => {
  const worker = await createWorker();
  process.env.ADMIN_PASSWORD = "test-password";
  try {
    const res = await apiFetch(worker, "/api/admin/notes", { auth: true });
    assert.equal(res.status, 403, "forged oai-authenticated-user-email must not grant admin access");
  } finally {
    delete process.env.ADMIN_PASSWORD;
  }
});

test("standalone mode accepts a session cookie issued by /api/admin/login", async () => {
  const worker = await createWorker();
  process.env.ADMIN_PASSWORD = "test-password";
  try {
    const wrong = await worker.fetch(new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "nope" }),
    }), makeEnv(), makeCtx());
    assert.equal(wrong.status, 401);

    const login = await worker.fetch(new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "test-password" }),
    }), makeEnv(), makeCtx());
    assert.equal(login.status, 200);
    const cookie = (login.headers.get("set-cookie") || "").split(";", 1)[0];
    assert.match(cookie, /^admin_session=/);

    const res = await worker.fetch(new Request("http://localhost/api/admin/notes", { headers: { cookie } }), makeEnv(), makeCtx());
    assert.equal(res.status, 200);
  } finally {
    delete process.env.ADMIN_PASSWORD;
  }
});

// ─── Slugs: Obsidian frontmatter slug is kept verbatim ─────────────

test("POST with explicit slug keeps it (cleaned) without a time suffix", async () => {
  const worker = await createWorker();
  const res = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Slug Keep", content: "body", slug: "Slug-Keep-ABC1", status: "published", sourcePath: "blog/slug-keep.md" },
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.note.slug, "slug-keep-abc1");
});

test("re-uploading with a slug realigns a previously suffixed slug", async () => {
  const worker = await createWorker();
  const { testDb } = await import("./support/cloudflare-workers-stub.mjs");
  const first = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Slug Realign", content: "v1", slug: "slug-realign", status: "published", sourcePath: "blog/slug-realign.md" },
  });
  const created = (await first.json()).note;
  testDb.prepare("UPDATE notes SET slug = ? WHERE id = ?").run("slug-realign-mtfvh3oh", created.id);

  const again = await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Slug Realign", content: "v2", slug: "slug-realign", status: "published", sourcePath: "blog/slug-realign.md" },
  });
  const updated = (await again.json()).note;
  assert.equal(updated.id, created.id);
  assert.equal(updated.slug, "slug-realign");
});

test("a slug owned by another note gets a suffix instead of failing", async () => {
  const worker = await createWorker();
  const post = (title, sourcePath) => apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title, content: "x", slug: "shared-slug", status: "published", sourcePath },
  });
  const a = (await (await post("Shared A", "blog/a.md")).json()).note;
  const b = (await (await post("Shared B", "blog/b.md")).json()).note;
  assert.equal(a.slug, "shared-slug");
  assert.notEqual(b.slug, "shared-slug");
  assert.match(b.slug, /^shared-slug-[0-9a-z]+$/);
});

// ─── Public pagination never leaks drafts ──────────────────────────

test("GET /api/notes pagination returns only published notes without duplicates", async () => {
  const worker = await createWorker();
  for (let i = 0; i < 3; i += 1) {
    await apiFetch(worker, "/api/admin/notes", {
      method: "POST",
      auth: true,
      contentType: "application/json",
      body: { title: `Paged Published ${i}`, content: "p", status: "published", publishedAt: `2020-01-0${i + 1}` },
    });
  }
  await apiFetch(worker, "/api/admin/notes", {
    method: "POST",
    auth: true,
    contentType: "application/json",
    body: { title: "Paged Draft", content: "secret draft", status: "draft" },
  });

  const all = (await (await apiFetch(worker, "/api/notes?limit=500")).json()).notes;
  const seen = [];
  let cursor;
  do {
    const res = await apiFetch(worker, `/api/notes?limit=1${cursor ? `&after=${cursor}` : ""}`);
    const body = await res.json();
    seen.push(...body.notes);
    cursor = body.nextCursor;
  } while (cursor);

  assert.ok(!seen.some((note) => note.title === "Paged Draft"), "drafts must never appear in public pages");
  assert.equal(new Set(seen.map((note) => note.id)).size, seen.length, "pages must not overlap");
  assert.deepEqual(new Set(seen.map((note) => note.id)), new Set(all.map((note) => note.id)), "paging must cover every published note");
});

test("sitemap lists every published note, not just the first 20", async () => {
  const worker = await createWorker();
  for (let i = 0; i < 22; i += 1) {
    await apiFetch(worker, "/api/admin/notes", {
      method: "POST",
      auth: true,
      contentType: "application/json",
      body: { title: `Sitemap Note ${i}`, content: "s", status: "published" },
    });
  }
  const published = (await (await apiFetch(worker, "/api/notes?limit=500")).json()).notes;
  const xml = await (await apiFetch(worker, "/sitemap.xml")).text();
  const locs = (xml.match(/<loc>[^<]*\/notes\//g) || []).length;
  assert.equal(locs, published.length);
  assert.ok(locs >= 22);
});
