import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId, unauthorized } from "@/lib/teams";

type Status = "submitted" | "approved";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  // Left join so teams with no submissions still show up with an empty row.
  const rows = await sql`
    select t.id as team_id, t.name as team_name, s.milestone_id, s.status
    from teams t
    left join milestone_submissions s on s.team_id = t.id
    order by t.name`;

  const byTeam = new Map<
    string,
    { id: string; name: string; statuses: Record<string, Status> }
  >();

  for (const r of rows) {
    let team = byTeam.get(r.team_id);
    if (!team) {
      team = { id: r.team_id, name: r.team_name, statuses: {} };
      byTeam.set(r.team_id, team);
    }
    if (r.milestone_id) team.statuses[r.milestone_id] = r.status;
  }

  return NextResponse.json({ teams: [...byTeam.values()] });
}