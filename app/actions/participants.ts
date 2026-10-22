"use server";

import { getRows, appendRow, updateRow, deleteRow } from "@/lib/sheets";

// Same tabs and layout as app/actions/checkin.ts
const ATTENDEES_TAB = "Attendees"; // A: Name, B: Email, C: Phone No., D: Emergency No., E: Registration ID
const CHECKINS_TAB = "Check-ins"; // A: Participant Name, B: Action, C: Timestamp, D: Registration ID

export type CheckStatus = "in" | "out" | "none";
export type ParticipantInput = {
  /** Registration ID before editing; omit when creating. */
  originalId?: string;
  name: string;
  email: string;
  phone: string;
  emergency: string;
  registrationId: string;
};
export type ParticipantRow = Omit<ParticipantInput, "originalId"> & { status: CheckStatus; lastAt: string };
type Done = { ok: true } | { ok: false; message: string };

const s = (v: unknown) => String(v ?? "").trim();
const same = (a: string, b: string) => s(a).toLowerCase() === s(b).toLowerCase();
const fail = (e: unknown): { ok: false; message: string } => {
  console.error(e);
  return { ok: false, message: "Couldn't reach the sheet. Try again." };
};

// TODO: verify the caller is an organiser here, as in checkin.ts. Server actions are public endpoints.

export async function listParticipants(): Promise<{ ok: true; rows: ParticipantRow[] } | { ok: false; message: string }> {
  try {
    const [people, log] = await Promise.all([
      getRows(`'${ATTENDEES_TAB}'!A2:E`),
      getRows(`'${CHECKINS_TAB}'!A2:D`),
    ]);

    // latest log row per ID decides the status (same rule checkInAction uses)
    const latest = new Map<string, { status: CheckStatus; at: string }>();
    for (const r of log) {
      const id = s(r[3]).toLowerCase();
      if (id) latest.set(id, { status: s(r[1]) === "CHECK IN" ? "in" : "out", at: s(r[2]) });
    }

    const rows = people
      .filter((r) => s(r[4]) || s(r[0]))
      .map((r): ParticipantRow => {
        const registrationId = s(r[4]);
        const st = latest.get(registrationId.toLowerCase());
        return {
          name: s(r[0]), email: s(r[1]), phone: s(r[2]), emergency: s(r[3]), registrationId,
          status: st?.status ?? "none", lastAt: st?.at ?? "",
        };
      });
    return { ok: true, rows };
  } catch (e) {
    return fail(e);
  }
}

export async function saveParticipant(input: ParticipantInput): Promise<Done> {
  const p = {
    name: s(input.name), email: s(input.email), phone: s(input.phone),
    emergency: s(input.emergency), registrationId: s(input.registrationId),
  };
  if (!p.name) return { ok: false, message: "Name is required." };
  if (!p.registrationId) return { ok: false, message: "Registration ID is required." };
  if (p.registrationId.length > 100) return { ok: false, message: "Registration ID is too long." };
  try {
    const people = await getRows(`'${ATTENDEES_TAB}'!A2:E`);
    const original = s(input.originalId);
    if (!same(p.registrationId, original) && people.some((r) => same(r[4], p.registrationId)))
      return { ok: false, message: `Registration ID "${p.registrationId}" is already in use.` };

    const values = [p.name, p.email, p.phone, p.emergency, p.registrationId];
    if (original) {
      const i = people.findIndex((r) => same(r[4], original));
      if (i < 0) return { ok: false, message: "That participant no longer exists. Refresh the list." };
      const row = i + 2; // header row + 1-indexed
      await updateRow(`'${ATTENDEES_TAB}'!A${row}:E${row}`, values);
    } else {
      await appendRow(`'${ATTENDEES_TAB}'!A:E`, values);
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteParticipant(registrationId: string): Promise<Done> {
  try {
    const people = await getRows(`'${ATTENDEES_TAB}'!A2:E`);
    const i = people.findIndex((r) => same(r[4], registrationId));
    if (i < 0) return { ok: false, message: "That participant no longer exists. Refresh the list." };
    await deleteRow(ATTENDEES_TAB, i + 2);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}