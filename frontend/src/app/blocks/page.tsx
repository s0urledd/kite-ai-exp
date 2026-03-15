"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Block, PaginatedResponse, ChainStats } from "@/lib/types/api";
import { formatNumber, shortenHash } from "@/lib/utils/format";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1.5 text-kite-text-muted hover:text-kite-gold transition-colors"
      title="Copy"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 3) return "just now";
  if (diff < 60) return `${diff} secs ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [nextParams, setNextParams] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const data: PaginatedResponse<Block> = await blockscout.getBlocks(params);
      if (params) {
        setBlocks((prev) => [...prev, ...data.items]);
      } else {
        setBlocks(data.items);
      }
      setNextParams(data.next_page_params);
    } catch (e) {
      console.error("Failed to load blocks", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    blockscout.getStats().then(setStats).catch(() => {});
  }, [load]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-kite-text mb-6">Blocks</h1>

      {/* Total count bar */}
      <div className="bg-kite-surface rounded-t-[14px] border border-kite-border px-5 py-3">
        <span className="text-sm text-kite-text">
          <span className="font-bold">{stats ? formatNumber(stats.total_blocks) : "..."}</span>
          <span className="text-kite-text-secondary ml-1.5">Blocks Found</span>
        </span>
      </div>

      {/* Table */}
      <div className="bg-kite-surface rounded-b-[14px] border border-t-0 border-kite-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[120px_1fr_80px_200px_160px_130px] gap-4 px-5 py-3.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
          <span>Height</span>
          <span>Hash</span>
          <span>Txns</span>
          <span>Gas Used</span>
          <span>Gas Limit</span>
          <span>Age</span>
        </div>

        {/* Rows */}
        {blocks.map((b) => {
          const gasUsed = parseFloat(b.gas_used) || 0;
          const gasLimit = parseFloat(b.gas_limit) || 1;
          const gasPct = ((gasUsed / gasLimit) * 100).toFixed(2);

          return (
            <div
              key={b.height}
              className="grid grid-cols-[120px_1fr_80px_200px_160px_130px] gap-4 px-5 py-4 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center"
            >
              {/* Height - badge style */}
              <Link href={`/block/${b.height}`} className="inline-flex">
                <span className="text-[13px] font-mono font-semibold text-kite-gold bg-kite-gold-faint border border-transparent rounded-md px-2.5 py-1 hover:bg-kite-gold/10 transition-colors">
                  {formatNumber(b.height)}
                </span>
              </Link>

              {/* Hash with copy */}
              <div className="flex items-center min-w-0">
                <Link href={`/block/${b.height}`} className="text-[13px] font-mono text-kite-text-secondary hover:text-kite-gold transition-colors truncate">
                  {shortenHash(b.hash, 6)}
                </Link>
                <CopyButton text={b.hash} />
              </div>

              {/* Txns */}
              <span className="text-[13px] font-semibold text-kite-text">{b.tx_count}</span>

              {/* Gas Used with percentage */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-mono text-kite-text">{formatNumber(b.gas_used)}</span>
                <span className="text-[12px] text-kite-text-muted">({gasPct}%)</span>
              </div>

              {/* Gas Limit */}
              <span className="text-[13px] font-mono text-kite-text">{formatNumber(b.gas_limit)}</span>

              {/* Age */}
              <span className="text-[13px] text-kite-text-secondary">{relativeTime(b.timestamp)}</span>
            </div>
          );
        })}

        {loading && (
          <div className="px-5 py-8 text-center text-kite-text-muted text-sm">Loading blocks...</div>
        )}
      </div>

      {/* Load More */}
      {nextParams && !loading && (
        <div className="flex justify-center mt-5">
          <button
            onClick={() => load(nextParams)}
            className="px-8 py-2.5 rounded-[10px] bg-kite-surface border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover hover:border-kite-gold/20 transition-all"
          >
            Load More Blocks
          </button>
        </div>
      )}
    </div>
  );
}
