"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import type { TimeRange } from "@/lib/hooks/use-chart-data";

interface TxChartProps {
  data: { t: string; v: number }[];
  loading?: boolean;
  onRangeChange?: (range: TimeRange) => void;
}

const RANGES: TimeRange[] = ["24H", "1W", "1M"];

export function TxChart({ data, loading, onRangeChange }: TxChartProps) {
  const [range, setRange] = useState<TimeRange>("24H");

  const handleRange = (r: TimeRange) => {
    setRange(r);
    onRangeChange?.(r);
  };

  return (
    <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-transparent">
        <span className="text-sm font-semibold text-kite-text">Transaction Activity</span>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRange(r)}
              className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium transition-colors ${
                range === r
                  ? "bg-kite-gold/20 text-kite-gold"
                  : "text-kite-text-muted hover:text-kite-text bg-kite-bg"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 pb-2 h-[220px] relative">
        {loading && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-kite-text-muted text-xs">
            Loading...
          </div>
        )}
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C4A96A" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C4A96A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tick={{ fill: "#FFFFFF", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#FFFFFF", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip suffix=" txns" />} />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#C4A96A"
              strokeWidth={2}
              fill="url(#txGrad)"
              dot={false}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
