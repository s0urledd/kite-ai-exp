"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { rpc, hex, type RpcBlock } from "@/lib/api/rpc";
import { blockscout } from "@/lib/api/blockscout";
import { STATS_API_URL } from "@/lib/config/chain";

export type TimeRange = "24H" | "1W" | "1M";

interface ChartPoint {
  t: string;
  v: number;
}

function getRangeConfig() {
  return {
    "24H": {
      windows: 24,
      secondsPerWindow: 3600, // 1 hour
      label: { hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions,
      rpcSamplesPerWindow: 3,
    },
    "1W": {
      windows: 14,
      secondsPerWindow: 43200, // 12 hours
      label: { month: "short", day: "numeric" } as Intl.DateTimeFormatOptions,
      rpcSamplesPerWindow: 1, // Only for gas fallback, 1 sample is enough
    },
    "1M": {
      windows: 30,
      secondsPerWindow: 86400, // 1 day
      label: { month: "short", day: "numeric" } as Intl.DateTimeFormatOptions,
      rpcSamplesPerWindow: 1,
    },
  };
}

export function useChartData(latestBlock: number, range: TimeRange, avgBlockTime: number) {
  const [txData, setTxData] = useState<ChartPoint[]>([]);
  const [gasData, setGasData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const lastKey = useRef("");

  const load = useCallback(async () => {
    if (latestBlock <= 0 || avgBlockTime <= 0) return;

    // Debounce: only re-fetch when block changes significantly
    const key = `${range}-${Math.floor(latestBlock / 50)}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    setLoading(true);

    try {
      const blockTime = avgBlockTime;

      const configs = getRangeConfig();
      const config = configs[range];
      const blocksPerWindow = Math.max(1, Math.round(config.secondsPerWindow / blockTime));

      // If chain is younger than requested range, adjust window count
      const actualWindows = Math.min(
        config.windows,
        Math.max(1, Math.floor(latestBlock / blocksPerWindow))
      );

      // Load TX data and gas (RPC) data in PARALLEL
      const txDataPromise = loadTxChartData(range, actualWindows, config.secondsPerWindow, config.label);
      const rpcDataPromise = loadRpcSampledData(
        latestBlock,
        actualWindows,
        blocksPerWindow,
        config.label,
        config.rpcSamplesPerWindow,
      );

      const [txChartData, rpcData] = await Promise.all([txDataPromise, rpcDataPromise]);

      // Use aggregated data only if it has actual non-zero values
      const hasRealData = txChartData &&
        txChartData.length > 2 &&
        txChartData.some((p) => p.v > 0);
      setTxData(hasRealData ? txChartData! : rpcData.tx);
      setGasData(rpcData.gas);
    } catch {
      // Keep previous data on error
    }

    setLoading(false);
  }, [latestBlock, range, avgBlockTime]);

  useEffect(() => {
    load();
  }, [load]);

  return { txData, gasData, loading };
}

/**
 * Unified TX chart data loader — picks the best source for the given range.
 */
async function loadTxChartData(
  range: TimeRange,
  windows: number,
  secondsPerWindow: number,
  labelFmt: Intl.DateTimeFormatOptions,
): Promise<ChartPoint[] | null> {
  if (range === "24H") {
    return loadBlockscout24hData(windows, secondsPerWindow, labelFmt);
  }
  // 1W/1M: Stats microservice first, then Blockscout charts fallback
  const statsData = await loadStatsMicroserviceTxData(range);
  if (statsData) return statsData;
  return loadBlockscoutTxData(range);
}

/**
 * Try stats microservice /api/v1/lines/newTxns for tx chart data.
 * The stats service has its own database with pre-aggregated daily data.
 */
async function loadStatsMicroserviceTxData(range: TimeRange): Promise<ChartPoint[] | null> {
  try {
    const res = await fetch(`${STATS_API_URL}/api/v1/lines/newTxns`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();

    // Stats microservice returns: { chart: [{ date: "2024-01-01", value: "123" }, ...] }
    const chart = data?.chart;
    if (!Array.isArray(chart) || chart.length === 0) return null;

    // Add 1 extra day margin so today's partial data is included
    const days = (range === "1W" ? 7 : 30) + 1;
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filtered = chart
      .filter((d: { date: string }) => new Date(d.date) >= cutoff)
      .sort((a: { date: string }, b: { date: string }) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    if (filtered.length < 2) return null;

    return filtered.map((d: { date: string; value: string }) => ({
      t: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      v: parseInt(d.value) || 0,
    }));
  } catch {
    return null;
  }
}

/**
 * Try Blockscout /stats/charts/transactions for tx data.
 * Returns daily aggregated tx counts from the historian's transaction_stats table.
 */
async function loadBlockscoutTxData(range: TimeRange): Promise<ChartPoint[] | null> {
  try {
    const chartData = await blockscout.getTransactionCharts();
    if (!chartData?.chart_data?.length) return null;

    const days = (range === "1W" ? 7 : 30) + 1;
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filtered = chartData.chart_data
      .filter((d) => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filtered.length < 2) return null;

    return filtered.map((d) => ({
      t: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      v: d.transaction_count ?? d.tx_count ?? 0,
    }));
  } catch {
    return null;
  }
}

/**
 * Load 24H chart data from Blockscout paginated /blocks endpoint.
 * Uses actual indexed block data with tx_count — no sampling or extrapolation needed.
 */
async function loadBlockscout24hData(
  windows: number,
  secondsPerWindow: number,
  labelFmt: Intl.DateTimeFormatOptions,
): Promise<ChartPoint[] | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - windows * secondsPerWindow;

    // Fetch blocks from Blockscout (paginated, newest first)
    // Each page returns ~50 blocks with tx_count already calculated
    type BsBlock = { height: number; timestamp: string; tx_count: number; gas_used: string; gas_limit: string };
    const allBlocks: BsBlock[] = [];
    let params: Record<string, string> = {};

    // KiteAI block time ~99s → ~873 blocks/24H → ~18 pages needed
    for (let page = 0; page < 20; page++) {
      const res = await fetch(
        `${blockscoutApiUrl()}/blocks?${new URLSearchParams({ type: "block", ...params })}`,
        { cache: "no-store" },
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: BsBlock[] = data.items || [];
      if (items.length === 0) break;

      let reachedCutoff = false;
      for (const block of items) {
        const ts = Math.floor(new Date(block.timestamp).getTime() / 1000);
        if (ts < cutoff) {
          reachedCutoff = true;
          break;
        }
        allBlocks.push(block);
      }

      if (reachedCutoff) break;

      // Next page
      if (!data.next_page_params) break;
      params = Object.fromEntries(
        Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])
      );
    }

    if (allBlocks.length < 10) return null;

    // Bucket blocks into hourly windows
    const windowStart = cutoff;
    const buckets: { txCount: number; gasUsed: number; gasLimit: number; ts: number }[] = [];
    for (let w = 0; w < windows; w++) {
      buckets.push({ txCount: 0, gasUsed: 0, gasLimit: 0, ts: windowStart + w * secondsPerWindow });
    }

    for (const block of allBlocks) {
      const ts = Math.floor(new Date(block.timestamp).getTime() / 1000);
      const windowIdx = Math.min(windows - 1, Math.floor((ts - windowStart) / secondsPerWindow));
      if (windowIdx >= 0 && windowIdx < windows) {
        buckets[windowIdx].txCount += block.tx_count;
        buckets[windowIdx].gasUsed += parseInt(block.gas_used) || 0;
        buckets[windowIdx].gasLimit += parseInt(block.gas_limit) || 0;
      }
    }

    return buckets.map((b) => ({
      t: new Date(b.ts * 1000).toLocaleDateString("en-US", labelFmt),
      v: b.txCount,
    }));
  } catch {
    return null;
  }
}

function blockscoutApiUrl(): string {
  // Re-use the same env var
  return (
    process.env.NEXT_PUBLIC_BLOCKSCOUT_API_URL || "http://localhost:4000/api/v2"
  ).replace(/\/$/, "");
}

/**
 * RPC sampling: fetch a few blocks per time window, extrapolate tx count & avg gas.
 * Ultimate fallback — always works as long as the RPC is reachable.
 */
async function loadRpcSampledData(
  latestBlock: number,
  windows: number,
  blocksPerWindow: number,
  labelFmt: Intl.DateTimeFormatOptions,
  samplesPerWindow: number = 3,
): Promise<{ tx: ChartPoint[]; gas: ChartPoint[] }> {
  // Build sample list: for each window, pick samplesPerWindow evenly spaced blocks
  const samples: { window: number; blockNum: number }[] = [];

  for (let w = 0; w < windows; w++) {
    const windowStart = latestBlock - (windows - w) * blocksPerWindow;
    if (windowStart < 0) continue;

    const step = Math.max(1, Math.floor(blocksPerWindow / samplesPerWindow));
    for (let s = 0; s < samplesPerWindow; s++) {
      const num = windowStart + s * step;
      if (num >= 0 && num <= latestBlock) {
        samples.push({ window: w, blockNum: num });
      }
    }
  }

  // Fetch all sampled blocks in parallel (batched)
  const BATCH_SIZE = 50;
  const results: (RpcBlock | null)[] = new Array(samples.length).fill(null);

  for (let i = 0; i < samples.length; i += BATCH_SIZE) {
    const batch = samples.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((s) =>
        rpc<RpcBlock>("eth_getBlockByNumber", ["0x" + s.blockNum.toString(16), false]).catch(() => null)
      )
    );
    batchResults.forEach((r, j) => {
      results[i + j] = r;
    });
  }

  // Group by window
  const windowBlocks: Record<number, RpcBlock[]> = {};
  samples.forEach((s, i) => {
    const block = results[i];
    if (block) {
      if (!windowBlocks[s.window]) windowBlocks[s.window] = [];
      windowBlocks[s.window].push(block);
    }
  });

  // Build chart points
  const txPoints: ChartPoint[] = [];
  const gasPoints: ChartPoint[] = [];

  for (let w = 0; w < windows; w++) {
    const blocks = windowBlocks[w];
    if (!blocks || blocks.length === 0) continue;

    // TX count: transactions is hash array when fetched with false
    const sampledTx = blocks.reduce((sum, b) => {
      if (Array.isArray(b.transactions)) return sum + b.transactions.length;
      return sum;
    }, 0);
    const estimatedTx = Math.round((sampledTx / blocks.length) * blocksPerWindow);

    // Gas: average utilization across samples
    const gasUtils = blocks.map((b) => {
      const gu = hex(b.gasUsed);
      const gl = hex(b.gasLimit);
      return gl > 0 ? (gu / gl) * 100 : 0;
    });
    const avgGas = gasUtils.reduce((a, b) => a + b, 0) / gasUtils.length;

    // Label from first block's timestamp
    const ts = hex(blocks[0].timestamp);
    const label = new Date(ts * 1000).toLocaleDateString("en-US", labelFmt);

    txPoints.push({ t: label, v: estimatedTx });
    gasPoints.push({ t: label, v: parseFloat(avgGas.toFixed(1)) });
  }

  return { tx: txPoints, gas: gasPoints };
}
