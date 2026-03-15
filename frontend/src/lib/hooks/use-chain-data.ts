"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { rpc, hex, gwei, type RpcBlock, type RpcTransaction } from "@/lib/api/rpc";
import { blockscout } from "@/lib/api/blockscout";
import { STATS_API_URL } from "@/lib/config/chain";
import type { ChainStats } from "@/lib/types/api";

export interface ChainData {
  blockNumber: number;
  gasPrice: number;
  blocks: RpcBlock[];
  txHistory: { t: string; v: number }[];
  gasHistory: { t: string; v: number }[];
  totalTx: number;
  avgBlockTime: number;
  utilization: number;
  tps: number;
  peakTps: number;
  contracts: { address: string; calls: number; callers: number }[];
  addressCount: number;
  transactionsToday: number;
  gasUsedToday: number;
  totalBlocks: number;
  // Blockscout real stats
  chainStats: ChainStats | null;
  // Network activity counters
  totalContracts: number;
  newAddresses24h: number;
  newContracts24h: number;
}

const INITIAL: ChainData = {
  blockNumber: 0,
  gasPrice: 0,
  blocks: [],
  txHistory: [],
  gasHistory: [],
  totalTx: 0,
  avgBlockTime: 0,
  utilization: 0,
  tps: 0,
  peakTps: 0,
  contracts: [],
  addressCount: 0,
  transactionsToday: 0,
  gasUsedToday: 0,
  totalBlocks: 0,
  chainStats: null,
  totalContracts: 0,
  newAddresses24h: 0,
  newContracts24h: 0,
};

// ── Stats microservice counters (single API call, all data) ──
interface StatsCounters {
  totalContracts: number;
  totalAddresses: number;
  totalAccounts: number;
  newTxns24h: number;
  lastNewContracts: number;
  totalTxns: number;
  completedTxns: number;
  averageBlockTime: number;
  totalBlocks: number;
}

async function fetchStatsCounters(): Promise<StatsCounters | null> {
  try {
    const res = await fetch(`${STATS_API_URL}/api/v1/counters`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const counters = data?.counters;
    if (!Array.isArray(counters)) return null;

    const map = new Map<string, string>();
    for (const c of counters) {
      map.set(c.id, c.value);
    }

    return {
      totalContracts: parseInt(map.get("totalContracts") || "0") || 0,
      totalAddresses: parseInt(map.get("totalAddresses") || "0") || 0,
      totalAccounts: parseInt(map.get("totalAccounts") || "0") || 0,
      newTxns24h: parseInt(map.get("newTxns24h") || "0") || 0,
      lastNewContracts: parseInt(map.get("lastNewContracts") || "0") || 0,
      totalTxns: parseInt(map.get("totalTxns") || "0") || 0,
      completedTxns: parseInt(map.get("completedTxns") || "0") || 0,
      averageBlockTime: parseFloat(map.get("averageBlockTime") || "0") || 0,
      totalBlocks: parseInt(map.get("totalBlocks") || "0") || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate a rolling 24H transaction count.
 *
 * Blockscout's `transactions_today` only counts from midnight UTC — NOT a rolling 24H window.
 * If it's 3 AM UTC, that's only 3 hours of data, not 24H.
 *
 * This function combines:
 * 1. `transactions_today` (midnight UTC → now)
 * 2. Yesterday's TX count from /stats/charts/transactions (proportional to remaining hours)
 *
 * Result ≈ true rolling 24H TX count.
 */
async function calculateRolling24hTx(todayFromStats: number): Promise<number> {
  const now = new Date();
  const hoursSinceMidnightUTC = now.getUTCHours() + now.getUTCMinutes() / 60;
  const remainingHours = 24 - hoursSinceMidnightUTC;

  // If we're very close to midnight, transactions_today is basically 24H already
  if (remainingHours < 0.5) return todayFromStats;

  try {
    const chartData = await blockscout.getTransactionCharts();
    const chart = chartData?.chart_data;
    if (!Array.isArray(chart) || chart.length < 2) return todayFromStats;

    // Get yesterday's total TX count (second-to-last entry, or last if today not in chart)
    // Chart entries: [{date: "2026-03-14", tx_count: 500}, {date: "2026-03-15", tx_count: 200}]
    const todayStr = now.toISOString().slice(0, 10);
    let yesterdayTxCount = 0;

    for (let i = chart.length - 1; i >= 0; i--) {
      if (chart[i].date !== todayStr) {
        yesterdayTxCount = chart[i].tx_count ?? chart[i].transaction_count ?? 0;
        break;
      }
    }

    if (yesterdayTxCount <= 0) return todayFromStats;

    // Proportional share of yesterday's TX for the remaining hours
    const yesterdayShare = Math.round(yesterdayTxCount * (remainingHours / 24));
    return todayFromStats + yesterdayShare;
  } catch {
    return todayFromStats;
  }
}

/**
 * Fetch the latest value from a stats-microservice line chart.
 * Returns the most recent day's value, or 0 on failure.
 */
async function fetchLatestStatValue(endpoint: string): Promise<number> {
  try {
    const res = await fetch(`${STATS_API_URL}/api/v1/lines/${endpoint}`, {
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const chart = data?.chart;
    if (!Array.isArray(chart) || chart.length === 0) return 0;
    // Last entry = most recent day
    const last = chart[chart.length - 1];
    return parseInt(last.value) || 0;
  } catch {
    return 0;
  }
}

export function useChainData(pollInterval = 10000) {
  const [data, setData] = useState<ChainData>(INITIAL);
  const addrs = useRef(new Set<string>());
  // Track peak TPS over 24H — only goes up, resets after 24H
  const peakTpsRef = useRef({ value: 0, since: Date.now() });
  // Track new TX since last update to keep 24H TX real-time between polls
  const txTracker = useRef({ lastSeenBlock: 0, txDelta: 0, lastSourceValue: 0 });

  // Cache slow-changing values — refresh every 60s
  // Keep last good values so failed fetches don't wipe data
  const slowCache = useRef({
    totalContracts: 0,
    newAddresses24h: 0,
    newContracts24h: 0,
    lastFetch: 0,
  });

  // Cache last good Blockscout stats to survive intermittent failures
  const lastGoodStats = useRef<ChainStats | null>(null);
  // Cache last good stats-microservice counters
  const lastGoodCounters = useRef<StatsCounters | null>(null);

  const load = useCallback(async () => {
    // Fetch RPC data, Blockscout stats, and stats-microservice counters in parallel
    const [bnH, gpH, statsResult, countersResult] = await Promise.all([
      rpc<string>("eth_blockNumber"),
      rpc<string>("eth_gasPrice"),
      blockscout.getStats().catch(() => null),
      fetchStatsCounters(),
    ]);
    const bn = hex(bnH);
    const gp = gwei(gpH);

    // Use fresh data or fall back to last good values
    const stats = statsResult || lastGoodStats.current;
    if (statsResult) lastGoodStats.current = statsResult;

    const counters = countersResult || lastGoodCounters.current;
    if (countersResult) lastGoodCounters.current = countersResult;

    // Fetch recent blocks for TPS, gas, active contracts, and display
    const RECENT_BLOCKS = 8;
    const promises: Promise<RpcBlock | null>[] = [];
    for (let i = 0; i < RECENT_BLOCKS; i++) {
      promises.push(rpc<RpcBlock>("eth_getBlockByNumber", ["0x" + (bn - i).toString(16), true]));
    }
    const bks = (await Promise.all(promises)).filter(Boolean) as RpcBlock[];

    let tot = 0;
    const contractMap: Record<string, { address: string; count: number; users: Set<string> }> = {};
    const txH: { t: string; v: number }[] = [];
    const gasH: { t: string; v: number }[] = [];

    bks.forEach((b) => {
      const txs = (b.transactions || []) as RpcTransaction[];
      const tc = txs.length;
      tot += tc;

      const ts = hex(b.timestamp);
      const label = new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      txH.unshift({ t: label, v: tc });

      const gu = hex(b.gasUsed);
      const gl = hex(b.gasLimit);
      gasH.unshift({ t: label, v: parseFloat(((gu / gl) * 100).toFixed(1)) });

      txs.forEach((tx) => {
        addrs.current.add(tx.from);
        if (tx.to) {
          addrs.current.add(tx.to);
        }
        if (tx.to && tx.input?.length > 10) {
          if (!contractMap[tx.to]) contractMap[tx.to] = { address: tx.to, count: 0, users: new Set() };
          contractMap[tx.to].count++;
          contractMap[tx.to].users.add(tx.from);
        }
      });
    });

    const contracts = Object.values(contractMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((c) => ({ address: c.address, calls: c.count, callers: c.users.size }));

    // Block time from Blockscout (most accurate), fallback to local sample
    const localAvgBt =
      bks.length >= 2
        ? (hex(bks[0].timestamp) - hex(bks[bks.length - 1].timestamp)) / (bks.length - 1)
        : 0;

    const util = bks[0] ? (hex(bks[0].gasUsed) / hex(bks[0].gasLimit)) * 100 : 0;

    // TPS: instantaneous rate from recent blocks
    const totalTimeSpan =
      bks.length >= 2
        ? hex(bks[0].timestamp) - hex(bks[bks.length - 1].timestamp)
        : 0;
    const instantTps = totalTimeSpan > 0 ? tot / totalTimeSpan : 0;

    // Peak TPS: track highest instantaneous TPS seen, reset every 24H
    const now24h = Date.now();
    if (now24h - peakTpsRef.current.since > 86400_000) {
      peakTpsRef.current = { value: instantTps, since: now24h };
    } else if (instantTps > peakTpsRef.current.value) {
      peakTpsRef.current.value = instantTps;
    }

    // Total TXN: prefer stats-microservice > Blockscout > estimate
    let totalTx: number;
    if (counters && counters.totalTxns > 0) {
      totalTx = counters.totalTxns;
    } else if (stats?.total_transactions) {
      totalTx = parseInt(stats.total_transactions);
    } else {
      const avgTxPerBlock = bks.length > 0 ? tot / bks.length : 0;
      totalTx = Math.round(avgTxPerBlock * bn);
    }

    // ── Slow-changing counters: refresh every 60s ──
    // Only needed for newAccounts chart (counters endpoint doesn't have newAddresses24h)
    const now = Date.now();
    if (now - slowCache.current.lastFetch > 60000) {
      // Stats-microservice counters already have totalContracts and lastNewContracts
      // We only need newAccounts chart for new addresses count
      const newAccounts = await fetchLatestStatValue("newAccounts");

      slowCache.current = {
        newAddresses24h: newAccounts > 0 ? newAccounts : slowCache.current.newAddresses24h,
        newContracts24h: counters ? counters.lastNewContracts : slowCache.current.newContracts24h,
        totalContracts: counters ? counters.totalContracts : slowCache.current.totalContracts,
        lastFetch: now,
      };
    }

    // ── 24H Transactions (Rolling 24H window) ──
    // Priority:
    //   1. Stats-microservice newTxns24h (true rolling 24H if available)
    //   2. Rolling calc: Blockscout transactions_today + proportional yesterday from chart data
    //   3. Raw Blockscout transactions_today (midnight UTC, worst case)
    const microserviceTx24h = counters ? counters.newTxns24h : 0;
    const blockscoutTx24h = stats?.transactions_today ? parseInt(stats.transactions_today) : 0;

    let baseTx24h: number;
    if (microserviceTx24h > 0) {
      // Stats microservice has true rolling 24H — use it directly
      baseTx24h = microserviceTx24h;
    } else if (blockscoutTx24h > 0) {
      // Calculate rolling 24H from chart data + today's count
      baseTx24h = await calculateRolling24hTx(blockscoutTx24h);
    } else {
      baseTx24h = 0;
    }

    // Track TX delta for real-time updates between API polls
    if (baseTx24h !== txTracker.current.lastSourceValue && baseTx24h > 0) {
      txTracker.current = { lastSeenBlock: bn, txDelta: 0, lastSourceValue: baseTx24h };
    } else if (bn > txTracker.current.lastSeenBlock && bks.length > 0) {
      for (const b of bks) {
        const blockNum = hex(b.number);
        if (blockNum > txTracker.current.lastSeenBlock) {
          const txCount = Array.isArray(b.transactions) ? b.transactions.length : 0;
          txTracker.current.txDelta += txCount;
        }
      }
      txTracker.current.lastSeenBlock = bn;
    }

    const transactionsToday = (baseTx24h > 0 ? baseTx24h : 0) + txTracker.current.txDelta;

    // ── Address count: counters > Blockscout stats > local tracking ──
    const addressCount = counters && counters.totalAddresses > 0
      ? counters.totalAddresses
      : stats
        ? parseInt(stats.total_addresses || "0")
        : addrs.current.size;

    // ── Avg TPS (based on rolling 24H TX count / 86400 seconds) ──
    const avgTps = transactionsToday > 0 ? transactionsToday / 86400 : instantTps;

    setData({
      blockNumber: bn,
      gasPrice: gp,
      blocks: bks,
      txHistory: txH,
      gasHistory: gasH,
      totalTx,
      avgBlockTime: (stats?.average_block_time && stats.average_block_time > 0)
        ? stats.average_block_time / 1000
        : (counters && counters.averageBlockTime > 0)
          ? counters.averageBlockTime
          : (localAvgBt > 0 ? localAvgBt : 2),
      utilization: stats ? stats.network_utilization_percentage : util,
      tps: avgTps,
      peakTps: Math.max(peakTpsRef.current.value, avgTps),
      contracts,
      addressCount,
      transactionsToday,
      gasUsedToday: stats ? parseInt(stats.gas_used_today || "0") : 0,
      totalBlocks: counters && counters.totalBlocks > 0
        ? counters.totalBlocks
        : stats
          ? parseInt(stats.total_blocks || "0")
          : bn,
      chainStats: stats,
      totalContracts: counters && counters.totalContracts > 0
        ? counters.totalContracts
        : slowCache.current.totalContracts,
      newAddresses24h: slowCache.current.newAddresses24h,
      newContracts24h: counters
        ? counters.lastNewContracts
        : slowCache.current.newContracts24h,
    });
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, pollInterval);
    return () => clearInterval(iv);
  }, [load, pollInterval]);

  return data;
}
