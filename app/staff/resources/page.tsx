"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { HardCard } from "@/components/dashboard/HardCard";
import { thumbnailFor } from "@/lib/resources";
import {
  deleteResource,
  listAllResources,
  saveResource,
  setResourcePublished,
  type Audience,
  type Kind,
  type ResourceInput,
  type ResourceRow,
} from "@/app/actions/resources";

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";
const BTN =
  "border-[2px] border-[var(--foreground)] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.08em] disabled:opacity-50";
const BTN_SOLID = `${BTN} bg-[var(--foreground)] text-[var(--background)]`;
const BTN_OUTLINE = `${BTN} bg-transparent`;
const LABEL = "font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60";
const FIELD =
  "mt-1 w-full border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none";

type Filter = "all" | "published" | "drafts";

const EMPTY: ResourceInput = {
  title: "",
  summary: "",
  body: "",
  url: "",
  thumbnailUrl: "",
  category: "General",
  kind: "guide",
  audience: "all",
  published: false,
  sortOrder: 0,
};

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Everyone",
  client: "Clients",
  organiser: "Organisers",
};

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${TAG} cursor-pointer ${
        active ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-transparent text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="Loading">
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]"
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block font-body text-xs text-[var(--foreground)]/60">{hint}</span> : null}
    </label>
  );
}

export default function ResourcesAdminPage() {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ResourceInput | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listAllResources();
      if (res.ok) {
        setRows(res.rows);
        setError(null);
      } else {
        setError(res.message);
      }
    } catch {
      setError("Network error. Try refreshing.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "published" && !r.published) return false;
      if (filter === "drafts" && r.published) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    });
  }, [rows, filter, query]);

  const publishedCount = rows.filter((r) => r.published).length;

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setBusy(true);
    try {
      const res = await action();
      if (!res.ok) setError(res.message ?? "Something went wrong.");
      else {
        setError(null);
        after?.();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      // Always reload so the list reflects the database.
      await load();
      setBusy(false);
    }
  }

  const edit = (r: ResourceRow) =>
    setDraft({
      id: r.id,
      title: r.title,
      summary: r.summary,
      body: r.body,
      url: r.url,
      thumbnailUrl: r.thumbnailUrl,
      category: r.category,
      kind: r.kind,
      audience: r.audience,
      published: r.published,
      sortOrder: r.sortOrder,
    });

  const set = <K extends keyof ResourceInput>(key: K, value: ResourceInput[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  if (!loaded) return <Spinner />;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl">Resources</h1>
            <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">
              Write and publish the guides and tutorials clients see.
            </p>
          </div>
          {!draft ? (
            <button type="button" onClick={() => setDraft({ ...EMPTY })} className={BTN_SOLID}>
              New resource
            </button>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-6 border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        {draft ? (
          <HardCard className="mt-8">
            <h2 className="font-display text-2xl font-bold">{draft.id ? "Edit resource" : "New resource"}</h2>

            <div className="mt-6 space-y-5">
              <Field label="Title">
                <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={FIELD} />
              </Field>

              <Field label="Summary" hint="One line shown on the card.">
                <input value={draft.summary} onChange={(e) => set("summary", e.target.value)} className={FIELD} />
              </Field>

              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Type">
                  <select
                    value={draft.kind}
                    onChange={(e) => set("kind", e.target.value as Kind)}
                    className={FIELD}
                  >
                    <option value="guide">Guide</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="video">Video</option>
                    <option value="link">Link</option>
                  </select>
                </Field>
                <Field label="Category">
                  <input
                    value={draft.category}
                    onChange={(e) => set("category", e.target.value)}
                    list="resource-categories"
                    className={FIELD}
                  />
                  <datalist id="resource-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Visible to">
                  <select
                    value={draft.audience}
                    onChange={(e) => set("audience", e.target.value as Audience)}
                    className={FIELD}
                  >
                    {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                      <option key={a} value={a}>
                        {AUDIENCE_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Link" hint="Optional. Adds an Open or Watch button.">
                <input
                  value={draft.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://"
                  inputMode="url"
                  className={FIELD}
                />
              </Field>

              <Field
                label="Thumbnail"
                hint="Optional image link. YouTube links get one automatically. Without one, the card shows a plain placeholder."
              >
                <input
                  value={draft.thumbnailUrl}
                  onChange={(e) => set("thumbnailUrl", e.target.value)}
                  placeholder="https://"
                  inputMode="url"
                  className={FIELD}
                />
              </Field>
              {thumbnailFor({ kind: draft.kind, url: draft.url, thumbnailUrl: draft.thumbnailUrl }) ? (
                <div className="max-w-xs border-[2px] border-[var(--foreground)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailFor({ kind: draft.kind, url: draft.url, thumbnailUrl: draft.thumbnailUrl })!}
                    alt="Thumbnail preview"
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : null}

              <Field label="Content" hint="Leave a blank line between paragraphs. Lines that are only a web address become links.">
                <textarea
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                  rows={12}
                  className={`${FIELD} resize-y`}
                />
              </Field>

              <div className="flex flex-wrap items-end gap-6">
                <Field label="Order" hint="Lower numbers appear first in a category.">
                  <input
                    type="number"
                    value={draft.sortOrder}
                    onChange={(e) => set("sortOrder", Number(e.target.value))}
                    className={`${FIELD} w-28`}
                  />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 pb-2 font-body text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => set("published", e.target.checked)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                  Published
                </label>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => saveResource(draft), () => setDraft(null))}
                className={BTN_SOLID}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button type="button" disabled={busy} onClick={() => setDraft(null)} className={BTN_OUTLINE}>
                Cancel
              </button>
              {draft.id ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Delete "${draft.title}"? This can't be undone.`)) return;
                    run(() => deleteResource(draft.id!), () => setDraft(null));
                  }}
                  className={`${BTN_OUTLINE} ml-auto border-red-600 text-red-600`}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </HardCard>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex gap-2" role="tablist" aria-label="Filter resources">
                <Tab active={filter === "all"} onClick={() => setFilter("all")}>
                  All · {rows.length}
                </Tab>
                <Tab active={filter === "published"} onClick={() => setFilter("published")}>
                  Published · {publishedCount}
                </Tab>
                <Tab active={filter === "drafts"} onClick={() => setFilter("drafts")}>
                  Drafts · {rows.length - publishedCount}
                </Tab>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or category"
                aria-label="Search resources"
                className="min-w-0 flex-1 border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none"
              />
            </div>

            {visible.length === 0 ? (
              <HardCard className="mt-8 border-dashed">
                <p className="font-body text-sm">
                  {rows.length === 0 ? "No resources yet. Select New resource to add the first one." : "No resources match."}
                </p>
              </HardCard>
            ) : (
              <ul className="mt-8 space-y-4">
                {visible.map((r) => (
                  <li key={r.id}>
                    <HardCard className={busy ? "opacity-60" : ""}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-bold break-words">{r.title}</p>
                          <p className="mt-1 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                            {r.category} · {AUDIENCE_LABEL[r.audience]} · Updated{" "}
                            {new Date(r.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`${TAG} shrink-0 ${
                            r.published ? "bg-[var(--accent)] text-[var(--foreground)]" : "bg-transparent"
                          }`}
                        >
                          {r.published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button type="button" disabled={busy} onClick={() => edit(r)} className={BTN_SOLID}>
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => setResourcePublished(r.id, !r.published))}
                          className={BTN_OUTLINE}
                        >
                          {r.published ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </HardCard>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}