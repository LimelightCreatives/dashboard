export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]"
    />
    </div>
  );
}