"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/Button";
import { HardCard } from "@/components/dashboard/HardCard";
import {
  BOOKING_JITTER_SECONDS,
  EQUIPMENT,
  EVENT_DAYS,
  dayOpensAt,
  formatOpensAt,
  sameTeam,
  slotHasEnded,
  slotLabel,
  type EquipmentSnapshot,
} from "@/lib/events/equipment";

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  if (data === null) throw new Error("The server returned an unexpected response.");
  return data as T;
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

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const dates = EVENT_DAYS.map((d) => d.date);

function defaultDate() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  return dates.includes(today) ? today : dates[0];
}

export default function EquipmentPage() {
  const [teamName, setTeamName] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EquipmentSnapshot | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    try {
      const [teamRes, snap] = await Promise.all([
        api<{ team: { name: string } | null }>("/api/team"),
        api<EquipmentSnapshot>("/api/equipment"),
      ]);
      setTeamName(teamRes.team?.name ?? null);
      setSnapshot(snap);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  // Re-check bookings when the user comes back to the tab.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // Per-browser random delay after a day opens, to spread the opening rush.
  const [jitterMs] = useState(() => Math.random() * BOOKING_JITTER_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const unlockMs = (d: string) => {
    const t = dayOpensAt(d);
    return t ? t.getTime() + jitterMs : 0;
  };
  const waiting = EVENT_DAYS.some((d) => unlockMs(d.date) > now);
  const dayOpen = unlockMs(date) <= now;

  // Tick once a second, but only while some day is still locked.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  // Pull fresh bookings the moment the selected day opens.
  const wasOpen = useRef(dayOpen);
  useEffect(() => {
    if (!wasOpen.current && dayOpen) load();
    wasOpen.current = dayOpen;
  }, [dayOpen, load]);

  const act = async (method: "POST" | "DELETE", categoryId: string, slotId: string) => {
    setBusyKey(`${categoryId}:${slotId}`);
    setActionError(null);
    try {
      const snap = await api<EquipmentSnapshot>("/api/equipment/book", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, date, slotId }),
      });
      setSnapshot(snap);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong");
      load(); // show what the sheet actually says now
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) return <Spinner />;

  if (loadError || !snapshot) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Equipment</h1>
        <div className="mx-auto mt-16 w-full max-w-md">
          <HardCard>
            <div className="flex flex-col items-center text-center">
              <p className="font-display text-2xl">Couldn&apos;t load equipment</p>
              <p className="mt-2 font-body text-sm text-red-600">
                {loadError ?? "No data returned"}
              </p>
              <Button variant="secondary" className="mt-6" onClick={() => load(true)}>
                Try again
              </Button>
            </div>
          </HardCard>
        </div>
      </div>
    );
  }

  if (!teamName) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Equipment</h1>
        <div className="mx-auto mt-10 w-full max-w-lg md:mt-16">
          <HardCard>
            <div className="flex flex-col items-center px-4 py-10 text-center md:py-14">
              <p className="font-display text-3xl md:text-4xl">Join a team first</p>
              <p className="mt-4 max-w-sm font-body text-base text-[var(--foreground)]/70">
                Equipment is booked per team. Join or create a team, then come back to reserve.
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl">Equipment</h1>
          <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
            Reserve gear in timed slots. Each category shows how many slots your team can book per
            day. <b>If you plan on attending a workshop, do not book any equipment!</b>
          </p>
        </div>
        <Button variant="secondary" onClick={() => load()} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Day picker */}
      <div className="mt-10 flex flex-wrap gap-3" role="tablist" aria-label="Day">
        {EVENT_DAYS.map((d) => {
          const active = d.date === date;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDate(d.date)}
              className={`border-[2px] border-[var(--foreground)] px-4 py-2 text-left font-display transition-colors ${
                active
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : "bg-transparent hover:bg-[var(--surface-hover)]"
              }`}
            >
              <span className="block text-sm font-bold">{d.label}</span>
              <span className="block font-body text-xs text-[var(--foreground)]/60">
                {new Date(`${d.date}T12:00:00`).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 font-body text-sm text-[var(--foreground)]/70">
        Booking as <strong>{teamName}</strong>
      </p>

      {!dayOpen ? (
        <p
          role="status"
          className="mt-4 border-[2px] border-[var(--foreground)] bg-[var(--accent)] px-3 py-2 font-body text-sm"
        >
          Bookings for {EVENT_DAYS.find((d) => d.date === date)?.label} open{" "}
          <b>{formatOpensAt(date)}</b> (in {formatCountdown(unlockMs(date) - now)}). You can look at
          the slots now; reserving unlocks automatically.
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="mt-4 border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600">
          {actionError}
        </p>
      ) : null}

      <ol className="mt-6 space-y-8">
        {Object.entries(EQUIPMENT).map(([categoryId, category], index) => {
          const state = snapshot.categories[categoryId];
          const slots = state?.days[date] ?? [];
          const units = state?.units ?? [];
          const max = state?.maxSessions ?? 0;

          const todays = snapshot.bookings.filter(
            (b) => b.categoryId === categoryId && b.date === date
          );
          const myCount = todays.filter((b) => sameTeam(b.team, teamName)).length;
          const limitReached = myCount >= max;

          return (
            <li key={categoryId}>
              <HardCard>
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {category.image ? (
                      <div className="relative h-20 w-20 shrink-0 border-[2px] border-[var(--foreground)] bg-[var(--surface-hover)] md:h-24 md:w-24">
                        <Image
                          src={category.image}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 96px, 80px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-[var(--foreground)] font-display text-sm font-bold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold break-words">
                        {category.label}
                      </p>
                      {category.description ? (
                        <p className="mt-1 font-body text-sm text-[var(--foreground)]/70">
                          {category.description}
                        </p>
                      ) : null}
                      <p className="mt-1 font-body text-xs text-[var(--foreground)]/60">
                        {units.length} available in total
                      </p>
                    </div>
                  </div>

                  {/* Daily allowance meter */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`${TAG} ${
                        limitReached
                          ? "bg-[var(--accent)] text-[var(--foreground)]"
                          : "bg-transparent text-[var(--foreground)]"
                      }`}
                    >
                      {limitReached ? "Limit reached" : `${myCount}/${max} booked today`}
                    </span>
                    <div className="flex gap-1" aria-hidden>
                      {Array.from({ length: max }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-3 w-6 border-[2px] border-[var(--foreground)] ${
                            i < myCount ? "bg-[var(--foreground)]" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {slots.length === 0 ? (
                  <p className="mt-6 font-body text-sm text-[var(--foreground)]/70">
                    No slots are available on this day.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => {
                      const booked = todays.filter((b) => b.slotId === slot.id);
                      const myBooking = booked.find((b) => sameTeam(b.team, teamName));
                      const mine = Boolean(myBooking);
                      const freeUnits = units.filter((u) => !booked.some((b) => b.unit === u));
                      const ended = slotHasEnded(date, slot);

                      const status = mine
                        ? "Yours"
                        : ended
                          ? "Closed"
                          : !dayOpen
                            ? "Closed"
                            : freeUnits.length === 0
                              ? "Full"
                              : limitReached
                                ? "Limit reached"
                                : "Available";
                      const canReserve = status === "Available";
                      const busy = busyKey === `${categoryId}:${slot.id}`;

                      return (
                        <div
                          key={slot.id}
                          className={`flex flex-col gap-3 border-[2px] border-[var(--foreground)] px-3 py-3 ${
                            mine ? "bg-[var(--accent)]" : ""
                          } ${!canReserve && !mine ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-display text-base font-bold">{slotLabel(slot)}</p>
                            <span className={`${TAG} bg-transparent`}>{status}</span>
                          </div>

                          {/* One square per unit: filled = taken */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {units.map((unit) => {
                              const taker = booked.find((b) => b.unit === unit);
                              return (
                                <span
                                  key={unit}
                                  title={taker ? `${unit}: ${taker.team}` : `${unit}: free`}
                                  className={`h-3.5 w-3.5 border-[2px] border-[var(--foreground)] ${
                                    taker ? "bg-[var(--foreground)]" : ""
                                  }`}
                                />
                              );
                            })}
                            <span className="ml-1 font-body text-xs text-[var(--foreground)]/70">
                              {freeUnits.length} of {units.length} free
                            </span>
                          </div>

                          {mine && myBooking ? (
                            <p className="font-body text-xs text-[var(--foreground)]/80">
                              You have <b>{myBooking.unit}</b>
                            </p>
                          ) : null}

                          {canReserve ? (
                            <Button
                              variant="primary"
                              className="w-full"
                              disabled={busyKey !== null}
                              onClick={() => act("POST", categoryId, slot.id)}
                            >
                              {busy ? "Reserving…" : "RESERVE"}
                            </Button>
                          ) : null}

                          {mine && !ended ? (
                            <Button
                              variant="secondary"
                              className="w-full"
                              disabled={busyKey !== null}
                              onClick={() => act("DELETE", categoryId, slot.id)}
                            >
                              {busy ? "Cancelling…" : "Cancel booking"}
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </HardCard>
            </li>
          );
        })}
      </ol>
    </div>
  );
}