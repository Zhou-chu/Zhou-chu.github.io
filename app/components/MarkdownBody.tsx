import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark-dimmed.css";
import { slugifyHeading } from "../lib/heading-slugger";

function normalizeObsidianMath(source: string) {
  const indentationWidth = (prefix: string) => {
    let column = 0;
    for (const character of prefix) column += character === "\t" ? 4 - (column % 4) : 1;
    return column;
  };
  let activeFence: { marker: "`" | "~"; indent: number } | null = null;
  const normalizedIndentation = source.split("\n").map((line) => {
    const fence = line.match(/^([\t ]*)(?:[+*-]\s+)?(`{3,}|~{3,})(.*)$/);
    if (fence && (!activeFence || fence[2][0] === activeFence.marker)) {
      if (activeFence) {
        const closingIndent = activeFence.indent;
        activeFence = null;
        return `${" ".repeat(closingIndent)}${fence[2]}`;
      }
      const indent = indentationWidth(fence[1]);
      activeFence = { marker: fence[2][0] as "`" | "~", indent };
      return `${" ".repeat(indent)}${fence[2]}${fence[3]}`;
    }
    if (activeFence) return `${" ".repeat(activeFence.indent)}${line}`;
    const prefix = line.match(/^[\t ]+/)?.[0];
    if (!prefix?.includes("\t")) return line;
    const column = indentationWidth(prefix);
    return `${" ".repeat(column)}${line.slice(prefix.length)}`;
  }).join("\n");

  return normalizeMathDelimiters(normalizedIndentation)
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_match, formula: string) => `$$\n${formula}\n$$`)
    .replace(/\\\((.+?)\\\)/g, (_match, formula: string) => `$${formula}$`);
}

/**
 * Obsidian（MathJax）允许把 `$$…$$` 用在行内、引用块、列表缩进等非标准位置，
 * 但 remark-math 只认「独占一行的 `$$`」块定界符，其他用法会错配定界符、把整段
 * 正文吞进 KaTeX 错误按红色源码显示。这里统一规范化为 remark-math 可识别的形态：
 * 引用块/残尾星定界行 → 独立 `$$`；独占一行的 `$$x$$` → 多行块（保留 display 意图）；
 * 其余行内 `$$x$$` → `$x$`；残留 `$$` → `$`。
 */
function normalizeMathDelimiters(source: string) {
  // Obsidian（MathJax）容忍各种非规范的 `$$` 用法（引用块、列表缩进、行内、
  // 与公式同行……），remark-math 只认「独占一行的 $$」块定界符，其他用法会
  // 错配定界符、把整段正文吞进 KaTeX 错误（红色源码）。逐行状态机统一规范化。
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inBlock = false;
  for (const raw of lines) {
    const line = raw;
    const s = line.replace(/^[ \t]*(?:>[ \t]*)*/, "");
    // 1) 独立定界行（含 `$$*` 残尾）
    if (/^\$\$\*?[ \t]*$/.test(s)) {
      inBlock = !inBlock;
      out.push("$$");
      continue;
    }
    // 2) 块内内容行：去引用前缀/缩进与残余定界符；若行尾带 `$$` 则就地闭合
    if (inBlock) {
      const inner = s.replace(/^[ \t]*/, "").replace(/^\$\$/, "");
      const closesHere = /\$\$[ \t]*$/.test(inner);
      out.push(inner.replace(/\$\$[ \t]*$/, ""));
      if (closesHere) {
        out.push("$$");
        inBlock = false;
      }
      continue;
    }
    // 3) 独占一行的单行数学块 `$$x$$` → 多行块（保留展示意图）
    const single = s.match(/^\$\$([^$\n]+?)\$\$[ \t]*$/);
    if (single) {
      out.push("$$", single[1].trim(), "$$");
      continue;
    }
    // 4) 行首 `$$` 后带内容（多行块开场）
    const opener = s.match(/^\$\$([\s\S]+)$/);
    if (opener && !opener[1].includes("$$")) {
      out.push("$$");
      out.push(opener[1].trim());
      inBlock = true;
      continue;
    }
    // 5) 行尾 `$$`（多行块收场，内容无 $）
    const closer = s.match(/^([^$\n]+?)\$\$[ \t]*$/);
    if (closer) {
      out.push(closer[1].trim(), "$$");
      continue;
    }
    // 6) 普通行：行内 `$$x$$` → `$x$`；残余 `$$`（散落）直接删除，否则会与
    //    后续行内数学错配成对、吞掉散文
    out.push(line.replace(/\$\$([^$\n]+?)\$\$/g, (_match, body: string) => `$${body}$`).replace(/\$\$+/g, ""));
  }
  return out.join("\n");
}

/**
 * Recursively extract plain text from React children (strings, numbers,
 * arrays, and elements with `props.children`). Handles inline code, links,
 * emphasis, and other inline formatting that react-markdown produces.
 */
export function extractTextContent(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join("");
  if (node && typeof node === "object" && "props" in node) {
    const children = (node as { props?: { children?: ReactNode } }).props?.children;
    return children != null ? extractTextContent(children) : "";
  }
  return "";
}

interface MarkdownBodyProps {
  source: string;
  /** When true, render deterministic `id` attributes on `h2` and `h3`.
   *  Default false — admin preview (and existing callers) are unchanged. */
  headingIds?: boolean;
}

export function MarkdownBody({ source, headingIds = false }: MarkdownBodyProps) {
  const usedSlugs = headingIds ? new Set<string>() : null;

  return <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[
      [rehypeKatex, { strict: false, throwOnError: false }],
      [rehypeHighlight, { detect: true, ignoreMissing: true }],
    ]}
    components={{
      a({ href, children, node: _node, ...props }) {
        const internal = href?.startsWith("/") || href?.startsWith("#");
        return <a href={href} target={internal ? undefined : "_blank"} rel={internal ? undefined : "noreferrer"} {...props}>{children}</a>;
      },
      img({ title, alt, node: _node, ...props }) {
        const width = title?.match(/^width:(\d+)$/)?.[1];
        return <img {...props} alt={alt || ""} title={width ? undefined : title} style={width ? { maxWidth: `${width}px` } : undefined} loading="lazy" />;
      },
      code({ className, children, node: _node, ...props }) {
        const language = className?.match(/language-([\w-]+)/)?.[1];
        return <code className={className} data-language={language} {...props}>{children}</code>;
      },
      ...(headingIds && usedSlugs ? {
        h2({ children, node: _node, ...props }: Record<string, unknown>) {
          const text = extractTextContent(children as ReactNode);
          const id = slugifyHeading(text, usedSlugs);
          return <h2 id={id} {...props}>{children as ReactNode}</h2>;
        },
        h3({ children, node: _node, ...props }: Record<string, unknown>) {
          const text = extractTextContent(children as ReactNode);
          const id = slugifyHeading(text, usedSlugs);
          return <h3 id={id} {...props}>{children as ReactNode}</h3>;
        },
      } : {}),
    }}
  >{normalizeObsidianMath(source)}</ReactMarkdown>;
}
