"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

interface NavLinkProps extends ComponentProps<typeof Link> {
  /** Make active-state matching exact (e.g. "/") or prefix-based (e.g. "/archive"). */
  activeMatch?: "exact" | "prefix";
}

/**
 * Client nav link that sets `data-active="true"` when the current pathname
 * matches the link's href.
 *
 * DESIGN.md §5.2: active nav link receives `--ink` color and `2px solid
 * var(--moss)` underline via the CSS `[data-active="true"]` selector.
 */
export function NavLink({
  activeMatch = "prefix",
  href,
  className,
  ...rest
}: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const hrefStr = typeof href === "string" ? href : "";

  const isActive =
    activeMatch === "exact"
      ? pathname === hrefStr
      : hrefStr === "/"
        ? pathname === "/"
        : pathname.startsWith(hrefStr);

  return (
    <Link
      href={href}
      className={className}
      data-active={isActive ? "true" : undefined}
      {...rest}
    />
  );
}
