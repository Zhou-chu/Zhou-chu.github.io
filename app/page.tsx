import Link from "next/link";
import type { Metadata } from "next";
import { defaultSiteCopy, type SiteCopy } from "./lib/site-copy";
import { listPublicNoteIndex } from "./lib/public-note-index";
import {
  aggregateCategoryCounts,
  normalizeDisplayDate,
  type PublicNoteIndexEntry,
} from "./lib/public-note-model";

// ─── Metadata ──────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "浮光笔记",
  description: "在喧嚣里，打捞思想的微光。收录关于技术、阅读、写作与生活的长期笔记。",
  alternates: {
    canonical: "https://fuguang-notes.zhouc6301.chatgpt.site",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

/** Format YYYY-MM-DD as MM.DD for display. */
function fmtDate(ymd: string): string {
  return ymd.slice(5).replace("-", ".");
}

// ─── Page ─────────────────────────────────────────────────────────────

export default async function HomePage() {
  // ── Site copy (fallback-chain: DB → defaults) ─────────────────────
  // readSiteCopy is a server-only import — fine for an async server component.
  let copy: SiteCopy = { ...defaultSiteCopy };
  try {
    const { readSiteCopy } = await import("../db/site-copy");
    const row = await readSiteCopy();
    if (row?.copyJson) {
      const stored = JSON.parse(row.copyJson) as Partial<SiteCopy>;
      // Merge stored overrides into the frozen defaults.
      const merged = { ...defaultSiteCopy } as Record<string, string>;
      for (const key of Object.keys(defaultSiteCopy)) {
        const storedValue = (stored as Record<string, unknown>)[key];
        if (typeof storedValue === "string") merged[key] = storedValue;
      }
      copy = merged as unknown as SiteCopy;
    }
  } catch {
    // DB unavailable — use compiled defaults.
  }

  // ── Published note index (metadata only) ───────────────────────────
  let entries: readonly PublicNoteIndexEntry[] = [];
  try {
    entries = await listPublicNoteIndex();
  } catch {
    // DB unavailable — empty ledger below.
  }

  const recent = entries.slice(0, 5);
  const categoryCounts = aggregateCategoryCounts(entries);
  const totalNotes = entries.length;

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="home-kicker"><span aria-hidden="true" />{copy.cKicker}</p>
          <h1 id="home-title" className="home-intro__heading">{copy.cTitle}</h1>
          <p className="home-intro__body">{copy.cIntro}</p>
          <div className="home-hero__actions">
            <Link className="home-primary-link" href="/archive">
              漫游全部笔记 <span aria-hidden="true">↗</span>
            </Link>
            <a className="home-text-link" href="#recent">从最近更新开始</a>
          </div>
          <dl className="home-stats" aria-label="站点概览">
            <div><dt>{totalNotes || "—"}</dt><dd>篇公开笔记</dd></div>
            <div><dt>{categoryCounts.length || "—"}</dt><dd>个长期主题</dd></div>
            <div><dt>2026</dt><dd>持续生长中</dd></div>
          </dl>
        </div>

        <aside className="home-hero__visual" aria-label="站点主题">
          <div className="home-cabinet-card">
            <p>THE READING CABINET</p>
            <div className="home-cabinet-card__rings" aria-hidden="true"><span /><span /><span /></div>
            <strong>林间书柜</strong>
            <span>技术 · 阅读 · 写作 · 生活</span>
            <small>OPEN THE CABINET<br />AND FOLLOW A THOUGHT</small>
            <div className="home-hero__seal" aria-hidden="true">浮<br />光</div>
          </div>
          <p className="home-hero__credit">一隅木色，留给缓慢生长的念头。</p>
        </aside>
      </section>

      <section className="home-content" id="recent">
        <div className="home-section-heading">
          <p>RECENT NOTES</p>
          <h2>{copy.cRecentTitle}</h2>
          <span>沿着新留下的墨迹，继续往里走。</span>
        </div>

        <div className="home-ledger">

          {recent.length === 0 ? (
            <p className="home-ledger__empty">尚无公开笔记。第一条记录发布后，会在这里悄悄长出来。</p>
          ) : (
            <ol className="home-ledger__list">
              {recent.map((entry) => {
                const date = normalizeDisplayDate(entry);
                return (
                  <li key={entry.id} className="home-ledger__row">
                    <Link
                      href={`/notes/${encodeURIComponent(entry.slug)}`}
                      className="home-ledger__link"
                    >
                      <span className="home-ledger__title">{entry.title}</span>
                      <span className="home-ledger__category">
                        {entry.category || "未分类"}
                      </span>
                      <time className="home-ledger__date" dateTime={date}>{fmtDate(date)}</time>
                      <span className="home-ledger__arrow" aria-hidden="true">↗</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <Link href="/archive" className="home-ledger__more">查看完整归档 <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="home-research" id="research">
        <div className="home-research__intro">
          <p>GROWING THREADS</p>
          <h2 className="home-research__heading">{copy.cBrowseTitle}</h2>
          <span>{copy.cAsideText}</span>
        </div>
        {categoryCounts.length > 0 ? (
          <div className="home-research__grid">
            {categoryCounts.map(({ category, count }, index) => (
              <Link key={category} className="home-research__tile" href={`/archive?material=${encodeURIComponent(category)}`}>
                <span className="home-research__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="home-research__label">{category}</span>
                <span className="home-research__count">{count} 篇</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-research__empty">主题会随着写作慢慢生长。</div>
        )}
      </section>

      <aside className="home-quote">
        <span className="home-quote__leaf" aria-hidden="true">⌁</span>
        <blockquote>“{copy.footerMotto}”</blockquote>
        <p>— {copy.authorName}</p>
      </aside>
    </div>
  );
}
