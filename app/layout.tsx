import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { PublicHeader } from "./components/PublicHeader";
import { PublicFooter } from "./components/PublicFooter";
import { defaultSiteCopy } from "./lib/site-copy";
import "./globals.css";

// ─── Resolve site copy for shared shell ───────────────────────────────
// Falls back to compiled defaults when DB is unavailable.
async function resolveShellCopy() {
  try {
    const { readSiteCopy } = await import("../db/site-copy");
    const row = await readSiteCopy();
    if (row?.copyJson) {
      const stored = JSON.parse(row.copyJson) as Record<string, unknown>;
      const merged = { ...defaultSiteCopy };
      for (const key of Object.keys(defaultSiteCopy)) {
        const v = stored[key];
        if (typeof v === "string") (merged as Record<string, string>)[key] = v;
      }
      return merged;
    }
  } catch {
    // DB unavailable — use compiled defaults.
  }
  return { ...defaultSiteCopy };
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "gm-2.zhou-chu.workers.dev";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  return {
    title: "木漏｜周川的技术、阅读与生活",
    description: "刨花落尽，木纹方显。收录关于技术、阅读、写作与生活的长期笔记。",
    icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
    openGraph: { title: "木漏", description: "刨花落尽，木纹方显。", type: "website", locale: "zh_CN", images: [{ url: imageUrl, width: 1536, height: 1024, alt: "木漏" }] },
    twitter: { card: "summary_large_image", title: "木漏", description: "刨花落尽，木纹方显。", images: [imageUrl] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isDevToolsEnabled = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS !== "1";
  const copy = await resolveShellCopy();

  return (
      <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/images/materials/forest-waterfall.jpg" fetchPriority="high" />
        {/* Pre-hydration theme script — prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark")}else if(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();`,
          }}
        />

        {/* Dev-only: react-scan (auto) */}
        {isDevToolsEnabled && (
          <Script src="https://unpkg.com/react-scan/dist/auto.global.js" crossOrigin="anonymous" strategy="afterInteractive" />
        )}

        {/* Dev-only: react-grab */}
        {isDevToolsEnabled && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>
        <div className="pub-shell">
          {/* Skip link — first focusable element (DESIGN.md §7.5) */}
          <a href="#main-content" className="skip-link">
            跳到主要内容
          </a>

          {/* Semantic public header */}
          <PublicHeader siteName={copy.siteName} siteCode={copy.siteCode} />

          {/* Semantic main content area */}
          <main id="main-content" className="pub-main">
            {children}
          </main>

          {/* Semantic public footer */}
          <PublicFooter
            siteName={copy.siteName}
            authorName={copy.authorName}
            footerMotto={copy.footerMotto}
            footerLegal={copy.footerLegal}
          />
        </div>
      </body>
    </html>
  );
}
