"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Address, PaginatedResponse } from "@/lib/types/api";
import { shortenHash } from "@/lib/utils/format";

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

function formatBalance(wei: string | null): string {
  if (!wei || wei === "0") return "0";
  const num = parseFloat(wei) / 1e18;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(8);
}

function formatFullBalance(wei: string | null): string {
  if (!wei || wei === "0") return "0 KITE";
  const num = parseFloat(wei) / 1e18;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} KITE`;
}

export default function TopAccountsPage() {
  const [accounts, setAccounts] = useState<Address[]>([]);
  const [nextParams, setNextParams] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const load = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const data: PaginatedResponse<Address> = await blockscout.getAddresses(params);
      if (params) {
        setAccounts((prev) => {
          const merged = [...prev, ...data.items];
          setTotalLoaded(merged.length);
          return merged;
        });
      } else {
        setAccounts(data.items);
        setTotalLoaded(data.items.length);
      }
      setNextParams(data.next_page_params);
    } catch (e) {
      console.error("Failed to load accounts", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canLoadMore = nextParams && !loading && totalLoaded < 1000;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-kite-text mb-6">Top Accounts</h1>

      {/* Count bar */}
      <div className="bg-kite-surface rounded-t-[14px] border border-kite-border px-5 py-3">
        <span className="text-sm text-kite-text">
          <span className="font-bold">{totalLoaded.toLocaleString()}</span>
          <span className="text-kite-text-secondary ml-1.5">addresses shown (sorted by KITE balance)</span>
        </span>
      </div>

      {/* Table */}
      <div className="bg-kite-surface rounded-b-[14px] border border-t-0 border-kite-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_100px_200px] gap-4 px-5 py-3.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
          <span>Rank</span>
          <span>Address</span>
          <span>Type</span>
          <span className="text-right">KITE Balance</span>
        </div>

        {/* Rows */}
        {accounts.map((a, idx) => (
          <div
            key={a.hash}
            className="grid grid-cols-[60px_1fr_100px_200px] gap-4 px-5 py-3.5 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center"
          >
            {/* Rank */}
            <span className="text-[13px] font-mono font-semibold text-kite-text-muted">
              {idx + 1}
            </span>

            {/* Address */}
            <div className="flex items-center min-w-0">
              {a.name ? (
                <Link href={`/address/${a.hash}`} className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-medium text-kite-gold hover:text-kite-gold-light transition-colors truncate">
                    {a.name}
                  </span>
                  <span className="text-[11px] font-mono text-kite-text-muted hidden sm:inline">
                    ({shortenHash(a.hash, 4)})
                  </span>
                </Link>
              ) : (
                <Link href={`/address/${a.hash}`} className="text-[13px] font-mono text-kite-gold hover:text-kite-gold-light transition-colors truncate">
                  {shortenHash(a.hash, 8)}
                </Link>
              )}
              <CopyButton text={a.hash} />
            </div>

            {/* Type */}
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full w-fit ${
              a.is_contract
                ? "bg-blue-500/10 text-blue-400"
                : "bg-green-500/10 text-green-400"
            }`}>
              {a.is_contract ? "Contract" : "EOA"}
            </span>

            {/* Balance */}
            <span className="text-[13px] font-mono font-semibold text-white text-right" title={formatFullBalance(a.coin_balance)}>
              {formatBalance(a.coin_balance)} KITE
            </span>
          </div>
        ))}

        {loading && (
          <div className="px-5 py-8 text-center text-kite-text-muted text-sm">Loading accounts...</div>
        )}
      </div>

      {/* Load More */}
      {canLoadMore && (
        <div className="flex justify-center mt-5">
          <button
            onClick={() => load(nextParams!)}
            className="px-8 py-2.5 rounded-[10px] bg-kite-surface border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover hover:border-kite-gold/20 transition-all"
          >
            Load More Accounts
          </button>
        </div>
      )}
    </div>
  );
}
