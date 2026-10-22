"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { HardCard } from "@/components/dashboard/HardCard";
import { checkInAction } from "@/app/actions/checkin";
import {
  deleteParticipant,
  listParticipants,
  saveParticipant,
  type CheckStatus,
  type ParticipantInput,
  type ParticipantRow,
} from "@/app/actions/participants";

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";
const BTN =
  "border-[2px] border-[var(--foreground)] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.08em] disabled:opacity-50";
const BTN_SOLID = `${BTN} bg-[var(--foreground)] text-[var(--background)]`;
const BTN_OUTLINE = `${BTN} bg-transparent`;
const LABEL = "font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--foreground)]/60";
const FIELD =
  "mt-1 w-full border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none";

type Filter = "all" | CheckStatus;

const EMPTY: ParticipantInput = { name: "", email: "", phone: "", emergency: "", registrationId: "" };
const STATUS_LABEL: Record<CheckStatus, string> = { in: "Checked in", out: "Checked out", none: "Not arrived" };

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

export default function ParticipantsPage() {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ParticipantInput | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listParticipants();
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

  const counts = useMemo(() => {
    const c = { all: rows.length, in: 0, out: 0, none: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.registrationId].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

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
      // Always reload so the list reflects the sheet.
      await load();
      setBusy(false);
    }
  }

  // Reuses the same server action as the scanner, so a manual tap behaves exactly like a scan.
  const toggle = (r: ParticipantRow) =>
    run(async () => {
      const res = await checkInAction(r.registrationId);
      if (res.status === "ok") return { ok: true };
      return { ok: false, message: res.status === "unknown" ? `No participant with ID "${res.id}".` : res.message };
    });

  const edit = (r: ParticipantRow) =>
    setDraft({
      originalId: r.registrationId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      emergency: r.emergency,
      registrationId: r.registrationId,
    });

  const set = <K extends keyof ParticipantInput>(key: K, value: ParticipantInput[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  if (!loaded) return <Spinner />;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl">Participants</h1>
            <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">
              Manage the participant list in Google Sheets and see who is checked in.
            </p>
          </div>
          {!draft ? (
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => run(async () => ({ ok: true }))} className={BTN_OUTLINE}>
                Refresh
              </button>
              <button type="button" onClick={() => setDraft({ ...EMPTY })} className={BTN_SOLID}>
                New participant
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-6 border-[2px] border-red-600 px-3 py-2 font-body text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {draft ? (
          <HardCard className="mt-8">
            <h2 className="font-display text-2xl font-bold">
              {draft.originalId ? "Edit participant" : "New participant"}
            </h2>

            <div className="mt-6 space-y-5">
              <Field label="Name">
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={FIELD} />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set("email", e.target.value)}
                  inputMode="email"
                  className={FIELD}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone no.">
                  <input
                    value={draft.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    inputMode="tel"
                    className={FIELD}
                  />
                </Field>
                <Field label="Emergency no.">
                  <input
                    value={draft.emergency}
                    onChange={(e) => set("emergency", e.target.value)}
                    inputMode="tel"
                    className={FIELD}
                  />
                </Field>
              </div>

              <Field label="Registration ID" hint="Must match the ID in the participant's QR code. Changing it won't update an existing code.">
                <input
                  value={draft.registrationId}
                  onChange={(e) => set("registrationId", e.target.value)}
                  className={FIELD}
                />
              </Field>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => saveParticipant(draft), () => setDraft(null))}
                className={BTN_SOLID}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button type="button" disabled={busy} onClick={() => setDraft(null)} className={BTN_OUTLINE}>
                Cancel
              </button>
              {draft.originalId ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Delete "${draft.name}" from the sheet? This can't be undone.`)) return;
                    run(() => deleteParticipant(draft.originalId!), () => setDraft(null));
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
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter participants">
                <Tab active={filter === "all"} onClick={() => setFilter("all")}>All · {counts.all}</Tab>
                <Tab active={filter === "in"} onClick={() => setFilter("in")}>In · {counts.in}</Tab>
                <Tab active={filter === "out"} onClick={() => setFilter("out")}>Out · {counts.out}</Tab>
                <Tab active={filter === "none"} onClick={() => setFilter("none")}>Not arrived · {counts.none}</Tab>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone or ID"
                aria-label="Search participants"
                className="min-w-0 flex-1 border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none"
              />
            </div>

            {visible.length === 0 ? (
              <HardCard className="mt-8 border-dashed">
                <p className="font-body text-sm">
                  {rows.length === 0
                    ? "No participants yet. Select New participant to add the first one."
                    : "No participants match."}
                </p>
              </HardCard>
            ) : (
              <ul className="mt-8 space-y-4">
                {visible.map((r) => (
                  <li key={r.registrationId || r.name}>
                    <HardCard
                      className={`${busy ? "opacity-60" : ""} ${r.status === "in" ? "border-l-[10px] border-l-[var(--accent)]" : ""}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-bold break-words">{r.name || "(No name)"}</p>
                          <p className="mt-1 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                            ID: {r.registrationId || "none"}
                            {r.lastAt ? ` · ${STATUS_LABEL[r.status]} ${r.lastAt}` : ""}
                          </p>
                        </div>
                        <span
                          className={`${TAG} shrink-0 ${
                            r.status === "in" ? "bg-[var(--accent)] text-[var(--foreground)]" : "bg-transparent"
                          } ${r.status === "none" ? "border-dashed" : ""}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>

                      <dl className="mt-3 grid gap-x-6 gap-y-1 font-body text-sm sm:grid-cols-3">
                        <div className="min-w-0">
                          <dt className={LABEL}>Email</dt>
                          <dd className="break-words">{r.email || "-"}</dd>
                        </div>
                        <div>
                          <dt className={LABEL}>Phone</dt>
                          <dd>{r.phone || "-"}</dd>
                        </div>
                        <div>
                          <dt className={LABEL}>Emergency</dt>
                          <dd>{r.emergency || "-"}</dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy || !r.registrationId}
                          onClick={() => toggle(r)}
                          className={r.status === "in" ? BTN_OUTLINE : BTN_SOLID}
                        >
                          {r.status === "in" ? "Check out" : "Check in"}
                        </button>
                        <button type="button" disabled={busy} onClick={() => edit(r)} className={BTN_OUTLINE}>
                          Edit
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