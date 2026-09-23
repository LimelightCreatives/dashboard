"use client";

import { useState } from "react";
import { Button } from "@/components/Button"; // adjust import path to wherever Button actually lives

type TopbarUser = {
  name: string;
  email?: string;
  avatarUrl?: string;
};

type TopbarProps = {
  /** Left-hand label. Defaults to "Dashboard" so this stays generic across staff/participant views. */
  label?: string;
  user: TopbarUser;
  onLogout: () => void;
};

/**
 * Shared topbar for every dashboard (participant + staff, any event).
 * Deliberately uses only the generic theme tokens (--foreground/--background/--border/--surface),
 * never an event's accent colour, so it reads the same everywhere it's dropped in.
 */
export function Topbar({ label = "Dashboard", user, onLogout }: TopbarProps) {
  const [open, setOpen] = useState(false);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-6 py-4 md:px-16">
      <span className="font-display text-lg tracking-tight">{label}</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-3 rounded-none px-2 py-1 font-body text-sm transition-colors hover:bg-[var(--surface-hover)]"
        >
          <span className="flex h-8 w-8 items-center justify-center border-[2px] border-[var(--foreground)] bg-[var(--surface)] font-display text-xs">
            {initials || "?"}
          </span>
          <span className="hidden sm:inline">{user.name}</span>
        </button>

        {open ? (
          <>
            {/* click-catcher to close the menu; swap for a proper useOnClickOutside hook later */}
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-56 border-[2px] border-[var(--foreground)] bg-[var(--background)] p-2 shadow-[4px_4px_0_0_var(--foreground)]"
            >
              <div className="border-b border-[var(--border)] px-3 py-2">
                <p className="font-body text-sm">{user.name}</p>
                {user.email ? (
                  <p className="font-body text-xs text-[var(--foreground)]/60">{user.email}</p>
                ) : null}
              </div>
              <div className="pt-2">
                <Button variant="secondary" className="w-full" onClick={onLogout}>
                  Log out
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
