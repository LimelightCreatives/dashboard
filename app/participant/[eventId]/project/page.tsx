"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { HardCard } from "@/components/dashboard/HardCard";
import { Field, inputStyles } from "@/components/dashboard/form";

type Project = {
  title: string;
  logline: string;
  videoUrl: string;
};

const EMPTY_PROJECT: Project = { title: "", logline: "", videoUrl: "" };

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";

// Reads the body as text first so an empty or non-JSON response never throws,
// then throws a readable Error for any non-2xx status.
async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body, handled below */
    }
  }

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  if (data === null) {
    throw new Error("The server returned an unexpected response.");
  }
  return data as T;
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

export default function ProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [hasTeam, setHasTeam] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Project>(EMPTY_PROJECT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await api<{ hasTeam: boolean; project: Project | null }>("/api/project");
      setHasTeam(d.hasTeam);
      setProject(d.project);
      setForm(d.project ?? EMPTY_PROJECT);
      setEditing(!d.project);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/project", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setProject(form);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (loadError) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Your project</h1>
        <div className="mx-auto mt-16 w-full max-w-md">
          <HardCard>
            <div className="flex flex-col items-center text-center">
              <p className="font-display text-2xl">Couldn&apos;t load your project</p>
              <p className="mt-2 font-body text-sm text-red-600">{loadError}</p>
              <Button variant="secondary" className="mt-6" onClick={() => load()}>
                Try again
              </Button>
            </div>
          </HardCard>
        </div>
      </div>
    );
  }

  if (!hasTeam) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Your project</h1>
        <div className="mx-auto mt-10 w-full max-w-lg md:mt-16">
          <HardCard>
            <div className="flex flex-col items-center px-4 py-10 text-center md:py-14">
              <p className="font-display text-3xl md:text-4xl">Join a team first</p>
              <p className="mt-4 max-w-sm font-body text-base text-[var(--foreground)]/70">
                Your team submits one project together. Join or create a team, then come back here
                to submit it.
              </p>
              <Button className="mt-8" href="team">
                Go to team page
              </Button>
            </div>
          </HardCard>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl">Your project</h1>
          <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
            Every team submits a single project. You can update the details until submissions
            close.
          </p>
        </div>

        {project && !editing ? (
          <Button
            variant="secondary"
            onClick={() => {
              setForm(project);
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : null}
      </div>

      <div className="mt-10 max-w-2xl">
        {editing ? (
          <HardCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Field label="Title">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputStyles}
                  placeholder="Give your film a name"
                />
              </Field>

              <Field label="Logline">
                <textarea
                  required
                  value={form.logline}
                  onChange={(e) => setForm((f) => ({ ...f, logline: e.target.value }))}
                  className={`${inputStyles} min-h-28`}
                  placeholder="One or two sentences about your film"
                />
              </Field>

              <Field label="Video link">
                <input
                  required
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  className={inputStyles}
                  placeholder="https://..."
                />
              </Field>

              {error ? (
                <p
                  role="alert"
                  className="border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Save project"}
                </Button>
                {project ? (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setForm(project);
                      setError(null);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </HardCard>
        ) : project ? (
          <HardCard>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold break-words">{project.title}</p>
                <p className="mt-2 whitespace-pre-wrap break-words font-body text-sm text-[var(--foreground)]/70">
                  {project.logline}
                </p>
              </div>
              <span className={`${TAG} bg-[var(--accent)] text-[var(--background)]`}>
                Saved
              </span>
            </div>

            <div className="mt-6">
              <Button href={project.videoUrl} external variant="secondary">
                Watch submission
              </Button>
            </div>
          </HardCard>
        ) : null}
      </div>
    </div>
  );
}