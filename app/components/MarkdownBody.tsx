import { Fragment, type ReactNode } from "react";

const tokenPattern = /(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|==[^=]+==|\[[^\]]+\]\([^)]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(tokenPattern).filter((part) => part !== "").map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"width:(\d+)")?\)$/);
    if (image) return <img key={index} src={image[2]} alt={image[1]} style={image[3] ? { maxWidth: `${image[3]}px` } : undefined} loading="lazy" />;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith("==") && part.endsWith("==")) return <mark key={index}>{part.slice(2, -2)}</mark>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const internal = link[2].startsWith("/") || link[2].startsWith("#");
      return <a key={index} href={link[2]} target={internal ? undefined : "_blank"} rel={internal ? undefined : "noreferrer"}>{link[1]}</a>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{3,}/.test(line) && line.includes("|");

export function MarkdownBody({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={blocks.length}><code data-language={language || undefined}>{code.join("\n")}</code></pre>);
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(cells(lines[index++]));
      blocks.push(<div className="markdown-table-wrap" key={blocks.length}><table><thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }

    if (/^\s*[-*+] /.test(line)) {
      const items: Array<{ text: string; checked?: boolean }> = [];
      while (index < lines.length && /^\s*[-*+] /.test(lines[index])) {
        const text = lines[index++].replace(/^\s*[-*+]\s+/, "");
        const task = text.match(/^\[([ xX])\]\s+(.*)$/);
        items.push(task ? { text: task[2], checked: task[1].toLowerCase() === "x" } : { text });
      }
      blocks.push(<ul key={blocks.length}>{items.map((item, itemIndex) => <li key={itemIndex} className={item.checked !== undefined ? "task-item" : undefined}>{item.checked !== undefined && <input type="checkbox" checked={item.checked} readOnly />}{inline(item.text)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\. /.test(lines[index])) items.push(lines[index++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={blocks.length}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>);
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) quote.push(lines[index++].replace(/^>\s?/, ""));
      const callout = quote[0]?.match(/^\[!([^\]]+)\][+-]?\s*(.*)$/);
      blocks.push(<blockquote key={blocks.length} className={callout ? "obsidian-callout" : undefined}>{callout && <strong>{callout[2] || callout[1]}</strong>}{inline((callout ? quote.slice(1) : quote).join(" "))}</blockquote>);
      continue;
    }

    if (line === "---" || line === "***") { blocks.push(<hr key={blocks.length} />); index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const content = inline(heading[2]);
      const key = blocks.length;
      const id = heading[2].replace(/[*_`]/g, "").trim();
      const level = heading[1].length;
      blocks.push(level === 1 ? <h1 id={id} key={key}>{content}</h1> : level === 2 ? <h2 id={id} key={key}>{content}</h2> : <h3 id={id} key={key}>{content}</h3>);
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|>|```|\s*[-*+]\s|\s*\d+\.\s|---$|\*\*\*$)/.test(lines[index])) {
      if (lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) break;
      paragraph.push(lines[index++]);
    }
    blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "))}</p>);
  }

  return <>{blocks}</>;
}
