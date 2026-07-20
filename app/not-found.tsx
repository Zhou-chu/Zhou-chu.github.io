import Link from "next/link";
import type { Metadata } from "next";

// ─── 404 Page — Timber Field Notes (DESIGN.md §5.14, Appendix B) ──
// Redesigned from hardcoded green-era values to declared Timber Field tokens.

export const metadata: Metadata = {
  title: "页面未找到 — 浮光笔记",
};

export default function NotFound() {
  return (
    <div className="route-404">
      <h1 className="route-404__heading">页面未找到</h1>
      <p className="route-404__body">您访问的页面不存在或已被移除。</p>
      <Link href="/" className="route-404__link">
        &larr; 返回首页
      </Link>
    </div>
  );
}
