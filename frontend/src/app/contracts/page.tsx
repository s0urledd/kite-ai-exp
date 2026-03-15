"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { SmartContract, PaginatedResponse } from "@/lib/types/api";
import { shortenHash, formatNumber } from "@/lib/utils/format";
import { useChainData } from "@/lib/hooks/use-chain-data";

const CONTRACT_TABS = [
  { id: "all", label: "All Contracts" },
  { id: "verified", label: "Verified" },
  { id: "unverified", label: "Not Verified" },
];

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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

function relativeTime(ts: string | null): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [nextParams, setNextParams] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const chainData = useChainData();

  const load = useCallback(async (params?: Record<string, string>, append = false) => {
    setLoading(true);
    try {
      const apiParams: Record<string, string> = { ...params };
      if (activeTab === "verified") apiParams.filter = "verified";
      if (activeTab === "unverified") apiParams.filter = "not_verified";
      if (searchQuery) apiParams.q = searchQuery;

      const data: PaginatedResponse<SmartContract> = await blockscout.getSmartContracts(apiParams);
      if (append) {
        setContracts((prev) => [...prev, ...(data.items || [])]);
      } else {
        setContracts(data.items || []);
      }
      setNextParams(data.next_page_params);
    } catch (e) {
      console.error("Failed to load contracts", e);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => { load(); }, [load]);

  // Show RPC-detected contracts when blockscout returns empty
  const showRpcFallback = contracts.length === 0 && !loading && chainData.contracts.length > 0 && activeTab === "all" && !searchQuery;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-[12px] bg-kite-surface border border-kite-border flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kite-text-muted">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-kite-text">Smart Contracts</h1>
          <p className="text-xs text-kite-text-muted mt-0.5">Deployed contracts on Kite AI Network</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex gap-1 bg-kite-surface rounded-[10px] border border-kite-border p-1">
          {CONTRACT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-kite-gold-faint text-kite-gold shadow-sm"
                  : "text-kite-text-secondary hover:text-kite-text hover:bg-kite-surface-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-kite-surface border border-kite-border rounded-[10px] flex-1 max-w-[320px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-kite-text placeholder:text-kite-text-muted"
            placeholder="Search by contract name or address..."
          />
        </div>
      </div>

      {/* Indexed Contracts Table */}
      {contracts.length > 0 && (
        <>
          <div className="bg-kite-surface rounded-t-[14px] border border-kite-border px-5 py-3">
            <span className="text-sm text-kite-text">
              <span className="font-bold">{contracts.length > 0 ? contracts.length + (nextParams ? "+" : "") : "0"}</span>
              <span className="text-kite-text-secondary ml-1.5">
                {activeTab === "verified" ? "Verified Contracts" : activeTab === "unverified" ? "Unverified Contracts" : "Contracts"} Found
              </span>
            </span>
          </div>

          <div className="bg-kite-surface rounded-b-[14px] border border-t-0 border-kite-border overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_100px_100px_100px] gap-4 px-5 py-3.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
              <span>Contract</span>
              <span>Language</span>
              <span>Compiler</span>
              <span>Balance</span>
              <span>Txns</span>
              <span>Verified</span>
            </div>

            {contracts.map((c) => {
              const addr = c.address?.hash || "";
              const isVerified = !!c.verified_at;
              return (
                <Link
                  key={addr}
                  href={`/address/${addr}`}
                  className="grid grid-cols-[1fr_120px_120px_100px_100px_100px] gap-4 px-5 py-3.5 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-kite-gold-faint border border-kite-border flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kite-gold">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      {c.address?.name && (
                        <div className="text-[13px] font-medium text-kite-text group-hover:text-kite-gold transition-colors truncate">
                          {c.address.name}
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="text-[12px] font-mono text-kite-text-secondary group-hover:text-kite-gold-dim transition-colors">
                          {shortenHash(addr, 6)}
                        </span>
                        <CopyButton text={addr} />
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] text-kite-text-secondary capitalize">{c.language || "—"}</span>
                  <span className="text-[11px] font-mono text-kite-text-muted truncate">{c.compiler_version ? c.compiler_version.split("+")[0] : "—"}</span>
                  <span className="text-[12px] font-mono text-kite-text-secondary">{c.coin_balance ? formatNumber((parseFloat(c.coin_balance) / 1e18).toFixed(2)) : "0"}</span>
                  <span className="text-[12px] text-kite-text-secondary">{c.tx_count !== null ? formatNumber(c.tx_count) : "—"}</span>
                  <div className="flex items-center gap-1.5">
                    {isVerified ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <span className="text-[11px] text-green-400">{relativeTime(c.verified_at)}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-kite-text-muted">—</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {nextParams && !loading && (
            <div className="flex justify-center mt-5">
              <button
                onClick={() => load(nextParams, true)}
                className="px-8 py-2.5 rounded-[10px] bg-kite-surface border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover hover:border-kite-gold/20 transition-all"
              >
                Load More Contracts
              </button>
            </div>
          )}
        </>
      )}

      {/* RPC Detected Contracts Fallback */}
      {showRpcFallback && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          <div className="px-5 py-3 border-b border-kite-border">
            <span className="text-sm text-kite-text">
              <span className="font-bold">{chainData.contracts.length}</span>
              <span className="text-kite-text-secondary ml-1.5">Active Contracts Detected</span>
            </span>
            <span className="text-[11px] text-kite-text-muted ml-3">(from recent block activity)</span>
          </div>

          <div className="grid grid-cols-[auto_1fr_120px_120px] gap-4 px-5 py-3 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
            <span>#</span>
            <span>Contract Address</span>
            <span className="text-right">Unique Callers</span>
            <span className="text-right">Interactions</span>
          </div>

          {chainData.contracts.map((c, i) => (
            <Link
              key={c.address}
              href={`/address/${c.address}`}
              className="grid grid-cols-[auto_1fr_120px_120px] gap-4 px-5 py-3.5 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center group"
            >
              <span className="text-[13px] font-mono text-kite-text-muted w-6">{i + 1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-kite-surface border border-kite-border flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kite-text-muted">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="flex items-center">
                  <span className="text-[13px] font-mono text-kite-text-secondary group-hover:text-kite-gold transition-colors">
                    {shortenHash(c.address, 10)}
                  </span>
                  <CopyButton text={c.address} />
                </div>
              </div>
              <span className="text-[13px] font-mono text-kite-text-secondary text-right">{formatNumber(c.callers)}</span>
              <span className="text-[13px] font-mono text-kite-gold font-semibold text-right">{formatNumber(c.calls)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && !showRpcFallback && !loading && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-kite-gold-faint border border-kite-border flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-kite-gold-dim">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="text-kite-text-secondary text-sm font-medium mb-1.5">
            {searchQuery ? "No contracts match your search" : activeTab === "verified" ? "No verified contracts yet" : "No contracts found"}
          </div>
          <div className="text-kite-text-muted text-xs max-w-sm mx-auto">
            {searchQuery
              ? "Try searching with a different contract name or address."
              : "Contracts will appear here as they are deployed and indexed by the explorer. This may take a few moments after deployment."}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          <div className="animate-pulse space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-transparent">
                <div className="w-7 h-7 rounded-lg bg-kite-bg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-kite-bg rounded w-48" />
                  <div className="h-2.5 bg-kite-bg rounded w-32" />
                </div>
                <div className="h-3 bg-kite-bg rounded w-16" />
                <div className="h-3 bg-kite-bg rounded w-12" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
