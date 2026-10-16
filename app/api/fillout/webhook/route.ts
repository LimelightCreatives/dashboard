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

  const params: Record<string, string> = Object.fromEntries(
    ((submission.urlParameters ?? []) as UrlParam[]).map((p) => [p.name, p.value])
  );

  const { milestoneId, teamId } = params;
  if (!milestoneId || !teamId) {
    return NextResponse.json({ error: "Missing milestoneId or teamId" }, { status: 400 });
  }

  const milestoneLabel: string | null = params.milestone || null;
  const submissionId: string | null = submission.submissionId ?? null;
  // Fillout sends the answers as `questions: [{ id, name, type, value }]`.
  const answers = JSON.stringify(Array.isArray(submission.questions) ? submission.questions : []);

  try {
    // Approved milestones are left untouched: a resubmission can't downgrade them.
    await sql`
      insert into milestone_submissions
        (team_id, milestone_id, status, submission_id, milestone_label, answers)
      values
        (${teamId}, ${milestoneId}, 'submitted', ${submissionId}, ${milestoneLabel}, ${answers}::jsonb)
      on conflict (team_id, milestone_id) do update
        set submission_id   = excluded.submission_id,
            milestone_label = excluded.milestone_label,
            answers         = excluded.answers,
            submitted_at    = now(),
            status          = 'submitted'
        where milestone_submissions.status <> 'approved'`;
  } catch (e) {
    // An unknown or malformed teamId (FK violation / invalid uuid) lands here.
    console.error(e);
    return NextResponse.json({ error: "Could not record submission" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}