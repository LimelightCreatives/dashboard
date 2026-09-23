export function HardCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 bg-[var(--accent)]" />
      <div className={`relative border-[2px] border-[var(--foreground)] bg-[var(--surface)] p-6 ${className}`}>
        {children}
      </div>
    </div>
  );
}
