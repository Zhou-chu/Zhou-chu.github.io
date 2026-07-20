/**
 * Dependency-free heading slugger for deterministic article heading anchors.
 * Normalizes Chinese / Latin / emoji / punctuation text into URL-safe IDs.
 * Safe to import from both server and client — zero dependencies.
 *
 * Features:
 * - Preserves CJK characters, Latin letters, digits, and emoji
 * - Strips punctuation and replaces whitespace with hyphens
 * - Appends stable `-2`, `-3` suffixes for duplicate headings via a usage set
 * - Handles empty / whitespace / special-char-only headings gracefully
 */

// Characters kept as-is in IDs: letters, digits, CJK scripts, emoji.
// Punctuation, symbols, and separators (even non-ASCII ones like fullwidth
// punctuation and em dashes) are replaced with hyphens.
function isCodePointIdSafe(cp: number): boolean {
  // ASCII letters and digits
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return true;
  if (cp >= 0x30 && cp <= 0x39) return true;

  // Latin Extended (accented letters: U+00C0–U+024F)
  if (cp >= 0x00c0 && cp <= 0x024f) return true;

  // Greek & Coptic, Cyrillic
  if (cp >= 0x0370 && cp <= 0x052f) return true;

  // CJK Radicals Supplement
  if (cp >= 0x2e80 && cp <= 0x2fdf) return true;

  // Hiragana, Katakana (incl. phonetic extensions)
  if (cp >= 0x3040 && cp <= 0x30ff) return true;
  if (cp >= 0x31f0 && cp <= 0x31ff) return true;

  // Bopomofo
  if (cp >= 0x3100 && cp <= 0x312f) return true;

  // CJK Compatibility
  if (cp >= 0x3300 && cp <= 0x33ff) return true;

  // CJK Unified Ideographs Extension A
  if (cp >= 0x3400 && cp <= 0x4dbf) return true;

  // CJK Unified Ideographs
  if (cp >= 0x4e00 && cp <= 0x9fff) return true;

  // CJK Compatibility Ideographs
  if (cp >= 0xf900 && cp <= 0xfaff) return true;

  // Fullwidth Latin letters A-Z, a-z, and digits 0-9
  if (cp >= 0xff21 && cp <= 0xff3a) return true;
  if (cp >= 0xff41 && cp <= 0xff5a) return true;
  if (cp >= 0xff10 && cp <= 0xff19) return true;

  // Halfwidth Katakana
  if (cp >= 0xff61 && cp <= 0xff9f) return true;

  // Hangul Syllables
  if (cp >= 0xac00 && cp <= 0xd7af) return true;

  // Emoji / pictographs (Misc Symbols, Emoticons, Transport, Supplements)
  if (cp >= 0x2600 && cp <= 0x27bf) return true;
  if (cp >= 0x1f300 && cp <= 0x1f9ff) return true;
  if (cp >= 0x1fa00 && cp <= 0x1fa6f) return true;

  // Supplementary planes (U+10000+): rare scripts, more emoji, historic characters
  if (cp >= 0x10000) return true;

  // Everything else (punctuation, symbols, fullwidth punctuation like U+FF1A,
  // dashes like U+2014, separators) → treated as non-ID-safe
  return false;
}

function codePointLength(cp: number): number {
  return cp > 0xffff ? 2 : 1;
}

/**
 * Convert heading text to a URL-safe slug.
 *
 * When `used` is provided, guarantees uniqueness by appending `-2`, `-3`, etc.
 * and adds the resulting slug to the set. When omitted, returns the base slug
 * without suffix logic.
 */
export function slugifyHeading(text: string, used?: Set<string>): string {
  // Step 1 — trim and handle empty / whitespace input
  const trimmed = text.trim();
  if (!trimmed) {
    return uniqueAppend("heading", used);
  }

  // Step 2 — build slug: keep id-safe chars, replace others with hyphens
  const segments: string[] = [];
  for (let i = 0; i < trimmed.length; ) {
    const cp = trimmed.codePointAt(i)!;
    if (isCodePointIdSafe(cp)) {
      segments.push(String.fromCodePoint(cp));
    } else if (cp === 0x20 || cp === 0x09) {
      // Whitespace → hyphen (collapse consecutive)
      if (segments.length > 0 && segments[segments.length - 1] !== "-") {
        segments.push("-");
      }
    } else {
      // Punctuation / symbol → hyphen (collapse)
      if (segments.length > 0 && segments[segments.length - 1] !== "-") {
        segments.push("-");
      }
    }
    i += codePointLength(cp);
  }

  // Step 3 — collapse multi-hyphens, trim edges, lowercase
  let slug = segments
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  // Step 4 — fallback for texts that produce empty slugs (e.g., all-punctuation)
  if (!slug) {
    slug = "heading";
  }

  return uniqueAppend(slug, used);
}

function uniqueAppend(base: string, used?: Set<string>): string {
  if (!used) return base;

  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  used.add(candidate);
  return candidate;
}
