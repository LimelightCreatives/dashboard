// Shared (client + server) config, types and helpers for equipment booking.
// The Google Sheet is the source of truth for quantities, per-team limits and
// timeslots. This file only holds what the sheet can't tell us.

export type Slot = { id: string; start: string; end: string }; // 24h "HH:mm"; id === start

export type Booking = {
  team: string; // team NAME, as written into the sheet cell
  categoryId: string;
  unit: string; // e.g. "Gimbal 2"
  date: string; // "YYYY-MM-DD"
  slotId: string;
};

export type CategoryConfig = {
  label: string;
  description?: string;
  /** Sheet tables are named "<tablePrefix> Day <n>", e.g. "Gimbal Day 1". */
  tablePrefix: string;
  /** Units are named "<unitName> 1", "<unitName> 2", ... (one per Slot column). */
  unitName: string;
  /** Labels in column A of the config block; the value sits in the next cell. */
  quantityLabel: string;
  maxSessionsLabel: string;
};

/** What the server returns: everything the page needs to render. */
export type CategoryState = {
  units: string[];
  maxSessions: number; // per team, per day
  days: Record<string, Slot[]>; // keyed by date
};
export type EquipmentSnapshot = {
  categories: Record<string, CategoryState>;
  bookings: Booking[];
};

export type EventDay = {
  date: string;
  label: string;
  /** Sydney local time "YYYY-MM-DDTHH:mm" when booking for this day opens. Omit = already open. */
  opens?: string;
};

// "Day 1" in a table name = first entry here, "Day 2" = second, etc.
// Placeholder dates and opening times, so replace them with your own.
export const EVENT_DAYS: EventDay[] = [
  { date: "2026-10-24", label: "Saturday", opens: "2026-10-24T10:00" },
  { date: "2026-10-25", label: "Sunday", opens: "2026-10-25T09:00" },
];

// Browsers wait a random 0..N seconds after a day opens before enabling the
// RESERVE buttons, which smooths the opening rush. 0 = strictly first-come.
// This is client-side only; the server enforces the real opening time.
export const BOOKING_JITTER_SECONDS = 8;

export const dayOpensAt = (date: string): Date | null => {
  const opens = EVENT_DAYS.find((d) => d.date === date)?.opens;
  return opens ? new Date(`${opens}:00${TIMEZONE_OFFSET}`) : null;
};

export const dayHasOpened = (date: string, now = new Date()) => {
  const t = dayOpensAt(date);
  return !t || now.getTime() >= t.getTime();
};

export const formatOpensAt = (date: string): string =>
  dayOpensAt(date)?.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "numeric",
    minute: "2-digit",
  }) ?? "";

export const SLOT_MINUTES = 60;

// Sydney in November is AEDT. Used only to work out which slots are already over.
export const TIMEZONE_OFFSET = "+11:00";

// To add equipment: add a key here AND add "<prefix> Day n" tables plus the two
// config rows to the sheet.
export const EQUIPMENT: Record<string, CategoryConfig> = {
  gimbal: {
    label: "Osmo Mobile 8 (Phone Gimbal)",
    description: "Handheld stabilisers for smooth, moving shots.",
    tablePrefix: "Gimbal",
    unitName: "Gimbal",
    quantityLabel: "Gimbal Quantity",
    maxSessionsLabel: "Max Gimbal Sessions",
  },
  mic: {
    label: "DJI Mic Mini (Lapel Mics)",
    description: "Clip-on mics for clean and convenient audio.",
    tablePrefix: "Microphone",
    unitName: "Mic",
    quantityLabel: "Microphone Quantity",
    maxSessionsLabel: "Max Microphone Sessions",
  },
};

export const sameTeam = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** "10:00 AM", "1:00 pm", "13:00" or "13:00:00" -> "13:00". Null if unreadable. */
export function parseTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])?\.?m?\.?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const meridiem = m[3]?.toLowerCase();
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (meridiem === "p" ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "13:00" -> "1:00 PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const slotLabel = (s: Slot) => `${formatTime(s.start)} – ${formatTime(s.end)}`;

export function slotHasEnded(date: string, slot: Slot, now = new Date()) {
  return now.getTime() > new Date(`${date}T${slot.end}:00${TIMEZONE_OFFSET}`).getTime();
}