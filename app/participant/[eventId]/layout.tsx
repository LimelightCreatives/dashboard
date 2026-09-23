"use client";

import { useParams } from "next/navigation";

import { getEventConfig, listEvents } from "@/lib/events";
import { Topbar } from "@/components/dashboard/Topbar";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { EventThemeProvider } from "@/components/dashboard/EventThemeProvider";

const TABS = [
  { label: "Milestones", href: "milestones" },
  { label: "Project", href: "project" },
  { label: "Voting", href: "voting" },
  { label: "Team", href: "team" },
];

export default function EventDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const event = getEventConfig(eventId);

  // Temporary debug fallback instead of a silent notFound() — once routing is confirmed
  // working, this can go back to calling notFound() from "next/navigation".
  if (!event) {
    return (
      <div className="p-10 font-body text-sm">
        <p>
          The event <strong>&quot;{eventId}&quot;</strong> is either not a thing or has concluded.
        </p>
      </div>
    );
  }

  // TODO: replace with the signed-in participant from your auth/session provider
  const user = { name: "Test User", email: "test@example.com" };

  return (
    <div className="min-h-screen">
      <Topbar user={user} onLogout={() => { /* TODO: wire up sign-out */ }} />

      <EventThemeProvider theme={event.theme}>
        <div className="border-b border-[var(--border)]">
          <DashboardTabs basePath={`/participant/${event.id}`} tabs={TABS} />
        </div>
        <main className="px-6 py-10 md:px-16 md:py-14">{children}</main>
      </EventThemeProvider>
    </div>
  );
}
