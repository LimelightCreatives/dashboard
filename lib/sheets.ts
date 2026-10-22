import { google } from "googleapis";

function privateKey(): string {
  const b64 = process.env.GOOGLE_PRIVATE_KEY_B64;
  const raw = b64
    ? Buffer.from(b64, "base64").toString("utf8")
    : process.env.GOOGLE_PRIVATE_KEY ?? "";

  return raw
    .trim()
    .replace(/^["']|["']$/g, "") // stray surrounding quotes
    .replace(/\\n/g, "\n"); // literal \n -> real newline
}

function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function getRows(range: string): Promise<string[][]> {
  const res = await client().spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range,
  });
  return (res.data.values as string[][]) ?? [];
}

export async function appendRow(range: string, row: string[]) {
  await client().spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range,
    // RAW so a scanned value like "=IMPORTDATA(...)" is stored as text, not run as a formula
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

/** Overwrite one row of cells, e.g. updateRow("'Attendees'!A5:E5", [...]). */
export async function updateRow(range: string, row: string[]) {
  await client().spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range,
    // RAW so formulas aren't run and phone numbers keep their leading zeros
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

/** Delete one row from a tab. `row` is the 1-indexed sheet row (the header is row 1). */
export async function deleteRow(tab: string, row: number) {
  const api = client();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const sheetId = meta.data.sheets?.find((x) => x.properties?.title === tab)?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Tab "${tab}" not found`);
  await api.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row } } },
      ],
    },
  });
}