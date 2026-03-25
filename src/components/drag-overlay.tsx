export function DragOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200">
      <div className="absolute inset-0 shadow-[inset_0_0_0_3px_var(--color-link)] opacity-60" />
      <span className="rounded-md bg-elevated px-4 py-2 font-mono text-xs text-secondary shadow-sm">
        Drop to read
      </span>
    </div>
  );
}
