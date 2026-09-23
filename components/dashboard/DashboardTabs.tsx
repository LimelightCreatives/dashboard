"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DashboardTab = {
  label: string;
  /** Path segment relative to /dashboard/[eventId]/, e.g. "milestones" */
  href: string;
};

export function DashboardTabs({
  basePath,
  tabs,
}: {
  /** e.g. `/dashboard/genesis` — kept generic so this works for /staff/[eventId] too if needed later */
  basePath: string;
  tabs: DashboardTab[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-6 md:px-12">
      {tabs.map((tab) => {
        const href = `${basePath}/${tab.href}`;
        const active = pathname === href || pathname?.startsWith(`${href}/`);

        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-[3px] px-4 py-3 font-body text-sm uppercase tracking-[0.1em] transition-colors ${
              active
                ? "border-[var(--accent)] text-[var(--foreground)]"
                : "border-transparent text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
