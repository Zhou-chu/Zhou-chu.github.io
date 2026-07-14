"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownBody } from "./components/MarkdownBody";

type Note = {
  id: number | string;
  title: string;
  excerpt: string;
  date: string;
  read: string;
  category: string;
  featured?: boolean;
  content: React.ReactNode;
};

const seedNotes: Note[] = [
  {
    id: 1,
    title: "把复杂系统讲清楚：我的技术写作方法",
    excerpt: "一套从混乱草稿走向清晰文章的可复用流程，以及我反复使用的三个自检问题。",
    date: "2026.07.08",
    read: "8 分钟",
    category: "写作",
    featured: true,
    content: (
      <>
        <p className="lead">技术写作不是把知道的全部倒出来，而是替读者设计一条阻力足够小的理解路径。</p>
        <h2>先找到文章的唯一任务</h2>
        <p>动笔前，我会用一句话写下：读者读完后，应该能够做什么？如果答案里出现了三个动词，这篇文章往往需要拆开。</p>
        <blockquote>清晰不是信息更少，而是每一条信息都出现在恰当的位置。</blockquote>
        <h2>用结构消除认知切换</h2>
        <p>好的章节标题本身就是一份摘要。先给结论，再解释原因，最后放入可以验证的例子。读者可以停在任意一层，而不会失去文章主线。</p>
        <pre><code>{`目标 → 结论 → 原理 → 示例 → 边界`}</code></pre>
        <h2>发布前的三个问题</h2>
        <ul><li>第一屏是否说清了问题与收益？</li><li>每一节是否只承担一个任务？</li><li>删掉这个段落，文章会损失什么？</li></ul>
      </>
    ),
  },
  {
    id: 2,
    title: "构建第二大脑：从收集到创造",
    excerpt: "笔记的价值不在数量，而在它能否在正确时刻重新进入你的思考。",
    date: "2026.06.26",
    read: "6 分钟",
    category: "方法",
    featured: true,
    content: (<><p className="lead">真正有用的第二大脑，不是一座资料仓库，而是一套让旧想法持续参与新工作的机制。</p><h2>少收集，多连接</h2><p>我只保存能够改变判断、支持项目或激发新问题的内容。每条笔记至少连接一个正在进行的主题。</p><blockquote>收藏解决的是焦虑，连接才创造复利。</blockquote><h2>让笔记流动</h2><p>每周回顾时，我会从最近的碎片里选出三条，写成带有自己立场的永久笔记。它们最终会进入文章、项目或决策。</p></>),
  },
  {
    id: 3,
    title: "在日常里保留无用之用",
    excerpt: "散步、发呆与漫无目的的阅读，为什么是创造力不可缺少的留白。",
    date: "2026.06.12",
    read: "5 分钟",
    category: "随想",
    featured: true,
    content: (<><p className="lead">有些时间看起来没有产出，却在悄悄恢复我们感知世界的能力。</p><h2>不被安排的半小时</h2><p>我开始在傍晚散步，不戴耳机，也不规划路线。那些白天没有来得及完成的思绪，常常在这段时间里自然浮现。</p><blockquote>留白不是效率的敌人，它是意义重新长出来的地方。</blockquote><p>无用之用不需要证明自己。它只需要被保护，像窗边一小块没有摆满东西的桌面。</p></>),
  },
  {
    id: 4,
    title: "React 状态设计的三个朴素原则",
    excerpt: "减少重复状态，让数据来源保持唯一，并把状态放在真正需要它的位置。",
    date: "2026.06.03",
    read: "7 分钟",
    category: "技术",
    content: (<><p className="lead">很多前端复杂度并不来自业务，而来自状态之间悄悄形成的依赖。</p><h2>能计算出来的，就不存</h2><p>派生数据应该在渲染时计算。重复保存它，会让同步问题成为迟早发生的故障。</p><pre><code>{`const visibleNotes = notes.filter(note =>\n  activeTag === "全部" || note.category === activeTag\n);`}</code></pre><h2>让所有权清晰</h2><p>状态应该靠近真正修改它的组件。只有多个区域需要协调时，才将它提升到共同的父级。</p></>),
  },
  {
    id: 5,
    title: "读完一本书后，我会留下什么",
    excerpt: "从摘录、复述到质疑：一份轻量但可持续的读书笔记模板。",
    date: "2026.05.18",
    read: "4 分钟",
    category: "阅读",
    content: (<><p className="lead">读书笔记不是缩短版原书，而是一次与作者观点的真实交锋。</p><h2>只保留三类内容</h2><ul><li>改变了我原有判断的观点</li><li>可以直接用于当前项目的方法</li><li>我明确不同意、但值得继续追问的论证</li></ul><p>最后，我会用自己的话写一段不超过 200 字的复述。如果写不出来，就意味着还没有真正理解。</p></>),
  },
  {
    id: 6,
    title: "一次没有目的地的城市漫游",
    excerpt: "沿着旧街区走到河边，记录那些地图上没有标出的微小现场。",
    date: "2026.05.02",
    read: "3 分钟",
    category: "生活",
    content: (<><p className="lead">熟悉一座城市最好的方式，或许是暂时忘掉自己要去哪里。</p><p>那天下午，我沿着树荫更浓的方向走。旧店招、晾晒的床单、修车铺收音机里的评书，共同组成了一张比地图更准确的地方志。</p><blockquote>旅行并不总是去远方，也可以是重新看见已经路过无数次的附近。</blockquote></>),
  },
];

const tags = ["全部", "技术", "写作", "方法", "阅读", "随想", "生活"];

export default function Home() {
  const [allNotes, setAllNotes] = useState<Note[]>(seedNotes);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("全部");
  const [selected, setSelected] = useState<Note | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("/api/notes", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.notes?.length) return;
        const uploaded: Note[] = data.notes.map((note: { id: number; title: string; summary: string; content: string; category: string; featured: number | boolean; publishedAt: string | null }) => ({
          id: `db-${note.id}`,
          title: note.title,
          excerpt: note.summary || note.content.replace(/[#>*`\-]/g, "").slice(0, 72),
          date: (note.publishedAt || new Date().toISOString().slice(0, 10)).replaceAll("-", "."),
          read: `${Math.max(1, Math.ceil(note.content.length / 500))} 分钟`,
          category: note.category,
          featured: Boolean(note.featured),
          content: <MarkdownBody source={note.content} />,
        }));
        setAllNotes([...uploaded, ...seedNotes]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("fuguang-theme");
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(stored ? stored === "dark" : preferDark);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem("fuguang-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allNotes.filter((note) => {
      const matchesTag = activeTag === "全部" || note.category === activeTag;
      const matchesQuery = !needle || `${note.title}${note.excerpt}${note.category}`.toLowerCase().includes(needle);
      return matchesTag && matchesQuery;
    });
  }, [activeTag, query, allNotes]);

  const featured = allNotes.filter((note) => note.featured).slice(0, 3);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="浮光笔记首页"><span>浮光</span><small>FUGUANG NOTES</small></a>
        <nav aria-label="主导航"><a href="#notes">笔记</a><a href="#topics">专题</a><a href="/b">B 版</a><a href="/admin">写作后台</a></nav>
        <div className="header-actions">
          <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索笔记…" aria-label="搜索笔记" /><kbd>⌘ K</kbd></label>
          <button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={dark ? "切换到浅色主题" : "切换到深色主题"}>{dark ? "☀" : "☾"}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">思考 · 技术 · 生活</p>
          <h1>在喧嚣里，<br />打捞思想的微光。</h1>
          <p className="hero-intro">你好，我是周川。这里收录我关于技术、阅读与生活的长期笔记。愿这些尚未完成的思考，也能为你照亮一小段路。</p>
          <a className="text-link" href="#notes">开始阅读 <span>↘</span></a>
        </div>
        <aside className="today-note" aria-label="今日札记">
          <div className="pin" aria-hidden="true" />
          <p className="note-label">今日札记 · 07/14</p>
          <blockquote>“不要急着成为答案，<br />先成为一个好问题。”</blockquote>
          <span className="signature">— 写在盛夏</span>
        </aside>
      </section>

      <section className="featured-section" aria-labelledby="featured-title">
        <div className="section-heading"><div><span>01</span><h2 id="featured-title">精选文章</h2></div><button onClick={() => { setActiveTag("全部"); document.querySelector("#notes")?.scrollIntoView({behavior:"smooth"}); }}>查看全部 →</button></div>
        <div className="featured-grid">
          {featured.map((note, index) => (
            <button className={`featured-card card-${index + 1}`} key={note.id} onClick={() => setSelected(note)}>
              <span className="card-category">{note.category}</span>
              <h3>{note.title}</h3>
              <p>{note.excerpt}</p>
              <span className="card-meta">{note.date} · {note.read}<b>↗</b></span>
            </button>
          ))}
        </div>
      </section>

      <section className="notes-layout" id="notes">
        <div className="recent-notes">
          <div className="section-heading compact"><div><span>02</span><h2>最近笔记</h2></div><span>{filtered.length} 篇</span></div>
          <div className="filter-mobile">{tags.map((tag) => <button key={tag} className={activeTag === tag ? "active" : ""} onClick={() => setActiveTag(tag)}>{tag}</button>)}</div>
          <div className="note-list">
            {filtered.map((note) => (
              <button className="note-row" key={note.id} onClick={() => setSelected(note)}>
                <span className="note-date">{note.date.slice(5).replace(".", "/")}</span>
                <span className="note-main"><strong>{note.title}</strong><small>{note.excerpt}</small></span>
                <span className="note-tag">{note.category}</span><span className="arrow">↗</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="empty"><span>没有找到相关笔记</span><button onClick={() => {setQuery(""); setActiveTag("全部");}}>清除筛选</button></div>}
          </div>
        </div>

        <aside className="sidebar" id="topics">
          <div className="side-block"><h3>按主题浏览</h3><div className="tag-cloud">{tags.map((tag) => <button key={tag} className={activeTag === tag ? "active" : ""} onClick={() => setActiveTag(tag)}>{tag}<sup>{tag === "全部" ? allNotes.length : allNotes.filter((note) => note.category === tag).length}</sup></button>)}</div></div>
          <div className="side-block ink-note" id="about"><p>关于这里</p><span>笔记并非结论，而是思考留下的脚印。保持好奇，持续记录。</span><i>川</i></div>
          <div className="side-links"><a href="mailto:hello@example.com">来信</a><a href="#top">回到顶部 ↑</a></div>
        </aside>
      </section>

      <footer><div className="footer-brand">浮光笔记</div><p>写作是与时间相处的一种方式。</p><span>© 2026 周川 · Built with curiosity.</span></footer>

      {selected && (
        <div className="reader-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <article className="reader" role="dialog" aria-modal="true" aria-labelledby="reader-title">
            <button className="reader-close" onClick={() => setSelected(null)} aria-label="关闭文章">×</button>
            <div className="reader-meta"><span>{selected.category}</span> {selected.date} · {selected.read}</div>
            <h1 id="reader-title">{selected.title}</h1>
            <div className="reader-content">{selected.content}</div>
            <div className="reader-end"><span>完</span><button onClick={() => setSelected(null)}>返回笔记列表</button></div>
          </article>
        </div>
      )}
    </main>
  );
}
