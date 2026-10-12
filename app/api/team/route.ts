import { NextRequest, NextResponse } from "next/server";
import { pool, sql } from "@/lib/db";
import { generateJoinCode, getUserId, teamsLocked, unauthorized, MAX_TEAM_SIZE } from "@/lib/teams";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  const rows = await sql`
    select t.id, t.name, t.join_code, t.owner_id,
           (select count(*)::int from team_members where team_id = t.id) as member_count
    from team_members m
    join teams t on t.id = m.team_id
    where m.user_id = ${userId}`;

  const t = rows[0];
  if (!t) return NextResponse.json({ team: null });

  return NextResponse.json({
    team: {
      id: t.id,
      name: t.name,
      joinCode: t.join_code,
      isOwner: t.owner_id === userId,
      memberCount: t.member_count,
      maxSize: MAX_TEAM_SIZE,
    },
  });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  if (teamsLocked()) return NextResponse.json({ error: "Teams are locked" }, { status: 403 });

  const { name } = await req.json().catch(() => ({}));
  const teamName = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!teamName) return NextResponse.json({ error: "Team name required" }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const existing = await client.query("select 1 from team_members where user_id = $1", [userId]);
    if (existing.rowCount) {
      await client.query("rollback");
      return NextResponse.json({ error: "You're already on a team" }, { status: 409 });
    }

    let teamId: string | null = null;
    for (let i = 0; i < 5 && !teamId; i++) {
      const res = await client.query(
        `insert into teams (name, join_code, owner_id) values ($1, $2, $3)
         on conflict (join_code) do nothing returning id`,
        [teamName, generateJoinCode(), userId]
      );
      teamId = res.rows[0]?.id ?? null;
    }
    if (!teamId) throw new Error("Could not generate join code");

    await client.query("insert into team_members (user_id, team_id) values ($1, $2)", [userId, teamId]);
    await client.query("commit");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    client.release();
  }
}