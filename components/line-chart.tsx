import { formatShortDate } from "@/lib/dates";
import { format } from "@/lib/nutrition";

/** Gráfico de linha simples em SVG (sem bibliotecas), legível e sem excesso técnico. */
export function LineChart({ points, unit, label }: { points: { date: string; value: number }[]; unit: string; label: string }) {
  const W = 320;
  const H = 140;
  const pad = { l: 8, r: 8, t: 16, b: 24 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: de ${format.number1(first.value)} ${unit} para ${format.number1(last.value)} ${unit}`}>
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#E9DFD0" />
        {points.length > 1 ? <path d={d} fill="none" stroke="#B4642F" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3.5} fill={i === points.length - 1 ? "#14100D" : "#B4642F"} />
        ))}
        <text x={pad.l} y={H - 6} fontSize="11" fill="#8A7B6C">
          {formatShortDate(first.date)}
        </text>
        {points.length > 1 ? (
          <text x={W - pad.r} y={H - 6} fontSize="11" fill="#8A7B6C" textAnchor="end">
            {formatShortDate(last.date)}
          </text>
        ) : null}
      </svg>
    </figure>
  );
}
