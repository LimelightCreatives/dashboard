import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type UrlParam = { name: string; value: string };

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.FILLOUT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Fillout nests the data under `submission`; fall back to the root just in case.
  const submission = body.submission ?? body;

  // Temporary: check your server logs after a test submission to confirm the shape,
  // then delete this line.
  console.log("Fillout webhook payload:", JSON.stringify(body));

  const params: Record<string, string> = Object.fromEntries(
    ((submission.urlParameters ?? []) as UrlParam[]).map((p) => [p.name, p.value])
  );

  const { milestoneId, teamId } = params;
  if (!milestoneId || !teamId) {
    return NextResponse.json({ error: "Missing milestoneId or teamId" }, { status: 400 });
  }

  const submissionId: string | null = submission.submissionId ?? null;

  try {
    // A resubmission never downgrades an already-approved milestone.
    await sql`
      insert into milestone_submissions (team_id, milestone_id, status, submission_id)
      values (${teamId}, ${milestoneId}, 'submitted', ${submissionId})
      on conflict (team_id, milestone_id) do update
        set submission_id = excluded.submission_id,
            submitted_at = now(),
            status = case when milestone_submissions.status = 'approved'
                          then 'approved' else 'submitted' end`;
  } catch (e) {
    // An unknown or malformed teamId (FK violation / invalid uuid) lands here.
    console.error(e);
    return NextResponse.json({ error: "Could not record submission" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}