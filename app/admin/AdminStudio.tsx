"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MarkdownBody } from "../components/MarkdownBody";

type StoredNote = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  status: "draft" | "published";
  featured: number | boolean;
  publishedAt: string | null;
  updatedAt: string;
};

type Draft = Omit<StoredNote, "id" | "slug" | "updatedAt"> & { id?: number };

const emptyDraft: Draft = { title: "", summary: "", content: "", category: "随想", status: "draft", featured: false, publishedAt: new Date().toISOString().slice(0, 10) };

function parseMarkdownFile(raw: string, filename: string): Draft {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  let content = normalized;
  if (match) {
    match[1].split("\n").forEach((line) => {
      const separator = line.indexOf(":");
      if (separator > 0) meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    });
    content = match[2].trim();
  }
  const heading = content.match(/^#\s+(.+)$/m)?.[1];
  return {
    ...emptyDraft,
    title: meta.title || heading || filename.replace(/\.(md|markdown)$/i, ""),
    summary: meta.summary || meta.description || "",
    category: meta.category || "随想",
    featured: meta.featured === "true",
    publishedAt: meta.date || emptyDraft.publishedAt,
    content,
  };
}

export function AdminStudio({ user }: { user: { displayName: string; email: string } }) {
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("正在读取笔记…");
  const fileInput = useRef<HTMLInputElement>(null);

  const publishedCount = useMemo(() => notes.filter((note) => note.status === "published").length, [notes]);

  async function loadNotes() {
    const response = await fetch("/api/admin/notes", { cache: "no-store" });
    const data = await response.json() as { notes?: StoredNote[]; error?: string };
    if (!response.ok) throw new Error(data.error || "读取失败");
    setNotes(data.notes || []);
    setMessage("");
  }

  useEffect(() => { loadNotes().catch((error) => setMessage(error.message)); }, []);

  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name)) { setMessage("请选择 .md 或 .markdown 文件"); return; }
    const raw = await file.text();
    setDraft(parseMarkdownFile(raw, file.name));
    setMode("edit");
    setMessage(`已载入 ${file.name}，检查后即可发布`);
  }

  function editNote(note: StoredNote) {
    setDraft({ id: note.id, title: note.title, summary: note.summary, content: note.content, category: note.category, status: note.status, featured: Boolean(note.featured), publishedAt: note.publishedAt });
    setMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(status: "draft" | "published") {
    if (!draft.title.trim() || !draft.content.trim()) { setMessage("请填写标题和正文"); return; }
    setBusy(true); setMessage(status === "published" ? "正在发布…" : "正在保存…");
    try {
      const response = await fetch("/api/admin/notes", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "保存失败");
      await loadNotes();
      setDraft(emptyDraft);
      setMessage(status === "published" ? "文章已发布，A 与 B 两个前端将自动显示" : "草稿已保存");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(false); }
  }

  async function remove(note: StoredNote) {
    if (!window.confirm(`确定删除《${note.title}》吗？此操作无法撤销。`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/notes?id=${note.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "删除失败");
      await loadNotes();
      if (draft.id === note.id) setDraft(emptyDraft);
      setMessage("笔记已删除");
    } catch (error) { setMessage(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(false); }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><a href="/">浮光笔记</a><span>/ 写作后台</span></div>
        <nav><a href="/" target="_blank">查看 A 版</a><a href="/b" target="_blank">查看 B 版</a><a href="/signout-with-chatgpt?return_to=/">退出</a></nav>
      </header>
      <section className="admin-intro">
        <div><p>WRITING STUDIO</p><h1>下午好，{user.displayName.split("@")[0]}</h1><span>把未完成的想法，安静地写下来。</span></div>
        <div className="admin-stats"><span><b>{notes.length}</b>全部笔记</span><span><b>{publishedCount}</b>已发布</span><span><b>{notes.length - publishedCount}</b>草稿</span></div>
      </section>

      <section className="editor-layout">
        <aside className="library">
          <div className="library-head"><h2>笔记库</h2><button onClick={() => setDraft(emptyDraft)}>＋ 新建</button></div>
          <button className="upload-zone" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); readFile(event.dataTransfer.files[0]); }}>
            <strong>拖入 Markdown 文件</strong><span>或点击选择 .md 文件</span>
          </button>
          <input ref={fileInput} type="file" accept=".md,.markdown,text/markdown" hidden onChange={(event) => readFile(event.target.files?.[0])} />
          <div className="library-list">
            {notes.map((note) => <div className={`library-item ${draft.id === note.id ? "selected" : ""}`} key={note.id}><button onClick={() => editNote(note)}><span className={`status-dot ${note.status}`} /> <strong>{note.title}</strong><small>{note.category} · {note.status === "published" ? "已发布" : "草稿"}</small></button><button className="delete-note" onClick={() => remove(note)} aria-label={`删除${note.title}`}>×</button></div>)}
            {!notes.length && !message && <p className="no-notes">还没有笔记，从一次上传开始吧。</p>}
          </div>
        </aside>

        <div className="editor-panel">
          <div className="editor-toolbar"><div><button className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>编辑</button><button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>预览</button></div><span>{draft.content.length} 字符</span></div>
          {mode === "edit" ? <>
            <input className="title-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="文章标题" />
            <div className="meta-grid"><label>分类<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label>发布日期<input type="date" value={draft.publishedAt || ""} onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })} /></label><label className="featured-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />设为精选</label></div>
            <textarea className="summary-input" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="用一两句话写摘要…" />
            <textarea className="markdown-input" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder={"# 从这里开始\n\n支持 Markdown 标题、列表、引用和代码块。"} />
          </> : <article className="admin-preview"><p className="preview-label">{draft.category || "未分类"} · {draft.publishedAt}</p><h1>{draft.title || "未命名笔记"}</h1>{draft.summary && <p className="preview-summary">{draft.summary}</p>}<MarkdownBody source={draft.content || "还没有正文。"} /></article>}
          <div className="editor-footer"><p className={message ? "show" : ""}>{message || "所有更改都需要手动保存"}</p><div><button disabled={busy} className="save-draft" onClick={() => save("draft")}>保存草稿</button><button disabled={busy} className="publish-note" onClick={() => save("published")}>发布文章 ↗</button></div></div>
        </div>
      </section>
    </main>
  );
}
