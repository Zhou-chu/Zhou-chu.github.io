export const defaultSiteCopy = {
  siteName: "木漏",
  siteCode: "KOMOREBI NOTES",
  authorName: "周川",
  navNotes: "笔记",
  navTopics: "专题",
  navAdmin: "写作后台",
  footerMotto: "写作是与时间相处的一种方式。",
  footerLegal: "© 2026 周川 · Built with curiosity.",
  cKicker: "A QUIET INDEX OF IDEAS",
  cTitle: "刨花落尽，木纹方显。",
  cIntro: "这里收录技术实践、阅读札记与日常观察。每一篇笔记都可以被检索、连接，也可以继续生长。",
  cSearchPlaceholder: "搜索标题、摘要或主题…",
  cFeaturedTitle: "值得从这里开始",
  cRecentTitle: "最近更新",
  cBrowseTitle: "主题索引",
  cAsideTitle: "持续写作",
  cAsideText: "把注意力放在值得长期思考的问题上。",
} as const;

export type SiteCopy = { [K in keyof typeof defaultSiteCopy]: string };

export const siteCopyFields: Array<{ key: keyof SiteCopy; label: string; group: string; multiline?: boolean }> = [
  { key: "siteName", label: "站点名称", group: "全站" }, { key: "siteCode", label: "英文标识", group: "全站" }, { key: "authorName", label: "作者名", group: "全站" },
  { key: "navNotes", label: "导航：笔记", group: "全站" }, { key: "navTopics", label: "导航：专题", group: "全站" }, { key: "navAdmin", label: "导航：后台", group: "全站" },
  { key: "cKicker", label: "顶部小标题", group: "C 版" }, { key: "cTitle", label: "主标题", group: "C 版", multiline: true }, { key: "cIntro", label: "介绍文字", group: "C 版", multiline: true }, { key: "cSearchPlaceholder", label: "搜索提示", group: "C 版" },
  { key: "cFeaturedTitle", label: "精选栏目名", group: "C 版" }, { key: "cRecentTitle", label: "最近栏目名", group: "C 版" }, { key: "cBrowseTitle", label: "主题栏目名", group: "C 版" }, { key: "cAsideTitle", label: "侧栏标题", group: "C 版" }, { key: "cAsideText", label: "侧栏正文", group: "C 版", multiline: true },
  { key: "footerMotto", label: "页脚短句", group: "全站" }, { key: "footerLegal", label: "页脚版权", group: "全站" },
];
