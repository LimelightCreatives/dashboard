"use client";

import { useParams } from "next/navigation";

import { getEventConfig } from "@/lib/events";
import { HardCard } from "@/components/dashboard/HardCard";
import { Button } from "@/components/Button";
import type { MilestoneStatus } from "@/lib/types";

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  pending: "Ready to submit",
  submitted: "Awaiting review",
  approved: "Approved",
};

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";

export default function MilestonesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getEventConfig(eventId)!;

  const ordered = [
    ...event.milestones.filter((m) => !m.bonus),
    ...event.milestones.filter((m) => m.bonus),
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-4xl md:text-5xl">Milestones</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Submit each milestone for review. The next one unlocks once a mentor or
        organiser approves your current one.
      </p>

      <ol className="mt-10 space-y-8">
        {ordered.map((milestone, index) => {
          const previous = index > 0 ? ordered[index - 1] : null;
          const locked =
            !milestone.bonus && previous !== null && previous.status !== "approved";

          const submitHref = milestone.formUrl
            ? `${milestone.formUrl}${milestone.formUrl.includes("?") ? "&" : "?"}${new URLSearchParams(
                { event: event.id, milestone: milestone.id },
              ).toString()}`
            : null;

          return (
            <li key={milestone.id}>
              <HardCard
                shadow={!locked}
                className={`flex flex-wrap items-start justify-between gap-6 ${
                  locked ? "opacity-50" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-[var(--foreground)] font-display text-sm font-bold">
                    {milestone.bonus ? "★" : String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl font-bold break-words">
                        {milestone.label}
                      </p>
                      {milestone.bonus ? (
                        <span className={`${TAG} bg-[var(--accent)] text-[var(--foreground)]`}>
                          Bonus
                        </span>
                      ) : null}
                    </div>

                    {milestone.targetTime ? (
                      <p className="mt-2 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                        Target: {milestone.targetTime}
                      </p>
                    ) : null}

                    {milestone.description ? (
                      <p className="mt-3 font-body text-sm text-[var(--foreground)]/70">
                        {milestone.description}
                      </p>
                    ) : null}

                    {milestone.evidence ? (
                      <div className="mt-4 border-[2px] border-[var(--foreground)] px-3 py-2">
                        <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                          Show
                        </p>
                        <p className="mt-1 font-body text-sm">{milestone.evidence}</p>
                      </div>
                    ) : null}

                    {locked && previous ? (
                      <div className="mt-4 border-[2px] border-dashed border-[var(--foreground)] px-3 py-2 font-body text-sm">
                        🔒 Unlocks after “{previous.label}” is approved.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <span
                    className={`${TAG} ${
                      milestone.status === "approved" && !locked
                        ? "bg-[var(--accent)] text-[var(--foreground)]"
                        : "bg-transparent text-[var(--foreground)]"
                    }`}
                  >
                    {locked ? "Locked" : STATUS_LABEL[milestone.status]}
                  </span>

                  {!locked && milestone.status === "pending" && submitHref ? (
                    <Button href={submitHref} external variant="primary">
                      SUBMIT
                    </Button>
                  ) : null}
                </div>
              </HardCard>
            </li>
          );
        })}
      </ol>
    </div>
  );
}