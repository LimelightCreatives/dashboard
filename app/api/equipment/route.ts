import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/events/equipment-sheet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSnapshot());
  } catch (e) {
    console.error("[equipment] read failed", e);
    return NextResponse.json({ error: "Couldn't read the equipment sheet" }, { status: 502 });
  }
}