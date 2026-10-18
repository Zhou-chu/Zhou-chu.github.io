import Link from "next/link";
import type { Metadata } from "next";

// ─── 404 Page — Timber Field Notes (DESIGN.md §5.14, Appendix B) ──
// Redesigned from hardcoded green-era values to declared Timber Field tokens.

export const metadata: Metadata = {
  title: "页面未找到 — 木漏",
};

export default function NotFound() {
  return (
    <div className="route-404">
      <span className="route-404__mark" aria-hidden="true" />
      <h1 className="route-404__heading">页面未找到</h1>
      <p className="route-404__body">您访问的页面不存在或已被移除。也许它换了一条小径。</p>
      <div className="route-404__actions">
        <Link href="/" className="route-404__link">
          &larr; 返回首页
        </Link>
        <Link href="/archive" className="route-404__alt">
          去书架找找
        </Link>
      </div>
    </div>
  );
}
