"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { runWithCircularReveal } from "../lib/view-transition";

type SiteStyle = "nature" | "mono";

const STORAGE_KEY = "site-style";

function readStoredStyle(): SiteStyle {
  try {
    return localStorage.getItem(STORAGE_KEY) === "mono" ? "mono" : "nature";
  } catch {
    return "nature";
  }
}

function applyStyle(style: SiteStyle): void {
  document.documentElement.setAttribute("data-style", style);
}

/**
 * Switches between the two visual styles of the site: the photographic
 * "nature" look (default) and the black-and-white "mono" look. Independent of
 * the light/dark toggle, so each style has its own light and dark variant.
 * The pre-hydration script in layout.tsx applies the stored choice before paint.
 */
export function StyleControl() {
  const [style, setStyle] = useState<SiteStyle>("nature");

  useEffect(() => {
    const stored = readStoredStyle();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount
    setStyle(stored);
    applyStyle(stored);
  }, []);

  const toggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const next: SiteStyle = style === "nature" ? "mono" : "nature";
    runWithCircularReveal(event.currentTarget, () => applyStyle(next));
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable: the choice lasts for this page only
    }
    setStyle(next);
  }, [style]);

  const label = style === "nature" ? "切换到黑白风格" : "切换到自然风格";

  return (
    <button
      type="button"
      className="style-toggle"
      onClick={toggle}
      aria-label={label}
      aria-pressed={style === "mono"}
      title={label}
    >
      <span className="style-toggle__mark" aria-hidden="true" />
      <span className="style-toggle__label">{style === "nature" ? "黑白" : "自然"}</span>
    </button>
  );
}
