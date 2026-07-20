import type { Metadata } from "next";
import Link from "next/link";

/**
 * Diagnostic 404-test page for Lighthouse auditing.
 *
 * Renders the same 404 UI as app/not-found.tsx but returns HTTP 200.
 * ROUTE: /404-test | never linked from navigation.
 */

export const metadata: Metadata = {
  title: "页面未找到 — 浮光笔记",
  description: "您访问的页面不存在或已被移除。返回浮光笔记首页，浏览技术、阅读与生活相关的内容。",
};

export default function NotFoundTestPage() {
  return (
    <div className="route-404">
      <div className="route-404__content">
        <h1 className="route-404__heading">页面未找到</h1>
        <p className="route-404__body">
          您访问的页面不存在或已被移除。
        </p>
        <Link href="/" className="route-404__link">
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
