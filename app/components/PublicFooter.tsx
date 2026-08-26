import Link from "next/link";

type PublicFooterProps = {
  readonly siteName: string;
  readonly authorName: string;
  readonly footerMotto: string;
  readonly footerLegal: string;
};

/**
 * Public footer — server-rendered, driven by site-copy fields.
 *
 * DESIGN.md §5.3:
 * - Brand wordmark (left), Tagline (center), Year + admin link (right)
 * - Text: var(--muted), font: var(--font-control), size: var(--text-sm)
 * - Tagline: from footerMotto site-copy field
 * - Year: var(--font-mono)
 * - Border-top: 1px solid var(--line), background: var(--canvas)
 */
export function PublicFooter({
  siteName,
  authorName,
  footerMotto,
  footerLegal,
}: PublicFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="pub-footer">
      <div className="pub-footer__inner">
        <div className="pub-footer__brand"><span aria-hidden="true">木</span><strong>{siteName}</strong></div>

        {/* Tagline — driven by site-copy footerMotto */}
        <p className="pub-footer__tagline">{footerMotto}</p>

        {/* Meta: year + admin link, driven by footerLegal */}
        <div className="pub-footer__meta">
          <time dateTime={String(year)}>{year}</time>
          <span className="pub-footer__legal">{footerLegal}</span>
          <Link href="/rss.xml">RSS</Link>
          <Link href="/admin">写作后台</Link>
        </div>
      </div>
    </footer>
  );
}
