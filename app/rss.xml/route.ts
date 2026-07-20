import { listPublishedNotes } from "../../db/notes";
import { readSiteCopy } from "../../db/site-copy";
import { defaultSiteCopy } from "../lib/site-copy";

export const dynamic = "force-dynamic";

const SITE_URL = "https://fuguang-notes.zhouc6301.chatgpt.site";

function toRFC822Date(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toUTCString();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function getSiteName(): Promise<string> {
  try {
    const stored = await readSiteCopy();
    if (stored?.copyJson) {
      const copy = JSON.parse(stored.copyJson);
      if (copy.siteName) return copy.siteName;
    }
  } catch { /* ignore */ }
  return defaultSiteCopy.siteName;
}

export async function GET() {
  try {
    const [result, siteName] = await Promise.all([
      listPublishedNotes(),
      getSiteName(),
    ]);

    const notes = (result as Array<Record<string, unknown>>).slice(0, 50);

    const buildDate = toRFC822Date(new Date().toISOString().slice(0, 10));

    const items = notes.map((note) => {
      const title = escapeXml(String(note.title ?? ""));
      const slug = escapeXml(String(note.slug ?? ""));
      const summary = escapeXml(String(note.summary ?? ""));
      const publishedAt = typeof note.publishedAt === "string" ? note.publishedAt : "";
      const pubDate = publishedAt ? toRFC822Date(publishedAt) : buildDate;

      return [
        "    <item>",
        `      <title>${title}</title>`,
        `      <link>${SITE_URL}/notes/${slug}</link>`,
        `      <description>${summary}</description>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <guid isPermaLink="true">${SITE_URL}/notes/${slug}</guid>`,
        "    </item>",
      ].join("\n");
    }).join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      "  <channel>",
      `    <title>${escapeXml(siteName)}</title>`,
      `    <link>${SITE_URL}</link>`,
      `    <description>${escapeXml(siteName)} - 在喧嚣里，打捞思想的微光。</description>`,
      `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`,
      `    <lastBuildDate>${buildDate}</lastBuildDate>`,
      items,
      "  </channel>",
      "</rss>",
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 },
    );
  }
}
