import type { EventTheme } from "@/lib/events";

/**
 * Overrides the generic `--accent` token (and optional `--accent-secondary`) for its children only.
 * The Topbar is rendered outside of this in the layout, so it always keeps the neutral default
 * accent regardless of which event is being viewed.
 */
export function EventThemeProvider({
  theme,
  children,
}: {
  theme: EventTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        {
          "--accent": theme.accent,
          "--accent-secondary": theme.accentSecondary ?? theme.accent,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
