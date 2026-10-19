// Pure logic for the Run of Show page. All content comes from data/run-of-show/schedule.json.

export type Raw = string | string[] | { role?: string | string[]; roles?: string | string[]; location?: string; note?: string };
export type Block = {
  start: string; end?: string; location?: string; participantLocation?: string; staffLocation?: string;
  participants?: string; title?: string; staff?: Record<string, Raw>; allStaff?: Raw;
};
export type Staff = { id: string; name: string; placeholder?: string; availability?: Record<string, string[] | string[][]> };
export type RoleDef = { steps?: string[]; location?: string; flexible?: boolean };
export type Day = { id: string; label: string; date?: string; blocks: Block[] };
export type Schedule = {
  event: { name?: string; subtitle?: string; timezone?: string; leadId?: string; redirectNote?: string };
  locations: Record<string, string>;
  travel?: { between: [string, string]; minutes: number }[];
  staff: Staff[];
  roles: Record<string, RoleDef>;
  days: Day[];
};

export const PARTICIPANT = "participant";
export type Role = { name: string; steps: string[]; flexible: boolean; location?: string };
export type Assignment =
  | { status: "off"; partial?: string }
  | { status: "ok"; roles: Role[]; location: string; code?: string; note?: string; partial?: string };
export type Item =
  | { kind: "marker"; s: number; e?: undefined; text: string }
  | { kind: "block"; s: number; e: number; key: string; a: Extract<Assignment, { status: "ok" }>; ctx: { s: number; text: string }[] }
  | { kind: "pblock"; s: number; e: number; text: string; where: string; code?: string }
  | { kind: "arrive" | "return"; s: number; e: number; at: number; first: Extract<Item, { kind: "block" }> }
  | { kind: "done"; s: number; e: number; at: number };

const toArr = <T,>(v: T | T[] | undefined | null | ""): T[] => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]);
export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

export function fmt(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
}
export const fmtRange = (s: number, e?: number) => (e == null ? fmt(s) : `${fmt(s)} – ${fmt(e)}`);
export const fmtDuration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
export const fmtDate = (iso?: string) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";

/** "LT / GA" → "La Trobe / Golden Age Cinema" */
export function placeFn(data: Schedule) {
  const map = data.locations || {};
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (!keys.length) return (t?: string) => t || "";
  const re = new RegExp(`\\b(${keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
  return (t?: string) => (t ? t.replace(re, (k) => map[k]) : "");
}

/** Current date + minutes past midnight in the event timezone (or the ?now=YYYY-MM-DDTHH:MM override). */
export function eventNow(tz = "Australia/Sydney", override?: string | null) {
  if (override) { const [date, time = "00:00"] = override.split("T"); return { date, min: toMin(time) }; }
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

export function timeState(day: Day, now: { date: string; min: number }, s: number, e?: number): "past" | "now" | "future" {
  if (!day.date || now.date !== day.date) return now.date > (day.date || "9") ? "past" : "future";
  if (e == null) return now.min > s ? "past" : "future";
  return now.min >= e ? "past" : now.min >= s ? "now" : "future";
}

export function makeApi(data: Schedule) {
  const place = placeFn(data);
  const staffList = data.staff || [];
  const findStaff = (id: string) => staffList.find((s) => s.id === id);
  const scheduled = staffList.filter((s) => !s.placeholder);
  const isMarker = (b: Block) => !b.end;

  const roleInfo = (name: string): Role => {
    const r = data.roles?.[name];
    return { name, steps: r?.steps ?? [], flexible: !!r?.flexible, location: r?.location };
  };
  const normalize = (raw?: Raw) => {
    if (raw == null) return null;
    if (typeof raw === "string" || Array.isArray(raw)) return { roles: toArr(raw) as string[] };
    return { roles: toArr(raw.role ?? raw.roles) as string[], location: raw.location, note: raw.note };
  };
  /** When someone is on site that day, in minutes. null = all day. */
  const windowsFor = (p: Staff, day: Day) => {
    const raw = p.availability?.[day.id];
    if (!raw || !raw.length) return null;
    const spans = (typeof raw[0] === "string" ? [raw] : raw) as string[][];
    return spans.map(([a, b]) => ({ s: toMin(a), e: toMin(b) })).sort((x, y) => x.s - y.s);
  };

  function assignment(b: Block, p: Staff, day: Day): Assignment {
    const s = toMin(b.start), e = toMin(b.end!);
    const windows = windowsFor(p, day);
    let partial: string | undefined;
    if (windows) {
      const i = windows.findIndex((w) => s < w.e && e > w.s);
      if (i < 0) return { status: "off" };
      const w = windows[i];
      if (s < w.s) partial = `${i ? "Back" : "Arrives"} ${fmt(w.s)}`;
      else if (e > w.e) partial = `Leaves ${fmt(w.e)}`;
    }
    const given = normalize(b.staff?.[p.id]) || normalize(b.allStaff);
    if (!given || !given.roles.length) return partial ? { status: "off", partial } : { status: "ok", roles: [], location: place(b.staffLocation || b.location), partial };
    const roles = given.roles.map(roleInfo);
    const code = given.location || roles.find((r) => r.location)?.location || b.staffLocation || b.location;
    return { status: "ok", roles, location: place(code), code, note: given.note, partial };
  }

  function personalPlan(day: Day, p: Staff): Item[] {
    const blocks = day.blocks.filter((b) => !isMarker(b));
    if (!blocks.length) return [];
    const dayStart = Math.min(...blocks.map((b) => toMin(b.start)));
    const dayEnd = Math.max(...blocks.map((b) => toMin(b.end!)));
    const windows = windowsFor(p, day) || [{ s: dayStart, e: dayEnd }];
    const items: Item[] = [];
    for (const b of day.blocks) {
      const s0 = toMin(b.start);
      if (isMarker(b)) {
        if (b.participants && windows.some((w) => s0 >= w.s && s0 < w.e)) items.push({ kind: "marker", s: s0, text: b.participants });
        continue;
      }
      const a = assignment(b, p, day);
      if (a.status === "off") continue;
      const w = windows.find((x) => s0 < x.e && toMin(b.end!) > x.s)!;
      const s = Math.max(s0, w.s), e = Math.min(toMin(b.end!), w.e);
      const ctx = b.participants ? [{ s, text: b.participants }] : [];
      const key = JSON.stringify([a.roles.map((r) => r.name), a.location, a.note]);
      const prev = items[items.length - 1];
      if (prev?.kind === "block" && prev.key === key && prev.e === s) { prev.e = e; prev.ctx.push(...ctx); continue; }
      items.push({ kind: "block", key, s, e, a, ctx });
    }
    const jobs = items.filter((i): i is Extract<Item, { kind: "block" }> => i.kind === "block");
    if (!jobs.length) return items;
    windows.forEach((w, i) => {
      const first = jobs.find((j) => j.s >= w.s);
      if (!first || (i === 0 && w.s <= dayStart)) return;
      const at = items.findIndex((it) => it.s >= w.s);
      items.splice(at < 0 ? items.length : at, 0, { kind: i ? "return" : "arrive", s: w.s, e: Math.max(first.s, w.s), at: w.s, first });
    });
    const finish = jobs[jobs.length - 1].e;
    items.push({ kind: "done", s: finish, e: 24 * 60, at: finish });
    return items;
  }

  function participantPlan(day: Day): Item[] {
    const items: Item[] = [];
    for (const b of day.blocks) {
      if (!b.participants) continue;
      const s = toMin(b.start), where = place(b.participantLocation || b.location);
      if (isMarker(b)) { items.push({ kind: "marker", s, text: b.participants }); continue; }
      const e = toMin(b.end!), prev = items[items.length - 1];
      if (prev?.kind === "pblock" && prev.e === s && prev.text === b.participants && prev.where === where) { prev.e = e; continue; }
      items.push({ kind: "pblock", s, e, text: b.participants, where, code: b.participantLocation || b.location });
    }
    return items;
  }

  const planFor = (day: Day, id: string) => (id === PARTICIPANT ? participantPlan(day) : personalPlan(day, findStaff(id)!));
  const roleNames = (a: { roles: Role[] }) => a.roles.map((r) => r.name).join(" + ");
  const title = (it: Item) => (it.kind === "block" ? roleNames(it.a) || "Not assigned" : it.kind === "pblock" || it.kind === "marker" ? it.text : it.kind === "done" ? "Done" : it.kind === "return" ? "Back" : "Arrive");
  const where = (it: Item) => (it.kind === "block" ? it.a.location : it.kind === "pblock" ? it.where : "");
  const code = (it: Item) => (it.kind === "block" ? it.a.code : it.kind === "pblock" ? it.code : undefined);

  const venueOf = (c?: string) => {
    const last = String(c || "").split("→").pop()!.trim();
    const base = last.split("-")[0];
    return data.locations?.[base] ? base : last;
  };
  const travel = (a: string, b: string) =>
    data.travel?.find((t) => (t.between[0] === a && t.between[1] === b) || (t.between[0] === b && t.between[1] === a))?.minutes ?? null;

  /** "Now / Next / Walk" banner lines for one person. */
  function nowNext(day: Day, id: string, nowMin: number) {
    const plan = planFor(day, id);
    const cards = plan.filter((i) => i.kind !== "marker");
    const jobs = plan.filter((i) => i.kind === "block" || i.kind === "pblock");
    if (!jobs.length) return null;
    const cur = cards.find((i) => nowMin >= i.s && nowMin < i.e!);
    const upcoming = cards.find((c) => c.s > nowMin);
    let now: string, next: Item | undefined;
    if (!cur && nowMin < cards[0].s) { now = `Your day starts ${fmt(cards[0].s)} · in ${fmtDuration(cards[0].s - nowMin)}`; next = jobs[0]; }
    else if (!cur && upcoming?.kind === "return") {
      now = `Back${upcoming.first.a.location ? ` at ${upcoming.first.a.location}` : ""} by ${fmt(upcoming.at)} · in ${fmtDuration(upcoming.at - nowMin)}`; next = upcoming.first;
    }
    else if (cur?.kind === "done") now = "You’re done for the day. Thanks!";
    else if (cur?.kind === "arrive" || cur?.kind === "return") { now = `On site · first job ${fmt(cur.first.s)}`; next = cur.first; }
    else if (cur) { now = `${title(cur)}${where(cur) ? ` · ${where(cur)}` : ""} · until ${fmt(cur.e!)}`; next = jobs.find((j) => j.s >= cur.e!); }
    else { next = jobs.find((j) => j.s > nowMin); now = next ? `Free until ${fmt(next.s)}` : "Nothing more today"; }

    let nextLine = "", walk = "";
    if (next) {
      const m = next.s - nowMin;
      nextLine = `${title(next)} · ${fmt(next.s)}${m > 0 && m <= 90 ? ` · in ${m} min` : ""}`;
      const here = cur && cur.kind !== "arrive" && cur.kind !== "return" ? venueOf(code(cur)) : "";
      const there = venueOf(code(next));
      if (here && there && here !== there) {
        const mins = travel(here, there);
        walk = `${mins ? "Walk" : "Head"} to ${where(next).includes("→") ? place(there) : where(next)}${mins ? ` (${mins} min)` : ""}`;
      }
    } else if (cur && cur.kind !== "done") {
      const d = plan.find((i) => i.kind === "done");
      if (d?.kind === "done") nextLine = `Done at ${fmt(d.at)}`;
    }
    return { now, nextLine, walk };
  }

  return { place, staffList, scheduled, findStaff, isMarker, assignment, planFor, roleNames, title, nowNext };
}