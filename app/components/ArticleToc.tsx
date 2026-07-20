"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, type MouseEvent, type KeyboardEvent } from "react";

interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Client-only table of contents for article pages.
 *
 * Reads the rendered heading DOM to discover `h2` / `h3` elements that carry
 * deterministic SSR `id` attributes. Provides:
 * - Desktop: sticky right-side rail
 * - Mobile: floating trigger button → slide-in drawer
 * - IntersectionObserver active-section tracking
 * - Escape close, focus return, reduced-motion-safe scroll
 * - Hidden when fewer than 2 eligible headings exist
 *
 * Styling is inline (no CSS module) to keep the component self-contained.
 * Tokens reference the DESIGN.md contract: paper, ink, muted, line, moss.
 */
export function ArticleToc() {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Discover headings from the DOM ──────────────────────────────
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading rendered DOM headings on mount is the canonical TOC pattern; no cascading renders at scale
  useLayoutEffect(() => {
    const els = document.querySelectorAll<HTMLHeadingElement>(
      ".note-body h2[id], .note-body h3[id]",
    );
    const items: TocHeading[] = [];
    for (const el of els) {
      if (el.id) {
        items.push({
          id: el.id,
          text: el.textContent ?? "",
          level: (el.tagName === "H2" ? 2 : 3) as 2 | 3,
        });
      }
    }
    // Reading the rendered DOM is the standard TOC pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(items);
  }, []);

  // ── IntersectionObserver for active section ─────────────────────
  useEffect(() => {
    if (headings.length < 2) return;

    // Cleanup previous observer
    if (observerRef.current) observerRef.current.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is intersecting (above the fold)
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            return;
          }
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [headings]);

  // ── Keyboard: Escape closes drawer ──────────────────────────────
  useEffect(() => {
    if (!drawerOpen) return;

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // ── Click handler: scroll to heading, update URL hash ───────────
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });

      // Update URL hash without scrolling again
      history.pushState(null, "", `#${id}`);

      // Close drawer on mobile
      setDrawerOpen(false);
    },
    [],
  );

  // ── Keyboard handler for TOC links ──────────────────────────────
  const handleLinkKey = useCallback(
    (e: KeyboardEvent<HTMLAnchorElement>, id: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        const prefersReduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
        history.pushState(null, "", `#${id}`);
        setDrawerOpen(false);
      }
    },
    [],
  );

  // ── Suppress when fewer than 2 eligible headings ────────────────
  if (headings.length < 2) return null;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* ─── Mobile trigger button ───────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        className="toc-trigger"
        aria-expanded={drawerOpen}
        aria-controls="toc-drawer"
        aria-label="目录"
        onClick={() => setDrawerOpen((v) => !v)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="16" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="2" y="9" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="2" y="14" width="14" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>

      {/* ─── Desktop rail ────────────────────────────────────────── */}
      <nav className="toc-rail" aria-label="文章目录">
        <div className="toc-rail-title">目录</div>
        <TocList
          headings={headings}
          activeId={activeId}
          onItemClick={handleClick}
        />
      </nav>

      {/* ─── Mobile drawer ────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        id="toc-drawer"
        className={`toc-drawer${drawerOpen ? " toc-drawer-open" : ""}`}
        role="dialog"
        aria-modal={drawerOpen}
        aria-label="文章目录"
      >
        <div className="toc-drawer-header">
          <span>目录</span>
          <button
            type="button"
            className="toc-drawer-close"
            aria-label="关闭目录"
            onClick={() => {
              setDrawerOpen(false);
              triggerRef.current?.focus();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <TocList
          headings={headings}
          activeId={activeId}
          onItemClick={handleClick}
          onItemKeyDown={handleLinkKey}
        />
      </div>

      {/* ─── Backdrop ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="toc-backdrop"
          onClick={() => {
            setDrawerOpen(false);
            triggerRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      <style>{tocStyles}</style>
    </>
  );
}

/** Shared list of TOC items, used by both rail and drawer. */
function TocList({
  headings,
  activeId,
  onItemClick,
  onItemKeyDown,
}: {
  headings: TocHeading[];
  activeId: string | null;
  onItemClick: (e: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onItemKeyDown?: (e: KeyboardEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <ul className="toc-list">
      {headings.map((h) => (
        <li
          key={h.id}
          className={`toc-item toc-level-${h.level}${
            activeId === h.id ? " toc-active" : ""
          }`}
        >
          <a
            href={`#${h.id}`}
            onClick={(e) => onItemClick(e, h.id)}
            onKeyDown={onItemKeyDown ? (e) => onItemKeyDown(e, h.id) : undefined}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ─── Styles (inline, DESIGN.md tokens) ──────────────────────────────
const tocStyles = /* css */ `
  /* ── Mobile trigger (hidden on desktop) ───────────────────────── */
  .toc-trigger {
    display: none; /* hidden by default; shown on mobile via media query */
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 50;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line, #c8c5ba);
    border-radius: 2px;
    background: var(--paper, #fbfaf6);
    color: var(--muted, #66675e);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    transition: color 180ms ease, border-color 180ms ease;
  }
  .toc-trigger:hover {
    color: var(--moss, #4f5d42);
    border-color: var(--moss, #4f5d42);
  }
  .toc-trigger:focus-visible {
    outline: 2px solid var(--moss, #4f5d42);
    outline-offset: 2px;
  }

  /* ── Desktop rail ─────────────────────────────────────────────── */
  .toc-rail {
    display: block;
    position: sticky;
    top: 100px;
    width: 200px;
    flex-shrink: 0;
    padding-left: 24px;
    border-left: 1px solid var(--line, #c8c5ba);
  }
  .toc-rail-title {
    font: 500 11px/1.5 "PingFang SC", system-ui, sans-serif;
    letter-spacing: 0.08em;
    color: var(--muted, #66675e);
    margin-bottom: 16px;
  }

  /* ── TOC list (shared) ────────────────────────────────────────── */
  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toc-item {
    margin: 0;
    padding: 0;
  }
  .toc-item a {
    display: block;
    padding: 6px 0;
    font: 400 12px/1.6 "PingFang SC", system-ui, sans-serif;
    color: var(--muted, #66675e);
    text-decoration: none;
    border-left: 2px solid transparent;
    padding-left: 12px;
    transition: color 180ms ease, border-color 180ms ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .toc-item a:hover {
    color: var(--ink, #20211d);
  }
  .toc-item.toc-active a {
    color: var(--ink, #20211d);
    border-left-color: var(--moss, #4f5d42);
  }
  .toc-level-3 a {
    padding-left: 28px;
    font-size: 11px;
  }

  /* ── Mobile drawer ─────────────────────────────────────────────── */
  .toc-drawer {
    display: none; /* hidden by default */
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(300px, 80vw);
    z-index: 100;
    background: var(--paper, #fbfaf6);
    border-left: 1px solid var(--line, #c8c5ba);
    transform: translateX(100%);
    transition: transform 220ms cubic-bezier(0.4, 0, 1, 1);
    overflow-y: auto;
    padding: 24px;
    box-sizing: border-box;
  }
  .toc-drawer-open {
    transform: translateX(0);
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .toc-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--line, #c8c5ba);
  }
  .toc-drawer-header span {
    font: 500 14px/1.5 "PingFang SC", system-ui, sans-serif;
    letter-spacing: 0.06em;
    color: var(--ink, #20211d);
  }
  .toc-drawer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    background: none;
    color: var(--muted, #66675e);
    cursor: pointer;
    border-radius: 2px;
    transition: color 180ms ease;
  }
  .toc-drawer-close:hover {
    color: var(--ink, #20211d);
  }
  .toc-drawer-close:focus-visible {
    outline: 2px solid var(--moss, #4f5d42);
    outline-offset: 2px;
  }

  /* ── Backdrop ──────────────────────────────────────────────────── */
  .toc-backdrop {
    display: none; /* hidden by default */
    position: fixed;
    inset: 0;
    z-index: 99;
    background: rgba(0, 0, 0, 0.15);
  }

  /* ── Responsive: mobile (≤960px) ──────────────────────────────── */
  @media (max-width: 960px) {
    .toc-rail {
      display: none;
    }
    .toc-trigger {
      display: flex;
    }
    .toc-drawer {
      display: block;
    }
    .toc-backdrop {
      display: block;
    }
  }

  /* ── Reduced motion ────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .toc-drawer {
      transition: none;
    }
    .toc-trigger,
    .toc-item a,
    .toc-drawer-close {
      transition: none;
    }
  }
`;
