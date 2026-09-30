"use client";

import { useCallback, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

import { HardCard } from "@/components/dashboard/HardCard";
import { checkInAction, type CheckInResult } from "@/app/actions/checkin";

const TAG =
  "inline-block border-[2px] border-[var(--foreground)] px-2 py-0.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em]";

function labelFor(r: CheckInResult) {
  if (r.status === "ok") return r.action === "CHECK IN" ? "Checked in" : "Checked out";
  return r.status === "unknown" ? "Unknown ID" : "Error";
}

function titleFor(r: CheckInResult) {
  if (r.status === "ok") return r.name;
  return r.status === "unknown" ? r.id : r.message;
}

export default function CheckInPage() {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [history, setHistory] = useState<CheckInResult[]>([]);
  const [pending, setPending] = useState(false);
  const [manual, setManual] = useState("");

  const busy = useRef(false);
  const last = useRef({ code: "", at: 0 });

  const submit = useCallback(async (code: string) => {
    const now = Date.now();
    if (busy.current) return;
    // the camera reads the same QR many times a second, so ignore repeats for 3s
    if (last.current.code === code && now - last.current.at < 3000) return;
    last.current = { code, at: now };

    busy.current = true;
    setPending(true);
    try {
      const res = await checkInAction(code);
      setResult(res);
      setHistory((h) => [res, ...h].slice(0, 10));
    } catch {
      setResult({ status: "error", message: "Network error. Try again." });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const highlight = result?.status === "ok" && result.action === "CHECK IN";

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display font-bold text-4xl md:text-5xl">Check-in</h1>

        <HardCard className="mt-8 !p-0 overflow-hidden">
          <div className="relative aspect-square w-full bg-black">
            <Scanner
              onScan={(codes) => {
                const value = codes[0]?.rawValue;
                if (value) submit(value);
              }}
              onError={() =>
                setResult({ status: "error", message: "Camera unavailable. Check permissions." })
              }
              paused={pending}
              formats={["qr_code"]}
              constraints={{ facingMode: "environment" }}
              components={{ finder: false }}
              styles={{
                container: { width: "100%", height: "100%" },
                video: { objectFit: "cover" },
              }}
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-3/5 w-3/5 border-[3px] transition-colors ${
                  pending ? "border-[var(--accent)]" : "border-white"
                }`}
              />
            </div>
          </div>
        </HardCard>

        {result ? (
          <HardCard
            className={`mt-6 ${highlight ? "bg-[var(--accent)]" : ""} ${
              result.status !== "ok" ? "border-dashed" : ""
            }`}
          >
            <span className={`${TAG} bg-transparent`}>{labelFor(result)}</span>

            {result.status === "ok" ? (
              <>
                <p className="mt-3 font-display text-3xl font-bold break-words">
                  {result.name}
                </p>
                <p className="mt-2 font-body text-xs uppercase tracking-[0.08em] text-[var(--foreground)]/60">
                  ID: {result.id} · {result.at}
                </p>
              </>
            ) : (
              <p className="mt-3 font-body text-sm">
                {result.status === "unknown"
                  ? `No participant with ID "${result.id}".`
                  : result.message}
              </p>
            )}
          </HardCard>
        ) : null}

        <div className="mt-8 flex gap-3">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manual.trim()) {
                submit(manual);
                setManual("");
              }
            }}
            placeholder="Or enter registration ID"
            className="min-w-0 flex-1 border-[2px] border-[var(--foreground)] bg-transparent px-3 py-2 font-body text-sm outline-none"
          />
          <button
            type="button"
            disabled={pending || !manual.trim()}
            onClick={() => {
              submit(manual);
              setManual("");
            }}
            className="border-[2px] border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.08em] text-[var(--background)] disabled:opacity-50"
          >
            Submit
          </button>
        </div>

        {history.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold">Recent scans</h2>
            <ul className="mt-3 space-y-2">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 border-[2px] border-[var(--foreground)] px-3 py-2 font-body text-sm"
                >
                  <span className="min-w-0 truncate">{titleFor(h)}</span>
                  <span className={`${TAG} shrink-0`}>{labelFor(h)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}