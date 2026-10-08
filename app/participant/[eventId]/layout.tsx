import { headers } from "next/headers";
import { getEventConfig } from "@/lib/events";
import { ClientTopbar } from "@/components/dashboard/ClientTopbar";
import { EventLockedDialog } from "@/components/dashboard/EventLockedDialog";
import {
  DashboardShell,
  type DashboardTab,
} from "@/components/dashboard/DashboardShell";
import { EventThemeProvider } from "@/components/dashboard/EventThemeProvider";
import { HardCard } from "@/components/dashboard/HardCard";
import { Button } from "@/components/Button";

const TABS: DashboardTab[] = [
  { label: "Home", href: "", icon: "home" },
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
      <EventThemeProvider theme={event.theme}>
        {event.locked ? (
          <EventLockedDialog eventName={event.name} />
        ) : (
          <DashboardShell basePath={`/participant/${event.id}`} tabs={TABS}>
            {children}
          </DashboardShell>
        )}
      </EventThemeProvider>
    </div>
  );
}