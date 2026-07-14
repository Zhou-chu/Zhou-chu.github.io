"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleNotes, type PublicNote } from "../lib/sample-notes";
import { useSiteCopy } from "../hooks/useSiteCopy";
import "./c.css";

const readMinutes = (content: string) => Math.max(1, Math.ceil(content.length / 500));

export default function CleanHome() {
  const copy = useSiteCopy();
  const [notes, setNotes] = useState<PublicNote[]>(sampleNotes);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("全部");

  useEffect(() => {
    fetch("/api/notes", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.notes?.length) setNotes([...data.notes, ...sampleNotes]);
      })
      .catch(() => undefined);
  }, []);

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(notes.map((note) => note.category)))],
    [notes],
  );
  const filtered = useMemo(
    () => notes.filter((note) =>
      (active === "全部" || note.category === active)
      && (!query || `${note.title}${note.summary}${note.category}`.toLowerCase().includes(query.toLowerCase()))),
    [notes, active, query],
  );
  const featured = notes.filter((note) => note.featured).slice(0, 3);

  return <main className="clean-site">
    <header className="clean-header">
      <a className="clean-brand" href="/"><i>光</i><span><b>{copy.siteName}</b><small>{copy.siteCode}</small></span></a>
      <nav><a href="#notes">{copy.navNotes}</a><a href="#topics">{copy.navTopics}</a><a href="/admin">{copy.navAdmin}</a></nav>
      <div className="clean-final"><i /> FINAL EDITION</div>
    </header>

    <section className="clean-hero">
      <div><p className="clean-kicker">{copy.cKicker}</p><h1>{copy.cTitle}</h1><p className="clean-intro">{copy.cIntro}</p><label className="clean-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.cSearchPlaceholder} /><kbd>⌘ K</kbd></label></div>
      <aside><div className="clean-profile"><span>川</span><div><small>WRITTEN BY</small><b>{copy.authorName}</b><p>技术实践者与长期写作者</p></div></div><div className="clean-numbers"><span><b>{notes.length}</b>篇笔记</span><span><b>{categories.length - 1}</b>个主题</span><span><b>2026</b>开始记录</span></div><blockquote>“{copy.aTodayQuote}”</blockquote></aside>
    </section>

    <section className="clean-featured">
      <div className="clean-heading"><div><span>01</span><h2>{copy.cFeaturedTitle}</h2></div><p>CURATED NOTES</p></div>
      <div className="clean-feature-grid">{featured.map((note, index) => <a key={`${note.id}-${index}`} href={`/notes/${encodeURIComponent(note.slug)}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties} className={index === 0 ? "primary" : ""}><div className="note-card-meta"><small>{note.category}</small><time>{note.publishedAt} · {readMinutes(note.content)} 分钟</time></div><h3>{note.title}</h3><p>{note.summary}</p><span>阅读笔记 <i>↗</i></span></a>)}</div>
    </section>

    <section className="clean-layout" id="notes">
      <div className="clean-notes"><div className="clean-heading"><div><span>02</span><h2>{copy.cRecentTitle}</h2></div><p>{filtered.length} NOTES</p></div><div className="clean-list">{filtered.map((note, index) => <a key={`${note.id}-${index}`} href={`/notes/${encodeURIComponent(note.slug)}`} style={{ "--delay": `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}><span className="list-index">{String(index + 1).padStart(2, "0")}</span><time>{note.publishedAt.slice(5).replace("-", ".")}</time><div><small>{note.category} · 预计 {readMinutes(note.content)} 分钟</small><h3>{note.title}</h3><p>{note.summary}</p></div><span className="list-arrow">↗</span></a>)}</div></div>
      <aside className="clean-aside" id="topics"><div><p className="aside-label">{copy.cBrowseTitle}</p><div className="clean-tags">{categories.map((category) => <button key={category} className={active === category ? "active" : ""} onClick={() => setActive(category)}>{category}<sup>{category === "全部" ? notes.length : notes.filter((note) => note.category === category).length}</sup></button>)}</div></div><div className="garden-card"><span>◌</span><p>{copy.cAsideTitle}</p><b>{copy.cAsideText}</b><a href="/admin">写一篇新笔记 ↗</a></div></aside>
    </section>

    <footer className="clean-footer"><div><b>{copy.siteName}</b><span>{copy.siteCode}</span></div><p>{copy.footerMotto}</p><small>{copy.footerLegal}</small></footer>
  </main>;
}
