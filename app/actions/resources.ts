"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { sql } from "@/lib/db";

export type Audience = "all" | "client" | "organiser";
export type Kind = "guide" | "tutorial" | "video" | "link";

export type ResourceRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  kind: Kind;
  audience: Audience;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type ResourceInput = Omit<ResourceRow, "id" | "slug" | "updatedAt"> & { id?: string };

export type ListResult = { ok: true; rows: ResourceRow[] } | { ok: false; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

const KINDS: Kind[] = ["guide", "tutorial", "video", "link"];
const AUDIENCES: Audience[] = ["all", "client", "organiser"];

// Server actions can be invoked directly, so re-check the role here instead of
// relying only on the middleware's route gating. The middleware sets these headers.
async function requireStaff() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "ADMIN" && role !== "STAFF") return null;
  return { id: h.get("x-user-id") ?? "", email: h.get("x-user-email") ?? "" };
}

const NOT_AUTHORISED = { ok: false, message: "Not authorised." } as const;

function toRow(r: Record<string, unknown>): ResourceRow {
  return {
    id: String(r.id),
    title: String(r.title),
    slug: String(r.slug),
    summary: String(r.summary ?? ""),
    body: String(r.body ?? ""),
    url: String(r.url ?? ""),
    thumbnailUrl: String(r.thumbnail_url ?? ""),
    category: String(r.category ?? "General"),
    kind: r.kind as Kind,
    audience: r.audience as Audience,
    published: Boolean(r.published),
    sortOrder: Number(r.sort_order ?? 0),
    updatedAt: new Date(r.updated_at as string | Date).toISOString(),
  };
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "resource";

const isHttp = (s: string) => /^https?:\/\//i.test(s);

/** Client side: published resources for the "client" audience only. */
export async function listClientResources(): Promise<ListResult> {
  try {
    const rows = await sql`
      SELECT id, title, slug, summary, body, url, thumbnail_url, category, kind, audience, published, sort_order, updated_at
      FROM resources
      WHERE published = true AND audience IN ('all', 'client')
      ORDER BY category, sort_order, title`;
    return { ok: true, rows: rows.map(toRow) };
  } catch {
    return { ok: false, message: "Couldn't load resources. Try refreshing." };
  }
}

/** Organiser side: everything, drafts included. */
export async function listAllResources(): Promise<ListResult> {
  try {
    if (!(await requireStaff())) return NOT_AUTHORISED;
    const rows = await sql`
      SELECT id, title, slug, summary, body, url, thumbnail_url, category, kind, audience, published, sort_order, updated_at
      FROM resources
      ORDER BY updated_at DESC`;
    return { ok: true, rows: rows.map(toRow) };
  } catch {
    return { ok: false, message: "Couldn't load resources. Try refreshing." };
  }
}

export async function saveResource(input: ResourceInput): Promise<SaveResult> {
  try {
    if (!(await requireStaff())) return NOT_AUTHORISED;

    const title = input.title.trim();
    const category = input.category.trim() || "General";
    const url = input.url.trim();
    const thumbnailUrl = input.thumbnailUrl.trim();
    if (!title) return { ok: false, message: "Add a title before saving." };
    if (url && !isHttp(url)) return { ok: false, message: "The link must start with http:// or https://." };
    if (!KINDS.includes(input.kind) || !AUDIENCES.includes(input.audience)) {
      return { ok: false, message: "Pick a valid type and audience." };
    }
    if (thumbnailUrl && !isHttp(thumbnailUrl)) {
      return { ok: false, message: "The thumbnail link must start with http:// or https://." };
    }
    if (input.published && !input.body.trim() && !url) {
      return { ok: false, message: "Add some content or a link before publishing." };
    }
    const sortOrder = Number.isFinite(input.sortOrder) ? Math.trunc(input.sortOrder) : 0;

    if (input.id) {
      await sql`
        UPDATE resources SET
          title = ${title}, summary = ${input.summary.trim()}, body = ${input.body},
          url = ${url}, thumbnail_url = ${thumbnailUrl}, category = ${category}, kind = ${input.kind},
          audience = ${input.audience}, published = ${input.published},
          sort_order = ${sortOrder}, updated_at = now()
        WHERE id = ${input.id}`;
    } else {
      let slug = slugify(title);
      const taken = await sql`SELECT 1 FROM resources WHERE slug = ${slug} LIMIT 1`;
      if (taken.length > 0) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      await sql`
        INSERT INTO resources (title, slug, summary, body, url, thumbnail_url, category, kind, audience, published, sort_order)
        VALUES (${title}, ${slug}, ${input.summary.trim()}, ${input.body}, ${url}, ${thumbnailUrl}, ${category},
                ${input.kind}, ${input.audience}, ${input.published}, ${sortOrder})`;
    }

    revalidatePath("/resources");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save. Try again." };
  }
}

export async function setResourcePublished(id: string, published: boolean): Promise<SaveResult> {
  try {
    if (!(await requireStaff())) return NOT_AUTHORISED;
    await sql`UPDATE resources SET published = ${published}, updated_at = now() WHERE id = ${id}`;
    revalidatePath("/resources");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

export async function deleteResource(id: string): Promise<SaveResult> {
  try {
    if (!(await requireStaff())) return NOT_AUTHORISED;
    await sql`DELETE FROM resources WHERE id = ${id}`;
    revalidatePath("/resources");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't delete. Try again." };
  }
}