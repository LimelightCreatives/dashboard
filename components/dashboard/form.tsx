export const inputStyles =
  "w-full border-[2px] border-[var(--foreground)] bg-transparent px-4 py-2 font-body text-sm " +
  "placeholder:text-[var(--foreground)]/40 transition-colors " +
  "hover:bg-[var(--surface-hover)] focus:bg-[var(--surface)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-display text-xs font-bold uppercase tracking-[0.08em] text-[var(--foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}