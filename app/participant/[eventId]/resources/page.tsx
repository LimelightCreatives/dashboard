"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { HardCard } from "@/components/dashboard/HardCard";
import { listClientResources, type ResourceRow } from "@/app/actions/resources";
import { thumbnailFor } from "@/lib/resources";

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";
const BTN =
  "border-[2px] border-[var(--foreground)] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.08em] disabled:opacity-50";
const BTN_SOLID = `${BTN} bg-[var(--foreground)] text-[var(--background)]`;
const BTN_OUTLINE = `${BTN} bg-transparent`;

const ALL = "All";
const KIND_LABEL: Record<ResourceRow["kind"], string> = {
  guide: "Guide",
  tutorial: "Tutorial",
  video: "Video",
  link: "Link",
};

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

function Thumb({
  src, alt, href, kind,
}: { src: string | null; alt: string; href: string; kind: ResourceRow["kind"] }) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  const box = (
    <span className="relative block aspect-video w-full overflow-hidden border-[2px] border-[var(--foreground)] bg-[var(--foreground)]/10">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center font-display text-4xl font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/30"
        >
          {KIND_LABEL[kind]}
        </span>
      )}
      {kind === "video" ? (
        <span
          aria-hidden
          className="absolute bottom-3 left-3 border-[2px] border-[var(--foreground)] bg-[var(--background)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]"
        >
          ▶ Video
        </span>
      ) : null}
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="mb-4 block">
      {box}
    </a>
  ) : (
    <div className="mb-4">{box}</div>
  );
}

function Line({ text }: { text: string }) {
  if (/^https?:\/\//i.test(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className="break-all underline">
        {text}
      </a>
    );
  }
  return <span className="break-words">{text}</span>;
}

function Body({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="mt-4 space-y-3 border-[2px] border-[var(--foreground)] px-3 py-3 font-body text-sm">
      {paragraphs.map((p, i) => (
        <p key={i} className="flex flex-col gap-0.5">
          {p.split("\n").map((line, j) => (
            <Line key={j} text={line} />
          ))}
        </p>
      ))}
    </div>
  );
}

export default function ResourcesPage() {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await listClientResources();
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Pick up newly published resources when the person returns to this tab.
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
    return [
      { id: ALL, count: rows.length },
      ...[...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => ({ id, count })),
    ];
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== ALL && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
      );
    });
  }, [rows, category, query]);

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (!loaded) return <Spinner />;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl">Resources</h1>
            <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">
              Guides and tutorials to help you prepare for the shoot.
            </p>
          </div>
          <button type="button" onClick={load} disabled={refreshing} className={BTN_OUTLINE}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-6 border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {categories.length > 2 ? (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  onClick={() => setCategory(c.id)}
                  className={`${TAG} cursor-pointer ${
                    category === c.id
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-transparent text-[var(--foreground)]"
                  }`}
                >
                  {c.id} · {c.count}
                </button>
              ))}
            </div>
          ) : null}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources"
            aria-label="Search resources"
            className="min-w-0 flex-1 border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none"
          />
        </div>

        {visible.length === 0 ? (
          <HardCard className="mt-8 border-dashed">
            <p className="font-body text-sm">
              {rows.length === 0 ? "No resources have been published yet. Check back soon." : "No resources match."}
            </p>
          </HardCard>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => {
              const isOpen = open.has(r.id);
              const thumb = thumbnailFor(r);
              return (
                <li key={r.id} className="min-w-0">
                  <HardCard className="flex h-full flex-col">
                    <Thumb src={thumb} alt={`Thumbnail for ${r.title}`} href={r.url} kind={r.kind} />
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-display text-xl font-bold break-words">{r.title}</p>
                        {r.summary ? (
                          <p className="mt-1 font-body text-sm break-words">{r.summary}</p>
                        ) : null}
                        <p className="mt-2 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                          {r.category} · Updated {new Date(r.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`${TAG} shrink-0 bg-transparent text-[var(--foreground)]`}>
                        {KIND_LABEL[r.kind]}
                      </span>
                    </div>

                    {isOpen && r.body.trim() ? <Body text={r.body} /> : null}

                    {r.body.trim() || r.url ? (
                      <div className="mt-auto flex flex-wrap gap-3 pt-5">
                        {r.body.trim() ? (
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => toggle(r.id)}
                            className={r.url ? BTN_OUTLINE : BTN_SOLID}
                          >
                            {isOpen ? "Hide" : "Read"}
                          </button>
                        ) : null}
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${BTN_SOLID} inline-block`}
                          >
                            {r.kind === "video" ? "Watch" : "Open"}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </HardCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}