import Link from "next/link";
import { ThemeControl } from "./ThemeControl";
import { NavLink } from "./NavLink";

/**
 * Public header — server-rendered shell chrome with client-nav island for
 * active-route detection.
 *
 * DESIGN.md §5.2:
 * - Brand wordmark (left, links to /)
 * - Primary nav (Home `/`, Archive `/archive`, Research `#research`)
 * - Theme toggle (right, client leaf)
 * - 56px mobile / 64px desktop height
 * - 44px minimum touch targets
 * - Active nav: 2px moss underline via ::after line expansion (180ms)
 *
 * ThemeControl and NavLink are client components — the rest is pure SSR.
 *
 * @param siteName — from resolved site-copy (overridden by stored DB value)
 */
export function PublicHeader({ siteName, siteCode }: { readonly siteName: string; readonly siteCode: string }) {
  return (
    <header className="pub-header">
      <div className="pub-header__inner">
        {/* Brand wordmark */}
        <Link href="/" className="pub-header__brand" aria-label={`${siteName} — 首页`}>
          <span className="pub-header__mark" aria-hidden="true">光</span>
          <span><strong>{siteName}</strong><small>{siteCode}</small></span>
        </Link>

        {/* Primary navigation */}
        <nav className="pub-nav" aria-label="主导航">
          <NavLink href="/" className="pub-nav__link" activeMatch="exact">
            随笔
          </NavLink>
          <NavLink href="/archive" className="pub-nav__link">
            书架
          </NavLink>
          <a href="#research" className="pub-nav__link">
            主题
          </a>
        </nav>

        {/* Right-side actions */}
        <div className="pub-header__actions">
          <ThemeControl />
        </div>
      </div>
    </header>
  );
}
