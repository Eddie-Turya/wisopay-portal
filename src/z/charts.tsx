import { tr } from "./i18n";

import { useId, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { compact, shortDate } from "./data";

type Pt = { t: number; v: number; n?: number };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

// Smooth path (monotone-ish Catmull-Rom → Bézier)
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = Math.min(Math.max(p1[1] + (p2[1] - p0[1]) * t, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = Math.min(Math.max(p2[1] - (p3[1] - p1[1]) * t, Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Single-series area chart with crosshair + tooltip. */
export function AreaChart({ data, height = 240, format = (v: number) => compact(v), unit = "TZS", countLabel = "payments" }: { data: Pt[]; height?: number; format?: (v: number) => string; unit?: string; countLabel?: string }) {
  const gid = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const max = niceMax(Math.max(...data.map((d) => d.v)));
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = data.map((d, i) => [x(i), y(d.v)] as [number, number]);
  const line = smooth(pts);
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const step = Math.ceil(data.length / 6);

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={tr("Volume over time")}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--p-series)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--p-series)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--p-line)" strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--p-faint)">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={d.t} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--p-faint)">
              {shortDate(d.t)}
            </text>
          ) : null,
        )}
        <motion.path key={`a${data.length}`} d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path
          key={`l${data.length}-${data[0]?.v}`}
          d={line}
          fill="none"
          stroke="var(--p-series)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--p-faint)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.v)} r="5" fill="var(--p-series)" stroke="var(--p-panel)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl border border-p-line bg-p-panel px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? tr("calc(-100% - 12px)") : tr("12px")})` }}
        >
          <p className="text-p-faint">{shortDate(h.t)}</p>
          <p className="mt-0.5 font-semibold tabular-nums text-p-fg">
            {unit === "USD" ? `$${Math.round(h.v).toLocaleString("en-US")}` : `${unit} ${Math.round(h.v).toLocaleString("en-US")}`}
          </p>
          {h.n !== undefined && (
            <p className="text-p-muted tabular-nums">
              {h.n} {countLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Vertical bars, one hue, hover tooltip per bar. */
export function Bars({ data, height = 180, format = (v: number) => `${v.toFixed(1)}%`, min = 0 }: { data: { label: string; v: number }[]; height?: number; format?: (v: number) => string; min?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="relative" style={{ height }}>
      <div className="flex h-full items-end gap-[3px]">
        {data.map((d, i) => {
          const h = ((d.v - min) / (max - min || 1)) * 100;
          return (
            <div key={i} className="relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <motion.div
                className="w-full rounded-t-[4px] bg-p-series"
                style={{ opacity: hover === null || hover === i ? 1 : 0.45 }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(2, h)}%` }}
                transition={{ duration: 0.6, delay: i * 0.012 }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-p-line bg-p-panel px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg">
                  <span className="text-p-faint">{d.label}</span> <span className="font-semibold tabular-nums">{format(d.v)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Ranked horizontal bar list — single hue, labels in text tokens. */
export function BarList({ items, format }: { items: { label: string; value: number; meta?: string; dot?: React.ReactNode }[]; format: (v: number) => string }) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.value - a.value), [items]);
  const max = sorted[0]?.value || 1;
  return (
    <ul className="space-y-3">
      {sorted.map((it, i) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 truncate">
              {it.dot}
              {it.label}
            </span>
            <span className="shrink-0 tabular-nums text-p-muted">
              {format(it.value)}
              {it.meta && <span className="ml-2 text-p-faint">{it.meta}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-p-panel2">
            <motion.div
              className="h-full rounded-full bg-p-series"
              initial={{ width: 0 }}
              whileInView={{ width: `${(it.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny sparkline for stat tiles. */
export function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-24" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--p-series)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
