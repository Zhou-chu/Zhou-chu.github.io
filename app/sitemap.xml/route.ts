import { listPublishedNotes } from "../../db/notes";

export const dynamic = "force-dynamic";

const SITE_URL = "https://fuguang-notes.zhouc6301.chatgpt.site";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  try {
    const result = await listPublishedNotes();
    const notes = result as Array<Record<string, unknown>>;

    const noteUrls = notes.map((note) => {
      const slug = escapeXml(String(note.slug ?? ""));
      const publishedAt = typeof note.publishedAt === "string" ? note.publishedAt : "";

      const parts = [
        "  <url>",
        `    <loc>${SITE_URL}/notes/${slug}</loc>`,
      ];
      if (publishedAt) {
        parts.push(`    <lastmod>${publishedAt}</lastmod>`);
      }
      parts.push(
        "    <changefreq>monthly</changefreq>",
        "    <priority>0.7</priority>",
        "  </url>",
      );
      return parts.join("\n");
    }).join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      "  <url>",
      `    <loc>${SITE_URL}/</loc>`,
      "    <changefreq>daily</changefreq>",
      "    <priority>1.0</priority>",
      "  </url>",
      "  <url>",
      `    <loc>${SITE_URL}/archive</loc>`,
      "    <changefreq>daily</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
      noteUrls,
      "</urlset>",
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 },
    );
  }
}
