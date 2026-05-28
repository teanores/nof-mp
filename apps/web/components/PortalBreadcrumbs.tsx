import Link from "next/link";
import React from "react";

export interface PortalBreadcrumbItem {
  href?: string;
  label: string;
}

export function PortalBreadcrumbs({ items = [] }: { items?: PortalBreadcrumbItem[] }) {
  return (
    <nav className="tech-label flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-forge-accent" aria-label="Portal breadcrumbs">
      <Link className="transition hover:text-forge-ink" href="/">
        {"// DRAGON FORGE // Narag'Othal Forgath"}
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <span className="text-forge-muted">{"//"}</span>
          {item.href ? (
            <Link className="transition hover:text-forge-ink" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="text-forge-muted">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
