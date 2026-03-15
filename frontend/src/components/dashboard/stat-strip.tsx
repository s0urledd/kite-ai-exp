"use client";

import { AnimatedNumber } from "@/components/common/animated-number";
import type { ChainData } from "@/lib/hooks/use-chain-data";
import { useKitePrice } from "@/lib/hooks/use-kite-price";
import { type ReactNode } from "react";

interface StatStripProps {
  data: ChainData;
}

interface MetricCell {
  label: string;
  value: ReactNode;
  align?: "left" | "right";
}

interface StatCard {
  title: string;
  accentHex: string;
  icon: ReactNode;
  metrics: MetricCell[];
}

const GOLD = "#C4A96A";

function GasColorValue({ gwei }: { gwei: number }) {
  const color =
    gwei < 5 ? "text-green-400" : gwei < 20 ? "text-yellow-400" : "text-red-400";
  return (
    <span className={`font-mono font-semibold ${color}`}>
      {gwei.toFixed(1)} Gwei
    </span>
  );
}

function ChangeBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold leading-none ${
        isPositive
          ? "bg-green-500/15 text-green-400"
          : "bg-red-500/15 text-red-400"
      }`}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function StatStrip({ data }: StatStripProps) {
  const price = useKitePrice();
  const priceNum = parseFloat(price.priceUsd);
  const change = price.priceChange24h;

  const avgGasPerTx =
    data.transactionsToday > 0
      ? Math.round(data.gasUsedToday / data.transactionsToday)
      : 0;

  const cards: StatCard[] = [
    // ── Card 1: Chain Pulse ──
    {
      title: "Chain Pulse",
      accentHex: GOLD,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      metrics: [
        {
          label: "Total Txn",
          value: <AnimatedNumber value={data.totalTx} />,
        },
        {
          label: "24H Transactions",
          align: "right" as const,
          value:
            data.transactionsToday > 0
              ? data.transactionsToday.toLocaleString()
              : "\u2014",
        },
        { label: "Avg TPS (24H)", value: data.tps.toFixed(2) },
        { label: "Peak TPS (24H)", align: "right" as const, value: data.peakTps.toFixed(2) },
      ],
    },
    // ── Card 2: Block & Gas ──
    {
      title: "Block & Gas",
      accentHex: GOLD,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      ),
      metrics: [
        {
          label: "Current Block",
          value: (
            <span>
              #<AnimatedNumber value={data.blockNumber} />
            </span>
          ),
        },
        {
          label: "Avg Block Time",
          align: "right" as const,
          value: data.avgBlockTime.toFixed(1) + "s",
        },
        { label: "Gas Price", value: <GasColorValue gwei={data.gasPrice} /> },
        {
          label: "Avg Gas/TXN",
          align: "right" as const,
          value: avgGasPerTx > 0 ? avgGasPerTx.toLocaleString() : "\u2014",
        },
      ],
    },
    // ── Card 3: KITE Economy ──
    {
      title: "KITE Economy",
      accentHex: GOLD,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      metrics: [
        {
          label: "KITE Price",
          value: priceNum > 0 ? `$${priceNum.toFixed(4)}` : "$\u2014",
        },
        {
          label: "24H Change",
          align: "right" as const,
          value: priceNum > 0 ? <ChangeBadge value={change} /> : "\u2014",
        },
        {
          label: "Market Cap",
          value:
            price.marketCap > 0
              ? `$${(price.marketCap / 1e6).toFixed(2)}M`
              : "\u2014",
        },
        {
          label: "FDV",
          align: "right" as const,
          value:
            price.fdv > 0 ? `$${(price.fdv / 1e9).toFixed(2)}B` : "\u2014",
        },
      ],
    },
    // ── Card 4: Network Activity ──
    {
      title: "Network Activity",
      accentHex: GOLD,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
          <path d="M16.24 16.24l2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="M4.93 19.07l2.83-2.83" />
          <path d="M16.24 7.76l2.83-2.83" />
        </svg>
      ),
      metrics: [
        {
          label: "Total Addresses",
          value: <AnimatedNumber value={data.addressCount} />,
        },
        {
          label: "24H New Addresses",
          align: "right" as const,
          value: data.newAddresses24h > 0 ? data.newAddresses24h.toLocaleString() : "\u2014",
        },
        {
          label: "Total Contracts",
          value: data.totalContracts.toLocaleString(),
        },
        {
          label: "24H New Contracts",
          align: "right" as const,
          value: data.newContracts24h.toLocaleString(),
        },
      ],
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 -mt-1 mb-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="relative bg-kite-surface rounded-[12px] overflow-hidden transition-colors duration-300 group"
            style={{
              boxShadow: `0 0 0 1px ${GOLD}10`,
            }}
          >
            {/* Top gold gradient line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, ${GOLD}00 0%, ${GOLD} 50%, ${GOLD}00 100%)`,
              }}
            />

            <div className="p-5 pt-5">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${card.accentHex}12`,
                    color: card.accentHex,
                    filter: `drop-shadow(0 0 8px ${card.accentHex}66)`,
                  }}
                >
                  {card.icon}
                </div>
                <span className="text-[13px] text-white font-semibold uppercase tracking-wider">
                  {card.title}
                </span>
              </div>

              {/* Separator under title */}
              <div
                className="mb-3.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              />

              {/* 2×2 metrics grid */}
              <div className="grid grid-cols-2 gap-y-3.5">
                {card.metrics.map((m) => {
                  const isRight = m.align === "right";
                  return (
                    <div key={m.label} className={isRight ? "text-right" : "text-left"}>
                      <div
                        className="text-[11px] uppercase tracking-wide mb-1 font-medium"
                        style={{ color: "rgba(255,255,255,0.40)" }}
                      >
                        {m.label}
                      </div>
                      <div className="text-[15px] font-mono font-semibold text-white">
                        {m.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
