import { format } from "@/lib/nutrition";

/** Anel de progresso da proteína — protagonista da tela Hoje. */
export function ProgressRing({ percent, consumed, size = 196 }: { percent: number; consumed: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${p}% da meta de proteína`}
        className="-rotate-90"
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(246,240,230,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (p / 100) * c}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9A66B" />
            <stop offset="100%" stopColor="#C8722F" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tabular text-[2.6rem] font-bold leading-none text-cream">{p}%</span>
        <span className="mt-2 text-[0.9rem] text-sand/80">{format.protein(consumed)}</span>
      </div>
    </div>
  );
}

export function Bar({ percent, label }: { percent: number; label: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-copper transition-all" style={{ width: `${p}%` }} />
    </div>
  );
}
