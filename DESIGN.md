# Timber Field Notes — Public Design Contract

Canonical design token and component contract for the gm-2 public surfaces.
Every visual decision flows from this document. No raw values in product code.

**Status:** Active. Replaces the retired "Quiet Writing Desk" system.
**Scope:** Public routes only (`/`, `/archive`, `/notes/[slug]`, shared chrome and states).
**Admin Boundary:** Section 10 preserves backward-compatible legacy aliases for untouched
admin surfaces; admin tokens and selectors remain functional but are not part of
this contract.

---

## 1. Foundations & Intent

**Signature: "Timber Field Notes"**

Photography carries the wood; the UI is warm-white, ink, moss, hairlines, and
structural spacing. The material concept comes from one strong architectural
image and beam-like grid lines — never from brown decoration, wood textures, or
parchment cosplay.

### Visual Ratio

| Share | Concern |
| --- | --- |
| 60% | Minimal reading surfaces — warm-white body, editorial typography, generous whitespace |
| 20% | Timber structure — hero photography, beam-like section lines, year rails, hairlines |
| 15% | Engineering archive — log rows, material labels, numeric precision |
| 5%  | Restrained motion — 150–250ms transform/opacity transitions, line expansion |

### Principles

1. **Reading first, decoration second.** Every element earns its visual weight.
2. **Photography, not texture.** Timber comes from the hero image and structural
   grid lines — never from repeating grain, faux-wood CSS, or brown wash.
3. **Hairlines, not shadows.** Depth is conveyed through 1px borders and tonal
   surface shifts. Zero box-shadow. No elevation.
4. **Asymmetric editorial composition.** Hero/ledger/homepage use beam-like
   horizontal and vertical structure. Archive uses large-year rails.
   Never generic card grids or three-column blog walls.
5. **Light and dark designed together.** Every token has a declared light/dark
   pair. No dark-mode drift.
6. **Accessible by construction.** Contrast ≥ 4.5:1 on text, 44px touch targets,
   keyboard-navigable, reduced-motion safe.

---

## 2. Color Tokens

### 2.1 Semantic Map

| Token | Role |
| --- | --- |
| `--canvas` | Page chrome background: header, footer, rails, backdrops |
| `--paper` | Primary reading surface: article body, content panels, card backgrounds |
| `--ink` | Primary body text |
| `--muted` | Secondary text, metadata, timestamps, captions |
| `--faint` | Placeholder text, disabled labels, decorative rules |
| `--line` | Hairline borders, dividers, table rules |
| `--moss` | Links, interactive accents, focus rings, category indicators |
| `--timber` | Structural accents: year rails, hero overlay tint, section beam lines |
| `--code` | Code block and inline code background |
| `--error` | Error text, destructive actions, validation borders |
| `--success` | Success messages, confirmed states |

### 2.2 Light Tokens

| Token | Value | Contrast vs paper | Contrast vs canvas |
| --- | --- | --- | --- |
| `--canvas` | `#f3f1e9` | — | — |
| `--paper` | `#fbfaf6` | — | — |
| `--ink` | `#20211d` | 14.8:1 | 14.2:1 |
| `--muted` | `#66675e` | 5.3:1 | 5.0:1 |
| `--faint` | `#77786f` | 4.0:1 | 3.8:1 |
| `--line` | `#c8c5ba` | — | — |
| `--moss` | `#4f5d42` | 6.1:1 | 5.8:1 |
| `--timber` | `#76543f` | 5.8:1 | 5.5:1 |
| `--code` | `#1b1f1c` | — | — |
| `--error` | `#9a433a` | 5.1:1 | 4.9:1 |
| `--success` | `#4e6545` | 5.6:1 | 5.3:1 |

`--faint` may be used only for non-essential decorative elements; never for
body text, metadata, or interactive labels. `--line` has no contrast
requirement (decorative). `--code` is background-only; code text uses
`--ink` or a light foreground within code surfaces.

### 2.3 Dark Tokens

| Token | Value | Contrast vs paper | Contrast vs canvas |
| --- | --- | --- | --- |
| `--canvas` | `#171a17` | — | — |
| `--paper` | `#1d211d` | — | — |
| `--ink` | `#eeece5` | 12.9:1 | 12.1:1 |
| `--muted` | `#b3b5aa` | 5.8:1 | 5.4:1 |
| `--faint` | `#858980` | 4.2:1 | 3.9:1 |
| `--line` | `#3b4139` | — | — |
| `--moss` | `#9baa8a` | 5.0:1 | 4.7:1 |
| `--timber` | `#c29271` | 4.8:1 | 4.5:1 |
| `--code` | `#111411` | — | — |
| `--error` | `#e18b80` | 4.9:1 | 4.6:1 |
| `--success` | `#9bb18e` | 4.8:1 | 4.5:1 |

### 2.4 CSS Variable Declaration

```css
:root {
  /* Surfaces */
  --canvas: #f3f1e9;
  --paper: #fbfaf6;
  --code-surface: #1b1f1c;
  /* Text */
  --ink: #20211d;
  --muted: #66675e;
  --faint: #77786f;
  /* Accent */
  --moss: #4f5d42;
  --timber: #76543f;
  /* Status */
  --error: #9a433a;
  --success: #4e6545;
  /* Structure */
  --line: #c8c5ba;
}

:root[data-theme="dark"] {
  --canvas: #171a17;
  --paper: #1d211d;
  --code-surface: #111411;
  --ink: #eeece5;
  --muted: #b3b5aa;
  --faint: #858980;
  --moss: #9baa8a;
  --timber: #c29271;
  --error: #e18b80;
  --success: #9bb18e;
  --line: #3b4139;
}
```

### 2.5 Token Usage Rules

| Background | Text Colors Allowed |
| --- | --- |
| `--canvas` | `--ink`, `--muted` |
| `--paper` | `--ink`, `--muted`, `--moss` (link), `--error` (status) |
| `--code-surface` | `--ink` via a light-on-dark code theme |
| `--canvas` (dark) | `--ink`, `--muted` |
| `--paper` (dark) | `--ink`, `--muted`, `--moss`, `--error` |

Never place `--faint` text on `--code-surface`. Never use `--timber` as a
text color on `--paper` (reserved for structural accents and overlays).

---

## 3. Typography

### 3.1 Font Stacks

| Role | Stack | Weight |
| --- | --- | --- |
| Display / Reading | `"Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif` | 400, 700 |
| UI Controls | `"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif` | 400, 500, 600 |
| Code / Metadata | `"Cascadia Code", "Fira Code", "Consolas", "SF Mono", monospace` | 400 |

- **Display serif** (`--font-display`): hero titles, article headings, brand wordmark,
  large year rails, reading body.
- **UI sans** (`--font-control`): navigation, buttons, filters, labels, form elements,
  captions, metadata that is not a timestamp.
- **Mono** (`--font-mono`): code blocks, inline code, timestamps, log IDs,
  keyboard shortcuts, version strings.

### 3.2 Type Scale (1.25 modular, 16px base)

| Step | `rem` | `px` | Usage |
| --- | --- | --- | --- |
| `--text-xs` | `0.75rem` | 12px | Keyboard shortcuts, fine-print attribution |
| `--text-sm` | `0.875rem` | 14px | Timestamps, captions, metadata, footer |
| `--text-base` | `1rem` | 16px | Body, controls, list items, nav links |
| `--text-md` | `1.125rem` | 18px | Lead paragraphs, archive log summaries |
| `--text-lg` | `1.25rem` | 20px | Section headings, year labels |
| `--text-xl` | `1.5rem` | 24px | Article titles, page headings |
| `--text-2xl` | `1.875rem` | 30px | Homepage introduction heading |
| `--text-3xl` | `2.375rem` | 38px | Hero overlay title |
| `--text-4xl` | `3rem` | 48px | Reserved |

### 3.3 Typography Rules

- Body text minimum: `--text-base` (16px) at all breakpoints.
- Reading body uses `--font-display` with `line-height: 1.75` and
  `letter-spacing: 0`.
- Headings use `--font-display` with `line-height: 1.3` and
  `letter-spacing: -0.011em`.
- Controls use `--font-control` with `line-height: 1.5` and
  `letter-spacing: 0`.
- Code uses `--font-mono` with `line-height: 1.6`, size `--text-sm`.
- Metadata timestamps and log IDs use `--font-mono` at `--text-sm`.
- All font stacks and scale steps are CSS custom properties on `:root`.

```css
:root {
  --font-display: "Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif;
  --font-control: "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
  --font-mono: "Cascadia Code", "Fira Code", "Consolas", "SF Mono", monospace;
  --text-xs: 0.75rem;      --text-sm: 0.875rem;
  --text-base: 1rem;       --text-md: 1.125rem;
  --text-lg: 1.25rem;      --text-xl: 1.5rem;
  --text-2xl: 1.875rem;    --text-3xl: 2.375rem;
  --text-4xl: 3rem;
  --leading-body: 1.75;    --leading-heading: 1.3;
  --leading-control: 1.5;  --tracking-heading: -0.011em;
}
```

---

## 4. Spacing, Grid & Responsive

### 4.1 Base Unit

4px base unit. All spacing derives from multiples of `0.25rem`.

| Token | `rem` | `px` |
| --- | --- | --- |
| `--space-1` | `0.25rem` |  4px |
| `--space-2` | `0.5rem`  |  8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem`    | 16px |
| `--space-5` | `1.25rem` | 20px |
| `--space-6` | `1.5rem`  | 24px |
| `--space-8` | `2rem`    | 32px |
| `--space-10`| `2.5rem`  | 40px |
| `--space-12`| `3rem`    | 48px |
| `--space-16`| `4rem`    | 64px |
| `--space-20`| `5rem`    | 80px |
| `--space-24`| `6rem`    | 96px |

### 4.2 Reading Measure

| Property | Value |
| --- | --- |
| Article target | `720px` (max-width) |
| Article bounds | `680px` – `760px` inclusive |
| Homepage max content | `1240px` |
| Paragraph ideal | `60ch` – `75ch` |

### 4.3 Grid & Container

```css
:root {
  --container-max: 1240px;
  --container-reader: 720px;
  --grid-gap: var(--space-6);
  /* spacing tokens */
  --space-1: 0.25rem;   --space-2: 0.5rem;
  --space-3: 0.75rem;   --space-4: 1rem;
  --space-5: 1.25rem;   --space-6: 1.5rem;
  --space-8: 2rem;      --space-10: 2.5rem;
  --space-12: 3rem;     --space-16: 4rem;
  --space-20: 5rem;     --space-24: 6rem;
}
```

### 4.4 Responsive Breakpoints

| Name | Width | Target |
| --- | --- | --- |
| `xs` | `375px` — `767px` | Mobile portrait |
| `sm` | `768px` — `1023px` | Tablet |
| `md` | `1024px` — `1279px` | Small desktop |
| `lg` | `≥1280px` | Desktop |

### 4.5 Touch Targets

All interactive controls (links, buttons, toggles, filter pills, TOC items)
must have a minimum **44px × 44px** touch/click area. This is enforced by
min-height/min-width or padding, not by invisible hit-area expansion.

### 4.6 Responsive Rules

- Container centers with `margin: 0 auto` and horizontal padding
  `var(--space-4)` minimum.
- Homepage: hero + intro-left / recent-right on md+; single-column below sm.
- Article: 680–760px centered reading column; TOC as desktop right rail,
  mobile drawer.
- Archive: large-year left rail on md+; years inline on mobile; log rows
  remain single-column at all breakpoints.
- No horizontal overflow at any breakpoint.
- `content-visibility: auto` on long lists (archive).

---

## 5. Component & State Contracts

Every component contract defines anatomy, tokens, states, and behavior.
Implementation details live in component files; this section sets the
normative expectations.

### 5.1 Public Shell

**Anatomy:** `<SkipLink>` → `<Header>` → `<main>` → `<Footer>`.

**Tokens:**
- Header background: `var(--canvas)`, bottom border `1px solid var(--line)`.
- Footer background: `var(--canvas)`, top border `1px solid var(--line)`.
- Skip link: `var(--moss)` focus ring, off-screen until focused.

**Behavior:** Server-rendered shell. Only theme control is a client leaf
(island). Active nav state via `data-active` attribute.

### 5.2 Public Header

**Anatomy:** Brand wordmark (left, links to `/`), Primary navigation (center:
Home `/`, Archive `/archive`, Research anchor `#research`), Theme toggle (right).

**Tokens:**
- Height: 56px (mobile), 64px (desktop).
- Brand font: `var(--font-display)`, color: `var(--ink)`.
- Nav links: `var(--font-control)`, `var(--muted)` default, `var(--ink)` active.
- Active nav underline: `2px solid var(--moss)`.
- All targets ≥ 44px.

**States:** Default, active route.

### 5.3 Public Footer

**Anatomy:** Brand wordmark (left), Tagline (center), Year + admin link (right).

**Tokens:**
- Text: `var(--muted)`, font: `var(--font-control)`, size: `var(--text-sm)`.
- Padding: `var(--space-10) var(--space-4)`.
- Year: `var(--font-mono)`.

**Tagline:** `静心阅读，深思写作` (Read quietly, write deeply).

### 5.4 Theme Control

**Anatomy:** Icon/toggle button in header.

**Tokens:**
- Size: 44px × 44px minimum touch target.
- Color: `var(--muted)` default, `var(--moss)` hover.
- Border-radius: `2px`.

**States:** Default, hover, active, focus-visible.

**Behavior:** Toggles `data-theme` on `<html>`. Persists to `localStorage`
key `theme`. Falls back to `prefers-color-scheme`. Pre-hydration inline
script prevents flash.

### 5.5 Hero Figure

**Anatomy:** `<figure>` containing a locally-hosted `<img>` (via
`next/image`) and a visible compact `<figcaption>`.

**Tokens:**
- Image: `width: 100%`, `height: auto`, `object-fit: cover`, declared
  `object-position` from manifest.
- Caption font: `var(--font-mono)`, size: `var(--text-xs)`, color:
  `var(--muted)`.
- Caption links: `var(--moss)`, underline on hover.

**States:** Default (image loaded), Loading (reserved geometry, no layout
shift), Error (reserved geometry, alt text visible, caption remains).

**Behavior:** `priority` loading. `sizes="(max-width: 768px) 100vw, 1280px"`.
Explicit `width`/`height` from manifest. Caption must include creator,
source URL, license name + URL, and modification disclosure. Image is a
replaceable manifest entry (see Section 8).

### 5.6 Introduction Block (Homepage)

**Anatomy:** Heading, body paragraph, optional CTA.

**Tokens:**
- Heading: `var(--font-display)`, `var(--text-2xl)`, `var(--ink)`.
- Body: `var(--font-display)`, `var(--text-md)`, `var(--muted)`.
- Max-width: `45ch`.

**States:** Default. Present even with zero notes.

### 5.7 Recent Ledger (Homepage)

**Anatomy:** Section heading, up to five most-recent article rows.

**Each row:** Title (link to `/notes/<slug>`), Date (`var(--font-mono)`,
`var(--text-sm)`, `var(--muted)`), Category label.

**Tokens:**
- Row border-bottom: `1px solid var(--line)`.
- Row padding: `var(--space-3) 0`.
- Title: `var(--font-control)`, `var(--ink)`, `var(--text-base)`.
- Hover: title color becomes `var(--moss)`.

**States:** Default (1-5 rows), Empty — shows exact copy:
`尚无公开笔记 / 第一条研究记录发布后，将在这里出现。`

### 5.8 Research Index (Homepage)

**Anatomy:** Section heading, grid of category/label tiles with counts.

**Tokens:**
- Label: square, `var(--canvas)` background, `1px solid var(--line)`,
  `var(--font-control)`, `var(--text-sm)`, `var(--muted)`.
- Count: `var(--font-mono)`, `var(--text-xs)`, `var(--muted)`.
- Border-radius: `0`.

**States:** Default (categories present), Empty (no tiles, section hidden).

### 5.9 Archive Year Rail & Log Rows

**Anatomy:** Left rail with large sticky years (descending). Right column
with log rows. Client search/category filter bar.

**Year rail tokens:**
- Font: `var(--font-display)`, size: `var(--text-2xl)`, color: `var(--muted)`.
- Position: `sticky`, `top: var(--space-8)`.
- Width: `120px` (desktop), inline (mobile).

**Log row tokens:**
- Each row: `LOG-<id>` (mono, `var(--text-sm)`, `var(--faint)`),
  Month-Day (mono, `var(--text-sm)`, `var(--muted)`),
  Title (control, `var(--text-base)`, `var(--ink)`, link),
  Summary (display, `var(--text-sm)`, `var(--muted)`, 2-line clamp),
  Material label (square, 0-radius, see 5.10).
- Row border-bottom: `1px solid var(--line)`.
- Row padding: `var(--space-4) 0`.
- Hover: title → `var(--moss)`.

**Search/Filter bar tokens:**
- Input background: `var(--paper)`, border: `1px solid var(--line)`.
- Focus border: `var(--moss)`.
- Placeholder: `var(--faint)`.
- Height: 44px.
- Filter params mirrored in URL: `?q=` and `?material=`.

**States:**
- Default (rows populated).
- Empty: `档案尚空 / 公开笔记会按年份在这里归档。`
- Filtered-empty: "No matching notes" with clear-filters action.
- Loading: skeleton rows, opacity pulse.

### 5.10 Material Label (Category)

**Anatomy:** Small square label with category text.

**Tokens:**
- Font: `var(--font-control)`, size: `var(--text-xs)`.
- Color: `var(--muted)`.
- Background: transparent.
- Border: `1px solid var(--line)`.
- Border-radius: `0`.
- Padding: `var(--space-1) var(--space-2)`.

**States:** Default, Active (in archive filter: `var(--moss)` border and
text on active category).

### 5.11 Article Ruler (Metadata Strip)

**Anatomy:** Horizontal strip below article title, containing date, reading
time estimate, category label, and optional featured marker — separated by
hairline ticks.

**Tokens:**
- Border-top: `1px solid var(--line)`.
- Font: `var(--font-mono)` for date and time, `var(--font-control)` for
  category.
- Size: `var(--text-sm)`.
- Color: `var(--muted)`.
- Ticks: `1px solid var(--line)` vertical separators, `var(--space-2)` margin.

### 5.12 Article Body

**Anatomy:** Title → Ruler → Reading content → Backlink rows → Related rows.

**Tokens:**
- Max-width: `720px` (within `680–760` range), centered.
- Body font: `var(--font-display)`, `var(--text-base)`, `var(--ink)`.
- Heading font: `var(--font-display)`, color: `var(--ink)`.
- Paragraph spacing: `var(--space-5)`.
- Heading bottom margin: `var(--space-3)`.
- Link color: `var(--moss)`, underline on hover.

**Code blocks:**
- Background: `var(--code-surface)`.
- Text: syntax-highlighted with a light-on-dark theme.
- Border: `1px solid var(--line)`, border-radius: `2px`.
- Font: `var(--font-mono)`, size: `var(--text-sm)`.
- No grain, no warm tint behind code.

**Inline code:**
- Background: `var(--line)`, color: `var(--ink)`.
- Font: `var(--font-mono)`, size: `0.9em`.
- Padding: `0.1em 0.3em`, border-radius: `2px`.

**Math (KaTeX):**
- No decorative box, no background tint, no border.
- Color: `var(--ink)` in light, `var(--ink)` in dark.
- Display math: centered, `var(--space-4)` vertical margin.

**Images/media:** Max-width 100%, `height: auto`, `2px` border-radius,
`1px solid var(--line)` border.

**Heading anchors:** Deterministic IDs (slugger, duplicate-safe with `-2`,
`-3` suffixes). Visible on hover/focus via `::before` anchor link.

**Backlink rows:** `1px solid var(--line)` top border, `var(--font-control)`,
`var(--text-sm)`, title as `var(--moss)` link. Not cards.

**Related rows:** Same structure as recent ledger rows. Link to related
note slugs via Wikilink resolution.

### 5.13 Table of Contents (TOC)

**Anatomy (desktop):** Right-side sticky rail, `h2` + `h3` items, active
section highlight.

**Anatomy (mobile):** Drawer triggered by floating button, slide-in panel,
Escape to close, focus trap.

**Tokens:**
- Rail width: `200px`.
- Item font: `var(--font-control)`, size: `var(--text-sm)`.
- Item color: `var(--muted)` default, `var(--ink)` active.
- Active indicator: `2px solid var(--moss)` left border.
- Drawer background: `var(--paper)`, border-left: `1px solid var(--line)`.
- Button: 44px × 44px, `var(--muted)`, `var(--moss)` on hover.

**States:**
- Visible (≥2 eligible headings on page).
- Hidden (fewer than 2 `h2`/`h3` on page — component not rendered).
- Drawer open (`aria-expanded="true"`, focus trapped).
- Drawer closed (focus returned to trigger).

**Behavior:** Discovers rendered `h2`/`h3` IDs from SSR DOM. Active section
tracked via IntersectionObserver. Anchor clicks scroll to target with
reduced-motion-safe smooth behavior. Escape closes drawer. `aria-controls`
on trigger, `aria-labelledby` on panel.

### 5.14 State Panels (Loading / Zero / Filter-Empty / Error / 404)

**Anatomy:** Centered content block with message and optional action.

**Tokens:**
- Background: transparent (inherits parent surface).
- Text: heading `var(--font-display)`, body `var(--font-control)`.
- Color: `var(--muted)` for body, `var(--ink)` for heading.
- Max-width: `480px`, centered.

**Variants:**

| State | Heading | Body | CTA |
| --- | --- | --- | --- |
| Loading | — | Skeleton pulse (opacity 0.5–0.7, 1.2s cycle) | — |
| Zero (home) | — | `尚无公开笔记 / 第一条研究记录发布后，将在这里出现。` | — |
| Zero (archive) | — | `档案尚空 / 公开笔记会按年份在这里归档。` | — |
| Filter-Empty | `没有匹配的笔记` | `试试调整筛选条件或搜索关键词。` | Clear filters |
| Error | `页面加载出错` | `请检查网络连接后重试。` | Retry |
| 404 | `页面未找到` | `您访问的页面不存在或已被移除。` | Return home |

**Behavior:** Skeleton pulse respects `prefers-reduced-motion` (static
opacity 0.6). Error state distinguishes genuine server failure from
missing-slug 404 (see route contracts in Section 6).

---

## 6. Page Wireframes

### 6.1 Homepage (`/`)

```
┌─────────────────────────────────────────┐
│ HEADER  (canvas, line-bottom)           │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ HERO FIGURE (image + figcaption)    │ │
│ └─────────────────────────────────────┘ │
│ ┌──────────────┐ ┌───────────────────┐  │
│ │ INTRODUCTION │ │ RECENT LEDGER     │  │
│ │ (left, 40%)  │ │ (right, 60%)      │  │
│ │ heading +    │ │ section heading   │  │
│ │ body text    │ │ row 1..5          │  │
│ │              │ │ empty copy on 0   │  │
│ └──────────────┘ └───────────────────┘  │
│ ┌─────────────────────────────────────┐ │
│ │ RESEARCH INDEX (full-width, below)  │ │
│ │ category tiles grid                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ FOOTER  (canvas, line-top)              │
└─────────────────────────────────────────┘
```

Hero and introduction remain visible when there are zero notes; only the
recent ledger shows empty copy.

### 6.2 Archive (`/archive`)

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ SEARCH & FILTER BAR                 │ │
│ │ [input] [material filter pills]     │ │
│ └─────────────────────────────────────┘ │
│ ┌──────┐ ┌────────────────────────────┐ │
│ │ YEAR │ │ LOG ROWS (per year group)  │ │
│ │ RAIL │ │ LOG-001 │ Jan 15 │ Title  │ │
│ │ 2026 │ │ LOG-002 │ Mar 02 │ Title  │ │
│ │      │ │ ...                        │ │
│ │ 2025 │ │ (group repeats)            │ │
│ │      │ │                            │ │
│ │ 2024 │ │ Empty state on zero notes  │ │
│ └──────┘ └────────────────────────────┘ │
├─────────────────────────────────────────┤
│ FOOTER                                  │
└─────────────────────────────────────────┘
```

Years descending, sticky left rail. Log rows single link per row. Material
labels as square tags. No imagery. `content-visibility: auto` for long lists.

### 6.3 Article (`/notes/[slug]`)

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
├─────────────────────────────────────────┤
│ ┌──────────────────┬──────────────────┐ │
│ │ ARTICLE (720px)  │ TOC RAIL (200px) │ │
│ │                  │ (desktop only)   │ │
│ │ Title            │ ┌─ h2 heading    │ │
│ │ ─── ruler ───   │ │  ├─ h3 sub     │ │
│ │                  │ │  ├─ h3 sub     │ │
│ │ Body content     │ ├─ h2 heading    │ │
│ │                  │ │                │ │
│ │ Code blocks      │ (hidden if < 2   │ │
│ │                  │  eligible heads) │ │
│ │ Math display     │                  │ │
│ │                  │ [mobile: TOC     │ │
│ │ Backlinks ───   │  drawer button]  │ │
│ │ Related rows     │                  │ │
│ └──────────────────┴──────────────────┘ │
├─────────────────────────────────────────┤
│ FOOTER                                  │
└─────────────────────────────────────────┘
```

### 6.4 Route States

| Route | Loading | Error | Empty | 404 |
| --- | --- | --- | --- | --- |
| `/` | SSR only — no client loading | Error boundary | Hero + intro + empty ledger copy | Not applicable (always renders) |
| `/archive` | Skeleton rows | Error boundary | Empty archive copy | Not applicable |
| `/notes/[slug]` | SSR only | Error boundary (DB failure) | — | 404 page (missing slug) |
| `/c` | Permanent redirect (301/308) to `/` | — | — | — |
| Any unknown | — | — | — | 404 page |

Error boundary distinguishes DB/server failure from missing content: only
`notFound()` for missing slugs; route error boundary for genuine failures.

---

## 7. Motion, Accessibility & Performance

### 7.1 Duration Scale

| Tier | Duration | Usage |
| --- | --- | --- |
| Micro | `150ms` | Hover color shifts, focus ring transitions |
| Standard | `180ms` | TOC active-section highlight, filter pill toggle |
| Emphasis | `220ms` | TOC drawer open/close, mobile menu (if any) |
| Reveal | `250ms` | Hero subtle crop shift on load, first-paint fade |

### 7.2 Easing

| Name | Value | Usage |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entering elements |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting elements |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus, theme |

### 7.3 Animation Properties Rule

**Only `transform` and `opacity` may be animated.** Never animate `width`,
`height`, `top`, `left`, `margin`, `padding`, `border-width`, `box-shadow`,
or `color` directly (use `opacity` on layered pseudo-elements for shadow/color
transitions).

### 7.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Skeleton pulse becomes static (`opacity: 0.6`). TOC drawer opens instantly.
Anchor scrolls use `scroll-behavior: auto`.

### 7.5 Accessibility

- All interactive elements: minimum 44×44px touch/click area.
- Focus visible: `:focus-visible` ring at `2px solid var(--moss)`,
  `2px` offset. Never remove focus outline for mouse users.
- Skip link: first focusable element, links to `#main-content`.
- Semantic HTML: `header/nav/main/footer`, `h1–h4` hierarchy,
  `aria-current="page"` on active nav.
- TOC: `aria-expanded`, `aria-controls` on drawer trigger; focus
  trap in open drawer; Escape closes; focus returns to trigger.
- Theme toggle: `aria-label`, `aria-pressed` (or equivalent role).
- Images: `alt` text on all content images; decorative images use
  `alt=""` or CSS background.
- Color contrast: ≥ 4.5:1 for all text (see Section 2 tables). Only
  `--faint` and `--line` are exempt.

### 7.6 Performance

- Server-rendered route shells. Only theme control, archive filter,
  and TOC are client leaves.
- No page-wide `use client`.
- `content-visibility: auto` on archive log list.
- Hero image: explicit `width`/`height`, `priority` preload, responsive
  `sizes`, local `next/image` optimization.
- No runtime UI, animation, icon, or Markdown libraries beyond the
  existing React/Next/Vinext + remark/rehype stack.
- Dev-only: react-grab + react-scan/lite gated behind
  `NODE_ENV === 'development'`.
- Production Lighthouse targets: 100 Performance, 100 Accessibility,
  100 Best Practices, 100 SEO on mobile and desktop for every public
  route. CLS < 0.1.

---

## 8. Licensed Hero Attribution & Replacement

### 8.1 Initial Asset

| Field | Value |
| --- | --- |
| Title | Ryoanji Temple — Kuri Main Building Interior |
| Creator | Tedmoseby |
| Source | `https://commons.wikimedia.org/wiki/File:Ryoanji_Temple_-_Kuri_Main_Building_Interior.jpg` |
| License | CC BY-SA 3.0 |
| License URL | `https://creativecommons.org/licenses/by-sa/3.0/deed.en` |
| Modifications | Cropped, converted to optimized web format |
| Local path | `public/images/timber/ryoanji-kuri.{avif,webp,jpg}` |
| Dimensions | 3456×2304 (intrinsic) |

### 8.2 Attribution Requirement

Every page that displays the hero MUST render a visible compact
`<figcaption>` containing:

> Photo: Tedmoseby — [Commons source] — CC BY-SA 3.0 (cropped/converted)

Creator name and source link are hyperlinks. License name links to the
license deed. Modification note is plain text.

### 8.3 One-Manifest Replacement Workflow

All replaceable hero properties are centralized in one typed manifest
module under `app/lib/public-visuals.ts`:

```ts
export const homeHero = {
  src: "/images/timber/ryoanji-kuri.avif",
  width: 3456,
  height: 2304,
  alt: "Ryoanji Temple — Kuri Main Building Interior",
  objectPosition: "center 40%",
  creator: "Tedmoseby",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Ryoanji_Temple_-_Kuri_Main_Building_Interior.jpg",
  licenseName: "CC BY-SA 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/deed.en",
  modificationNote: "Cropped and converted to optimized web format",
};
```

To replace the hero: (1) place new image under `public/images/timber/`,
(2) update the manifest fields. No other file or component edit is required.
The source/license fields are independent from site-copy CMS data.

### 8.4 Constraints

- Hero image MUST be locally hosted under `public/images/timber/`.
- Never hotlink the Commons image or any third-party URL as `src`.
- The hero image MUST NOT be used as the OpenGraph / meta image.
- Attribution is required on every render; it is not dismissible.

---

## 9. Must NOT Have (Prohibited Patterns)

This section explicitly retires the "Quiet Writing Desk" / green-era public
design and prohibits specific patterns. Every prohibition maps to a
verifiable absence check.

### 9.1 Retired Component Contracts

| Retired | Replacement |
| --- | --- |
| `ReaderDialog` (modal reading) | Full article page at `/notes/[slug]` |
| Three-card / featured-card wall | Hero + introduction + recent ledger on `/` |
| Card-grid layouts | Asymmetric beam/grid editorial composition |
| Walnut frame around every container | Hairline `--line` borders on canvas |
| Brass-hover / brass-active pill buttons | Moss accent on text and borders |
| Parchment reading surfaces | Warm-white `--paper` (#fbfaf6 / #1d211d) |
| Global body grain (CSS/SVG `feTurbulence`) | Texture allowed ONLY as low-opacity overlay on hero figure and timber structural rail; never behind article or archive text |
| Brown pill stacks | Square 0-radius material labels |
| Heavy box-shadows (`--shadow-card`, `--shadow-dialog`, etc.) | Zero shadow. Depth via 1px hairlines and tonal surface shifts |
| Wood frames as decorative borders | Structural beam-like section lines only |
| 3D flip/door effects, particles, scroll hijacking | No runtime animation library |
| Decorative floating objects | No decorative-only DOM elements |

### 9.2 Retired Public Tokens

These tokens MUST NOT appear in public CSS or components:

```
--surface-walnut-frame       --green
--surface-walnut-rail        --mint
--surface-dialog-backdrop    --deep
--text-on-walnut             --accent-vermillion
--border-line-strong         --accent-brass-hover
--shadow-card                --accent-brass-active
--shadow-card-hover          --status-warning
--shadow-header              --status-info
--shadow-dialog              --olive
--surface-paper (old value)  --soft-shadow
--surface-paper-deep
--text-faint (old value)
```

### 9.3 Prohibited Visual Patterns

- Repeating wood textures, faux-wood CSS patterns, or brown washes on
  any surface.
- Parchment-colored backgrounds (`#f3eddf`, `#e8deca`, or
  yellow-warm paper tones) in public routes.
- "Western/retro wood-sign" typography (serif display fonts associated
  with wood-working shop branding).
- Page-wide client hydration (`use client` on route page or layout).
- Emojis as icons. Use custom SVG or Unicode text indicators.
- Horizontal scroll at any breakpoint.
- Layout-property animation (`width`, `height`, `margin`, `padding`,
  `border-width`, `box-shadow` animated directly).
- `<body>` or `<main>` pseudo-element grain overlays.

---

## 10. Legacy Admin Boundary

### 10.1 Compatibility Aliases

Admin surfaces under `app/admin/` are NOT redesigned by this contract.
They may continue using their existing tokens and selectors as long as
public and admin CSS do not collide. The following CSS custom properties
are retained as compatibility aliases on `:root` so admin CSS continues
to render correctly:

```css
/* Admin compatibility aliases — do not use in public components */
:root {
  --surface-paper-legacy: #f3eddf;
  --surface-paper-deep-legacy: #e8deca;
  --surface-walnut-frame-legacy: #3d3226;
  --surface-walnut-rail-legacy: #5c4a38;
  --text-on-walnut-legacy: #ece4d5;
  --border-line-strong-legacy: #b0a288;
  --accent-vermillion-legacy: #b44a32;
  --accent-brass-hover-legacy: #c77d28;
  --accent-brass-active-legacy: #9e6120;
}
```

Admin components reference these aliases directly. Public components MUST
NOT reference any `*-legacy` token. Admin `ErrorBoundary` (`app/components/ErrorBoundary.tsx`)
remains behaviorally intact; it may continue using its existing styles
via legacy aliases.

### 10.2 Scope Separation

- `app/globals.css`: public token declarations + legacy admin aliases.
- `app/admin/`: no public token import required; uses legacy aliases
  or its own scoped styles.
- `app/c/c.css`: retired as part of homepage removal (Todo 8).
- `app/notes/[slug]/note.css`: replaced by public article styles
  scoped to `/notes/[slug]`.

---

## Appendix A: Token Quick Reference

```
--canvas    --paper    --code-surface
--ink       --muted    --faint
--moss      --timber   --line
--error     --success

--font-display    --font-control    --font-mono
--text-xs .. --text-4xl
--leading-body    --leading-heading    --leading-control
--tracking-heading

--space-1 .. --space-24
--container-max    --container-reader    --grid-gap

--ease-out    --ease-in    --ease-standard
```

## Appendix B: Component Token Map

| Component | Background | Text | Border | Accent | Font |
| --- | --- | --- | --- | --- | --- |
| Public Shell | canvas | — | line (bot/top) | — | — |
| Header | canvas | ink/muted | line (bot) | moss (active) | display/control |
| Footer | canvas | muted | line (top) | — | control/mono |
| Theme Toggle | transparent | muted | — | moss (hover) | — |
| Hero Figure | — | muted (caption) | — | moss (link) | mono |
| Introduction | paper | ink/muted | — | — | display |
| Recent Ledger | paper | ink/muted | line (row bot) | moss (hover) | control/mono |
| Research Index | canvas | muted | line | — | control/mono |
| Search/Filter | paper | ink/faint | line/moss | — | control |
| Material Label | transparent | muted | line | moss (active) | control |
| Archive Rail | canvas | muted | — | — | display |
| Archive Log Row | paper | ink/muted/faint | line (row bot) | moss (hover) | control/mono |
| Article Ruler | paper | muted | line | — | mono/control |
| Article Body | paper | ink | — | moss (link) | display/control/mono |
| Code Block | code-surface | light-on-dark | line | — | mono |
| TOC Rail/Drawer | paper | ink/muted | line | moss (active) | control |
| Backlink Row | paper | ink/muted | line (top) | moss (link) | control |
| State Panel | inherit | ink/muted | — | — | display/control |
| 404 Page | canvas | ink/muted | — | moss (link) | display/control |

## Appendix C: Design Validation Checklist

- [ ] Every color value in public CSS references a `--*` token from this contract.
- [ ] Every spacing value is a multiple of 4px (`--space-N`).
- [ ] Article computed reading width is 680–760px (target 720px) at desktop.
- [ ] All interactive elements have ≥ 44×44px touch/click area.
- [ ] Ink/muted/moss/error contrast ≥ 4.5:1 on their declared backgrounds.
- [ ] Only `transform` and `opacity` properties are animated; durations are
  150/180/220/250ms.
- [ ] `prefers-reduced-motion: reduce` disables all animations.
- [ ] `data-theme` toggles between light/dark token sets without flash.
- [ ] Hero `<figure>` includes visible creator/source/license/modification.
- [ ] No `ReaderDialog`, card wall, global grain, walnut frame, parchment,
  brass pill, green-era token, box-shadow, emoji icon, or brown wash
  appears in public code.
- [ ] Admin surfaces render correctly with legacy aliases.
- [ ] No `use client` on any public route page or layout.
