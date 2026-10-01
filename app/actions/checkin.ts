"use server";

import { getRows, appendRow } from "@/lib/sheets";

const ATTENDEES_TAB = "Attendees"; // A: Participant Name, B: Phone No., C: Emergency No., D: Registration ID
const CHECKINS_TAB = "Check-ins"; // A: Participant Name, B: Action, C: Timestamp, D: Registration ID
const TIME_ZONE = "Australia/Sydney"; // servers usually run in UTC, so set the event's timezone here
const ATTENDEE_CACHE_MS = 60_000; // newly added attendees can take up to this long to be recognised

export type CheckInAction = "CHECK IN" | "CHECK OUT";

export type CheckInResult =
  | { status: "ok"; action: CheckInAction; id: string; name: string; at: string }
  | { status: "unknown"; id: string }
  | { status: "error"; message: string };

// hh:mm:ss dd/mm/yy
function stamp(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.hour}:${p.minute}:${p.second} ${p.day}/${p.month}/${p.year}`;
}

// in-memory attendee cache (per server instance)
let attendeeCache: { at: number; rows: string[][] } | null = null;

async function getAttendees() {
  if (attendeeCache && Date.now() - attendeeCache.at < ATTENDEE_CACHE_MS) {
    return attendeeCache.rows;
  }
  const rows = await getRows(`'${ATTENDEES_TAB}'!A2:D`);
  attendeeCache = { at: Date.now(), rows };
  return rows;
}

// IDs currently being processed (per server instance)
const inFlight = new Set<string>();

export async function checkInAction(raw: string): Promise<CheckInResult> {
  // TODO: verify the caller is an organiser here. Server actions are public endpoints.
  const id = raw.trim();
  if (!id || id.length > 100) {
    return { status: "error", message: "Invalid code." };
  }
  const key = id.toLowerCase();

  if (inFlight.has(key)) {
    return { status: "error", message: "Scan already processing." };
  }
  inFlight.add(key);

  try {
    const [attendees, log] = await Promise.all([
      getAttendees(),
      getRows(`'${CHECKINS_TAB}'!A2:D`),
    ]);

    const person = attendees.find((r) => r[3]?.trim().toLowerCase() === key);
    if (!person) {
      return { status: "unknown", id };
    }

    const name = person[0] ?? "";
    const registrationId = person[3].trim();

    // most recent log row for this person decides the next action
    const lastRow = [...log].reverse().find((r) => r[3]?.trim().toLowerCase() === key);
    const action: CheckInAction = lastRow?.[1] === "CHECK IN" ? "CHECK OUT" : "CHECK IN";

    const at = stamp();
    await appendRow(`'${CHECKINS_TAB}'!A:D`, [name, action, at, registrationId]);

    return { status: "ok", action, id: registrationId, name, at };
  } catch (err) {
    console.error("check-in failed", err);
    return { status: "error", message: "Couldn't reach the sheet. Try again." };
  } finally {
    inFlight.delete(key);
  }
}