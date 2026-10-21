export function Wordmark({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const color = tone === "dark" ? "text-ink" : "text-cream";
  return (
    <div className={`leading-none ${className}`}>
      <p className={`font-serif text-[1.55rem] font-semibold tracking-wide ${color}`}>
        Maratona <span className="text-copper">21</span>
      </p>
      <p className={`mt-1 whitespace-nowrap text-[0.8125rem] font-semibold uppercase tracking-[0.16em] ${tone === "dark" ? "text-taupe" : "text-gold"}`}>
        Nutri Gisele Silveira
      </p>
    </div>
  );
}
