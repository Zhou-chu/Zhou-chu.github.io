import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkdownBody } from "../../components/MarkdownBody";
import { defaultSiteCopy, type SiteCopy } from "../../lib/site-copy";
import { sampleNotes, type PublicNote } from "../../lib/sample-notes";
import { getPublishedNoteBySlug } from "../../../db/notes";
import { readSiteCopy } from "../../../db/site-copy";
import "./note.css";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

const readMinutes = (content: string) => Math.max(1, Math.ceil(content.length / 500));

async function resolveNote(slug: string): Promise<PublicNote | null> {
  const sample = sampleNotes.find((note) => note.slug === slug);
  if (sample) return sample;

  try {
    return await getPublishedNoteBySlug(slug) as PublicNote | null;
  } catch {
    return null;
  }
}

async function resolveCopy(): Promise<SiteCopy> {
  try {
    const stored = await readSiteCopy();
    if (!stored?.copyJson) return { ...defaultSiteCopy };
    return { ...defaultSiteCopy, ...JSON.parse(stored.copyJson) };
  } catch {
    return { ...defaultSiteCopy };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await resolveNote(slug);
  if (!note) return { title: "笔记未找到" };
  return { title: note.title, description: note.summary };
}

export default async function NotePage({ params }: PageProps) {
  const { slug } = await params;
  const [note, copy] = await Promise.all([resolveNote(slug), resolveCopy()]);
  if (!note) notFound();

  const related = sampleNotes.filter((item) => item.slug !== note.slug).slice(0, 3);

  return <main className="note-page">
    <header className="note-header">
      <a className="note-brand" href="/"><i>光</i><span><b>{copy.siteName}</b><small>{copy.siteCode}</small></span></a>
      <a className="note-back" href="/">← 返回笔记花园</a>
    </header>

    <article className="note-article">
      <div className="note-meta"><span>{note.category}</span><time>{note.publishedAt}</time><i>预计阅读 {readMinutes(note.content)} 分钟</i></div>
      <h1>{note.title}</h1>
      {note.summary && <p className="note-summary">{note.summary}</p>}
      <div className="note-divider"><span>正文</span></div>
      <div className="note-body"><MarkdownBody source={note.content} /></div>

      <footer className="note-end">
        <i>光</i>
        <div><b>读到这里，感谢停留。</b><span>每一次阅读，都让想法继续生长。</span></div>
        <a href="/">返回全部笔记</a>
      </footer>
    </article>

    <aside className="note-related">
      <div className="note-related-title"><span>继续漫游</span><small>RELATED NOTES</small></div>
      <div>{related.map((item) => <a key={item.slug} href={`/notes/${item.slug}`}><small>{item.category} · {item.publishedAt}</small><h2>{item.title}</h2><span>阅读笔记 ↗</span></a>)}</div>
    </aside>

    <footer className="note-site-footer"><p>{copy.footerMotto}</p><small>{copy.footerLegal}</small></footer>
  </main>;
}
