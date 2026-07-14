"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownBody } from "../components/MarkdownBody";
import { useSiteCopy } from "../hooks/useSiteCopy";
import "./c.css";

type CleanNote = { id: string | number; title: string; summary: string; content: string; category: string; publishedAt: string; featured?: number | boolean };

const samples: CleanNote[] = [
  { id: "c1", title: "把复杂系统讲清楚：我的技术写作方法", summary: "从混乱草稿走向清晰文章的可复用流程，以及三个自检问题。", category: "写作", publishedAt: "2026-07-08", featured: true, content: "# 把复杂系统讲清楚\n\n技术写作不是把知道的全部倒出来，而是替读者设计一条阻力足够小的理解路径。\n\n## 先找到文章的唯一任务\n\n动笔前，先问读者读完后应该能够做什么。\n\n> 清晰不是信息更少，而是每条信息都出现在恰当的位置。" },
  { id: "c2", title: "构建第二大脑：从收集到创造", summary: "让旧想法在正确时刻，重新进入新的工作与创造。", category: "方法", publishedAt: "2026-06-26", featured: true, content: "# 构建第二大脑\n\n真正有用的第二大脑，不是一座资料仓库，而是一套让旧想法持续参与新工作的机制。" },
  { id: "c3", title: "React 状态设计的三个朴素原则", summary: "减少重复状态，让数据来源保持唯一。", category: "技术", publishedAt: "2026-06-03", content: "# React 状态设计\n\n能计算出来的数据，就不要重复保存。" },
  { id: "c4", title: "在日常里保留无用之用", summary: "散步、发呆与漫无目的的阅读。", category: "随想", publishedAt: "2026-06-12", content: "# 无用之用\n\n有些时间看起来没有产出，却在恢复我们感知世界的能力。" },
  { id: "c5", title: "读完一本书后，我会留下什么", summary: "一份轻量但可持续的读书笔记模板。", category: "阅读", publishedAt: "2026-05-18", content: "# 读完一本书后\n\n读书笔记不是缩短版原书，而是一次与作者观点的真实交锋。" },
];

export default function CleanHome() {
  const copy = useSiteCopy();
  const [notes, setNotes] = useState<CleanNote[]>(samples);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("全部");
  const [selected, setSelected] = useState<CleanNote | null>(null);

  useEffect(() => { fetch("/api/notes", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.notes?.length) setNotes([...data.notes, ...samples]); }).catch(() => undefined); }, []);
  const categories = useMemo(() => ["全部", ...Array.from(new Set(notes.map((note) => note.category)))], [notes]);
  const filtered = useMemo(() => notes.filter((note) => (active === "全部" || note.category === active) && (!query || `${note.title}${note.summary}${note.category}`.toLowerCase().includes(query.toLowerCase()))), [notes, active, query]);
  const featured = notes.filter((note) => note.featured).slice(0, 3);

  return <main className="clean-site">
    <header className="clean-header"><a className="clean-brand" href="/c"><i>光</i><span><b>{copy.siteName}</b><small>{copy.siteCode}</small></span></a><nav><a href="#notes">{copy.navNotes}</a><a href="#topics">{copy.navTopics}</a><a href="/admin">{copy.navAdmin}</a></nav><div className="clean-switch"><a href="/">{copy.navCompareA}</a><a href="/b">{copy.navCompareB}</a><span>{copy.navCompareC}</span></div></header>

    <section className="clean-hero">
      <div><p className="clean-kicker">{copy.cKicker}</p><h1>{copy.cTitle}</h1><p className="clean-intro">{copy.cIntro}</p><label className="clean-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.cSearchPlaceholder} /><kbd>⌘ K</kbd></label></div>
      <aside><div className="clean-profile"><span>川</span><div><small>WRITTEN BY</small><b>{copy.authorName}</b><p>技术实践者与长期写作者</p></div></div><div className="clean-numbers"><span><b>{notes.length}</b>篇笔记</span><span><b>{categories.length - 1}</b>个主题</span><span><b>2026</b>开始记录</span></div><blockquote>“{copy.aTodayQuote}”</blockquote></aside>
    </section>

    <section className="clean-featured"><div className="clean-heading"><div><span>01</span><h2>{copy.cFeaturedTitle}</h2></div><p>CURATED NOTES</p></div><div className="clean-feature-grid">{featured.map((note, index) => <button key={`${note.id}-${index}`} className={index === 0 ? "primary" : ""} onClick={() => setSelected(note)}><small>{note.category} · {note.publishedAt}</small><h3>{note.title}</h3><p>{note.summary}</p><span>阅读笔记 <i>↗</i></span></button>)}</div></section>

    <section className="clean-layout" id="notes"><div className="clean-notes"><div className="clean-heading"><div><span>02</span><h2>{copy.cRecentTitle}</h2></div><p>{filtered.length} NOTES</p></div><div className="clean-list">{filtered.map((note, index) => <button key={`${note.id}-${index}`} onClick={() => setSelected(note)}><time>{note.publishedAt.slice(5).replace("-", ".")}</time><div><small>{note.category}</small><h3>{note.title}</h3><p>{note.summary}</p></div><span>↗</span></button>)}</div></div>
      <aside className="clean-aside" id="topics"><div><p className="aside-label">{copy.cBrowseTitle}</p><div className="clean-tags">{categories.map((category) => <button key={category} className={active === category ? "active" : ""} onClick={() => setActive(category)}>{category}<sup>{category === "全部" ? notes.length : notes.filter((note) => note.category === category).length}</sup></button>)}</div></div><div className="garden-card"><span>◌</span><p>{copy.cAsideTitle}</p><b>{copy.cAsideText}</b><a href="/admin">写一篇新笔记 →</a></div></aside>
    </section>

    <footer className="clean-footer"><div><b>{copy.siteName}</b><span>{copy.siteCode}</span></div><p>{copy.footerMotto}</p><small>{copy.footerLegal}</small></footer>

    {selected && <div className="clean-reader-bg" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><article className="clean-reader"><button onClick={() => setSelected(null)} aria-label="关闭">×</button><p>{selected.category} · {selected.publishedAt}</p><h1>{selected.title}</h1><div><MarkdownBody source={selected.content} /></div></article></div>}
  </main>;
}
