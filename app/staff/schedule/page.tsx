"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HardCard } from "@/components/dashboard/HardCard";
import schedule from "@/data/run-of-show/schedule.json";
import {
  PARTICIPANT, eventNow, fmt, fmtDate, fmtRange, makeApi, timeState,
  type Day, type Item, type Schedule,
} from "@/lib/run-of-show/schedule";

const data = schedule as unknown as Schedule;

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";
const BTN =
  "border-[2px] border-[var(--foreground)] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.08em] disabled:opacity-50";
const BTN_SOLID = `${BTN} bg-[var(--foreground)] text-[var(--background)]`;
const BTN_OUTLINE = `${BTN} bg-transparent`;
const LABEL = "font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60";
const STORAGE_KEY = "limelight-ros-person";

type View = "mine" | "full";

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${TAG} cursor-pointer ${active ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-transparent text-[var(--foreground)]"}`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="Loading">
      <span aria-hidden className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]" />
    </div>
  );
}

export default function RunOfShowPage() {
  const api = useMemo(() => makeApi(data), []);
  const [ready, setReady] = useState(false);
  const [person, setPerson] = useState<string | null>(null);
  const [dayId, setDayId] = useState(data.days[0]?.id);
  const [view, setView] = useState<View>("mine");
  const [override, setOverride] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const tz = data.event.timezone;
  const now = useMemo(() => eventNow(tz, override), [tz, override, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read ?person= ?day= ?view= ?now= (and the remembered person) once on the client.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const valid = (id: string | null) => !!id && (id === PARTICIPANT || !!api.findStaff(id));
    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
    const wanted = (p.get("person") || "").toLowerCase();
    setPerson(valid(wanted) ? wanted : !wanted && valid(stored) ? stored : null);
    const ov = p.get("now");
    setOverride(ov);
    const today = eventNow(tz, ov).date;
    const d = p.get("day");
    setDayId(data.days.some((x) => x.id === d) ? d! : (data.days.find((x) => x.date === today) || data.days[0])?.id);
    if (p.get("view") === "full") setView("full");
    setReady(true);
  }, [api, tz]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    const wake = () => !document.hidden && setTick((n) => n + 1);
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", wake); };
  }, []);

  const choose = (id: string | null) => {
    setPerson(id);
    if (id) setView("mine");
    try { id ? localStorage.setItem(STORAGE_KEY, id) : localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (!ready) return <Spinner />;

  const day: Day | undefined = data.days.find((d) => d.id === dayId) || data.days[0];
  const hasBlocks = !!day && day.blocks.length > 0;
  const picking = view === "mine" && !person;
  const live = !!day?.date && now.date === day.date;
  const me = person ? api.findStaff(person) : null;
  const wide = view === "full" && hasBlocks;

  const banner = live && view === "mine" && person && !me?.placeholder ? api.nowNext(day!, person, now.min) : null;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl">Schedule</h1>
            <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">
              {data.event.subtitle || "Run of Show"}: who does what, when and where.
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="View">
            <Tab active={view === "mine"} onClick={() => setView("mine")}>My day</Tab>
            <Tab active={view === "full"} onClick={() => setView("full")}>Full view</Tab>
          </div>
        </div>

        {!picking && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex gap-2" role="tablist" aria-label="Day">
              {data.days.map((d) => (
                <Tab key={d.id} active={d.id === day?.id} onClick={() => setDayId(d.id)}>
                  {d.label} · {fmtDate(d.date).split(" ").slice(1).join(" ")}
                </Tab>
              ))}
            </div>
            {person && (
              <button type="button" onClick={() => choose(null)} className={`${BTN_OUTLINE} ml-auto`}>
                Switch
              </button>
            )}
          </div>
        )}

        {banner && (
          <HardCard className="mt-6">
            <p className={LABEL}>Now</p>
            <p className="font-body text-sm font-bold">{banner.now}</p>
            {banner.nextLine && (<><p className={`mt-3 ${LABEL}`}>Next</p><p className="font-body text-sm">{banner.nextLine}</p></>)}
            {banner.walk && <p className={`${TAG} mt-3 bg-[var(--accent)]`}>→ {banner.walk}</p>}
          </HardCard>
        )}

        <div className="mt-8">
          {!day ? (
            <HardCard className="border-dashed"><p className="font-body text-sm">No days in schedule.json yet.</p></HardCard>
          ) : picking ? (
            <Picker onPick={choose} />
          ) : !hasBlocks ? (
            <HardCard className="border-dashed">
              <p className="font-display text-xl font-bold">{day.label} is coming soon</p>
              <p className="mt-1 font-body text-sm">The run of show hasn’t been published yet. Check back here.</p>
            </HardCard>
          ) : view === "full" ? (
            <Grid day={day} me={person} now={now} />
          ) : me?.placeholder ? (
            <HardCard className="border-dashed">
              <p className="font-display text-xl font-bold">{me.placeholder}</p>
              <p className="mt-1 font-body text-sm">Your timeline will appear here once assignments are confirmed.</p>
            </HardCard>
          ) : (
            <Timeline
              day={day} id={person!} now={now} live={live}
              expanded={expanded} showAll={showAll}
              toggle={(k) => setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}
              toggleAll={() => setShowAll((v) => !v)}
            />
          )}
        </div>
      </div>
    </main>
  );

  function Picker({ onPick }: { onPick: (id: string) => void }) {
    const lead = data.event.leadId;
    const ordered = [
      ...api.scheduled.filter((s) => s.id === lead),
      ...api.scheduled.filter((s) => s.id !== lead).sort((a, b) => a.name.localeCompare(b.name)),
      ...api.staffList.filter((s) => s.placeholder),
    ];
    return (
      <div>
        <h2 className="font-display text-2xl font-bold">Who are you?</h2>
        <button type="button" onClick={() => onPick(PARTICIPANT)} className={`${BTN_SOLID} mt-4 w-full`}>Participant</button>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ordered.map((s) => (
            <button key={s.id} type="button" onClick={() => onPick(s.id)} className={BTN_OUTLINE}>{s.name}</button>
          ))}
        </div>
      </div>
    );
  }

  function Timeline(p: {
    day: Day; id: string; now: { date: string; min: number }; live: boolean;
    expanded: Set<string>; showAll: boolean; toggle: (k: string) => void; toggleAll: () => void;
  }) {
    const plan = api.planFor(p.day, p.id);
    const person = api.findStaff(p.id);
    const finished = plan.some((i) => i.kind === "done" && timeState(p.day, p.now, i.s, i.e) === "now");
    let lastLoc = "";
    return (
      <div>
        <h2 className="font-display text-2xl font-bold">
          {p.id === PARTICIPANT ? `Your ${p.day.label}` : `${person?.name}’s ${p.day.label}`}
        </h2>
        {person && data.event.redirectNote && person.id !== data.event.leadId && (
          <p className="mt-1 font-body text-sm text-[var(--foreground)]/70">{data.event.redirectNote}</p>
        )}
        <ul className="mt-6 space-y-4">
          {plan.map((it, i) => {
            const key = `${it.kind}:${it.s}:${i}`;
            if (it.kind === "marker") {
              return (
                <li key={key} className="font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                  {fmt(it.s)} · Participants · {it.text}
                </li>
              );
            }
            const st = timeState(p.day, p.now, it.s, it.e);
            const past = st === "past";
            if (finished && !p.showAll && it.kind !== "done") return null;
            const open = p.expanded.has(key);
            const loc = api.title(it) && (it.kind === "block" ? it.a.location : it.kind === "pblock" ? it.where : "");
            const showLoc = !!loc && (loc !== lastLoc || st !== "past");
            if (loc) lastLoc = loc;

            if (past && !open && it.kind !== "done") {
              return (
                <li key={key}>
                  <button type="button" onClick={() => p.toggle(key)} aria-expanded={false}
                    className="flex w-full items-center gap-3 border-[2px] border-[var(--foreground)]/30 px-3 py-2 text-left font-body text-sm text-[var(--foreground)]/60">
                    <span className="font-bold">{fmt(it.s)}</span>
                    <span className="min-w-0 flex-1 truncate">{api.title(it)}</span>
                    <span aria-hidden>✓</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={key} aria-current={st === "now" ? "time" : undefined}>
                <HardCard className={st === "now" ? "border-l-[10px] border-l-[var(--accent)]" : past ? "opacity-70" : ""}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className={LABEL}>{fmtRange(it.s, it.e < 24 * 60 ? it.e : undefined)}</p>
                    {st === "now" && <span className={`${TAG} bg-[var(--accent)] text-[var(--foreground)]`}>Now</span>}
                    {past && it.kind !== "done" && (
                      <button type="button" onClick={() => p.toggle(key)} className={`${TAG} cursor-pointer bg-transparent`}>Fold</button>
                    )}
                  </div>
                  {it.kind === "arrive" || it.kind === "return" ? (
                    <>
                      <p className="mt-2 font-display text-xl font-bold">
                        {it.kind === "return" ? "Back" : "Arrive"}{it.first.a.location ? ` at ${it.first.a.location}` : ""} by {fmt(it.at)}
                      </p>
                      <p className="mt-1 font-body text-sm text-[var(--foreground)]/70">
                        {it.kind === "return" ? "Next" : "First"} job {fmt(it.first.s)} · {api.roleNames(it.first.a)}
                      </p>
                    </>
                  ) : it.kind === "done" ? (
                    <>
                      <p className="mt-2 font-display text-xl font-bold">You’re done at {fmt(it.at)}. Thanks, {person?.name}.</p>
                      <button type="button" onClick={p.toggleAll} className={`${BTN_OUTLINE} mt-4`}>{p.showAll ? "Hide my day" : "Show my day"}</button>
                    </>
                  ) : it.kind === "pblock" ? (
                    <p className="mt-2 font-display text-xl font-bold break-words">{it.text}</p>
                  ) : it.kind === "block" ? (
                    <>
                      {it.a.roles.length === 0 && <p className="mt-2 font-display text-xl font-bold">Not assigned yet</p>}
                      {it.a.roles.map((r) => (
                        <div key={r.name} className="mt-2">
                          <p className="font-display text-xl font-bold">
                            {r.name} {r.flexible && <span className={TAG}>Flex</span>}
                          </p>
                          {r.steps.length > 0 && (
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 font-body text-sm">
                              {r.steps.map((s) => <li key={s}>{s}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                      {it.a.note && <p className="mt-3 border-[2px] border-[var(--foreground)] px-3 py-2 font-body text-sm">{it.a.note}</p>}
                    </>
                  ) : null}
                  {showLoc && <p className="mt-3 font-body text-sm font-bold">📍 {loc}</p>}
                  {it.kind === "block" && it.ctx.length > 0 && (
                    <div className="mt-3 border-t-[2px] border-[var(--foreground)]/20 pt-3 font-body text-sm text-[var(--foreground)]/70">
                      {it.ctx.filter((c, j, all) => c.text !== all[j - 1]?.text).map((c) => (
                        <p key={c.s}>Participants · {it.ctx.length > 1 && <strong>{fmt(c.s)} </strong>}{c.text}</p>
                      ))}
                    </div>
                  )}
                </HardCard>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  function Grid({ day, me, now }: { day: Day; me: string | null; now: { date: string; min: number } }) {
    const th = `border-[2px] border-[var(--foreground)] px-3 py-2 text-left align-top ${LABEL} text-[var(--foreground)]`;
    const td = "border-[2px] border-[var(--foreground)] px-3 py-2 align-top font-body text-sm";
    const mine = (id: string) => (id === me ? " bg-[var(--accent)]/30" : "");
    return (
      <div className="overflow-x-auto border-[2px] border-[var(--foreground)]">
        <table className="w-full min-w-max border-collapse">
          <caption className="sr-only">{day.label}: who does what, by time</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Time</th>
              <th scope="col" className={`${th}${mine(PARTICIPANT)}`}>Participants</th>
              {api.scheduled.map((s) => <th key={s.id} scope="col" className={`${th}${mine(s.id)}`}>{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {day.blocks.map((b, i) => {
              const s = b.start.split(":").map(Number).reduce((h, m) => h * 60 + m);
              if (api.isMarker(b)) {
                return (
                  <tr key={i}>
                    <th scope="row" className={th}>{fmt(s)}</th>
                    <td colSpan={api.scheduled.length + 1} className={`${td} font-bold uppercase tracking-[0.08em]`}>{b.participants || b.title}</td>
                  </tr>
                );
              }
              const e = b.end!.split(":").map(Number).reduce((h, m) => h * 60 + m);
              const st = timeState(day, now, s, e);
              const blockPlace = api.place(b.staffLocation || b.location);
              return (
                <tr key={i} className={`${st === "now" ? "bg-[var(--accent)]/20" : ""} ${st === "past" ? "opacity-60" : ""}`}>
                  <th scope="row" className={`${th} whitespace-nowrap`}>
                    {fmtRange(s, e)}
                    <span className="mt-1 block font-body normal-case tracking-normal font-normal">{api.place(b.location)}</span>
                  </th>
                  <td className={`${td} min-w-[12rem]${mine(PARTICIPANT)}`}>{b.participants || <em>Staff only: {b.title}</em>}</td>
                  {api.scheduled.map((p) => {
                    const a = api.assignment(b, p, day);
                    if (a.status === "off") {
                      return (
                        <td key={p.id} className={`${td} text-[var(--foreground)]/40${mine(p.id)}`}>
                          Not on site{a.partial && <span className="block text-xs">{a.partial}</span>}
                        </td>
                      );
                    }
                    return (
                      <td key={p.id} className={`${td} min-w-[9rem]${mine(p.id)}`}>
                        <div className="flex flex-wrap gap-1">
                          {a.roles.length ? a.roles.map((r) => (
                            <span key={r.name} className={TAG}>{r.name}{r.flexible ? " · Flex" : ""}</span>
                          )) : <em>Not assigned</em>}
                        </div>
                        {a.location && a.location !== blockPlace && <span className="mt-1 block text-xs">📍 {a.location}</span>}
                        {a.note && <span className="mt-1 block text-xs">{a.note}</span>}
                        {a.partial && <span className="mt-1 block text-xs font-bold">{a.partial}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}