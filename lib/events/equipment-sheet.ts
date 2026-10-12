// Server-only. Reads and writes the booking grid in Google Sheets.
//
// Sheet layout this expects (per category, per day):
//   * a native Table named "<tablePrefix> Day <n>", e.g. "Gimbal Day 1"
//   * its first column is headed "Timeslot" and holds each slot's start time
//   * every other column is one physical unit (Slot 1 = unit 1, ...) and its
//     cells hold the name of the team that booked it, or are empty
//   * a config block somewhere on the tab: a label cell with the value in the
//     cell to its right (e.g. "Gimbal Quantity" | 3)
//
// Env vars:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY (share the sheet with this email as Editor)
//   EQUIPMENT_SHEET_ID, EQUIPMENT_SHEET_TAB (optional; defaults to the first tab that has tables)

import { google, type sheets_v4 } from "googleapis";

import {
  EQUIPMENT,
  EVENT_DAYS,
  SLOT_MINUTES,
  addMinutes,
  dayHasOpened,
  formatOpensAt,
  parseTime,
  sameTeam,
  slotHasEnded,
  type Booking,
  type EquipmentSnapshot,
  type Slot,
} from "./equipment";

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 409
  ) {
    super(message);
  }
}

// ---------- Sheets client ----------

function privateKey(): string {
  const b64 = process.env.GOOGLE_EQUIPMENT_PRIVATE_KEY_B64;
  const raw = b64
    ? Buffer.from(b64, "base64").toString("utf8")
    : process.env.GOOGLE_EQUIPMENT_PRIVATE_KEY_B64 ?? "";

  return raw
    .trim()
    .replace(/^["']|["']$/g, "") // stray surrounding quotes
    .replace(/\\n/g, "\n"); // literal \n -> real newline
}

let _sheets: sheets_v4.Sheets | null = null;
function sheets() {
  if (!_sheets) {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_EQUIPMENT_EMAIL,
      key: privateKey(),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    _sheets = google.sheets({ version: "v4", auth });
  }
  return _sheets;
}

const spreadsheetId = () => {
  const id = process.env.EQUIPMENT_SHEET_ID;
  if (!id) throw new Error("EQUIPMENT_SHEET_ID is not set");
  return id;
};

const colLetter = (n: number) => {
  let s = "";
  for (let c = n + 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
  return s;
};
const quoteTab = (title: string) => `'${title.replace(/'/g, "''")}'`;

// ---------- Table metadata (changes rarely, so cached) ----------

type TableRange = { name: string; r0: number; r1: number; c0: number; c1: number }; // r1/c1 exclusive
type Meta = { sheetTitle: string; tables: TableRange[] };

let metaCache: { at: number; meta: Meta } | null = null;

async function getMeta(): Promise<Meta> {
  if (metaCache && Date.now() - metaCache.at < 60_000) return metaCache.meta;

  const res = await sheets().spreadsheets.get({
    spreadsheetId: spreadsheetId(),
    fields: "sheets(properties(sheetId,title),tables(tableId,name,range))",
  });
  const wanted = process.env.EQUIPMENT_SHEET_TAB;
  // `tables` is cast because older googleapis typings may not include it.
  const all = (res.data.sheets ?? []) as any[];
  const sheet = all.find((s) => (wanted ? s.properties?.title === wanted : s.tables?.length));
  if (!sheet) {
    throw new Error(wanted ? `Tab "${wanted}" not found` : "No tab with tables found in the sheet");
  }

  const tables: TableRange[] = (sheet.tables ?? []).map((t: any) => ({
    name: String(t.name ?? ""),
    r0: t.range?.startRowIndex ?? 0,
    r1: t.range?.endRowIndex ?? 0,
    c0: t.range?.startColumnIndex ?? 0,
    c1: t.range?.endColumnIndex ?? 0,
  }));

  const meta = { sheetTitle: sheet.properties.title as string, tables };
  metaCache = { at: Date.now(), meta };
  return meta;
}

// ---------- Reading ----------

type Locate = (categoryId: string, date: string, slotId: string, unitIndex: number) => { row: number; col: number } | null;

async function readState(): Promise<{ snapshot: EquipmentSnapshot; locate: Locate; sheetTitle: string }> {
  const meta = await getMeta();
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: quoteTab(meta.sheetTitle),
    valueRenderOption: "FORMATTED_VALUE",
  });
  const grid: string[][] = (res.data.values ?? []).map((r) => r.map((c) => String(c ?? "")));
  const cell = (r: number, c: number) => (grid[r]?.[c] ?? "").trim();

  const findConfig = (label: string): number | null => {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (cell(r, c).toLowerCase() !== label.toLowerCase()) continue;
        const raw = cell(r, c + 1);
        const n = Number(raw);
        return raw !== "" && Number.isFinite(n) ? n : null;
      }
    }
    return null;
  };

  const categories: EquipmentSnapshot["categories"] = {};
  const bookings: Booking[] = [];
  const layout: Record<string, Record<string, { firstCol: number; rows: { slotId: string; row: number }[] }>> = {};

  for (const [categoryId, cfg] of Object.entries(EQUIPMENT)) {
    const quantity = findConfig(cfg.quantityLabel);
    const maxSessions = findConfig(cfg.maxSessionsLabel);
    if (quantity === null) throw new Error(`Couldn't find "${cfg.quantityLabel}" in the sheet`);
    if (maxSessions === null) throw new Error(`Couldn't find "${cfg.maxSessionsLabel}" in the sheet`);

    const days: Record<string, Slot[]> = {};
    const found: { date: string; firstCol: number; slotCols: number; slots: Slot[]; rows: number[] }[] = [];
    layout[categoryId] = {};

    for (const t of meta.tables) {
      const m = t.name.match(/^(.*?)\s+day\s+(\d+)$/i);
      if (!m || m[1].trim().toLowerCase() !== cfg.tablePrefix.toLowerCase()) continue;
      const day = EVENT_DAYS[Number(m[2]) - 1];
      if (!day) continue;

      let header = -1;
      for (let r = t.r0; r < t.r1; r++) {
        if (cell(r, t.c0).toLowerCase() === "timeslot") {
          header = r;
          break;
        }
      }
      if (header < 0) continue;

      const slots: Slot[] = [];
      const rows: number[] = [];
      for (let r = header + 1; r < t.r1; r++) {
        const start = parseTime(cell(r, t.c0));
        if (!start) continue;
        slots.push({ id: start, start, end: addMinutes(start, SLOT_MINUTES) });
        rows.push(r);
      }
      found.push({ date: day.date, firstCol: t.c0, slotCols: t.c1 - t.c0 - 1, slots, rows });
    }

    // Never offer more units than every day's table has columns for.
    const unitCount = found.length
      ? Math.max(0, Math.min(quantity, ...found.map((f) => f.slotCols)))
      : 0;
    const units = Array.from({ length: unitCount }, (_, i) => `${cfg.unitName} ${i + 1}`);

    for (const f of found) {
      days[f.date] = f.slots;
      layout[categoryId][f.date] = {
        firstCol: f.firstCol,
        rows: f.rows.map((row, i) => ({ slotId: f.slots[i].id, row })),
      };
      f.rows.forEach((row, i) => {
        for (let u = 0; u < unitCount; u++) {
          const team = cell(row, f.firstCol + 1 + u);
          if (team) bookings.push({ team, categoryId, unit: units[u], date: f.date, slotId: f.slots[i].id });
        }
      });
    }

    categories[categoryId] = { units, maxSessions, days };
  }

  const locate: Locate = (categoryId, date, slotId, unitIndex) => {
    const t = layout[categoryId]?.[date];
    const row = t?.rows.find((r) => r.slotId === slotId)?.row;
    return t && row !== undefined ? { row, col: t.firstCol + 1 + unitIndex } : null;
  };

  return { snapshot: { categories, bookings }, locate, sheetTitle: meta.sheetTitle };
}

// Short cache so a room full of people refreshing doesn't blow the Sheets read quota.
let snapCache: { at: number; promise: Promise<EquipmentSnapshot> } | null = null;

export function getSnapshot(): Promise<EquipmentSnapshot> {
  if (snapCache && Date.now() - snapCache.at < 5_000) return snapCache.promise;
  const promise = readState().then((s) => s.snapshot);
  snapCache = { at: Date.now(), promise };
  promise.catch(() => {
    if (snapCache?.promise === promise) snapCache = null;
  });
  return promise;
}

// ---------- Writing ----------

// One write at a time per server instance, so two requests can't both see the same free unit.
let chain: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

type Args = { team: string; categoryId: string; date: string; slotId: string };

function resolve(snapshot: EquipmentSnapshot, a: Args) {
  const cat = snapshot.categories[a.categoryId];
  if (!cat) throw new BookingError("Unknown equipment category", 400);
  const slot = cat.days[a.date]?.find((s) => s.id === a.slotId);
  if (!slot) throw new BookingError("That slot doesn't exist", 400);
  if (slotHasEnded(a.date, slot)) throw new BookingError("That slot has already finished");
  const here = snapshot.bookings.filter(
    (b) => b.categoryId === a.categoryId && b.date === a.date
  );
  return { cat, slot, here };
}

export function reserve(a: Args): Promise<EquipmentSnapshot> {
  return exclusive(async () => {
    // Checked first so early clicks cost no Sheets quota.
    if (!dayHasOpened(a.date)) {
      throw new BookingError(`Bookings for this day open ${formatOpensAt(a.date)}`, 403);
    }
    
    const { snapshot, locate, sheetTitle } = await readState(); // always fresh, never cached
    const { cat, here } = resolve(snapshot, a);

    const mine = here.filter((b) => sameTeam(b.team, a.team));
    if (mine.some((b) => b.slotId === a.slotId)) throw new BookingError("Your team already has this slot");
    if (mine.length >= cat.maxSessions) {
      throw new BookingError(`Your team has reached the limit of ${cat.maxSessions} for this equipment today`);
    }

    const taken = new Set(here.filter((b) => b.slotId === a.slotId).map((b) => b.unit));
    const unitIndex = cat.units.findIndex((u) => !taken.has(u));
    if (unitIndex < 0) throw new BookingError("Someone just booked the last one in that slot");

    const pos = locate(a.categoryId, a.date, a.slotId, unitIndex);
    if (!pos) throw new BookingError("That slot moved in the sheet. Refresh and try again");

    await sheets().spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${quoteTab(sheetTitle)}!${colLetter(pos.col)}${pos.row + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[a.team]] },
    });

    // Read back: if another server instance wrote the same cell after us, we'll see their name.
    const after = await readState();
    const ok = after.snapshot.bookings.some(
      (b) =>
        b.categoryId === a.categoryId &&
        b.date === a.date &&
        b.slotId === a.slotId &&
        b.unit === cat.units[unitIndex] &&
        sameTeam(b.team, a.team)
    );
    snapCache = { at: Date.now(), promise: Promise.resolve(after.snapshot) };
    if (!ok) throw new BookingError("Someone else got that slot first. Try another");
    return after.snapshot;
  });
}

export function cancel(a: Args): Promise<EquipmentSnapshot> {
  return exclusive(async () => {
    const { snapshot, locate, sheetTitle } = await readState();
    const { cat, here } = resolve(snapshot, a);

    const booking = here.find((b) => b.slotId === a.slotId && sameTeam(b.team, a.team));
    if (!booking) throw new BookingError("Your team doesn't have this slot", 404);

    const pos = locate(a.categoryId, a.date, a.slotId, cat.units.indexOf(booking.unit));
    if (!pos) throw new BookingError("That slot moved in the sheet. Refresh and try again");

    await sheets().spreadsheets.values.clear({
      spreadsheetId: spreadsheetId(),
      range: `${quoteTab(sheetTitle)}!${colLetter(pos.col)}${pos.row + 1}`,
    });

    const after = await readState();
    snapCache = { at: Date.now(), promise: Promise.resolve(after.snapshot) };
    return after.snapshot;
  });
}