"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// One accent per series so multi-line/bar charts stay legible without a
// legend doing the work — brand indigo leads, everything else is a Tailwind
// 500-weight tone already used elsewhere in the app.
export const SERIES_COLORS = {
  signups: "#4f46e5", // brand
  listings: "#10b981", // emerald-500
  messages: "#f59e0b", // amber-500
  available: "#10b981",
  sold: "#64748b",
  expired: "#f59e0b",
};

export const CHART_PALETTE = [
  "#4f46e5", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#0ea5e9", // sky
  "#a855f7", // purple
  "#ec4899", // pink
  "#84cc16", // lime
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // violet
  "#eab308", // yellow
];

const AXIS_STYLE = { fontSize: 11, fill: "#94a3b8" };
const GRID_STROKE = "currentColor";

type SeriesPoint = { bucket: string; n: number };

function formatBucketLabel(bucket: string, granularity: string) {
  const d = new Date(bucket);
  if (granularity === "year") return d.getFullYear().toString();
  if (granularity === "month") return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  if (granularity === "week") return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Card-sized trend chart with a gradient fill — the main "how are we
// trending" visual, one per metric (signups / listings / messages).
export function TrendAreaChart({
  points,
  granularity,
  color = "#4f46e5",
}: {
  points: SeriesPoint[];
  granularity: string;
  color?: string;
}) {
  const data = points.map((p) => ({ label: formatBucketLabel(p.bucket, granularity), n: p.n }));
  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} className="text-slate-200 dark:text-slate-800" />
        <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="n" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// A tiny inline trend indicator for KPI cards — no axes, just the shape.
export function Sparkline({ points, color }: { points: SeriesPoint[]; color: string }) {
  const data = points.map((p) => ({ n: p.n }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="n" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {p.value}
        </p>
      ))}
    </div>
  );
}

// Horizontal bar chart — colleges, categories, price buckets, book
// departments all share this shape (a label and a count). Each bar gets
// its own color from the palette rather than one flat accent — with no
// natural order to these categories, distinct hues make each one easier
// to pick out at a glance, and it's what makes a BI-style chart look
// "alive" instead of a single tinted silhouette.
export function HBarChart({
  data,
  height,
  colors = CHART_PALETTE,
}: {
  data: { label: string; value: number }[];
  height?: number;
  colors?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(120, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} className="text-slate-200 dark:text-slate-800" />
        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_STYLE}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", className: "text-slate-100 dark:text-slate-800" } as object} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Vertical bar chart — weekday distribution reads left-to-right as a week,
// which a horizontal bar would obscure. Same per-bar coloring as HBarChart.
export function VBarChart({ data, colors = CHART_PALETTE }: { data: { label: string; value: number }[]; colors?: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} className="text-slate-200 dark:text-slate-800" />
        <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", className: "text-slate-100 dark:text-slate-800" } as object} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut for a small fixed set of categories (listing status) — a legend
// list beside it carries the exact numbers, the donut carries proportion.
export function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{total}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">total</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-400">{d.name}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-100">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
