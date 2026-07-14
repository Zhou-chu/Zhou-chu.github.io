import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark-dimmed.css";

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

  return normalizedIndentation
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_match, formula: string) => `$$\n${formula}\n$$`)
    .replace(/\\\((.+?)\\\)/g, (_match, formula: string) => `$${formula}$`);
}

export function MarkdownBody({ source }: { source: string }) {
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
    }}
  >{normalizeObsidianMath(source)}</ReactMarkdown>;
}
