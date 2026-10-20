export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-sand" />
      <div className="h-56 animate-pulse rounded-2xl bg-sand/70" />
      <div className="h-14 animate-pulse rounded-xl bg-sand/70" />
      <div className="h-32 animate-pulse rounded-2xl bg-sand/60" />
    </div>
  );
}
