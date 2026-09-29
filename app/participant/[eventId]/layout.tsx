import { headers } from "next/headers";
import { getEventConfig } from "@/lib/events";
import { ClientTopbar } from "@/components/dashboard/ClientTopbar";
import {
  DashboardShell,
  type DashboardTab,
} from "@/components/dashboard/DashboardShell";
import { EventThemeProvider } from "@/components/dashboard/EventThemeProvider";
import { HardCard } from "@/components/dashboard/HardCard";
import { Button } from "@/components/Button";

const TABS: DashboardTab[] = [
  { label: "Milestones", href: "milestones", icon: "milestones" },
  { label: "Project", href: "project", icon: "project" },
  { label: "Team", href: "team", icon: "team" },
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
      <div className="flex min-h-dvh items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <HardCard className="flex flex-col items-start gap-5">
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              This event doesn&apos;t exist . . . or does it?
            </h1>

            <p className="font-body text-sm text-[var(--foreground)]/70">
              We couldn&apos;t find an event called{" "}
              <strong className="break-all font-bold text-[var(--foreground)]">
                &quot;{eventId}&quot;
              </strong>
              . It may have concluded, or the link might be wrong.
            </p>

            <Button href="/" variant="primary">
              Go back home
            </Button>
          </HardCard>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0">
        <ClientTopbar user={user} label={event.name} />
      </div>

      <EventThemeProvider theme={event.theme}>
        <DashboardShell basePath={`/participant/${event.id}`} tabs={TABS}>
          {children}
        </DashboardShell>
      </EventThemeProvider>
    </div>
  );
}