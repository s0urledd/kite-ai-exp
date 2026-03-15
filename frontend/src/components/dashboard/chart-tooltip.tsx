"use client";

import { formatNumber } from "@/lib/utils/format";

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  suffix?: string;
}

export function ChartTooltip({ active, payload, label, suffix = "" }: ChartTooltipProps) {
  if (!active || !payload?.[0]) return null;

  return (
    <div className="bg-[#18170F] border border-kite-border rounded-lg px-3 py-1.5 font-mono text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
      <div className="text-kite-text-muted">{label}</div>
      <div className="text-kite-gold font-semibold">
        {formatNumber(payload[0].value)}{suffix}
      </div>
    </div>
  );
}
