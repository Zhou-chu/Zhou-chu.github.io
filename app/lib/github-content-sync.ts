type GitHubNote = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  status: "draft" | "published";
  featured: number | boolean;
  publishedAt: string | null;
  sourcePath: string | null;
  linksJson: string;
  tagsJson: string;
};

export type GitHubSyncResult = {
  ok: boolean;
  configured: boolean;
  action: "created" | "updated" | "deleted" | "unchanged" | "skipped";
  message?: string;
};

const DEFAULT_REPOSITORY = "Zhou-chu/Zhou-chu.github.io";
const DEFAULT_BRANCH = "main";

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function publicSourcePath(note: Pick<GitHubNote, "sourcePath" | "slug">): string {
  const candidate = (note.sourcePath || `blog/${note.slug}.md`).replaceAll("\\", "/").replace(/^\/+/, "");
  if (!candidate || candidate.split("/").includes("..") || /^[a-z]:/i.test(candidate)) {
    throw new Error("笔记来源路径不安全");
  }
  return /\.(?:md|markdown)$/i.test(candidate) ? candidate : `${candidate}.md`;
}

export function serializePublicNote(note: GitHubNote): string {
  const tags = parseStringArray(note.tagsJson);
  const outgoing = parseStringArray(note.linksJson);
  const lines = [
    "---",
    "blog: true",
    `title: ${yamlString(note.title)}`,
    `slug: ${yamlString(note.slug)}`,
    `summary: ${yamlString(note.summary)}`,
    `date: ${note.publishedAt || new Date().toISOString().slice(0, 10)}`,
    `category: ${yamlString(note.category)}`,
    `featured: ${note.featured ? "true" : "false"}`,
  ];
  if (tags.length) {
    lines.push("tags:");
    for (const tag of tags) lines.push(`  - ${yamlString(tag)}`);
  }
  if (outgoing.length) {
    lines.push("outgoing:");
    for (const slug of outgoing) lines.push(`  - ${yamlString(slug)}`);
  }
  lines.push("---", "", note.content.trim(), "");
  return lines.join("\n");
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function encodedContentPath(sourcePath: string): string {
  return `content/notes/${sourcePath}`.split("/").map(encodeURIComponent).join("/");
}

function githubSettings() {
  return {
    token: process.env.GITHUB_CONTENT_TOKEN || "",
    repository: process.env.GITHUB_CONTENT_REPO || DEFAULT_REPOSITORY,
    branch: process.env.GITHUB_CONTENT_BRANCH || DEFAULT_BRANCH,
  };
}

async function githubRequest(url: string, init: RequestInit): Promise<Response> {
  const settings = githubSettings();
  return fetch(url, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${settings.token}`,
      "content-type": "application/json",
      "user-agent": "gm-2-blog-content-sync",
      "x-github-api-version": "2022-11-28",
      ...init.headers,
    },
  });
}

async function currentFile(pathname: string): Promise<{ sha: string; content: string } | null> {
  const settings = githubSettings();
  const url = `https://api.github.com/repos/${settings.repository}/contents/${encodedContentPath(pathname)}?ref=${encodeURIComponent(settings.branch)}`;
  const response = await githubRequest(url, { method: "GET" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub 读取失败（HTTP ${response.status}）`);
  const data = await response.json() as { sha?: string; content?: string; encoding?: string };
  if (!data.sha) throw new Error("GitHub 返回的文件信息不完整");
  return { sha: data.sha, content: (data.content || "").replaceAll("\n", "") };
}

async function syncConfiguredNote(note: GitHubNote): Promise<GitHubSyncResult> {
  const settings = githubSettings();
  const pathname = publicSourcePath(note);
  const existing = await currentFile(pathname);

  if (note.status !== "published") {
    if (!existing) return { ok: true, configured: true, action: "unchanged" };
    const url = `https://api.github.com/repos/${settings.repository}/contents/${encodedContentPath(pathname)}`;
    const response = await githubRequest(url, {
      method: "DELETE",
      body: JSON.stringify({
        message: `content: unpublish ${note.title}`,
        sha: existing.sha,
        branch: settings.branch,
      }),
    });
    if (!response.ok) throw new Error(`GitHub 删除失败（HTTP ${response.status}）`);
    return { ok: true, configured: true, action: "deleted" };
  }

  const markdown = serializePublicNote(note);
  const encoded = encodeUtf8Base64(markdown);
  if (existing?.content === encoded) return { ok: true, configured: true, action: "unchanged" };
  const url = `https://api.github.com/repos/${settings.repository}/contents/${encodedContentPath(pathname)}`;
  const response = await githubRequest(url, {
    method: "PUT",
    body: JSON.stringify({
      message: `content: ${existing ? "update" : "publish"} ${note.title}`,
      content: encoded,
      branch: settings.branch,
      ...(existing ? { sha: existing.sha } : {}),
    }),
  });
  if (!response.ok) throw new Error(`GitHub 写入失败（HTTP ${response.status}）`);
  return { ok: true, configured: true, action: existing ? "updated" : "created" };
}

export async function syncNoteToGitHub(note: GitHubNote): Promise<GitHubSyncResult> {
  if (!githubSettings().token) {
    return { ok: true, configured: false, action: "skipped", message: "尚未配置 GitHub 内容令牌" };
  }
  try {
    return await syncConfiguredNote(note);
  } catch (error) {
    return {
      ok: false,
      configured: true,
      action: "skipped",
      message: error instanceof Error ? error.message : "GitHub 同步失败",
    };
  }
}

export async function syncManyNotesToGitHub(notes: GitHubNote[]): Promise<GitHubSyncResult> {
  if (!notes.length) return { ok: true, configured: Boolean(githubSettings().token), action: "unchanged" };
  let lastAction: GitHubSyncResult["action"] = "unchanged";
  for (const note of notes) {
    const result = await syncNoteToGitHub(note);
    if (!result.ok || !result.configured) return result;
    if (result.action !== "unchanged") lastAction = result.action;
  }
  return { ok: true, configured: true, action: lastAction };
}
