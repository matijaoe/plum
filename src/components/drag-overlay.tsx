export function DragOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-foreground/15 bg-foreground/[0.035]" />
      <span className="relative rounded-full border border-border-subtle bg-background/80 px-5 py-2.5 font-mono text-xs text-secondary backdrop-blur-md">
        Drop to read
      </span>
    </div>
  );
}
