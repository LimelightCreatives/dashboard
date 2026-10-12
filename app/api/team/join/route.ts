import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId, teamsLocked, unauthorized, MAX_TEAM_SIZE } from "@/lib/teams";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  if (teamsLocked()) return NextResponse.json({ error: "Teams are locked" }, { status: 403 });

  const { code } = await req.json().catch(() => ({}));
  const joinCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!joinCode) return NextResponse.json({ error: "Join code required" }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const existing = await client.query("select 1 from team_members where user_id = $1", [userId]);
    if (existing.rowCount) {
      await client.query("rollback");
      return NextResponse.json({ error: "You're already on a team" }, { status: 409 });
    }

    // FOR UPDATE locks the team row so two people can't both take the last slot
    const team = await client.query("select id from teams where join_code = $1 for update", [joinCode]);
    if (!team.rowCount) {
      await client.query("rollback");
      return NextResponse.json({ error: "No team with that code" }, { status: 404 });
    }
    const teamId = team.rows[0].id;

    const count = await client.query("select count(*)::int as n from team_members where team_id = $1", [teamId]);
    if (count.rows[0].n >= MAX_TEAM_SIZE) {
      await client.query("rollback");
      return NextResponse.json({ error: "That team is full" }, { status: 409 });
    }

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