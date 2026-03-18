"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressTimelinePoint } from "@/lib/analytics/progress";

type ProgressTrendChartProps = {
  data: ProgressTimelinePoint[];
};

function ProgressTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProgressTimelinePoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{point.score}%</p>
      <p className="text-sm text-slate-600">{point.track}</p>
      <p className="mt-2 text-xs text-slate-500">
        {point.durationMinutes} min practice, {point.followUps} follow-ups
      </p>
    </div>
  );
}

export function ProgressTrendChart({ data }: ProgressTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="progressScoreFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(148, 163, 184, 0.2)"
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          stroke="rgba(71, 85, 105, 0.8)"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          domain={[50, 100]}
          stroke="rgba(71, 85, 105, 0.8)"
        />
        <Tooltip content={<ProgressTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#f97316"
          strokeWidth={3}
          fill="url(#progressScoreFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
