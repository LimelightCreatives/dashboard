import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId, unauthorized } from "@/lib/teams";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  const rows = await sql`
    select s.milestone_id, s.status
    from team_members m
    join milestone_submissions s on s.team_id = m.team_id
    where m.user_id = ${userId}`;

  const statuses: Record<string, "submitted" | "approved"> = Object.fromEntries(
    rows.map((r) => [r.milestone_id, r.status])
  );

  return NextResponse.json({ statuses });
}