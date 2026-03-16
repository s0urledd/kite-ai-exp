"use client";

import { useEffect, useState, useCallback } from "react";
import { blockscout } from "@/lib/api/blockscout";
import { STATS_API_URL } from "@/lib/config/chain";
import type { ChainStats } from "@/lib/types/api";
import { formatNumber } from "@/lib/utils/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

// ─── Theme ───
const C = {
  gold: "#C4A96A",
  blue: "#60A5FA",
  green: "#4ADE80",
  purple: "#A78BFA",
  orange: "#FB923C",
  cyan: "#22D3EE",
  rose: "#FB7185",
  surface: "#111113",
  border: "#2A2820",
  muted: "#5C574E",
  grid: "#1E1D18",
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: "#9B9488" },
};

// ─── Stats microservice chart data ───
interface ChartPoint {
  date: string;
  value: number;
  label: string;
}

async function fetchLineChart(name: string, days = 30): Promise<ChartPoint[]> {
  try {
    const res = await fetch(`${STATS_API_URL}/api/v1/lines/${name}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const chart = data?.chart;
    if (!Array.isArray(chart) || chart.length === 0) return [];

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return chart
      .filter((d: { date: string }) => new Date(d.date) >= cutoff)
      .sort(
        (a: { date: string }, b: { date: string }) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      .map((d: { date: string; value: string }) => ({
        date: d.date,
        value: parseFloat(d.value) || 0,
        label: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));
  } catch {
    return [];
  }
}

// Also try Blockscout v2 /stats/charts/transactions as fallback
async function fetchTxChartFallback(days = 30): Promise<ChartPoint[]> {
  try {
    const data = await blockscout.getTransactionCharts();
    if (!data?.chart_data?.length) return [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return data.chart_data
      .filter((d) => new Date(d.date) >= cutoff)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      .map((d) => ({
        date: d.date,
        value: d.transaction_count ?? d.tx_count ?? 0,
        label: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));
  } catch {
    return [];
  }
}

// ─── Chart definitions ───
interface ChartDef {
  id: string;
  title: string;
  endpoint: string;
  color: string;
  type: "area" | "bar";
  suffix?: string;
  valueFormatter?: (v: number) => string;
}

const CHARTS: ChartDef[] = [
  {
    id: "dailyTxns",
    title: "Daily Transactions",
    endpoint: "newTxns",
    color: C.gold,
    type: "area",
  },
  {
    id: "txnsGrowth",
    title: "Cumulative Transactions",
    endpoint: "txnsGrowth",
    color: C.blue,
    type: "area",
  },
  {
    id: "activeAccounts",
    title: "Active Accounts",
    endpoint: "activeAccounts",
    color: C.green,
    type: "bar",
  },
  {
    id: "newAccounts",
    title: "New Accounts",
    endpoint: "newAccounts",
    color: C.cyan,
    type: "area",
  },
  {
    id: "accountsGrowth",
    title: "Cumulative Accounts",
    endpoint: "accountsGrowth",
    color: C.purple,
    type: "area",
  },
  {
    id: "averageTxnFee",
    title: "Average Transaction Fee",
    endpoint: "averageTxnFee",
    color: C.orange,
    type: "area",
    suffix: " KITE",
    valueFormatter: (v) => v.toFixed(6),
  },
  {
    id: "txnsFee",
    title: "Daily Transaction Fees",
    endpoint: "txnsFee",
    color: C.rose,
    type: "bar",
    suffix: " KITE",
    valueFormatter: (v) => v.toFixed(4),
  },
  {
    id: "averageGasPrice",
    title: "Average Gas Price",
    endpoint: "averageGasPrice",
    color: C.gold,
    type: "area",
    suffix: " Gwei",
    valueFormatter: (v) => v.toFixed(2),
  },
  {
    id: "newBlocks",
    title: "Daily New Blocks",
    endpoint: "newBlocks",
    color: C.blue,
    type: "bar",
  },
  {
    id: "averageBlockSize",
    title: "Average Block Size",
    endpoint: "averageBlockSize",
    color: C.green,
    type: "area",
    suffix: " bytes",
  },
  {
    id: "newContracts",
    title: "New Contracts",
    endpoint: "newContracts",
    color: C.purple,
    type: "bar",
  },
  {
    id: "contractsGrowth",
    title: "Cumulative Contracts",
    endpoint: "contractsGrowth",
    color: C.cyan,
    type: "area",
  },
];

// ─── Period selector ───
type Period = "7d" | "30d" | "90d";
const PERIODS: { label: string; value: Period; days: number }[] = [
  { label: "7D", value: "7d", days: 7 },
  { label: "30D", value: "30d", days: 30 },
  { label: "90D", value: "90d", days: 90 },
];

// ─── Single chart card component ───
function StatsChartCard({
  def,
  data,
  loading,
}: {
  def: ChartDef;
  data: ChartPoint[];
  loading: boolean;
}) {
  const gradientId = `grad-${def.id}`;

  return (
    <div className="bg-kite-surface rounded-[14px] border border-kite-border p-5">
      <h3 className="text-sm font-semibold text-kite-text mb-4">
        {def.title}
      </h3>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-kite-gold/30 border-t-kite-gold rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <span className="text-kite-text-muted text-xs">
            No data available yet
          </span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          {def.type === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={def.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={def.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  def.valueFormatter
                    ? def.valueFormatter(v)
                    : formatNumber(v, true)
                }
                width={55}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [
                  def.valueFormatter
                    ? `${def.valueFormatter(value)}${def.suffix || ""}`
                    : `${formatNumber(value)}${def.suffix || ""}`,
                  def.title,
                ]}
                labelFormatter={(v) => v}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={def.color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
              />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  def.valueFormatter
                    ? def.valueFormatter(v)
                    : formatNumber(v, true)
                }
                width={55}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [
                  def.valueFormatter
                    ? `${def.valueFormatter(value)}${def.suffix || ""}`
                    : `${formatNumber(value)}${def.suffix || ""}`,
                  def.title,
                ]}
                labelFormatter={(v) => v}
              />
              <Bar
                dataKey="value"
                fill={def.color}
                radius={[3, 3, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main page ───
export default function StatsPage() {
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [chartDataMap, setChartDataMap] = useState<
    Record<string, ChartPoint[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Load overview stats
  useEffect(() => {
    blockscout
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load all charts
  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    const days = PERIODS.find((p) => p.value === period)?.days || 30;

    const results = await Promise.all(
      CHARTS.map(async (def) => {
        let data = await fetchLineChart(def.endpoint, days);
        // Fallback for daily txns: use Blockscout v2 API
        if (data.length === 0 && def.endpoint === "newTxns") {
          data = await fetchTxChartFallback(days);
        }
        return { id: def.id, data };
      })
    );

    const map: Record<string, ChartPoint[]> = {};
    results.forEach((r) => {
      map[r.id] = r.data;
    });
    setChartDataMap(map);
    setChartsLoading(false);
  }, [period]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  // Overview stat items
  const overviewItems = stats
    ? [
        {
          label: "Total Transactions",
          value: formatNumber(stats.total_transactions),
        },
        { label: "Total Blocks", value: formatNumber(stats.total_blocks) },
        {
          label: "Wallet Addresses",
          value: formatNumber(stats.total_addresses),
        },
        {
          label: "Network Utilization",
          value: `${stats.network_utilization_percentage.toFixed(1)}%`,
        },
        {
          label: "Avg Block Time",
          value: `${(stats.average_block_time / 1000).toFixed(1)}s`,
        },
        {
          label: "Gas (Slow / Avg / Fast)",
          value: `${stats.gas_prices.slow ?? "—"} / ${stats.gas_prices.average ?? "—"} / ${stats.gas_prices.fast ?? "—"} Gwei`,
        },
      ]
    : [];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-kite-gold-faint border border-transparent flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-kite-gold"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-kite-text">
              Charts & Stats
            </h1>
            <p className="text-xs text-kite-text-muted mt-0.5">
              Kite AI Network analytics
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-kite-bg rounded-[8px] border border-kite-border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                period === p.value
                  ? "bg-kite-gold-faint text-kite-gold"
                  : "text-kite-text-muted hover:text-kite-text"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview stats row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-kite-surface rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {overviewItems.map((item) => (
            <div
              key={item.label}
              className="bg-kite-surface rounded-[14px] border border-kite-border p-4"
            >
              <div className="text-[10px] text-kite-text-muted uppercase tracking-wider mb-1.5">
                {item.label}
              </div>
              <div className="text-[15px] font-bold font-mono text-kite-text">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CHARTS.map((def) => (
          <StatsChartCard
            key={def.id}
            def={def}
            data={chartDataMap[def.id] || []}
            loading={chartsLoading}
          />
        ))}
      </div>
    </div>
  );
}
