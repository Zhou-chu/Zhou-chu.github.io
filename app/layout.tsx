import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "浮光笔记｜周川的技术、阅读与生活",
  description: "在喧嚣里，打捞思想的微光。收录关于技术、阅读、写作与生活的长期笔记。",
  openGraph: {
    title: "浮光笔记",
    description: "在喧嚣里，打捞思想的微光。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: { card: "summary", title: "浮光笔记", description: "在喧嚣里，打捞思想的微光。" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body>{children}</body></html>;
}
