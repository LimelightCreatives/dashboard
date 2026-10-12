import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId, submissionsClosed, unauthorized } from "@/lib/teams";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  const [membership] = await sql`select team_id from team_members where user_id = ${userId}`;
  if (!membership) return NextResponse.json({ hasTeam: false, project: null });

  const [s] = await sql`select title, logline, video_url from submissions where team_id = ${membership.team_id}`;
  return NextResponse.json({
    hasTeam: true,
    project: s ? { title: s.title, logline: s.logline, videoUrl: s.video_url } : null,
  });
}

export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  if (submissionsClosed()) return NextResponse.json({ error: "Submissions are closed" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim().slice(0, 120);
  const logline = String(body.logline ?? "").trim().slice(0, 500);
  const videoUrl = String(body.videoUrl ?? "").trim();

  let validUrl = false;
  try { validUrl = ["http:", "https:"].includes(new URL(videoUrl).protocol); } catch {}
  if (!title || !logline || !validUrl) {
    return NextResponse.json({ error: "Title, logline and a valid video URL are required" }, { status: 400 });
  }

  // team_id comes from the DB, never from the client
  const [membership] = await sql`select team_id from team_members where user_id = ${userId}`;
  if (!membership) return NextResponse.json({ error: "Join a team first" }, { status: 403 });

  await sql`
    insert into submissions (team_id, title, logline, video_url, submitted_by)
    values (${membership.team_id}, ${title}, ${logline}, ${videoUrl}, ${userId})
    on conflict (team_id) do update set
      title = excluded.title,
      logline = excluded.logline,
      video_url = excluded.video_url,
      submitted_by = excluded.submitted_by,
      updated_at = now()`;

  return NextResponse.json({ ok: true });
}