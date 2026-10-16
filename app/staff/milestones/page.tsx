"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { HardCard } from "@/components/dashboard/HardCard";
import {
  listSubmissions,
  reviewSubmission,
  type Decision,
  type SubmissionRow,
} from "@/app/actions/submissions";

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";

const BTN =
  "border-[2px] border-[var(--foreground)] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.08em] disabled:opacity-50";
const BTN_SOLID = `${BTN} bg-[var(--foreground)] text-[var(--background)]`;
const BTN_OUTLINE = `${BTN} bg-transparent`;

// Optional: paste your Fillout results page URL into NEXT_PUBLIC_FILLOUT_RESULTS_URL
// to show an "Open in Fillout" link in the header.
const FILLOUT_RESULTS_URL = process.env.NEXT_PUBLIC_FILLOUT_RESULTS_URL;

type Filter = "pending" | "approved" | "all";

const keyOf = (r: SubmissionRow) => `${r.teamId}:${r.milestoneId}`;

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

function Line({ text }: { text: string }) {
  if (/^https?:\/\//i.test(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className="break-all underline">
        {text}
      </a>
    );
  }
  return <span className="break-words">{text}</span>;
}

function Answers({ answers }: { answers: SubmissionRow["answers"] }) {
  if (answers.length === 0) {
    return (
      <p className="mt-4 font-body text-sm text-[var(--foreground)]/60">
        No answers were stored for this submission.
      </p>
    );
  }
  return (
    <div className="mt-4 space-y-3 border-[2px] border-[var(--foreground)] px-3 py-3">
      {answers.map((a, i) => (
        <div key={i}>
          <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60">
            {a.name}
          </p>
          <div className="mt-1 flex flex-col gap-0.5 font-body text-sm">
            {a.value.split("\n").map((line, j) => (
              <Line key={j} text={line} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SubmissionsPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await listSubmissions();
      if (res.ok) {
        setRows(res.rows);
        setError(null);
      } else {
        setError(res.message);
      }
    } catch {
      setError("Network error. Try refreshing.");
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Pick up new submissions when the organiser returns to this tab.
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  async function act(row: SubmissionRow, decision: Decision) {
    if (
      decision === "send_back" &&
      !window.confirm(
        `Send "${row.milestoneLabel}" back to ${row.teamName}? They'll need to submit it again.`
      )
    ) {
      return;
    }

    setBusyKey(keyOf(row));
    try {
      const res = await reviewSubmission(row.teamId, row.milestoneId, decision);
      if (!res.ok) setError(res.message);
      else setError(null);
    } catch {
      setError("Network error. Try again.");
    } finally {
      // Always reload so the list reflects the database, even after a conflict.
      await load();
      setBusyKey(null);
    }
  }

  const pendingCount = rows.filter((r) => r.status === "submitted").length;
  const approvedCount = rows.length - pendingCount;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (filter === "pending" && r.status !== "submitted") return false;
      if (filter === "approved" && r.status !== "approved") return false;
      if (!q) return true;
      return (
        r.teamName.toLowerCase().includes(q) || r.milestoneLabel.toLowerCase().includes(q)
      );
    });
    // Rows arrive newest-first. For the review queue, oldest-first is fairer.
    return filter === "pending" ? [...list].reverse() : list;
  }, [rows, filter, query]);

  if (!loaded) return <Spinner />;

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "approved", label: "Approved", count: approvedCount },
    { id: "all", label: "All", count: rows.length },
  ];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl">Milestones</h1>
            <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">
              Review milestone submissions. Approving unlocks the team's next milestone.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {FILLOUT_RESULTS_URL ? (
              <a
                href={FILLOUT_RESULTS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-sm underline"
              >
                Open in Fillout
              </a>
            ) : null}
            <button type="button" onClick={load} disabled={refreshing} className={BTN_OUTLINE}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-6 border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Filter submissions">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={`${TAG} cursor-pointer ${
                  filter === t.id
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-transparent text-[var(--foreground)]"
                }`}
              >
                {t.label} · {t.count}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team or milestone"
            className="min-w-0 flex-1 border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none"
          />
        </div>

        {visible.length === 0 ? (
          <HardCard className="mt-8 border-dashed">
            <p className="font-body text-sm">
              {rows.length === 0
                ? "No submissions yet."
                : filter === "pending" && !query
                  ? "Nothing waiting for review. 🎉"
                  : "No submissions match."}
            </p>
          </HardCard>
        ) : (
          <ul className="mt-8 space-y-6">
            {visible.map((row) => {
              const key = keyOf(row);
              const busy = busyKey === key;
              const approved = row.status === "approved";

              return (
                <li key={key}>
                  <HardCard className={busy ? "opacity-60" : ""}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-display text-xl font-bold break-words">
                          {row.milestoneLabel}
                        </p>
                        <p className="mt-1 font-body text-sm">
                          <strong>{row.teamName}</strong>
                          <span className="text-[var(--foreground)]/60">
                            {" "}
                            · {row.memberCount} {row.memberCount === 1 ? "member" : "members"}
                          </span>
                        </p>
                        <p className="mt-2 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                          Submitted {new Date(row.submittedAt).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`${TAG} shrink-0 ${
                          approved
                            ? "bg-[var(--accent)] text-[var(--foreground)]"
                            : "bg-transparent text-[var(--foreground)]"
                        }`}
                      >
                        {approved ? "Approved" : "Awaiting review"}
                      </span>
                    </div>

                    <Answers answers={row.answers} />

                    {approved && row.reviewedAt ? (
                      <p className="mt-4 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                        Approved {new Date(row.reviewedAt).toLocaleString()}
                        {row.reviewedBy ? ` by ${row.reviewedBy}` : ""}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      {approved ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(row, "undo_approval")}
                          className={BTN_OUTLINE}
                        >
                          Undo approval
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(row, "approve")}
                            className={BTN_SOLID}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(row, "send_back")}
                            className={BTN_OUTLINE}
                          >
                            Send back
                          </button>
                        </>
                      )}
                    </div>
                  </HardCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}