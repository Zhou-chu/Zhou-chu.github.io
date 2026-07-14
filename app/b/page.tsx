"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownBody } from "../components/MarkdownBody";
import "./b.css";

type DarkNote = { id: string | number; title: string; summary: string; content: string; category: string; publishedAt: string; featured?: number | boolean };

const samples: DarkNote[] = [
  { id: "s1", title: "把复杂系统讲清楚：我的技术写作方法", summary: "从混乱草稿走向清晰文章的可复用流程。", category: "写作", publishedAt: "2026-07-08", featured: true, content: "# 把复杂系统讲清楚\n\n技术写作不是把知道的全部倒出来，而是替读者设计一条阻力足够小的理解路径。\n\n## 找到唯一任务\n\n动笔前，先写下读者读完后应该能够做什么。\n\n> 清晰不是信息更少，而是每条信息都出现在恰当的位置。" },
  { id: "s2", title: "构建第二大脑：从收集到创造", summary: "笔记的价值，在于正确时刻重新进入思考。", category: "方法", publishedAt: "2026-06-26", featured: true, content: "# 构建第二大脑\n\n真正有用的第二大脑，不是一座资料仓库，而是一套让旧想法持续参与新工作的机制。" },
  { id: "s3", title: "React 状态设计的三个朴素原则", summary: "让数据来源保持唯一，把状态放在真正需要的位置。", category: "技术", publishedAt: "2026-06-03", content: "# React 状态设计\n\n能计算出来的数据，就不要重复保存。\n\n```tsx\nconst visible = notes.filter(match);\n```" },
  { id: "s4", title: "在日常里保留无用之用", summary: "散步、发呆与漫无目的的阅读。", category: "随想", publishedAt: "2026-06-12", content: "# 无用之用\n\n有些时间看起来没有产出，却在恢复我们感知世界的能力。" },
];

export default function DarkHome() {
  const [notes, setNotes] = useState<DarkNote[]>(samples);
  const [active, setActive] = useState("全部");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DarkNote | null>(null);

  useEffect(() => {
    fetch("/api/notes", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.notes?.length) setNotes([...data.notes, ...samples]);
    }).catch(() => undefined);
  }, []);

  const categories = useMemo(() => ["全部", ...Array.from(new Set(notes.map((note) => note.category)))], [notes]);
  const filtered = useMemo(() => notes.filter((note) => (active === "全部" || note.category === active) && (!query || `${note.title}${note.summary}`.toLowerCase().includes(query.toLowerCase()))), [notes, active, query]);
  const featured = notes.find((note) => note.featured) || notes[0];

  return <main className="dark-site">
    <div className="star-noise" aria-hidden="true" />
    <header className="dark-header"><a className="dark-brand" href="/b"><span>FG_</span>浮光笔记</a><nav><a href="#archive">ARCHIVE</a><a href="#tags">TAGS</a><a href="/admin">ADMIN</a></nav><div><a className="switch-a" href="/">切换 A 版</a><span className="online"><i /> ONLINE</span></div></header>

    <section className="dark-hero">
      <div className="hero-left"><p className="terminal-label">~/fuguang/notes <span>main*</span></p><h1>思考的轨迹，<br />在深夜持续发光<span>_</span></h1><p className="dark-intro">关于技术、创造与日常观察的长期记录。<br />这里没有最终答案，只有持续更新的思考版本。</p><div className="hero-command"><span>$</span><a href="#archive">cd ./latest-notes</a><i>↵</i></div><div className="system-meta"><span><b>06</b> NOTES</span><span><b>07</b> TOPICS</span><span><b>2026</b> SINCE</span></div></div>
      <div className="terminal-card"><div className="terminal-top"><span><i /><i /><i /></span><b>note.md — preview</b><em>⌘ K</em></div><div className="terminal-body"><p><span>01</span><b>---</b></p><p><span>02</span><i>title:</i> “浮光笔记”</p><p><span>03</span><i>status:</i> <strong>growing</strong></p><p><span>04</span><i>updated:</i> 2026-07-14</p><p><span>05</span><b>---</b></p><p><span>06</span></p><p><span>07</span><mark># 让想法保持开放</mark></p><p><span>08</span></p><p><span>09</span>记录不是为了囤积，</p><p><span>10</span>而是为了与未来的自己相遇。</p><p><span>11</span></p><p><span>12</span><code>const curiosity = true;</code></p></div><div className="terminal-status"><span>● Markdown</span><span>Ln 12, Col 24&nbsp;&nbsp; UTF-8</span></div></div>
    </section>

    <section className="dark-content" id="archive">
      <div className="archive-main"><div className="dark-section-head"><div><span>01 /</span><h2>精选记录</h2></div><p>FEATURED_NOTE</p></div>
        {featured && <button className="spotlight" onClick={() => setSelected(featured)}><span className="spot-date">{featured.publishedAt}</span><div><small>{featured.category} · FEATURED</small><h3>{featured.title}</h3><p>{featured.summary}</p></div><b>READ_NOTE ↗</b></button>}
        <div className="dark-section-head recent"><div><span>02 /</span><h2>最近更新</h2></div><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="search notes" /></label></div>
        <div className="dark-list">{filtered.map((note, index) => <button key={`${note.id}-${index}`} onClick={() => setSelected(note)}><span className="index">{String(index + 1).padStart(2, "0")}</span><div><small>{note.category} / {note.publishedAt}</small><strong>{note.title}</strong><p>{note.summary}</p></div><span className="go">↗</span></button>)}</div>
      </div>
      <aside className="dark-sidebar" id="tags"><div className="side-title"><span>FILTER_BY_TAG</span><i /></div><div className="dark-tags">{categories.map((category) => <button key={category} className={active === category ? "active" : ""} onClick={() => setActive(category)}><span>#</span>{category}<sup>{category === "全部" ? notes.length : notes.filter((note) => note.category === category).length}</sup></button>)}</div><div className="now-card"><span>CURRENTLY</span><p>正在整理关于<br /><b>“创造力与工具”</b><br />的一组笔记。</p><div><i /><i /><i /><i /><i /></div></div><div className="dark-quote">“保持开放，<br />保持未完成。”<span>— FUGUANG</span></div></aside>
    </section>

    <footer className="dark-footer"><div><a href="/b">FG_NOTES</a><span>thoughts.log</span></div><p>© 2026 · BUILT IN THE QUIET HOURS</p><a href="/admin">WRITE_NEW_NOTE ↗</a></footer>

    {selected && <div className="dark-reader-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><article className="dark-reader" role="dialog" aria-modal="true"><button className="dark-close" onClick={() => setSelected(null)}>ESC ×</button><p className="dark-reader-meta">{selected.category} / {selected.publishedAt}</p><h1>{selected.title}</h1><div className="dark-markdown"><MarkdownBody source={selected.content} /></div></article></div>}
  </main>;
}
