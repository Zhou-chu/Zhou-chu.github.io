"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MarkdownBody } from "../components/MarkdownBody";
import { CopyEditor } from "./CopyEditor";
import { ErrorBoundary } from "../components/ErrorBoundary";

export type StoredNote = {
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
  tagsJson: string;
  sourcePath: string | null;
};

type Draft = Omit<StoredNote, "id" | "slug" | "updatedAt" | "tagsJson"> & { id?: number; tags: string[] };

function makeEmptyDraft(): Draft {
  return { title: "", summary: "", content: "", category: "随想", status: "draft", featured: false, publishedAt: new Date().toISOString().slice(0, 10), sourcePath: null, tags: [] };
}

type GitHubSync = { ok: boolean; configured: boolean; action: "created" | "updated" | "deleted" | "unchanged" | "skipped"; message?: string };

function withGitHubSync(message: string, sync?: GitHubSync): string {
  if (!sync) return message;
  if (!sync.configured) return `${message}；GitHub 自动同步尚未配置`;
  if (!sync.ok) return `${message}；但 GitHub 同步失败：${sync.message || "请稍后重试"}`;
  if (sync.action === "deleted") return `${message}，GitHub 公开快照已移除`;
  if (sync.action === "created" || sync.action === "updated") return `${message}，GitHub 已同步`;
  return message;
}

/** Split raw tag input (逗号/中文逗号/顿号/空白) into a deduplicated tag array. */
function parseTags(input: string): string[] {
  const tags = new Set<string>();
  for (const rawTag of input.replace(/[\[\]'"]/g, "").split(/[,，、\s]+/)) {
    const tag = rawTag.trim();
    if (tag) tags.add(tag);
  }
  return [...tags].slice(0, 50);
}

/** Safely decode a stored tagsJson column into a string array. */
function parseTagsJson(json: string | null | undefined): string[] {
  try {
    const value = JSON.parse(json || "[]") as unknown;
    return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function parseMarkdownFile(raw: string, filename: string): Draft {
  const emptyDraft = makeEmptyDraft();
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  let tags: string[] = [];
  let content = normalized;
  if (match) {
    const lines = match[1].split("\n");
    let collectingTags = false;
    for (const line of lines) {
      if (collectingTags) {
        const item = line.match(/^\s*-\s+(.+)$/);
        if (item) {
          for (const tag of parseTags(item[1])) tags.push(tag);
          continue;
        }
        collectingTags = false;
        if (!line.trim()) continue;
      }
      const separator = line.indexOf(":");
      if (separator > 0) {
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        if (key === "tags") {
          if (value) {
            tags = parseTags(value);
          } else {
            collectingTags = true;
          }
        } else {
          meta[key] = value;
        }
      }
    }
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
    tags,
    content,
  };
}

function collectOutgoingLinks(content: string) {
  const wikilinkRegex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  const outgoingSlugs: string[] = [];
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const title = match[1]?.trim();
    if (title) outgoingSlugs.push(title);
  }
  return JSON.stringify([...new Set(outgoingSlugs)]);
}

export function AdminStudio({ user, initialNotes }: { user: { displayName: string; email: string }; initialNotes: StoredNote[] }) {
  const [notes, setNotes] = useState<StoredNote[]>(initialNotes);
  const [draft, setDraft] = useState<Draft>(() => makeEmptyDraft());
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lastImportedIds, setLastImportedIds] = useState<number[]>([]);
  const [batchTagInput, setBatchTagInput] = useState("");
  const [batchCategoryInput, setBatchCategoryInput] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const publishedCount = useMemo(() => notes.filter((note) => note.status === "published").length, [notes]);
  const existingCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const note of notes) if (note.category) categories.add(note.category);
    return [...categories].sort();
  }, [notes]);

  async function loadNotes() {
    const response = await fetch("/api/admin/notes", { cache: "no-store" });
    const data = await response.json() as { notes?: StoredNote[]; error?: string };
    if (!response.ok) throw new Error(data.error || "读取失败");
    setNotes(data.notes || []);
    setMessage("");
  }

  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name)) { setMessage("请选择 .md 或 .markdown 文件"); return; }
    const raw = await file.text();
    setDraft(parseMarkdownFile(raw, file.name));
    setMode("edit");
    setMessage(`已载入 ${file.name}，检查后即可发布`);
  }

  async function importFiles(fileList?: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (files.length === 1) {
      await readFile(files[0]);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    const markdownFiles: File[] = [];
    const failures: string[] = [];
    for (const file of files) {
      if (/\.(md|markdown)$/i.test(file.name)) markdownFiles.push(file);
      else failures.push(`${file.name}（格式不支持）`);
    }

    if (!markdownFiles.length) {
      setMessage("没有可导入的 Markdown 文件，请选择 .md 或 .markdown 文件");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    setBusy(true);
    try {
      setMessage(`正在批量导入 ${markdownFiles.length} 篇 Markdown…`);
      const results = await Promise.all(markdownFiles.map(async (file): Promise<{ id: number; overwritten: boolean; failure?: string }> => {
        try {
          const parsed = parseMarkdownFile(await file.text(), file.name);
          if (!parsed.title.trim() || !parsed.content.trim()) throw new Error("标题或正文为空");
          const response = await fetch("/api/admin/notes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...parsed,
              status: "draft",
              links_json: collectOutgoingLinks(parsed.content),
            }),
          });
          const data = await response.json() as { note?: { id?: number }; overwritten?: boolean; error?: string };
          if (!response.ok) throw new Error(data.error || "导入失败");
          return { id: data.note?.id ?? 0, overwritten: Boolean(data.overwritten) };
        } catch (error) {
          return error instanceof Error ? { id: 0, overwritten: false, failure: `${file.name}（${error.message}）` } : { id: 0, overwritten: false, failure: `${file.name}（导入失败）` };
        }
      }));

      const imported = results.filter((result) => result.id > 0);
      const overwritten = imported.filter((result) => result.overwritten).length;
      for (const result of results) {
        if (result.failure) failures.push(result.failure);
      }

      await loadNotes();
      if (imported.length) {
        setLastImportedIds(imported.map((result) => result.id));
        setBatchTagInput("");
      }
      const overwrittenNote = overwritten ? `（其中 ${overwritten} 篇标题已存在，已覆盖更新）` : "";
      const failureSummary = failures.length
        ? `，${failures.length} 个失败：${failures.slice(0, 3).join("、")}${failures.length > 3 ? "…" : ""}`
        : "";
      setMessage(`批量导入完成：${imported.length} 篇已保存为草稿${overwrittenNote}${failureSummary}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量导入失败");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  /** 一键打标签：把输入的标签应用到本次导入的所有文章。 */
  async function applyBatchTags() {
    const tags = parseTags(batchTagInput);
    if (!tags.length) { setMessage("请输入至少一个标签"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notes/tags", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: lastImportedIds, tags }),
      });
      const data = await response.json() as { updated?: number; error?: string; githubSync?: GitHubSync };
      if (!response.ok) throw new Error(data.error || "打标签失败");
      setMessage(withGitHubSync(`已为本次导入的 ${data.updated ?? 0} 篇文章打上标签：${tags.join("、")}`, data.githubSync));
      setLastImportedIds([]);
      setBatchTagInput("");
      await loadNotes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "打标签失败");
    } finally {
      setBusy(false);
    }
  }

  /** 一键分类：把输入的分类应用到本次导入的所有文章。 */
  async function applyBatchCategory() {
    const category = batchCategoryInput.trim();
    if (!category) { setMessage("请输入分类名称"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notes/category", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: lastImportedIds, category }),
      });
      const data = await response.json() as { updated?: number; error?: string; githubSync?: GitHubSync };
      if (!response.ok) throw new Error(data.error || "设置分类失败");
      setMessage(withGitHubSync(`已为本次导入的 ${data.updated ?? 0} 篇文章设置分类：${category}`, data.githubSync));
      setBatchCategoryInput("");
      await loadNotes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "设置分类失败");
    } finally {
      setBusy(false);
    }
  }

  function editNote(note: StoredNote) {
    setDraft({ id: note.id, title: note.title, summary: note.summary, content: note.content, category: note.category, status: note.status, featured: Boolean(note.featured), publishedAt: note.publishedAt, sourcePath: note.sourcePath, tags: parseTagsJson(note.tagsJson) });
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
        body: JSON.stringify({ ...draft, status, links_json: collectOutgoingLinks(draft.content) }),
      });
      const data = await response.json() as { error?: string; overwritten?: boolean; githubSync?: GitHubSync };
      if (!response.ok) throw new Error(data.error || "保存失败");
      await loadNotes();
      setDraft(makeEmptyDraft());
      const savedMessage = status === "published" ? "文章已发布，网站已更新" : (data.overwritten ? "已覆盖旧文章并保存为草稿" : "草稿已保存");
      setMessage(withGitHubSync(savedMessage, data.githubSync));
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(false); }
  }

  async function remove(note: StoredNote) {
    if (!window.confirm(`确定删除《${note.title}》吗？此操作无法撤销。`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/notes?id=${note.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string; githubSync?: GitHubSync };
      if (!response.ok) throw new Error(data.error || "删除失败");
      await loadNotes();
      if (draft.id === note.id) setDraft(makeEmptyDraft());
      setMessage(withGitHubSync("笔记已删除", data.githubSync));
    } catch (error) { setMessage(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(false); }
  }

  async function unpublishAll() {
    if (busy || !window.confirm("确定将所有已发布笔记改为草稿吗？首页将不再显示任何笔记。")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notes/batch-unpublish", { method: "POST" });
      const data = await response.json() as { unpublished?: number; error?: string; githubSync?: GitHubSync };
      if (!response.ok) throw new Error(data.error || "操作失败");
      setMessage(withGitHubSync(`已下架 ${data.unpublished ?? 0} 篇笔记`, data.githubSync));
      await loadNotes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    if (busy || !window.confirm("确定删除所有笔记吗？此操作不可撤销！")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notes/batch-delete", { method: "POST" });
      const data = await response.json() as { deleted?: number; error?: string; githubSync?: GitHubSync };
      if (!response.ok) throw new Error(data.error || "操作失败");
      setMessage(withGitHubSync(`已删除 ${data.deleted ?? 0} 篇笔记`, data.githubSync));
      setDraft(makeEmptyDraft());
      await loadNotes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ErrorBoundary>
    <main className="admin-shell">
      <header className="admin-header">
        <div><Link href="/">浮光笔记</Link><span>/ 写作后台</span></div>
        <nav><Link href="/" target="_blank">查看网站</Link><form action="/api/admin/logout" method="POST"><button type="submit" className="admin-logout-btn">退出</button></form></nav>
      </header>
      <section className="admin-intro">
        <div><p>WRITING STUDIO</p><h1>下午好，{user.displayName.split("@")[0]}</h1><span>把未完成的想法，安静地写下来。</span></div>
        <div className="admin-stats"><span><b>{notes.length}</b>全部笔记</span><span><b>{publishedCount}</b>已发布</span><span><b>{notes.length - publishedCount}</b>草稿</span></div>
      </section>

      <CopyEditor />

      <section className="editor-layout">
        <aside className="library">
          <div className="library-head">
            <h2>笔记库</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={busy} onClick={() => { setDraft(makeEmptyDraft()); setMode("edit"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>＋ 新建</button>
              <button disabled={busy} className="batch-unpublish" onClick={() => void unpublishAll()}>全部下架</button>
              <button disabled={busy} className="batch-delete" onClick={() => void deleteAll()}>全部删除</button>
            </div>
          </div>
          <button type="button" className="upload-zone" disabled={busy} onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void importFiles(event.dataTransfer.files); }}>
            <strong>拖入一个或多个 Markdown 文件</strong><span>单篇进入编辑器，多篇将批量保存为草稿</span>
          </button>
          <input ref={fileInput} type="file" accept=".md,.markdown,text/markdown" multiple hidden onChange={(event) => void importFiles(event.target.files)} />
          {lastImportedIds.length > 0 && (
            <div className="batch-tag-panel">
              <div className="batch-tag-panel__head"><strong>批量设置本次导入的 {lastImportedIds.length} 篇文章</strong><span>一键应用到全部文章</span></div>
              <div className="batch-tag-panel__row">
                <input aria-label="批量分类" list="batch-category-list" value={batchCategoryInput} onChange={(event) => setBatchCategoryInput(event.target.value)} placeholder="分类（如：技术、随笔）" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void applyBatchCategory(); } }} />
                <datalist id="batch-category-list">{existingCategories.map((cat) => <option key={cat} value={cat} />)}</datalist>
                <button type="button" disabled={busy || !batchCategoryInput.trim()} onClick={() => void applyBatchCategory()}>一键分类</button>
              </div>
              <div className="batch-tag-panel__row">
                <input aria-label="批量标签" value={batchTagInput} onChange={(event) => setBatchTagInput(event.target.value)} placeholder="标签（如：读书笔记, 技术, 随笔）" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void applyBatchTags(); } }} />
                <button type="button" disabled={busy || !batchTagInput.trim()} onClick={() => void applyBatchTags()}>一键打标签</button>
                <button type="button" className="batch-tag-skip" disabled={busy} onClick={() => { setLastImportedIds([]); setBatchCategoryInput(""); }}>跳过</button>
              </div>
            </div>
          )}
          <div className="library-list">
            {notes.map((note) => { const noteTags = parseTagsJson(note.tagsJson); return <div className={`library-item ${draft.id === note.id ? "selected" : ""}`} key={note.id}><button onClick={() => editNote(note)}><span className={`status-dot ${note.status}`} /> <strong>{note.title}</strong><small>{note.category} · {note.status === "published" ? "已发布" : "草稿"}{noteTags.length ? ` · ${noteTags.join("、")}` : ""}</small></button><button className="delete-note" onClick={() => remove(note)} aria-label={`删除${note.title}`}>×</button></div>; })}
            {!notes.length && !message && <p className="no-notes">还没有笔记，从一次上传开始吧。</p>}
          </div>
        </aside>

        <div className="editor-panel">
          <div className="editor-toolbar"><div><button className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>编辑</button><button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>预览</button></div><span>{draft.content.length} 字符</span></div>
          {mode === "edit" ? <>
            <input aria-label="文章标题" className="title-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="文章标题" />
            <div className="meta-grid"><label>分类<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label>标签<input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: parseTags(event.target.value) })} placeholder="逗号或空格分隔" /></label><label>发布日期<input type="date" value={draft.publishedAt || ""} onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })} /></label><label className="featured-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />设为精选</label></div>
            <textarea aria-label="文章摘要" className="summary-input" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="用一两句话写摘要…" />
            <textarea aria-label="Markdown 正文" className="markdown-input" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder={"# 从这里开始\n\n支持 Markdown 标题、列表、引用和代码块。"} />
          </> : <article className="admin-preview"><p className="preview-label">{draft.category || "未分类"} · {draft.publishedAt}</p><h1>{draft.title || "未命名笔记"}</h1>{draft.summary && <p className="preview-summary">{draft.summary}</p>}{draft.tags.length > 0 && <p className="preview-tags">{draft.tags.map((tag) => <span className="preview-tag" key={tag}>#{tag}</span>)}</p>}<MarkdownBody source={draft.content || "还没有正文。"} /></article>}
          <div className="editor-footer"><p className={message ? "show" : ""}>{message || "所有更改都需要手动保存"}</p><div><button disabled={busy} className="save-draft" onClick={() => save("draft")}>保存草稿</button>{draft.status === "published" && (<button disabled={busy} className="unpublish-note" onClick={() => save("draft")}>下架</button>)}<button disabled={busy} className="publish-note" onClick={() => save("published")}>{draft.status === "published" ? "更新文章 ↗" : "发布文章 ↗"}</button></div></div>
        </div>
      </section>
    </main>
    </ErrorBoundary>
  );
}
