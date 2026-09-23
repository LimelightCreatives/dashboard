"use client";

import { useParams } from "next/navigation";

import { getEventConfig } from "@/lib/events";
import { HardCard } from "@/components/dashboard/HardCard";

export default function MilestonesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getEventConfig(eventId)!;

  return (
    <div>
      <h1 className="font-display text-4xl md:text-5xl">Milestones</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Key dates and checkpoints for {event.name}.
      </p>

      <ol className="mt-10 space-y-4">
        {event.milestones.map((milestone, index) => (
          <li key={milestone.id}>
            <HardCard className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="font-display text-sm text-[var(--foreground)]/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display text-xl">{milestone.label}</p>
                  {milestone.description ? (
                    <p className="mt-1 font-body text-sm text-[var(--foreground)]/60">
                      {milestone.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-[var(--foreground)]/60">{milestone.date}</span>
                <span
                  className={`rounded-full px-3 py-1 font-body text-[0.7rem] uppercase tracking-[0.08em] ${
                    milestone.completed
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "border border-[var(--border)] text-[var(--foreground)]/60"
                  }`}
                >
                  {milestone.completed ? "Done" : "Upcoming"}
                </span>
              </div>
            </HardCard>
          </li>
        ))}
      </ol>
    </div>
  );
}
