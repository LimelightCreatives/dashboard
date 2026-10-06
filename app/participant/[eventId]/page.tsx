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

const LABEL =
  "font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60";

function buildSubmitUrl(base: string, milestoneLabel: string, teamId: string) {
  const url = new URL(base);
  url.searchParams.set("milestone", milestoneLabel);
  url.searchParams.set("team", teamId);
  return url.toString();
}

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEventConfig(eventId)!;

  // TODO: replace with the real team id once auth/teams exist
  const teamId = "test";

  const required = event.milestones.filter((m) => !m.bonus);
  const bonus = event.milestones.filter((m) => m.bonus);

  const approvedCount = required.filter((m) => m.status === "approved").length;
  const awaitingCount = event.milestones.filter(
    (m) => m.status === "submitted",
  ).length;
  const bonusApproved = bonus.filter((m) => m.status === "approved").length;

  // Milestones unlock in order, so the first unapproved one is "current"
  const current = required.find((m) => m.status !== "approved") ?? null;
  const allDone = current === null;

  const basePath = `/participant/${event.id}`;

  return (
    <div>
      <p className={LABEL}>{event.tagline}</p>
      <h1 className="mt-1 font-display text-4xl font-bold md:text-5xl">
        {event.name}
      </h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Your team&apos;s home base. Track your progress, see what&apos;s next,
        and jump straight into a submission.
      </p>

      {/* Stats */}
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <HardCard className="flex flex-col gap-2">
          <p className={LABEL}>Progress</p>
          <p className="font-display text-4xl font-bold">
            {approvedCount}
            <span className="text-[var(--foreground)]/40">
              /{required.length}
            </span>
          </p>
          <p className="font-body text-sm text-[var(--foreground)]/70">
            milestones approved
          </p>
        </HardCard>

        <HardCard className="flex flex-col gap-2">
          <p className={LABEL}>In review</p>
          <p className="font-display text-4xl font-bold">{awaitingCount}</p>
          <p className="font-body text-sm text-[var(--foreground)]/70">
            {awaitingCount === 1 ? "submission" : "submissions"} awaiting an
            organiser
          </p>
        </HardCard>

        <HardCard className="flex flex-col gap-2">
          <p className={LABEL}>Team</p>
          <p className="font-display text-4xl font-bold">{event.teamSize}</p>
          <p className="font-body text-sm text-[var(--foreground)]/70">
            people per team
            {bonus.length > 0
              ? ` · ${bonusApproved}/${bonus.length} bonus earned`
              : ""}
          </p>
        </HardCard>
      </div>

      {/* Segmented progress bar */}
      <div className="mt-8" aria-label={`${approvedCount} of ${required.length} milestones approved`}>
        <div className="flex gap-2">
          {required.map((m) => (
            <div
              key={m.id}
              title={`${m.label}: ${STATUS_LABEL[m.status]}`}
              className={`h-4 flex-1 border-[2px] border-[var(--foreground)] ${
                m.status === "approved"
                  ? "bg-[var(--accent)]"
                  : m.status === "submitted"
                    ? "bg-[var(--accent)]/30"
                    : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Up next */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold">
          {allDone ? "All done!" : "Up next"}
        </h2>

        <HardCard className="mt-4 flex flex-wrap items-start justify-between gap-6">
          {allDone ? (
            <p className="font-body text-sm text-[var(--foreground)]/70">
              Every milestone has been approved. Nice work, your film is in the
              can.
            </p>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-display text-xl font-bold">
                    {current.label}
                  </p>
                  <span
                    className={`${TAG} ${
                      current.status === "submitted"
                        ? "bg-[var(--accent)] text-[var(--foreground)]"
                        : "bg-transparent text-[var(--foreground)]"
                    }`}
                  >
                    {STATUS_LABEL[current.status]}
                  </span>
                </div>

                {current.targetTime ? (
                  <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">
                    🕒 {current.targetTime}
                  </p>
                ) : null}

                {current.description ? (
                  <p className="mt-3 font-body text-sm text-[var(--foreground)]/70">
                    {current.description}
                  </p>
                ) : null}

                {current.evidence ? (
                  <div className="mt-4 border-[2px] border-[var(--foreground)] px-3 py-2">
                    <p className={LABEL}>Show</p>
                    <p className="mt-1 font-body text-sm">{current.evidence}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-3">
                {current.status === "pending" ? (
                  <Button
                    href={buildSubmitUrl(event.formUrl, current.label, teamId)}
                    external
                    variant="primary"
                  >
                    SUBMIT
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </HardCard>
      </section>

      {/* Roadmap */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Roadmap</h2>
          <Button href={`${basePath}/milestones`} variant="secondary">
            All milestones
          </Button>
        </div>

        <ol className="mt-4 space-y-3">
          {[...required, ...bonus].map((m, i) => {
            const isCurrent = current?.id === m.id;
            const isLocked =
              !m.bonus &&
              !isCurrent &&
              m.status !== "approved" &&
              required.findIndex((r) => r.id === m.id) >
                required.findIndex((r) => r.id === current?.id);

            return (
              <li
                key={m.id}
                className={`flex items-center justify-between gap-4 border-[2px] border-[var(--foreground)] px-4 py-3 ${
                  isLocked ? "opacity-50" : ""
                } ${isCurrent ? "bg-[var(--accent)]/15" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-[var(--foreground)] font-display text-xs font-bold">
                    {m.bonus ? "★" : String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">
                      {m.label}
                    </p>
                    {m.targetTime ? (
                      <p className="truncate font-body text-xs text-[var(--foreground)]/60">
                        {m.targetTime}
                      </p>
                    ) : null}
                  </div>
                </div>

                <span
                  className={`${TAG} shrink-0 ${
                    m.status === "approved"
                      ? "bg-[var(--accent)] text-[var(--foreground)]"
                      : "bg-transparent text-[var(--foreground)]"
                  }`}
                >
                  {isLocked ? "Locked" : STATUS_LABEL[m.status]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}