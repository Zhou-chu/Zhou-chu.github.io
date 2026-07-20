"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

function resolveSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return null;
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // silently ignore
  }
}

/** Inline SVG icon — sun for light mode, moon for dark. */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * Client-only theme toggle. Reads localStorage + system preference,
 * toggles `data-theme` on `<html>`, persists choice.
 *
 * DESIGN.md §5.4: 44x44px target, var(--muted) default, var(--moss) hover,
 * border-radius 2px.
 */
export function ThemeControl() {
  const [theme, setTheme] = useState<Theme>("light");

  // Hydrate from stored preference on mount (avoid flash mismatch)
  useEffect(() => {
    const stored = readStoredTheme();
    const resolved = stored ?? resolveSystemTheme();
    setTheme(resolved);
    // Re-apply in case pre-hydration script didn't catch it
    applyTheme(resolved);
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = readStoredTheme();
      if (stored) return; // user explicitly chose — don't override
      const next: Theme = e.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const label = theme === "light" ? "切换到深色模式" : "切换到浅色模式";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      aria-pressed={theme === "dark"}
      title={label}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="theme-toggle__label">
        {theme === "light" ? "深色" : "浅色"}
      </span>
    </button>
  );
}
