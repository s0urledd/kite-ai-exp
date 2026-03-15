"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { ChainStats, TransactionChartData } from "@/lib/types/api";
import { formatNumber } from "@/lib/utils/format";
import { useChainData } from "@/lib/hooks/use-chain-data";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = {
  gold: "#C4A96A",
  goldDim: "#8B7A4E",
  blue: "#60A5FA",
  green: "#4ADE80",
  purple: "#A78BFA",
  orange: "#FB923C",
  surface: "#111113",
  border: "#2A2820",
  muted: "#5C574E",
  grid: "#1E1D18",
};

const tooltipStyle = {
  contentStyle: { backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9B9488" },
  itemStyle: { color: CHART_COLORS.gold },
};

function ChartCard({ title, children, rightSlot }: { title: string; children: React.ReactNode; rightSlot?: React.ReactNode }) {
  return (
    <div className="bg-kite-surface rounded-[14px] border border-kite-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-kite-text">{title}</h2>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [chartData, setChartData] = useState<{ date: string; tx_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"area" | "bar">("area");
  const chainData = useChainData();

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([
          blockscout.getStats(),
          blockscout.getTransactionCharts().catch(() => ({ chart_data: [] })),
        ]);
        setStats(s);
        // Normalize field name: API may return transaction_count or tx_count
        setChartData(
          (c.chart_data || []).map((d) => ({
            date: d.date,
            tx_count: d.transaction_count ?? d.tx_count ?? 0,
          }))
        );
      } catch (e) {
        console.error("Failed to load stats", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-kite-surface rounded w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-kite-surface rounded-[14px]" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="h-80 bg-kite-surface rounded-[14px]" />
            <div className="h-80 bg-kite-surface rounded-[14px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-red-400">Failed to load stats</div>;

  // Overview stat cards (Etherscan style)
  const overviewStats = [
    {
      label: "Total Transactions",
      value: formatNumber(stats.total_transactions),
      subLabel: `${formatNumber(stats.transactions_today)} today`,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      color: "border-kite-border",
    },
    {
      label: "Total Blocks",
      value: formatNumber(stats.total_blocks),
      subLabel: `${(stats.average_block_time / 1000).toFixed(1)}s avg block time`,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
      color: "border-kite-border",
    },
    {
      label: "Wallet Addresses",
      value: formatNumber(stats.total_addresses),
      subLabel: "Total unique addresses",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      color: "border-kite-border",
    },
    {
      label: "Network Utilization",
      value: `${stats.network_utilization_percentage.toFixed(1)}%`,
      subLabel: `${formatNumber(stats.gas_used_today, true)} gas today`,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
      color: "border-kite-border",
    },
  ];

  // Gas tracker
  const gasCards = [
    { label: "Slow", value: stats.gas_prices.slow ?? "—", color: "text-yellow-400", bg: "bg-yellow-400/5", borderColor: "border-transparent" },
    { label: "Average", value: stats.gas_prices.average ?? "—", color: "text-kite-gold", bg: "bg-kite-gold-faint", borderColor: "border-transparent" },
    { label: "Fast", value: stats.gas_prices.fast ?? "—", color: "text-green-400", bg: "bg-green-400/5", borderColor: "border-transparent" },
  ];

  // Prepare Gas History chart from RPC data
  const gasHistoryData = chainData.gasHistory.slice(-25);

  // Prepare TPS history from txHistory
  const tpsData = chainData.txHistory.slice(-25).map((d) => ({
    t: d.t,
    tps: chainData.avgBlockTime > 0 ? parseFloat((d.v / chainData.avgBlockTime).toFixed(2)) : 0,
  }));

  // Network pie chart data
  const utilizationData = [
    { name: "Used", value: stats.network_utilization_percentage },
    { name: "Available", value: 100 - stats.network_utilization_percentage },
  ];
  const PIE_COLORS = [CHART_COLORS.gold, CHART_COLORS.grid];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-[12px] bg-kite-gold-faint border border-transparent flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-gold">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-kite-text">Charts & Stats</h1>
          <p className="text-xs text-kite-text-muted mt-0.5">Kite AI Network overview and analytics</p>
        </div>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {overviewStats.map((s) => (
          <div key={s.label} className={`bg-kite-surface rounded-[14px] border ${s.color} p-4 flex items-start gap-3`}>
            <div className="w-9 h-9 rounded-[10px] bg-kite-bg border border-kite-border flex items-center justify-center flex-shrink-0 mt-0.5">
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-xl font-bold font-mono text-kite-text">{s.value}</div>
              <div className="text-[11px] text-kite-text-muted mt-0.5">{s.subLabel}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gas Tracker */}
      <div className="bg-kite-surface rounded-[14px] border border-kite-border p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <h2 className="text-sm font-semibold text-kite-text">Gas Tracker</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {gasCards.map((g) => (
            <div key={g.label} className={`${g.bg} rounded-[10px] border ${g.borderColor} p-4 text-center`}>
              <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-2">{g.label}</div>
              <div className={`text-2xl font-bold font-mono ${g.color}`}>{g.value}</div>
              <div className="text-[11px] text-kite-text-muted mt-1">Gwei</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 1. Daily Transactions Chart */}
        <ChartCard
          title="Daily Transactions"
          rightSlot={
            <div className="flex gap-1 bg-kite-bg rounded-[8px] border border-kite-border p-0.5">
              <button
                onClick={() => setActiveChart("area")}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${activeChart === "area" ? "bg-kite-gold-faint text-kite-gold" : "text-kite-text-muted hover:text-kite-text"}`}
              >Area</button>
              <button
                onClick={() => setActiveChart("bar")}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${activeChart === "bar" ? "bg-kite-gold-faint text-kite-gold" : "text-kite-text-muted hover:text-kite-text"}`}
              >Bar</button>
            </div>
          }
        >
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              {activeChart === "area" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="txGradStats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v, true)} />
                  <Tooltip {...tooltipStyle} labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} formatter={(value: number) => [formatNumber(value), "Transactions"]} />
                  <Area type="monotone" dataKey="tx_count" stroke={CHART_COLORS.gold} strokeWidth={2} fill="url(#txGradStats)" name="Transactions" />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v, true)} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="tx_count" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} name="Transactions" />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/30 mx-auto mb-3">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <div className="text-kite-text-muted text-sm">Transaction chart data is being collected</div>
                <div className="text-kite-text-muted/60 text-xs mt-1">Data will appear as the indexer processes blocks</div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* 2. Gas Utilization Over Time */}
        <ChartCard title="Gas Utilization (Recent Blocks)">
          {gasHistoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={gasHistoryData}>
                <defs>
                  <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.orange} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="t" tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value}%`, "Gas Used"]} />
                <Area type="monotone" dataKey="v" stroke={CHART_COLORS.orange} strokeWidth={2} fill="url(#gasGrad)" name="Gas %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-kite-text-muted text-sm">Loading gas data...</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* 3. TPS Over Time */}
        <ChartCard title="Transactions Per Block (Recent)">
          {chainData.txHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chainData.txHistory.slice(-25)}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="t" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => [value, "Txns"]} />
                <Line type="monotone" dataKey="v" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Transactions" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-kite-text-muted text-sm">Loading...</div>
          )}
        </ChartCard>

        {/* 4. Network Utilization Gauge */}
        <ChartCard title="Network Utilization">
          <div className="h-[240px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {utilizationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value.toFixed(1)}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center -mt-4">
              <div className="text-2xl font-bold font-mono text-kite-text">{stats.network_utilization_percentage.toFixed(1)}%</div>
              <div className="text-[11px] text-kite-text-muted">Current utilization</div>
            </div>
          </div>
        </ChartCard>

        {/* 5. Network Summary */}
        <ChartCard title="Network Summary">
          <div className="space-y-3.5">
            {[
              { label: "Avg Block Time", value: `${(stats.average_block_time / 1000).toFixed(1)}s`, color: "text-kite-text" },
              { label: "Current TPS", value: chainData.tps.toFixed(2), color: "text-kite-text" },
              { label: "Peak TPS", value: chainData.peakTps.toFixed(2), color: "text-kite-text" },
              { label: "Total Gas Used", value: formatNumber(stats.total_gas_used, true), color: "text-kite-text" },
              { label: "Gas Used Today", value: formatNumber(stats.gas_used_today, true), color: "text-kite-text" },
              { label: "Transactions Today", value: formatNumber(stats.transactions_today), color: "text-kite-text" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-transparent last:border-0">
                <span className="text-[12px] text-kite-text-muted">{item.label}</span>
                <span className={`text-[13px] font-mono font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Active Contracts from RPC */}
      {chainData.contracts.length > 0 && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-transparent">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-sm font-semibold text-kite-text">Most Active Contracts (Recent Blocks)</span>
            </div>
            <span className="text-[11px] text-kite-text-muted bg-kite-bg px-2 py-0.5 rounded font-mono">
              {chainData.contracts.length} tracked
            </span>
          </div>

          <div className="grid grid-cols-[auto_1fr_120px_120px] gap-4 px-5 py-2.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
            <span>#</span>
            <span>Contract</span>
            <span className="text-right">Unique Callers</span>
            <span className="text-right">Interactions</span>
          </div>

          {chainData.contracts.map((c, i) => (
            <Link
              key={c.address}
              href={`/address/${c.address}`}
              className="grid grid-cols-[auto_1fr_120px_120px] gap-4 px-5 py-3 border-b border-transparent hover:bg-kite-surface-hover transition-colors group"
            >
              <span className="text-[13px] font-mono text-kite-text-muted w-6">{i + 1}</span>
              <span className="text-[13px] font-mono text-kite-text-secondary group-hover:text-kite-gold transition-colors truncate">
                {c.address}
              </span>
              <span className="text-[13px] font-mono text-kite-text-secondary text-right">{formatNumber(c.callers)}</span>
              <span className="text-[13px] font-mono text-kite-gold font-semibold text-right">{formatNumber(c.calls)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
