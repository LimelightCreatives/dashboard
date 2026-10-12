import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId, teamsLocked, unauthorized } from "@/lib/teams";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  if (teamsLocked()) return NextResponse.json({ error: "Teams are locked" }, { status: 403 });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const left = await client.query("delete from team_members where user_id = $1 returning team_id", [userId]);
    if (!left.rowCount) {
      await client.query("rollback");
      return NextResponse.json({ error: "You're not on a team" }, { status: 404 });
    }
    const teamId = left.rows[0].team_id;

    const next = await client.query(
      "select user_id from team_members where team_id = $1 order by joined_at limit 1",
      [teamId]
    );
    if (!next.rowCount) {
      await client.query("delete from teams where id = $1", [teamId]); // cascades the submission
    } else {
      // hand ownership to the longest-standing member if the owner left
      await client.query("update teams set owner_id = $1 where id = $2 and owner_id = $3", [
        next.rows[0].user_id, teamId, userId,
      ]);
    }

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