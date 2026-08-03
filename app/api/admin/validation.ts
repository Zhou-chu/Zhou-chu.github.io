import type { NoteInput } from "../../../db/notes";

/**
 * Normalize a tags value (string[] or comma/、-separated string) into a
 * deduplicated JSON array string. Returns null when the input is invalid.
 */
export function normalizeTags(value: unknown): { ok: true; json: string } | { ok: false; error: string } {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
  if (!raw) return { ok: false, error: "标签格式无效" };

  const tags = [...new Set(
    raw
      .map((item) => String(item).replace(/[\[\]'"]/g, ""))
      .join(",")
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  )];

  if (tags.length > 50) return { ok: false, error: "标签最多 50 个" };
  for (const tag of tags) {
    if (tag.length > 50) return { ok: false, error: `标签「${tag}」限 50 字符` };
  }
  return { ok: true, json: JSON.stringify(tags) };
}

/** Check request body size from content-length header. */
export function checkBodySize(
  request: Request,
  maxBytes: number
): { ok: true } | { ok: false; error: string; status: number } {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > maxBytes) {
      return { ok: false, error: "请求体过大", status: 413 };
    }
  }
  return { ok: true };
}

/** Validate note input fields and return typed data or a structured error. */
export function validateNoteInput(
  body: unknown
): { valid: true; data: NoteInput } | { valid: false; error: string; status: number } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "请求体无效", status: 400 };
  }

  const input = body as Record<string, unknown>;

  // title: required, 1-500 chars
  if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.trim().length > 500) {
    return { valid: false, error: "标题需 1-500 字符", status: 400 };
  }

  // content: required, 1-500_000 chars
  if (typeof input.content !== "string" || input.content.trim().length < 1 || input.content.trim().length > 500_000) {
    return { valid: false, error: "正文需 1-250000 字符", status: 400 };
  }

  // summary: optional, max 1000 chars
  if (input.summary !== undefined && input.summary !== null) {
    if (typeof input.summary !== "string" || input.summary.length > 1000) {
      return { valid: false, error: "摘要限 1000 字符以内", status: 400 };
    }
  }

  // category: optional, max 50 chars
  if (input.category !== undefined && input.category !== null) {
    if (typeof input.category !== "string" || input.category.length > 50) {
      return { valid: false, error: "分类限 50 字符", status: 400 };
    }
  }

  // status: must be "draft" or "published"
  if (input.status !== undefined && input.status !== null) {
    if (input.status !== "draft" && input.status !== "published") {
      return { valid: false, error: "状态仅可为 draft 或 published", status: 400 };
    }
  }

  // publishedAt: if present, must match YYYY-MM-DD regex
  if (input.publishedAt !== undefined && input.publishedAt !== null) {
    if (typeof input.publishedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.publishedAt)) {
      return { valid: false, error: "发布日期格式需为 YYYY-MM-DD", status: 400 };
    }
  }

  // slug: if present, must not contain "/" or ".."
  if (input.slug !== undefined && input.slug !== null) {
    if (typeof input.slug !== "string" || input.slug.includes("/") || input.slug.includes("..")) {
      return { valid: false, error: "slug 不可包含路径符号", status: 400 };
    }
  }

  // tags: optional; array or comma-separated string → JSON array string
  let tagsJson: string | undefined;
  if (input.tags !== undefined && input.tags !== null) {
    const normalized = normalizeTags(input.tags);
    if (!normalized.ok) return { valid: false, error: normalized.error, status: 400 };
    tagsJson = normalized.json;
  }

  return {
    valid: true,
    data: {
      title: input.title.trim(),
      slug: typeof input.slug === "string" ? input.slug : undefined,
      summary: typeof input.summary === "string" ? input.summary : undefined,
      content: input.content.trim(),
      category: typeof input.category === "string" ? input.category : undefined,
      status: input.status as "draft" | "published" | undefined,
      featured: typeof input.featured === "boolean" ? input.featured : undefined,
      publishedAt: typeof input.publishedAt === "string" ? input.publishedAt : null,
      linksJson: typeof input.links_json === "string" ? input.links_json : undefined,
      tagsJson,
    },
  };
}
