"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Token, PaginatedResponse } from "@/lib/types/api";
import { formatNumber, shortenHash } from "@/lib/utils/format";

const TOKEN_TABS = [
  { id: "all", label: "All Tokens" },
  { id: "ERC-20", label: "ERC-20" },
  { id: "ERC-721", label: "ERC-721" },
  { id: "ERC-1155", label: "ERC-1155" },
];

const SORT_OPTIONS = [
  { value: "holders", label: "Holders" },
  { value: "name", label: "Name" },
  { value: "circulating_market_cap", label: "Market Cap" },
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
      title="Copy address"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

function tokenTypeColor(type: string) {
  switch (type) {
    case "ERC-20": return "text-blue-400 bg-blue-400/10 border-transparent";
    case "ERC-721": return "text-purple-400 bg-purple-400/10 border-transparent";
    case "ERC-1155": return "text-emerald-400 bg-emerald-400/10 border-transparent";
    case "ERC-404": return "text-orange-400 bg-orange-400/10 border-transparent";
    default: return "text-kite-gold-dim bg-kite-gold-faint border-transparent";
  }
}

function formatSupply(supply: string | null | undefined, decimals: string | null | undefined): string {
  if (!supply) return "0";
  const dec = parseInt(decimals || "0") || 0;
  const raw = BigInt(supply);
  if (dec === 0) return formatNumber(raw.toString());
  const divisor = BigInt(10 ** Math.min(dec, 18));
  const whole = raw / divisor;
  return formatNumber(whole.toString(), true);
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("holders");
  const [searchQuery, setSearchQuery] = useState("");
  const [nextParams, setNextParams] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const load = useCallback(async (params?: Record<string, string>, append = false) => {
    setLoading(true);
    try {
      const apiParams: Record<string, string> = { ...params };
      if (activeTab !== "all") apiParams.type = activeTab;
      if (searchQuery) apiParams.q = searchQuery;
      if (sortBy) apiParams.sort = sortBy;

      const data: PaginatedResponse<Token> = await blockscout.getTokens(apiParams);
      if (append) {
        setTokens((prev) => [...prev, ...(data.items || [])]);
      } else {
        setTokens(data.items || []);
      }
      setNextParams(data.next_page_params);
      if (!append && data.items) setTotalCount(data.items.length + (data.next_page_params ? 50 : 0));
    } catch (e) {
      console.error("Failed to load tokens", e);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, sortBy]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-kite-text mb-6">Tokens</h1>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Token Type Tabs */}
        <div className="flex gap-1 bg-kite-surface rounded-[10px] border border-kite-border p-1">
          {TOKEN_TABS.map((tab) => (
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

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-kite-surface border border-kite-border rounded-[10px] flex-1 max-w-[280px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-kite-text placeholder:text-kite-text-muted"
              placeholder="Search token name or symbol..."
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-kite-surface border border-kite-border rounded-[10px] text-sm text-kite-text-secondary outline-none cursor-pointer hover:border-kite-gold/20 transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Count bar */}
      <div className="bg-kite-surface rounded-t-[14px] border border-kite-border px-5 py-3">
        <span className="text-sm text-kite-text">
          <span className="font-bold">{tokens.length > 0 ? tokens.length + (nextParams ? "+" : "") : "0"}</span>
          <span className="text-kite-text-secondary ml-1.5">
            {activeTab === "all" ? "Tokens" : `${activeTab} Tokens`} Found
          </span>
        </span>
      </div>

      {/* Table */}
      <div className="bg-kite-surface rounded-b-[14px] border border-t-0 border-kite-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_80px_100px_140px_130px] gap-4 px-5 py-3.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
          <span>#</span>
          <span>Token</span>
          <span>Type</span>
          <span>Holders</span>
          <span>Total Supply</span>
          <span>Address</span>
        </div>

        {/* Empty state */}
        {tokens.length === 0 && !loading && (
          <div className="px-5 py-12 text-center">
            <div className="text-kite-text-muted text-sm mb-1">No tokens found</div>
            <div className="text-kite-text-muted/60 text-xs">
              {activeTab !== "all" ? `No ${activeTab} tokens indexed yet. Try "All Tokens".` : "The indexer may still be processing token data."}
            </div>
          </div>
        )}

        {/* Rows */}
        {tokens.map((token, idx) => (
          <Link
            key={token.address}
            href={`/token/${token.address}`}
            className="grid grid-cols-[40px_1fr_80px_100px_140px_130px] gap-4 px-5 py-3.5 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center group"
          >
            {/* Index */}
            <span className="text-xs text-kite-text-muted">{idx + 1}</span>

            {/* Token Name + Symbol */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-kite-gold-faint border border-kite-border flex items-center justify-center flex-shrink-0">
                {token.icon_url ? (
                  <img src={token.icon_url} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <span className="text-[11px] font-bold text-kite-gold">{(token.symbol || "?").charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-kite-text group-hover:text-kite-gold transition-colors truncate">
                  {token.name || "Unknown Token"}
                </div>
                <div className="text-[11px] text-kite-text-muted font-mono">{token.symbol || "—"}</div>
              </div>
            </div>

            {/* Type badge */}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border w-fit ${tokenTypeColor(token.type)}`}>
              {token.type}
            </span>

            {/* Holders */}
            <span className="text-[13px] text-kite-text">{formatNumber(token.holders)}</span>

            {/* Total Supply */}
            <span className="text-[13px] font-mono text-kite-text-secondary truncate">
              {formatSupply(token.total_supply, token.decimals)}
            </span>

            {/* Address */}
            <div className="flex items-center">
              <span className="text-[12px] font-mono text-kite-text-muted group-hover:text-kite-gold-dim transition-colors">
                {shortenHash(token.address, 4)}
              </span>
              <CopyButton text={token.address} />
            </div>
          </Link>
        ))}

        {loading && (
          <div className="px-5 py-8 text-center text-kite-text-muted text-sm">Loading tokens...</div>
        )}
      </div>

      {/* Load More */}
      {nextParams && !loading && (
        <div className="flex justify-center mt-5">
          <button
            onClick={() => load(nextParams, true)}
            className="px-8 py-2.5 rounded-[10px] bg-kite-surface border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover hover:border-kite-gold/20 transition-all"
          >
            Load More Tokens
          </button>
        </div>
      )}
    </div>
  );
}
