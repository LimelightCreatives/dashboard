"use server";

import { headers } from "next/headers";
import { sql } from "@/lib/db";

export type Answer = { name: string; value: string };

export type SubmissionRow = {
  teamId: string;
  teamName: string;
  memberCount: number;
  milestoneId: string;
  milestoneLabel: string;
  status: "submitted" | "approved";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  submissionId: string | null;
  answers: Answer[];
};

export type ListResult = { ok: true; rows: SubmissionRow[] } | { ok: false; message: string };
export type ReviewResult = { ok: true } | { ok: false; message: string };
export type Decision = "approve" | "send_back" | "undo_approval";

// Server actions can be invoked directly, so re-check the role here instead of
// relying only on the middleware's /staff gating. The middleware sets these headers.
async function requireStaff() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "ADMIN" && role !== "STAFF") return null;
  return { id: h.get("x-user-id") ?? "", email: h.get("x-user-email") ?? "" };
}

// Turn whatever Fillout stored for an answer into display text.
function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object" && "url" in v && typeof (v as { url: unknown }).url === "string") {
          return (v as { url: string }).url;
        }
        return JSON.stringify(v);
      })
      .join("\n");
  }
  if (typeof value === "object" && "url" in value && typeof (value as { url: unknown }).url === "string") {
    return (value as { url: string }).url;
  }
  return JSON.stringify(value);
}

function parseAnswers(raw: unknown): Answer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => {
      const item = q as { name?: unknown; value?: unknown };
      return { name: typeof item?.name === "string" ? item.name : "Answer", value: toText(item?.value) };
    })
    .filter((a) => a.value !== "");
}

export async function listSubmissions(): Promise<ListResult> {
  if (!(await requireStaff())) return { ok: false, message: "Not authorised." };

  try {
    const rows = await sql`
      select s.team_id, t.name as team_name,
             (select count(*)::int from team_members where team_id = s.team_id) as member_count,
             s.milestone_id, s.milestone_label, s.status,
             s.submitted_at, s.reviewed_at, s.reviewed_by, s.submission_id, s.answers
      from milestone_submissions s
      join teams t on t.id = s.team_id
      order by s.submitted_at desc
      limit 500`;

    return {
      ok: true,
      rows: rows.map((r) => ({
        teamId: r.team_id,
        teamName: r.team_name,
        memberCount: r.member_count,
        milestoneId: r.milestone_id,
        milestoneLabel: r.milestone_label || r.milestone_id,
        status: r.status,
        submittedAt: new Date(r.submitted_at).toISOString(),
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        reviewedBy: r.reviewed_by ?? null,
        submissionId: r.submission_id ?? null,
        answers: parseAnswers(r.answers),
      })),
    };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Couldn't load submissions." };
  }
}

export async function reviewSubmission(
  teamId: string,
  milestoneId: string,
  decision: Decision
): Promise<ReviewResult> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, message: "Not authorised." };
  if (typeof teamId !== "string" || typeof milestoneId !== "string") {
    return { ok: false, message: "Bad request." };
  }

  const reviewer = staff.email || staff.id || null;

  try {
    let changed: unknown[];

    if (decision === "approve") {
      changed = await sql`
        update milestone_submissions
        set status = 'approved', reviewed_at = now(), reviewed_by = ${reviewer}
        where team_id = ${teamId} and milestone_id = ${milestoneId} and status = 'submitted'
        returning 1`;
    } else if (decision === "undo_approval") {
      changed = await sql`
        update milestone_submissions
        set status = 'submitted', reviewed_at = null, reviewed_by = null
        where team_id = ${teamId} and milestone_id = ${milestoneId} and status = 'approved'
        returning 1`;
    } else if (decision === "send_back") {
      // Deleting the row returns the milestone to "Ready to submit" for the team.
      changed = await sql`
        delete from milestone_submissions
        where team_id = ${teamId} and milestone_id = ${milestoneId} and status = 'submitted'
        returning 1`;
    } else {
      return { ok: false, message: "Bad request." };
    }

    if (changed.length === 0) {
      return { ok: false, message: "That submission changed in the meantime. Refreshed the list." };
    }
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}