"use client";

import { useEffect, useState, type ComponentType } from "react";

type MarkdownBodyProps = {
  source: string;
  headingIds?: boolean;
};

/**
 * 正文渲染的客户端入口。
 *
 * 为什么存在：博客跑在 Cloudflare Workers Free plan，每请求 CPU 上限 10ms。
 * 服务端用 react-markdown + rehype-katex + rehype-highlight 渲染长笔记
 * （数学密集 155ms / 代码密集 278ms，纯 markdown 也要 9-53ms）必然触发
 * Error 1102（Worker exceeded resource limits）→ 503。
 *
 * 因此正文不在服务端渲染：SSR 只输出占位骨架，浏览器加载后动态 import
 * MarkdownBody 完成渲染（浏览器无 CPU 限制，KaTeX/高亮照常工作）。
 * 代价：正文初始 HTML 缺失（markdown 原文仍在 RSC payload 里），
 * 对本站可接受；后续若需 SEO 可升级 Workers Paid 或做上传时预渲染。
 */
export function MarkdownClient({ source, headingIds = false }: MarkdownBodyProps) {
  const [Body, setBody] = useState<ComponentType<MarkdownBodyProps> | null>(null);

  useEffect(() => {
    let alive = true;
    import("./MarkdownBody").then((m) => {
      if (alive) setBody(() => m.MarkdownBody);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 正文渲染完成后广播事件，让 ArticleToc 等依赖 DOM 的组件重新扫描
  useEffect(() => {
    if (Body) window.dispatchEvent(new CustomEvent("markdown:rendered"));
  }, [Body]);

  if (!Body) {
    return (
      <div className="markdown-loading" aria-busy="true">
        正文渲染中…
      </div>
    );
  }
  return <Body source={source} headingIds={headingIds} />;
}
