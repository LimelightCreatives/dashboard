"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { getEventConfig } from "@/lib/events";
import { HardCard } from "@/components/dashboard/HardCard";
import { Button } from "@/components/Button";
import type { MilestoneStatus } from "@/lib/events/types";

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  pending: "Ready to submit",
  submitted: "Awaiting review",
  approved: "Approved",
};

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";

type Team = { id: string; name: string };

function Spinner() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="Loading">
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]"
      />
    </div>
  );
}

// URLSearchParams handles encoding, so team names with spaces or & are safe.
// The IDs are what the webhook uses; the labels are just for humans reading Fillout.
function buildSubmitUrl(
  base: string,
  milestone: { id: string; label: string },
  team: Team
) {
  const url = new URL(base);
  url.searchParams.set("milestoneId", milestone.id);
  url.searchParams.set("milestone", milestone.label);
  url.searchParams.set("teamId", team.id);
  url.searchParams.set("team", team.name);
  return url.toString();
}

export default function MilestonesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getEventConfig(eventId)!;

  // undefined = still checking, null = no team
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [teamError, setTeamError] = useState<string | null>(null);

  // milestone id -> status. A missing key means "pending".
  const [statuses, setStatuses] = useState<Record<string, MilestoneStatus>>({});
  const [statusesLoaded, setStatusesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/team");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setTeam(data?.team ?? null);
      } catch {
        if (!cancelled) setTeamError("Couldn't check your team. Refresh to try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/milestones");
        const data = res.ok ? await res.json() : { statuses: {} };
        if (!cancelled) setStatuses(data.statuses ?? {});
      } catch {
        // Keep whatever we already had; the next focus will retry.
      } finally {
        if (!cancelled) setStatusesLoaded(true);
      }
    };

    load();
    // The form opens in a new tab, so refresh when the user comes back.
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, []);

  const statusOf = (m: { id: string }): MilestoneStatus => statuses[m.id] ?? "pending";

  // Wait for both lookups so the list never flashes the wrong lock state
  // or the list before the join-a-team card.
  if ((team === undefined || !statusesLoaded) && !teamError) return <Spinner />;

  if (team === null) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Milestones</h1>
        <div className="mx-auto mt-10 w-full max-w-lg md:mt-16">
          <HardCard>
            <div className="flex flex-col items-center px-4 py-10 text-center md:py-14">
              <p className="font-display text-3xl md:text-4xl">Join a team first</p>
              <p className="mt-4 max-w-sm font-body text-base text-[var(--foreground)]/70">
                Milestones are submitted per team. Join or create a team, then come back to
                submit.
              </p>
              <Button className="mt-8" href="team">
                Go to team page
              </Button>
            </div>
          </HardCard>
        </div>
      </div>
    );
  }

  const ordered = [
    ...event.milestones.filter((m) => !m.bonus),
    ...event.milestones.filter((m) => m.bonus),
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-4xl md:text-5xl">Milestones</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Submit each milestone for review. The next one unlocks once an
        organiser approves your current one.
      </p>

      {teamError ? (
        <p
          role="alert"
          className="mt-6 border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600"
        >
          {teamError}
        </p>
      ) : team ? (
        <p className="mt-6 font-body text-sm text-[var(--foreground)]/70">
          Submitting as <strong>{team.name}</strong>
        </p>
      ) : null}

      <ol className="mt-10 space-y-8">
        {ordered.map((milestone, index) => {
          const previous = index > 0 ? ordered[index - 1] : null;
          const status = statusOf(milestone);
          const locked =
            !milestone.bonus && previous !== null && statusOf(previous) !== "approved";

          const submitHref = team ? buildSubmitUrl(event.formUrl, milestone, team) : null;

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
                      status === "approved" && !locked
                        ? "bg-[var(--accent)] text-[var(--foreground)]"
                        : "bg-transparent text-[var(--foreground)]"
                    }`}
                  >
                    {locked ? "Locked" : STATUS_LABEL[status]}
                  </span>

                  {!locked && status === "pending" ? (
                    submitHref ? (
                      <Button href={submitHref} external variant="primary">
                        SUBMIT
                      </Button>
                    ) : (
                      // Still checking the team, or there is no team.
                      <Button variant="primary" disabled>
                        SUBMIT
                      </Button>
                    )
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
