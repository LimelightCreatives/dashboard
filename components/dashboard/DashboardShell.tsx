"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Milestone,
  FolderKanban,
  Vote,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  milestones: Milestone,
  project: FolderKanban,
  voting: Vote,
  team: Users,
} satisfies Record<string, LucideIcon>;

export type DashboardTab = {
  label: string;
  /** Path segment relative to the base path, e.g. "milestones" */
  href: string;
  /** String key (not a component) so it can be passed from a server component */
  icon: keyof typeof ICONS;
};

export function DashboardShell({
  basePath,
  tabs,
  children,
}: {
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
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-[var(--border)] bg-[var(--background)] md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <nav className="flex gap-1 overflow-x-auto px-6 py-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-4 md:py-8">
          {tabs.map((tab) => {
            const href = `${basePath}/${tab.href}`;
            const active =
              pathname === href || pathname?.startsWith(`${href}/`);
            const pending = pendingHref === href;
            const Icon = ICONS[tab.icon];

            return (
              <Link
                key={tab.href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (href !== pathname) setPendingHref(href);
                }}
                className={`flex items-center gap-3 whitespace-nowrap border-b-[3px] px-4 py-3 font-body text-sm uppercase tracking-[0.1em] transition-colors md:border-b-0 md:border-l-[3px] ${
                  active
                    ? "border-[var(--accent)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
                } ${pending ? "opacity-60" : ""}`}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main
        aria-busy={!!pendingHref}
        className="min-w-0 flex-1 px-6 py-10 md:px-16 md:py-14"
      >
        <div
          className={`transition-[filter,opacity] duration-200 ${
            pendingHref
              ? "pointer-events-none opacity-50 blur-sm"
              : "opacity-100 blur-0"
          }`}
        >
          {children}
        </div>
      </main>

      {pendingHref && (
        // Fixed to the viewport (minus the sidebar on desktop) so the spinner
        // is always centred on screen, even when the page content is tall.
        <div
          role="status"
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center md:left-56"
        >
          <span
            aria-hidden
            className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]"
          />
          <span className="sr-only">Loading…</span>
        </div>
      )}
    </div>
  );
}