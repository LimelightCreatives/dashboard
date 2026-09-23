export const inputStyles =
  "w-full border-[2px] border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-body text-sm outline-none focus:border-[var(--foreground)]";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-body text-xs uppercase tracking-[0.15em] text-[var(--foreground)]/60">
        {label}
      </span>
      {children}
    </label>
  );
}
