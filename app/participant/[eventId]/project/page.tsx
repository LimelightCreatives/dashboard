"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { HardCard } from "@/components/dashboard/HardCard";
import { Field, inputStyles } from "@/components/dashboard/form";

type Project = {
  title: string;
  logline: string;
  videoUrl: string;
};

// TODO: replace with a real fetch of the current team's project (or null if none submitted yet)
const MOCK_EXISTING_PROJECT: Project | null = null;

const EMPTY_PROJECT: Project = { title: "", logline: "", videoUrl: "" };

export default function ProjectPage() {
  const [project, setProject] = useState<Project | null>(MOCK_EXISTING_PROJECT);
  const [editing, setEditing] = useState(!project);
  const [form, setForm] = useState<Project>(project ?? EMPTY_PROJECT);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: send `form` to the backend — create the team's project if none exists yet, otherwise update it
    setTimeout(() => {
      setProject(form);
      setEditing(false);
      setSubmitting(false);
    }, 400);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Your project</h1>
          <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
            Every team submits a single project — you can update the details until submissions close.
          </p>
        </div>

        {project && !editing ? (
          <Button variant="secondary" onClick={() => { setForm(project); setEditing(true); }}>
            Edit
          </Button>
        ) : null}
      </div>

      <div className="mt-10 max-w-2xl">
        {editing ? (
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

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save project"}
              </Button>
              {project ? (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setForm(project); setEditing(false); }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : project ? (
          <HardCard>
            <p className="font-display text-2xl">{project.title}</p>
            <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">{project.logline}</p>
            <a
              href={project.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block font-body text-sm underline underline-offset-4"
            >
              Watch submission
            </a>
          </HardCard>
        ) : null}
      </div>
    </div>
  );
}
