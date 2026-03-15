"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Token, TokenTransfer, AddressParam } from "@/lib/types/api";
import { shortenHash, formatNumber } from "@/lib/utils/format";

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
      className="ml-1 text-kite-text-muted hover:text-kite-gold transition-colors"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

function tokenTypeColor(type: string) {
  switch (type) {
    case "ERC-20": return "text-blue-400 bg-blue-400/10 border-transparent";
    case "ERC-721": return "text-purple-400 bg-purple-400/10 border-transparent";
    case "ERC-1155": return "text-emerald-400 bg-emerald-400/10 border-transparent";
    default: return "text-kite-gold-dim bg-kite-gold-faint border-transparent";
  }
}

function formatTokenValue(value: string, decimals: string): string {
  const dec = parseInt(decimals) || 18;
  const num = parseFloat(value) / Math.pow(10, dec);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 3) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type Tab = "transfers" | "holders";

export default function TokenDetailPage() {
  const { hash } = useParams<{ hash: string }>();
  const [token, setToken] = useState<Token | null>(null);
  const [counters, setCounters] = useState<{ token_holders_count: string; transfers_count: string } | null>(null);
  const [transfers, setTransfers] = useState<TokenTransfer[]>([]);
  const [holders, setHolders] = useState<{ address: AddressParam; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("transfers");
  const [nextTransferParams, setNextTransferParams] = useState<Record<string, string> | null>(null);
  const [nextHolderParams, setNextHolderParams] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!hash) return;
    (async () => {
      try {
        const [t, c, tr, h] = await Promise.all([
          blockscout.getToken(hash),
          blockscout.getTokenCounters(hash).catch(() => null),
          blockscout.getTokenTransfers(hash).catch(() => ({ items: [], next_page_params: null })),
          blockscout.getTokenHolders(hash).catch(() => ({ items: [], next_page_params: null })),
        ]);
        setToken(t);
        setCounters(c);
        setTransfers(tr.items || []);
        setNextTransferParams(tr.next_page_params);
        setHolders(h.items || []);
        setNextHolderParams(h.next_page_params);
      } catch (e) {
        console.error("Failed to load token", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [hash]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-kite-surface rounded w-64" />
          <div className="h-32 bg-kite-surface rounded-[14px]" />
          <div className="h-64 bg-kite-surface rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (!token) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-red-400">Token not found</div>;

  const dec = parseInt(token.decimals) || 0;
  const supplyNum = dec > 0 ? parseFloat(token.total_supply) / Math.pow(10, dec) : parseFloat(token.total_supply);

  const tabs: { id: Tab; label: string; count?: string }[] = [
    { id: "transfers", label: "Transfers", count: counters?.transfers_count },
    { id: "holders", label: "Holders", count: counters?.token_holders_count },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-kite-gold-faint border border-kite-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          {token.icon_url ? (
            <img src={token.icon_url} alt="" className="w-12 h-12 rounded-full" />
          ) : (
            <span className="text-base font-bold text-kite-gold">{(token.symbol || "?").slice(0, 2)}</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-kite-text">{token.name || "Unknown Token"}</h1>
            <span className="text-sm font-mono text-kite-text-muted">({token.symbol})</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${tokenTypeColor(token.type)}`}>
              {token.type}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="font-mono text-[13px] text-kite-text-secondary">{token.address}</span>
            <CopyButton text={token.address} />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-kite-surface rounded-[12px] border border-kite-border p-4">
          <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1.5">Total Supply</div>
          <div className="text-lg font-bold font-mono text-kite-text">{supplyNum.toLocaleString()}</div>
          <div className="text-[11px] text-kite-text-muted mt-0.5">{token.symbol}</div>
        </div>
        <div className="bg-kite-surface rounded-[12px] border border-kite-border p-4">
          <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1.5">Holders</div>
          <div className="text-lg font-bold font-mono text-kite-text">{formatNumber(counters?.token_holders_count || token.holders)}</div>
        </div>
        <div className="bg-kite-surface rounded-[12px] border border-kite-border p-4">
          <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1.5">Transfers</div>
          <div className="text-lg font-bold font-mono text-kite-text">{formatNumber(counters?.transfers_count || "0")}</div>
        </div>
        <div className="bg-kite-surface rounded-[12px] border border-kite-border p-4">
          <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1.5">Decimals</div>
          <div className="text-lg font-bold font-mono text-kite-text">{token.decimals}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-kite-surface rounded-[10px] border border-kite-border p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-kite-gold-faint text-kite-gold shadow-sm"
                : "text-kite-text-secondary hover:text-kite-text hover:bg-kite-surface-hover"
            }`}
          >
            {tab.label}
            {tab.count && tab.count !== "0" && (
              <span className={`text-[10px] px-1.5 py-px rounded-full ${activeTab === tab.id ? "bg-kite-gold/15 text-kite-gold" : "bg-kite-bg text-kite-text-muted"}`}>
                {formatNumber(tab.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transfers Tab */}
      {activeTab === "transfers" && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          <div className="grid grid-cols-[1fr_130px_130px_100px_90px] gap-3 px-5 py-3 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
            <span>Tx Hash</span>
            <span>From</span>
            <span>To</span>
            <span>Amount</span>
            <span>Age</span>
          </div>

          {transfers.length === 0 && (
            <div className="px-5 py-12 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
                <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <div className="text-kite-text-secondary text-sm mb-1">No transfers yet</div>
              <div className="text-kite-text-muted text-xs">Token transfers will appear here as they occur on the network.</div>
            </div>
          )}

          {transfers.map((tr, idx) => (
            <div key={`${tr.tx_hash}-${tr.log_index}-${idx}`} className="grid grid-cols-[1fr_130px_130px_100px_90px] gap-3 px-5 py-3 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center">
              <Link href={`/tx/${tr.tx_hash}`} className="text-[13px] font-mono text-kite-gold hover:underline truncate">
                {shortenHash(tr.tx_hash, 8)}
              </Link>
              <Link href={`/address/${tr.from.hash}`} className="text-[12px] font-mono text-kite-text-secondary hover:text-kite-gold truncate">
                {shortenHash(tr.from.hash, 5)}
              </Link>
              <Link href={`/address/${tr.to.hash}`} className="text-[12px] font-mono text-kite-text-secondary hover:text-kite-gold truncate">
                {shortenHash(tr.to.hash, 5)}
              </Link>
              <span className="text-[12px] font-mono text-kite-text truncate">
                {formatTokenValue(tr.total.value, tr.total.decimals)}
              </span>
              <span className="text-[11px] text-kite-text-muted">
                {tr.tx_hash ? "—" : "—"}
              </span>
            </div>
          ))}

          {nextTransferParams && (
            <div className="flex justify-center py-4">
              <button
                onClick={async () => {
                  const data = await blockscout.getTokenTransfers(hash, nextTransferParams);
                  setTransfers((prev) => [...prev, ...(data.items || [])]);
                  setNextTransferParams(data.next_page_params);
                }}
                className="px-6 py-2 rounded-[10px] bg-kite-bg border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover transition-all"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Holders Tab */}
      {activeTab === "holders" && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_200px_120px] gap-4 px-5 py-3 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
            <span className="w-8">#</span>
            <span>Address</span>
            <span className="text-right">Balance</span>
            <span className="text-right">Share</span>
          </div>

          {holders.length === 0 && (
            <div className="px-5 py-12 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <div className="text-kite-text-secondary text-sm mb-1">No holders found</div>
              <div className="text-kite-text-muted text-xs">Holder data will appear as the indexer processes token transfers.</div>
            </div>
          )}

          {holders.map((h, idx) => {
            const balance = formatTokenValue(h.value, token.decimals);
            const totalSupply = parseFloat(token.total_supply);
            const share = totalSupply > 0 ? ((parseFloat(h.value) / totalSupply) * 100).toFixed(2) : "0";
            return (
              <Link
                key={h.address.hash}
                href={`/address/${h.address.hash}`}
                className="grid grid-cols-[auto_1fr_200px_120px] gap-4 px-5 py-3 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center group"
              >
                <span className="w-8 text-[12px] font-mono text-kite-text-muted">{idx + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-mono text-kite-text-secondary group-hover:text-kite-gold transition-colors truncate">
                    {h.address.name || shortenHash(h.address.hash, 8)}
                  </span>
                  {h.address.is_contract && (
                    <span className="text-[9px] text-purple-400 bg-purple-400/10 px-1.5 py-px rounded border border-purple-400/20 flex-shrink-0">Contract</span>
                  )}
                </div>
                <span className="text-[13px] font-mono text-kite-text text-right">{balance} {token.symbol}</span>
                <span className="text-[12px] font-mono text-kite-text-muted text-right">{share}%</span>
              </Link>
            );
          })}

          {nextHolderParams && (
            <div className="flex justify-center py-4">
              <button
                onClick={async () => {
                  const data = await blockscout.getTokenHolders(hash, nextHolderParams);
                  setHolders((prev) => [...prev, ...(data.items || [])]);
                  setNextHolderParams(data.next_page_params);
                }}
                className="px-6 py-2 rounded-[10px] bg-kite-bg border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover transition-all"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
