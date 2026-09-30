import { google } from "googleapis";

function privateKey(): string {
  const b64 = process.env.GOOGLE_PRIVATE_KEY_B64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");

  // fallback: raw key, tolerating pasted quotes and literal "\n"
  return (process.env.GOOGLE_PRIVATE_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");
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