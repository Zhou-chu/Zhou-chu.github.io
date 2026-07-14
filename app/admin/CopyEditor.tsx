"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultSiteCopy, siteCopyFields, type SiteCopy } from "../lib/site-copy";

export function CopyEditor() {
  const [copy, setCopy] = useState<SiteCopy>({ ...defaultSiteCopy });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const finalFields = useMemo(() => siteCopyFields.filter((field) => field.group === "全站" || field.group === "C 版"), []);
  const groups = useMemo(() => Array.from(new Set(finalFields.map((field) => field.group))), [finalFields]);

  useEffect(() => {
    fetch("/api/admin/site-copy", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.copy) setCopy({ ...defaultSiteCopy, ...data.copy });
    }).catch(() => setMessage("暂时无法读取文案设置"));
  }, []);

  async function save() {
    setBusy(true); setMessage("正在保存…");
    try {
      const response = await fetch("/api/admin/site-copy", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ copy }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "保存失败");
      setMessage("文案已保存，刷新 A、B、C 页面即可看到更新");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function reset() {
    if (window.confirm("确定恢复全部默认文案吗？保存前仍可撤销。")) setCopy({ ...defaultSiteCopy });
  }

  return <section className={`copy-editor ${open ? "open" : ""}`}>
    <button className="copy-editor-toggle" onClick={() => setOpen((value) => !value)}><span><b>站点文案定制</b><small>修改最终版首页的所有固定文字</small></span><i>{open ? "收起 −" : "展开 ＋"}</i></button>
    {open && <div className="copy-editor-body">
      {groups.map((group) => <fieldset key={group}><legend>{group}</legend><div className="copy-fields">{finalFields.filter((field) => field.group === group).map((field) => <label key={field.key}><span>{field.label}</span>{field.multiline ? <textarea value={copy[field.key]} onChange={(event) => setCopy({ ...copy, [field.key]: event.target.value })} /> : <input value={copy[field.key]} onChange={(event) => setCopy({ ...copy, [field.key]: event.target.value })} />}</label>)}</div></fieldset>)}
      <div className="copy-actions"><p>{message || "文章标题和正文请在下方笔记编辑器中修改。"}</p><div><button onClick={reset}>恢复默认</button><button className="copy-save" disabled={busy} onClick={save}>保存全部文案</button></div></div>
    </div>}
  </section>;
}
