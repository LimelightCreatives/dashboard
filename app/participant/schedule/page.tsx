"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HardCard } from "@/components/dashboard/HardCard";
import schedule from "@/data/run-of-show/schedule.json";
import {
  eventNow, fmt, fmtDate, fmtRange, makeApi, timeState,
  type Day, type Schedule,
} from "@/lib/run-of-show/schedule";

const data = schedule as unknown as Schedule;

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";
const LABEL =
  "font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60";

type Block = Day["blocks"][number];
type Entry =
  | { kind: "marker"; key: string; s: number; text: string | undefined }
  | { kind: "block"; key: string; s: number; e: number; text: string; where: string };

const toMin = (t: string) => t.split(":").map(Number).reduce((h, m) => h * 60 + m);

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${TAG} cursor-pointer ${
        active ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-transparent text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

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

export default function SchedulePage() {
  const api = useMemo(() => makeApi(data), []);
  const tz = data.event.timezone;

  const [ready, setReady] = useState(false);
  const [dayId, setDayId] = useState(data.days[0]?.id);
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => eventNow(tz, null), [tz, tick]);

  // Open on today's day if the event is running, or honour ?day=
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("day");
    const today = eventNow(tz, null).date;
    setDayId(
      data.days.some((x) => x.id === d)
        ? d!
        : (data.days.find((x) => x.date === today) || data.days[0])?.id,
    );
    setReady(true);
  }, [tz]);

  // Keep "Now" accurate without a reload
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    const wake = () => !document.hidden && setTick((n) => n + 1);
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  if (!ready) return <Spinner />;

  const day: Day | undefined = data.days.find((d) => d.id === dayId) || data.days[0];

  // Participant view: only blocks with participant-facing text, plus section markers.
  const entries: Entry[] = day
    ? day.blocks.flatMap((b: Block, i): Entry[] => {
        const s = toMin(b.start);
        if (api.isMarker(b)) {
          return [{ kind: "marker", key: `m${i}`, s, text: b.participants || b.title }];
        }
        if (!b.participants || !b.end) return [];
        return [
          {
            kind: "block",
            key: `b${i}`,
            s,
            e: toMin(b.end),
            text: b.participants,
            where: api.place(b.location) || "",
          },
        ];
      })
    : [];

  const blocks = entries.filter((e): e is Extract<Entry, { kind: "block" }> => e.kind === "block");
  const live = !!day?.date && now.date === day.date;
  const state = (e: { s: number; e: number }) => (day ? timeState(day, now, e.s, e.e) : "future");

  const current = live ? blocks.find((b) => state(b) === "now") : undefined;
  const next = live ? blocks.find((b) => state(b) === "future") : undefined;

  const toggle = (k: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold md:text-5xl">Schedule</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        {data.event.subtitle || "What’s happening, when and where."}
      </p>

      {data.days.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Day">
          {data.days.map((d) => (
            <Tab key={d.id} active={d.id === day?.id} onClick={() => setDayId(d.id)}>
              {d.label} · {fmtDate(d.date).split(" ").slice(1).join(" ")}
            </Tab>
          ))}
        </div>
      )}

      {/* Now / next */}
      {(current || next) && (
        <HardCard className="mt-6">
          {current && (
            <>
              <p className={LABEL}>Now</p>
              <p className="mt-1 font-body text-sm font-bold">{current.text}</p>
              {current.where && (
                <p className="mt-1 font-body text-sm text-[var(--foreground)]/70">📍 {current.where}</p>
              )}
            </>
          )}
          {next && (
            <>
              <p className={`${current ? "mt-4" : ""} ${LABEL}`}>Next · {fmt(next.s)}</p>
              <p className="mt-1 font-body text-sm">{next.text}</p>
              {next.where && (
                <p className="mt-1 font-body text-sm text-[var(--foreground)]/70">📍 {next.where}</p>
              )}
            </>
          )}
        </HardCard>
      )}

      <div className="mt-8">
        {!day ? (
          <HardCard className="border-dashed">
            <p className="font-body text-sm">The schedule isn’t available yet.</p>
          </HardCard>
        ) : entries.length === 0 ? (
          <HardCard className="border-dashed">
            <p className="font-display text-xl font-bold">{day.label} is coming soon</p>
            <p className="mt-1 font-body text-sm">The schedule hasn’t been published yet. Check back here.</p>
          </HardCard>
        ) : (
          <ul className="space-y-4">
            {entries.map((it) => {
              if (it.kind === "marker") {
                return (
                  <li
                    key={it.key}
                    className="pt-2 font-body text-xs font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60"
                  >
                    {fmt(it.s)} · {it.text}
                  </li>
                );
              }

              const st = state(it);
              const past = st === "past";
              const open = expanded.has(it.key);

              // Finished items fold into a single line
              if (past && !open) {
                return (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => toggle(it.key)}
                      aria-expanded={false}
                      className="flex w-full items-center gap-3 border-[2px] border-[var(--foreground)]/30 px-3 py-2 text-left font-body text-sm text-[var(--foreground)]/60"
                    >
                      <span className="font-bold">{fmt(it.s)}</span>
                      <span className="min-w-0 flex-1 truncate">{it.text}</span>
                      <span aria-hidden>✓</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={it.key} aria-current={st === "now" ? "time" : undefined}>
                  <HardCard
                    className={st === "now" ? "border-l-[10px] border-l-[var(--accent)]" : past ? "opacity-70" : ""}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className={LABEL}>{fmtRange(it.s, it.e < 24 * 60 ? it.e : undefined)}</p>
                      {st === "now" && (
                        <span className={`${TAG} bg-[var(--accent)] text-[var(--foreground)]`}>Now</span>
                      )}
                      {past && (
                        <button
                          type="button"
                          onClick={() => toggle(it.key)}
                          className={`${TAG} cursor-pointer bg-transparent`}
                        >
                          Fold
                        </button>
                      )}
                    </div>
                    <p className="mt-2 break-words font-display text-xl font-bold">{it.text}</p>
                    {it.where && <p className="mt-3 font-body text-sm font-bold">📍 {it.where}</p>}
                  </HardCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </div>
    </main>
  );
}