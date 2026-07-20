import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { wikilinkRemark } from "../app/lib/wikilink-remark.ts";

// ─── Mock resolver ──────────────────────────────────────────────────

/**
 * Simulates a note resolver. Returns a slug/title pair for known notes,
 * null for unknown titles.
 */
function mockResolve(title) {
  const notes = {
    "Hello": { slug: "hello-world", title: "Hello World" },
    "Simple Title": { slug: "simple-title", title: "Simple Title" },
    "Test Note": { slug: "test-note", title: "Test Note" },
  };
  return notes[title] ?? null;
}

// ─── Helper ─────────────────────────────────────────────────────────

function processMarkdown(markdown) {
  return unified()
    .use(remarkParse)
    .use(wikilinkRemark(mockResolve))
    .use(remarkStringify)
    .processSync(markdown);
}

// ─── normalizeObsidianMath (duplicated for isolated testing) ────────
// Source: app/components/MarkdownBody.tsx

function normalizeObsidianMath(source) {
  const indentationWidth = (prefix) => {
    let column = 0;
    for (const character of prefix)
      column += character === "\t" ? 4 - (column % 4) : 1;
    return column;
  };
  let activeFence = null;
  const normalizedIndentation = source
    .split("\n")
    .map((line) => {
      const fence = line.match(/^([\t ]*)(?:[+*-]\s+)?(`{3,}|~{3,})(.*)$/);
      if (fence && (!activeFence || fence[2][0] === activeFence.marker)) {
        if (activeFence) {
          const closingIndent = activeFence.indent;
          activeFence = null;
          return `${" ".repeat(closingIndent)}${fence[2]}`;
        }
        const indent = indentationWidth(fence[1]);
        activeFence = { marker: fence[2][0], indent };
        return `${" ".repeat(indent)}${fence[2]}${fence[3]}`;
      }
      if (activeFence) return `${" ".repeat(activeFence.indent)}${line}`;
      const prefix = line.match(/^[\t ]+/)?.[0];
      if (!prefix?.includes("\t")) return line;
      const column = indentationWidth(prefix);
      return `${" ".repeat(column)}${line.slice(prefix.length)}`;
    })
    .join("\n");

  return normalizedIndentation
    .replace(
      /\\\[\s*([\s\S]*?)\s*\\\]/g,
      (_match, formula) => `$$\n${formula}\n$$`,
    )
    .replace(/\\\((.+?)\\\)/g, (_match, formula) => `$${formula}$`);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("wikilinkRemark plugin", () => {
  test("[[Simple Title]] resolves to link when note exists", () => {
    const result = String(processMarkdown("[[Simple Title]]"));
    assert.match(result, /\[Simple Title\]\(\/notes\/simple-title\)/);
  });

  test("[[Simple Title|Custom Text]] resolves with custom display text", () => {
    const result = String(processMarkdown("[[Simple Title|Custom Text]]"));
    assert.match(result, /\[Custom Text\]\(\/notes\/simple-title\)/);
    assert.doesNotMatch(result, /Simple Title/);
  });

  test("[[Nonexistent]] preserves text without link (resolver returns null)", () => {
    const result = String(processMarkdown("Before [[Nonexistent]] after"));
    // Should contain the display text but no link syntax
    assert.match(result, /Nonexistent/);
    assert.doesNotMatch(result, /\[/);
    assert.doesNotMatch(result, /\]\(\/notes\//);
  });

  test("multiple wikilinks in one paragraph all resolve", () => {
    const result = String(
      processMarkdown("See [[Hello]] and [[Simple Title]] here"),
    );
    assert.match(result, /\[Hello\]\(\/notes\/hello-world\)/);
    assert.match(result, /\[Simple Title\]\(\/notes\/simple-title\)/);
  });

  test("wikilink inside a code block is NOT parsed", () => {
    const markdown = "Para\n\n```\n[[Hello]]\n```\n\nAfter";
    const result = String(processMarkdown(markdown));
    // Code block content must remain literal
    assert.match(result, /\[\[Hello\]\]/);
    // No link should be generated inside the code block
    assert.doesNotMatch(result, /\/notes\/hello-world/);
  });

  test("resolver returns null → wikilink becomes plain text", () => {
    const result = String(processMarkdown("A [[Missing Title]] B"));
    // Brackets stripped, plain text remains
    assert.match(result, /Missing Title/);
    assert.doesNotMatch(result, /\[\[/);
    assert.doesNotMatch(result, /\]\]/);
    assert.doesNotMatch(result, /\]\(/);
  });

  test("wikilink inside inline code is NOT parsed", () => {
    const result = String(processMarkdown("See `[[Hello]]` here"));
    // Inline code keeps brackets literal
    assert.match(result, /\[\[Hello\]\]/);
    assert.doesNotMatch(result, /\/notes\/hello-world/);
  });

  test("normalizeObsidianMath + wikilink combined pipeline", () => {
    // Math delimiters AND wikilinks coexist in source text
    const source = "This is \\(x^2\\) and [[Hello]] here";
    const normalized = normalizeObsidianMath(source);
    // normalizeObsidianMath converts \(...\) to $...$
    assert.match(normalized, /\$x\^2\$/);
    assert.doesNotMatch(normalized, /\\\(/);
    // Wikilink syntax preserved for next pipeline step
    assert.match(normalized, /\[\[Hello\]\]/);

    const result = String(processMarkdown(normalized));
    // Both transformed: math delimiter converted, wikilink resolved
    assert.match(result, /\$x\^2\$/);
    assert.match(result, /\[Hello\]\(\/notes\/hello-world\)/);
  });
});
