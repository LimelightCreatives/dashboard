import { HardCard } from "@/components/dashboard/HardCard";
import { Button } from "@/components/Button";

export function EventLockedDialog({ eventName }: { eventName: string }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-locked-title"
      aria-describedby="event-locked-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 py-16 backdrop-blur-sm"
    >
      <div className="w-full max-w-md">
        <HardCard className="flex flex-col items-start gap-5">
          <h1
            id="event-locked-title"
            className="font-display text-3xl font-bold md:text-4xl"
          >
            This event isn&apos;t open yet
          </h1>

          <p
            id="event-locked-description"
            className="font-body text-sm text-[var(--foreground)]/70"
          >
            <strong className="font-bold text-[var(--foreground)]">
              {eventName}
            </strong>{" "}
            hasn&apos;t started, so the dashboard is closed for now. Check back
            once the event kicks off!
          </p>

          <Button href="/" variant="primary">
            Go back home
          </Button>
        </HardCard>
      </div>
    </div>
  );
}