"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type DashboardTab = {
  label: string;
  /** Path segment relative to /dashboard/[eventId]/, e.g. "milestones" */
  href: string;
};

export function DashboardShell({
  basePath,
  tabs,
  children,
}: {
  /** e.g. `/dashboard/genesis` — kept generic so this works for /staff/[eventId] too if needed later */
  basePath: string;
  tabs: DashboardTab[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Once the route actually changes, whatever we were waiting on is done.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <div className="flex flex-col md:flex-row">
      <aside className="border-b border-[var(--border)] md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <nav className="flex gap-1 overflow-x-auto px-6 py-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-4 md:py-8">
          {tabs.map((tab) => {
            const href = `${basePath}/${tab.href}`;
            const active =
              pathname === href || pathname?.startsWith(`${href}/`);
            const pending = pendingHref === href;

            return (
              <Link
                key={tab.href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (href !== pathname) setPendingHref(href);
                }}
                className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-4 py-3 font-body text-sm uppercase tracking-[0.1em] transition-colors md:border-b-0 md:border-l-[3px] ${
                  active
                    ? "border-[var(--accent)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
                } ${pending ? "opacity-60" : ""}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="relative flex-1 px-6 py-10 md:px-16 md:py-14">
        <div
          className={`transition-opacity duration-150 ${
            pendingHref ? "opacity-40" : "opacity-100"
          }`}
        >
          {children}
        </div>

        {pendingHref && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]"
            />
          </div>
        )}
      </main>
    </div>
  );
}