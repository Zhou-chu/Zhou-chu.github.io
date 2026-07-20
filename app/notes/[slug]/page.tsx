import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { MarkdownBody } from "../../components/MarkdownBody";
import type { PublicNote } from "../../lib/sample-notes";
import { getDb } from "../../../db/index";
import { notes } from "../../../db/schema";
import { getPublishedNoteBySlug } from "../../../db/notes";
import { ArticleToc } from "../../components/ArticleToc";
import "./note.css";
import "./obsidian.css";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

function noteMinutes(note: PublicNote): number {
  return note.readMinutes || Math.max(1, Math.ceil(note.content.length / 500));
}

async function resolveBacklinks(
  targetSlug: string,
): Promise<Array<{ slug: string; title: string }>> {
  try {
    const db = getDb();
    const results = await db
      .select({ slug: notes.slug, title: notes.title })
      .from(notes)
      .where(
        and(
          eq(notes.status, "published"),
          sql`${notes.linksJson} LIKE '%"' || ${targetSlug} || '"%'`,
        ),
      )
      .limit(10)
      .all();
    return results.filter((r) => r.slug !== targetSlug);
  } catch {
    return [];
  }
}

async function resolveWikilinksInContent(content: string): Promise<string> {
  try {
    const db = getDb();
    const allNotes = await db
      .select({ slug: notes.slug, title: notes.title })
      .from(notes)
      .where(eq(notes.status, "published"))
      .all();

    const titleToSlug = new Map<string, string>();
    for (const n of allNotes) {
      titleToSlug.set(n.title.toLowerCase().trim(), n.slug);
    }

    return content.replace(
      /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
      (_match, title: string, alias?: string) => {
        const resolvedSlug = titleToSlug.get(title.trim().toLowerCase());
        if (resolvedSlug) {
          return `[${alias?.trim() || title.trim()}](/notes/${resolvedSlug})`;
        }
        return alias?.trim() || title.trim();
      },
    );
  } catch {
    return content;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const note = (await getPublishedNoteBySlug(slug)) as PublicNote | null;
    if (!note) return { title: "笔记未找到" };
    return {
      title: note.title,
      description: note.summary,
      alternates: {
        canonical: `https://fuguang-notes.zhouc6301.chatgpt.site/notes/${encodeURIComponent(slug)}`,
      },
    };
  } catch {
    return { title: "笔记未找到" };
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type RelatedRow = {
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  publishedAt: string;
};

export default async function NotePage({ params }: PageProps) {
  const { slug } = await params;

  // ═══════════════════════════════════════════════════════════════════
  // CRITICAL: getPublishedNoteBySlug is NOT wrapped in try/catch.
  // DB failures propagate to Next.js error boundary → 500 error UI.
  // Only a genuinely absent slug (null return) triggers notFound().
  // (DESIGN.md §6.4: error boundary for genuine failures, 404 only
  // for missing slugs.)
  // ═══════════════════════════════════════════════════════════════════
  const note = (await getPublishedNoteBySlug(slug)) as PublicNote | null;
  if (!note) notFound();

  const [backlinks, resolvedContent] = await Promise.all([
    resolveBacklinks(slug),
    resolveWikilinksInContent(note.content),
  ]);

  // Related notes — same category, excluding current note.
  // Non-critical: wraps in try/catch silently since related content
  // is supplementary (the note itself already resolved).
  let relatedRows: RelatedRow[] = [];
  try {
    const db = getDb();
    relatedRows = await db
      .select({
        slug: notes.slug,
        title: notes.title,
        summary: notes.summary,
        category: notes.category,
        publishedAt: notes.publishedAt,
      })
      .from(notes)
      .where(
        and(
          eq(notes.status, "published"),
          eq(notes.category, note.category),
          sql`${notes.slug} != ${note.slug}`,
        ),
      )
      .orderBy(desc(notes.publishedAt))
      .limit(3)
      .all();
  } catch {
    // Related notes are supplementary — silent fallback to empty array
  }

  const minutes = noteMinutes(note);

  return (
    <div className="note-page">
      <div className="note-article-wrapper">
        {/* ── Article body ── */}
        <article className="note-article" aria-labelledby="note-title">
          {/* ── Ruler: metadata tick strip (DESIGN.md §5.11) ── */}
          <div className="note-ruler">
            <span className="note-ruler__category">{note.category}</span>
            <span className="note-ruler__tick" aria-hidden="true" />
            <time className="note-ruler__date" dateTime={note.publishedAt}>
              {formatDate(note.publishedAt)}
            </time>
            <span className="note-ruler__tick" aria-hidden="true" />
            <span className="note-ruler__readtime">
              阅读约 {minutes} 分钟
            </span>
          </div>

          {/* ── Title ── */}
          <h1 id="note-title" className="note-title">
            {note.title}
          </h1>

          {/* ── Summary ── */}
          {note.summary && (
            <p className="note-summary">{note.summary}</p>
          )}

          {/* ── Obsidian source path (preserved behavior) ── */}
          {note.sourcePath && (
            <p className="note-source-path">
              OBSIDIAN · {note.sourcePath}
            </p>
          )}

          {/* ── Reading body ── */}
          <div className="note-body">
            <MarkdownBody source={resolvedContent} headingIds />
          </div>

          {/* ── Article end marker ── */}
          <div className="note-end-mark" aria-hidden="true">
            <span className="note-end-mark__line" />
            <span className="note-end-mark__symbol">光</span>
            <span className="note-end-mark__line" />
          </div>
        </article>

        {/* ── TOC: desktop rail, mobile drawer (DESIGN.md §5.13) ── */}
        <ArticleToc />
      </div>

      {/* ── Backlinks: hairline ledger rows (DESIGN.md §5.12) ── */}
      {backlinks.length > 0 && (
        <section className="note-backlinks">
          <h2 className="note-section-title">
            <span>反向链接</span>
            <small>BACKLINKS</small>
          </h2>
          <div className="note-ledger">
            {backlinks.map((b) => (
              <a
                key={b.slug}
                href={`/notes/${encodeURIComponent(b.slug)}`}
                className="note-ledger__row"
              >
                <span className="note-ledger__title">{b.title}</span>
                <span className="note-ledger__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Related: hairline ledger rows ── */}
      {relatedRows.length > 0 && (
        <aside className="note-related">
          <h2 className="note-section-title">
            <span>继续漫游</span>
            <small>RELATED</small>
          </h2>
          <div className="note-ledger">
            {relatedRows.map((item) => (
              <a
                key={item.slug}
                href={`/notes/${encodeURIComponent(item.slug)}`}
                className="note-ledger__row note-ledger__row--related"
              >
                <small className="note-ledger__meta">
                  {item.category} · {item.publishedAt}
                </small>
                <span className="note-ledger__title">{item.title}</span>
                <span className="note-ledger__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
