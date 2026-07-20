/**
 * Public-route test fixture helper.
 *
 * Guards: rejects any non-loopback base URL before a single write.
 * Creates uniquely prefixed published notes through the admin API,
 * stores returned IDs/slugs, and deletes only those exact IDs in `finally`.
 * Never calls batch-delete/unpublish.
 */
import type { APIRequestContext } from "@playwright/test";

// ─── Types ──────────────────────────────────────────────────────────

export interface FixtureNote {
  id: number;
  slug: string;
  title: string;
}

// ─── Loopback guard ─────────────────────────────────────────────────

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Returns a parsed URL if `urlString` points at a loopback host.
 * Throws on any non-loopback host (before a single request is sent).
 */
export function assertLoopback(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new TypeError(`Invalid base URL: ${JSON.stringify(urlString)}`);
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `Public fixture blocked: base URL hostname "${url.hostname}" is not a loopback address. ` +
        `Only ${[...LOOPBACK_HOSTS].join(", ")} are allowed.`,
    );
  }
  return url;
}

// ─── Prefix ─────────────────────────────────────────────────────────

const FIXTURE_PREFIX = `e2e-fixture-${process.pid}-${Date.now().toString(36)}`;

let seq = 0;
function nextPrefix(): string {
  seq += 1;
  return `${FIXTURE_PREFIX}-${seq}`;
}

// ─── Public fixture ─────────────────────────────────────────────────

export class PublicFixture {
  #request: APIRequestContext;
  #baseURL: string;
  #createdIds: number[] = [];

  /**
   * @param request  A Playwright APIRequestContext connected to the same origin.
   * @param baseURL  Must be a loopback URL (localhost / 127.0.0.1 / [::1]).
   */
  constructor(request: APIRequestContext, baseURL: string) {
    assertLoopback(baseURL);
    this.#request = request;
    this.#baseURL = baseURL;
  }

  // ── Read ──────────────────────────────────────────────────────────

  /** IDs created by this fixture instance. */
  get createdIds(): readonly number[] {
    return this.#createdIds;
  }

  /** Base URL (guaranteed loopback). */
  get baseURL(): string {
    return this.#baseURL;
  }

  // ── Write ─────────────────────────────────────────────────────────

  /**
   * Creates a single published note through `POST /api/admin/notes`.
   * Stores the returned ID for later cleanup.
   */
  async publishNote(opts: {
    title: string;
    content: string;
    category?: string;
    slug?: string;
    summary?: string;
  }): Promise<FixtureNote> {
    const body = {
      title: `${nextPrefix()} ${opts.title}`,
      content: opts.content,
      category: opts.category ?? "测试",
      status: "published" as const,
      summary: opts.summary ?? "",
      slug: opts.slug ?? undefined,
    };

    const res = await this.#request.post(`${this.#baseURL}/api/admin/notes`, {
      data: body,
      headers: { "content-type": "application/json" },
    });

    if (res.status() !== 201) {
      const text = await res.text();
      throw new Error(
        `Fixture note creation failed (${res.status()}): ${text.slice(0, 500)}`,
      );
    }

    const json = (await res.json()) as { note: { id: number; slug: string; title: string } };
    this.#createdIds.push(json.note.id);
    return { id: json.note.id, slug: json.note.slug, title: json.note.title };
  }

  // ── Cleanup ───────────────────────────────────────────────────────

  /**
   * Deletes every note created by this fixture instance, exactly by ID.
   * Safe to call multiple times. Does not throw — logs failures so the
   * caller can still teardown other resources.
   */
  async cleanup(): Promise<void> {
    const ids = [...this.#createdIds];
    for (const id of ids) {
      try {
        const res = await this.#request.delete(
          `${this.#baseURL}/api/admin/notes?id=${id}`,
        );
        if (res.ok()) {
          this.#createdIds = this.#createdIds.filter((i) => i !== id);
        }
      } catch {
        // Best-effort — do not prevent caller teardown.
      }
    }
  }
}
