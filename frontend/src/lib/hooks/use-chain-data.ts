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
  chainStats: ChainStats | null;
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

// ── Stats microservice counters ──
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

async function fetchLatestStatValue(endpoint: string): Promise<number> {
  try {
    const res = await fetch(`${STATS_API_URL}/api/v1/lines/${endpoint}`, {
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const chart = data?.chart;
    if (!Array.isArray(chart) || chart.length === 0) return 0;
    const last = chart[chart.length - 1];
    return parseInt(last.value) || 0;
  } catch {
    return 0;
  }
}

// ════════════════════════════════════════════════════════════════
// 24H TX Counter — exact, real-time, persistent across reloads
// ════════════════════════════════════════════════════════════════
//
// How it works:
//   1. First ever load → paginate Blockscout /blocks, sum tx_count
//      for last 24H. Save {count, lastBlock, timestamp} to localStorage.
//   2. F5 / page reload → read from localStorage. Only fetch NEW blocks
//      since lastBlock and add their tx_count. Fast, no full recalc.
//   3. Every 10 minutes → full recalc to correct any drift from the
//      24H sliding window (old TXs falling off the back).
//   4. New blocks arrive (10s poll) → add their tx_count immediately.

const TX24H_KEY = "kite_tx24h_v2";
const FULL_RECALC_INTERVAL = 600_000; // 10 minutes

interface Tx24hState {
  count: number;
  lastBlock: number;
  calculatedAt: number;
}

function saveTx24hState(state: Tx24hState) {
  try {
    localStorage.setItem(TX24H_KEY, JSON.stringify(state));
  } catch {}
}

function loadTx24hState(): Tx24hState | null {
  try {
    const raw = localStorage.getItem(TX24H_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as Tx24hState;
    // Valid if calculated within last 15 minutes
    if (Date.now() - state.calculatedAt > 900_000) return null;
    if (!state.count || !state.lastBlock) return null;
    return state;
  } catch {
    return null;
  }
}

/**
 * Full 24H TX count: paginate through Blockscout blocks from newest to oldest,
 * summing tx_count until we pass the 24H boundary.
 */
async function fullCount24hTx(): Promise<{ count: number; newestBlock: number }> {
  const cutoffSec = Math.floor(Date.now() / 1000) - 86400;
  let total = 0;
  let newestBlock = 0;
  let params: Record<string, string> = { type: "block" };

  for (let page = 0; page < 25; page++) {
    const data = await blockscout.getBlocks(params);
    const blocks = data.items || [];
    if (blocks.length === 0) break;

    for (const block of blocks) {
      if (page === 0 && newestBlock === 0) newestBlock = block.height;
      const blockTimeSec = new Date(block.timestamp).getTime() / 1000;
      if (blockTimeSec < cutoffSec) {
        return { count: total, newestBlock };
      }
      total += block.tx_count || 0;
    }

    if (!data.next_page_params) break;
    params = Object.fromEntries(
      Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])
    );
  }

  return { count: total, newestBlock };
}

/**
 * Incremental update: fetch only blocks newer than lastBlock,
 * add their tx_count to existing count.
 */
async function incrementalCount(lastBlock: number, currentBlock: number): Promise<number> {
  if (currentBlock <= lastBlock) return 0;

  let added = 0;
  let params: Record<string, string> = { type: "block" };

  for (let page = 0; page < 5; page++) {
    const data = await blockscout.getBlocks(params);
    const blocks = data.items || [];
    if (blocks.length === 0) break;

    let reachedLastBlock = false;
    for (const block of blocks) {
      if (block.height <= lastBlock) {
        reachedLastBlock = true;
        break;
      }
      added += block.tx_count || 0;
    }

    if (reachedLastBlock) break;
    if (!data.next_page_params) break;
    params = Object.fromEntries(
      Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])
    );
  }

  return added;
}


export function useChainData(pollInterval = 10000) {
  const [data, setData] = useState<ChainData>(INITIAL);
  const addrs = useRef(new Set<string>());
  const peakTpsRef = useRef({ value: 0, since: Date.now() });

  // 24H TX state — survives between polls, initialized from localStorage on mount
  const tx24h = useRef<Tx24hState>({ count: 0, lastBlock: 0, calculatedAt: 0 });
  const tx24hInitialized = useRef(false);

  const slowCache = useRef({
    totalContracts: 0,
    newAddresses24h: 0,
    newContracts24h: 0,
    lastFetch: 0,
  });

  const lastGoodStats = useRef<ChainStats | null>(null);
  const lastGoodCounters = useRef<StatsCounters | null>(null);

  const load = useCallback(async () => {
    const [bnH, gpH, statsResult, countersResult] = await Promise.all([
      rpc<string>("eth_blockNumber"),
      rpc<string>("eth_gasPrice"),
      blockscout.getStats().catch(() => null),
      fetchStatsCounters(),
    ]);
    const bn = hex(bnH);
    const gp = gwei(gpH);

    const stats = statsResult || lastGoodStats.current;
    if (statsResult) lastGoodStats.current = statsResult;

    const counters = countersResult || lastGoodCounters.current;
    if (countersResult) lastGoodCounters.current = countersResult;

    // Recent blocks for display
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
        if (tx.to) addrs.current.add(tx.to);
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

    const localAvgBt =
      bks.length >= 2
        ? (hex(bks[0].timestamp) - hex(bks[bks.length - 1].timestamp)) / (bks.length - 1)
        : 0;

    const util = bks[0] ? (hex(bks[0].gasUsed) / hex(bks[0].gasLimit)) * 100 : 0;

    const totalTimeSpan =
      bks.length >= 2
        ? hex(bks[0].timestamp) - hex(bks[bks.length - 1].timestamp)
        : 0;
    const instantTps = totalTimeSpan > 0 ? tot / totalTimeSpan : 0;

    const now24h = Date.now();
    if (now24h - peakTpsRef.current.since > 86400_000) {
      peakTpsRef.current = { value: instantTps, since: now24h };
    } else if (instantTps > peakTpsRef.current.value) {
      peakTpsRef.current.value = instantTps;
    }

    // Total TXN
    let totalTx: number;
    if (counters && counters.totalTxns > 0) {
      totalTx = counters.totalTxns;
    } else if (stats?.total_transactions) {
      totalTx = parseInt(stats.total_transactions);
    } else {
      const avgTxPerBlock = bks.length > 0 ? tot / bks.length : 0;
      totalTx = Math.round(avgTxPerBlock * bn);
    }

    // Slow counters (every 60s)
    const now = Date.now();
    if (now - slowCache.current.lastFetch > 60000) {
      const newAccounts = await fetchLatestStatValue("newAccounts");
      slowCache.current = {
        newAddresses24h: newAccounts > 0 ? newAccounts : slowCache.current.newAddresses24h,
        newContracts24h: counters ? counters.lastNewContracts : slowCache.current.newContracts24h,
        totalContracts: counters ? counters.totalContracts : slowCache.current.totalContracts,
        lastFetch: now,
      };
    }

    // ══════════════════════════════════════════════════
    // 24H TX — exact, persistent, incremental
    // ══════════════════════════════════════════════════
    const needsFullRecalc = now - tx24h.current.calculatedAt > FULL_RECALC_INTERVAL;

    if (!tx24hInitialized.current) {
      // First poll after mount: try localStorage
      tx24hInitialized.current = true;
      const saved = loadTx24hState();

      if (saved && saved.lastBlock > 0) {
        // Have saved state — just add new blocks since last visit
        const added = await incrementalCount(saved.lastBlock, bn);
        tx24h.current = {
          count: saved.count + added,
          lastBlock: bn,
          calculatedAt: saved.calculatedAt,
        };
        saveTx24hState(tx24h.current);
      } else {
        // No saved state — full calculation
        const result = await fullCount24hTx();
        tx24h.current = {
          count: result.count,
          lastBlock: result.newestBlock || bn,
          calculatedAt: now,
        };
        saveTx24hState(tx24h.current);
      }
    } else if (needsFullRecalc) {
      // Periodic full recalc to correct 24H sliding window drift
      const result = await fullCount24hTx();
      tx24h.current = {
        count: result.count,
        lastBlock: result.newestBlock || bn,
        calculatedAt: now,
      };
      saveTx24hState(tx24h.current);
    } else if (bn > tx24h.current.lastBlock) {
      // Normal poll: add TXs from new blocks via RPC data we already have
      for (const b of bks) {
        const blockNum = hex(b.number);
        if (blockNum > tx24h.current.lastBlock) {
          tx24h.current.count += Array.isArray(b.transactions) ? b.transactions.length : 0;
        }
      }
      tx24h.current.lastBlock = bn;
      saveTx24hState(tx24h.current);
    }

    const transactionsToday = tx24h.current.count;

    // Address count
    const addressCount = counters && counters.totalAddresses > 0
      ? counters.totalAddresses
      : stats
        ? parseInt(stats.total_addresses || "0")
        : addrs.current.size;

    // Avg TPS (24H)
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
