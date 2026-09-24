import { headers } from "next/headers";
import { getEventConfig } from "@/lib/events";
import { ClientTopbar } from "@/components/dashboard/ClientTopbar"; // Import the wrapper
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EventThemeProvider } from "@/components/dashboard/EventThemeProvider";

const TABS = [
  { label: "Milestones", href: "milestones" },
  { label: "Project", href: "project" },
  { label: "Voting", href: "voting" },
  { label: "Team", href: "team" },
];

export default async function EventDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId ?? "";
  const event = getEventConfig(eventId);

  const headersList = await headers();
  const userName = headersList.get("x-user-name") || "User Unavailable";
  const userEmail = headersList.get("x-user-email") || "unavailable";
  const user = { name: userName, email: userEmail };

  if (!event) {
    return (
      <div className="p-10 font-body text-sm">
        <p>
          The event <strong>&quot;{eventId}&quot;</strong> is either not a
          thing or has concluded.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Pass user to the client wrapper instead of passing functions */}
      <ClientTopbar user={user} label={event.name} />

      <EventThemeProvider theme={event.theme}>
        <DashboardShell basePath={`/participant/${event.id}`} tabs={TABS}>
          {children}
        </DashboardShell>
      </EventThemeProvider>
    </div>
  );
}