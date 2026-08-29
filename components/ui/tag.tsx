export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-fg-muted)]">
      {children}
    </span>
  );
}
