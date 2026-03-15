"use client";

import { useAnimatedNumber } from "@/lib/hooks/use-animated-number";
import { formatNumber } from "@/lib/utils/format";

export function AnimatedNumber({ value, compact = true }: { value: number; compact?: boolean }) {
  const v = useAnimatedNumber(value);
  return <span>{formatNumber(Math.round(v), compact)}</span>;
}
