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
      <aside className="border-b-[1px] border-[var(--border)] bg-[var(--background)] md:w-60 md:shrink-0 md:border-b-0 md:border-r-[1px]">
        {/* Padding leaves room for the hard shadows, which overflow-x-auto would otherwise clip */}
        <nav className="flex gap-4 overflow-x-auto px-6 pb-5 pt-4 md:flex-col md:gap-4 md:overflow-visible md:p-6 md:pt-8">
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
                className={`flex items-center gap-3 whitespace-nowrap border-[2px] px-4 py-3 font-display text-sm font-bold uppercase tracking-[0.1em] transition-all duration-150 ease-out ${
                  active
                    ? "border-[var(--foreground)] bg-[var(--accent)] text-white shadow-[4px_4px_0_0_var(--foreground)]"
                    : "border-transparent text-[var(--foreground)]/60 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:border-[var(--foreground)] hover:text-[var(--foreground)] hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_var(--foreground)]"
                } ${pending ? "opacity-60" : ""}`}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.5} />
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
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center md:left-60"
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