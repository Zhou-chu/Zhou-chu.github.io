import type { Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

type Resolver = (title: string) => { slug: string; title: string } | null;

export function wikilinkRemark(resolver: Resolver): Plugin<[], Root> {
  return () => (tree) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || typeof index !== "number") return;
      const regex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
      const value = node.value;
      const matches = Array.from(value.matchAll(regex));
      if (matches.length === 0) return;

      const newNodes: Array<
        Text | { type: "link"; url: string; title: null; children: Text[] }
      > = [];
      let lastIndex = 0;

      for (const match of matches) {
        const matchIndex = match.index!;
        const rawTitle = match[1]?.trim() ?? "";
        const displayText = match[2]?.trim() ?? rawTitle;

        // Add text before this match
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: "text",
            value: value.slice(lastIndex, matchIndex),
          });
        }

        // Resolve wikilink
        const resolved = resolver(rawTitle);
        if (resolved) {
          newNodes.push({
            type: "link",
            url: `/notes/${resolved.slug}`,
            title: null,
            children: [{ type: "text", value: displayText }],
          });
        } else {
          // Unresolved: keep as plain text (remove brackets)
          newNodes.push({ type: "text", value: displayText });
        }

        lastIndex = matchIndex + match[0].length;
      }

      // Add remaining text
      if (lastIndex < value.length) {
        newNodes.push({ type: "text", value: value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...newNodes);
    });
  };
}
