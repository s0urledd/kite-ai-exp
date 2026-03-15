"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Transaction, PaginatedResponse, ChainStats } from "@/lib/types/api";
import { shortenHash, txStatusLabel, txStatusColor, formatNumber } from "@/lib/utils/format";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-kite-text-muted hover:text-kite-gold transition-colors"
    >
      {copied ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 3) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [nextParams, setNextParams] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const data: PaginatedResponse<Transaction> = await blockscout.getTransactions(params);
      if (params) {
        setTxs((prev) => [...prev, ...data.items]);
      } else {
        setTxs(data.items);
      }
      setNextParams(data.next_page_params);
    } catch (e) {
      console.error("Failed to load transactions", e);
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
      <h1 className="text-2xl font-bold text-kite-text mb-6">Transactions</h1>

      {/* Count bar */}
      <div className="bg-kite-surface rounded-t-[14px] border border-kite-border px-5 py-3">
        <span className="text-sm text-kite-text">
          <span className="font-bold">{stats ? formatNumber(stats.total_transactions) : "..."}</span>
          <span className="text-kite-text-secondary ml-1.5">Transactions Found</span>
        </span>
      </div>

      <div className="bg-kite-surface rounded-b-[14px] border border-t-0 border-kite-border overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_70px_120px_120px_90px_80px_80px] gap-2 px-5 py-3.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
          <span>Tx Hash</span>
          <span>Method</span>
          <span>Block</span>
          <span>From</span>
          <span>To</span>
          <span>Value</span>
          <span>Status</span>
          <span>Age</span>
        </div>

        {txs.map((tx) => {
          const method = tx.method || tx.decoded_input?.method_call?.split("(")[0] || "Transfer";

          return (
            <div
              key={tx.hash}
              className="grid grid-cols-[1fr_80px_70px_120px_120px_90px_80px_80px] gap-2 px-5 py-3 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center"
            >
              <div className="flex items-center gap-1 min-w-0">
                <Link href={`/tx/${tx.hash}`} className="text-[13px] font-mono text-kite-gold hover:underline truncate">
                  {shortenHash(tx.hash, 8)}
                </Link>
                <CopyButton text={tx.hash} />
              </div>

              <span className="text-[10px] font-medium text-kite-text-secondary bg-kite-bg border border-kite-border rounded px-1.5 py-0.5 truncate text-center">
                {method.length > 10 ? method.slice(0, 10) + "…" : method}
              </span>

              {(tx.block ?? tx.block_number) ? (
                <Link href={`/block/${tx.block ?? tx.block_number}`} className="text-[13px] font-mono text-kite-text-secondary hover:text-kite-gold">
                  {tx.block ?? tx.block_number}
                </Link>
              ) : (
                <span className="text-[13px] text-kite-text-muted">—</span>
              )}

              <div className="flex items-center gap-1 min-w-0">
                <Link href={`/address/${tx.from?.hash}`} className="text-[12px] font-mono text-kite-text-secondary hover:text-kite-gold truncate">
                  {shortenHash(tx.from?.hash || "", 5)}
                </Link>
                <CopyButton text={tx.from?.hash || ""} />
              </div>

              <div className="flex items-center gap-1 min-w-0">
                {tx.to ? (
                  <>
                    <Link href={`/address/${tx.to.hash}`} className="text-[12px] font-mono text-kite-text-secondary hover:text-kite-gold truncate">
                      {shortenHash(tx.to.hash, 5)}
                    </Link>
                    <CopyButton text={tx.to.hash} />
                  </>
                ) : (
                  <span className="text-[11px] text-purple-400">Create</span>
                )}
              </div>

              <span className="text-[13px] font-mono text-kite-text">{(parseFloat(tx.value) / 1e18).toFixed(4)}</span>

              <span className={`text-[11px] font-semibold ${txStatusColor(tx.status)}`}>
                {txStatusLabel(tx.status)}
              </span>

              <span className="text-[12px] text-kite-text-muted">{relativeTime(tx.timestamp)}</span>
            </div>
          );
        })}

        {loading && (
          <div className="px-5 py-8 text-center text-kite-text-muted text-sm">Loading transactions...</div>
        )}
      </div>

      {nextParams && !loading && (
        <div className="flex justify-center mt-5">
          <button
            onClick={() => load(nextParams)}
            className="px-8 py-2.5 rounded-[10px] bg-kite-surface border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover hover:border-kite-gold/20 transition-all"
          >
            Load More Transactions
          </button>
        </div>
      )}
    </div>
  );
}
