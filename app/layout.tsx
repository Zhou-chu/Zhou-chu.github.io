import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "fuguang-notes.zhouc6301.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  return {
    title: "浮光笔记｜周川的技术、阅读与生活",
    description: "在喧嚣里，打捞思想的微光。收录关于技术、阅读、写作与生活的长期笔记。",
    openGraph: { title: "浮光笔记", description: "在喧嚣里，打捞思想的微光。", type: "website", locale: "zh_CN", images: [{ url: imageUrl, width: 1536, height: 1024, alt: "浮光笔记" }] },
    twitter: { card: "summary_large_image", title: "浮光笔记", description: "在喧嚣里，打捞思想的微光。", images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body>{children}</body></html>;
}
