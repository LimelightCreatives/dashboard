export function HardCard({
  children,
  className = "",
  shadow = true,
}: {
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
}) {
  return (
    <div className="relative">
      {shadow ? (
        <div
          aria-hidden
          className="absolute inset-0 translate-x-2 translate-y-2 bg-[var(--foreground)]"
        />
      ) : null}
      <div
        className={`relative border-[2px] border-[var(--foreground)] bg-[var(--surface)] p-6 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}