import { NextResponse } from "next/server";

import { BookingError, cancel, reserve } from "@/lib/events/equipment-sheet";

export const dynamic = "force-dynamic";

// The team always comes from the logged-in session, never from the request body,
// so nobody can book as another team.
// This calls your existing /api/team route and forwards the cookies. If you'd
// rather, replace it with a direct call to whatever that route uses internally.
async function currentTeam(req: Request): Promise<string | null> {
  const res = await fetch(new URL("/api/team", req.url), {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.team?.name ?? null;
}

async function handle(req: Request, action: typeof reserve) {
  const team = await currentTeam(req);
  if (!team) return NextResponse.json({ error: "Join a team before booking" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { categoryId, date, slotId } = body ?? {};
  if ([categoryId, date, slotId].some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await action({ team, categoryId, date, slotId }));
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[equipment] write failed", e);
    return NextResponse.json({ error: "Couldn't update the sheet. Try again" }, { status: 502 });
  }
}

export const POST = (req: Request) => handle(req, reserve);
export const DELETE = (req: Request) => handle(req, cancel);