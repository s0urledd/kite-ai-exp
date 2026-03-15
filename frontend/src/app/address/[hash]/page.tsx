"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Address, Transaction, PaginatedResponse, ContractMethod } from "@/lib/types/api";
import { weiToKite, shortenHash, txStatusLabel, txStatusColor, formatNumber } from "@/lib/utils/format";

interface TokenBalance {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: string;
    type: string;
    icon_url: string | null;
  };
  value: string;
}

function CopyButton({ text, size = 13 }: { text: string; size?: number }) {
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
      className="text-kite-text-muted hover:text-kite-gold transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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

function formatTokenBalance(value: string, decimals: string): string {
  const dec = parseInt(decimals) || 18;
  const num = parseFloat(value) / Math.pow(10, dec);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(4).replace(/\.?0+$/, "");
}

type Tab = "transactions" | "internal" | "tokens" | "contract";

export default function AddressPage() {
  const { hash } = useParams<{ hash: string }>();
  const [address, setAddress] = useState<Address | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [counters, setCounters] = useState<Record<string, string>>({});
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [readMethods, setReadMethods] = useState<ContractMethod[]>([]);
  const [writeMethods, setWriteMethods] = useState<ContractMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [nextTxParams, setNextTxParams] = useState<Record<string, string> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contractSubTab, setContractSubTab] = useState<"info" | "read" | "write">("info");

  useEffect(() => {
    if (!hash) return;
    (async () => {
      try {
        const [addr, txData, ctr, tokens] = await Promise.all([
          blockscout.getAddress(hash),
          blockscout.getAddressTransactions(hash),
          blockscout.getAddressCounters(hash).catch(() => ({})),
          blockscout.getAddressTokenBalances(hash).catch(() => []),
        ]);
        setAddress(addr);
        setTxs(txData.items || []);
        setNextTxParams(txData.next_page_params);
        setCounters(ctr);
        setTokenBalances(tokens as TokenBalance[]);

        // Load contract methods if it's a contract
        if (addr.is_contract) {
          const [rm, wm] = await Promise.all([
            blockscout.getSmartContractMethods(hash, "read").catch(() => []),
            blockscout.getSmartContractMethods(hash, "write").catch(() => []),
          ]);
          setReadMethods(rm);
          setWriteMethods(wm);
        }
      } catch (e) {
        console.error("Failed to load address", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [hash]);

  const loadMoreTxs = async () => {
    if (!nextTxParams || !hash) return;
    setLoadingMore(true);
    try {
      const data = await blockscout.getAddressTransactions(hash, nextTxParams);
      setTxs((prev) => [...prev, ...(data.items || [])]);
      setNextTxParams(data.next_page_params);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-kite-surface rounded w-64" />
          <div className="h-40 bg-kite-surface rounded-[14px]" />
          <div className="h-64 bg-kite-surface rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (!address) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-red-400">Address not found</div>;

  const isContract = address.is_contract;
  const kiteBalance = weiToKite(address.coin_balance || "0");

  const tabs: { id: Tab; label: string; count?: string }[] = [
    { id: "transactions", label: "Transactions", count: counters.transactions_count },
    { id: "internal", label: "Internal Txns", count: counters.internal_transactions_count },
    { id: "tokens", label: "Token Transfers", count: counters.token_transfers_count },
    ...(isContract ? [{ id: "contract" as Tab, label: "Contract" }] : []),
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 bg-kite-surface border border-kite-border">
            {isContract ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kite-text-muted">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted">
                <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2"/><path d="M6 14h.01"/><path d="M10 14h.01"/>
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-kite-text">{isContract ? "Contract" : "Address"}</h1>
              {address.name && (
                <span className="text-sm font-medium text-kite-gold bg-kite-gold-faint px-2 py-0.5 rounded-md">{address.name}</span>
              )}
              {address.is_verified && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[13px] text-kite-text-secondary break-all">{address.hash}</span>
              <CopyButton text={address.hash} size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Overview - Etherscan-style two-column cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Overview Card */}
        <div className="bg-kite-surface rounded-[14px] overflow-hidden">
          <div className="px-5 py-2.5 text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider bg-kite-bg">Overview</div>
          <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-[12px] text-kite-text-muted w-28 flex-shrink-0">Balance:</span>
            <span className="text-[14px] font-mono font-semibold text-kite-text">{kiteBalance} KITE</span>
          </div>
          <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-[12px] text-kite-text-muted w-28 flex-shrink-0">Token Holdings:</span>
            <span className="text-[13px] font-mono text-kite-text">{tokenBalances.length} token{tokenBalances.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        {/* More Info Card */}
        <div className="bg-kite-surface rounded-[14px] overflow-hidden">
          <div className="px-5 py-2.5 text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider bg-kite-bg">More Info</div>
          <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-[12px] text-kite-text-muted w-28 flex-shrink-0">Transactions:</span>
            <span className="text-[14px] font-mono font-semibold text-kite-text">{formatNumber(counters.transactions_count || "0")}</span>
          </div>
          <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-[12px] text-kite-text-muted w-28 flex-shrink-0">Transfers:</span>
            <span className="text-[14px] font-mono font-semibold text-kite-text">{formatNumber(counters.token_transfers_count || "0")}</span>
          </div>
          <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-[12px] text-kite-text-muted w-28 flex-shrink-0">Gas Used:</span>
            <span className="text-[14px] font-mono font-semibold text-kite-text">{formatNumber(counters.gas_usage_count || "0", true)}</span>
          </div>
        </div>
      </div>

      {/* Token Holdings - always visible */}
      <div className="bg-kite-surface rounded-[14px] mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-sm font-semibold text-kite-text">Token Holdings</h3>
          <span className="text-[11px] text-kite-text-muted bg-kite-bg px-2 py-0.5 rounded font-mono">{tokenBalances.length} tokens</span>
        </div>

        {tokenBalances.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <div className="text-kite-text-muted text-sm">No token holdings found for this address.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-5 pb-4">
            {tokenBalances.map((tb) => (
              <Link
                key={tb.token.address}
                href={`/address/${tb.token.address}`}
                className="flex items-center gap-2.5 p-2.5 rounded-[10px] bg-kite-bg hover:bg-kite-surface-hover transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-kite-gold-faint flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {tb.token.icon_url ? (
                    <img src={tb.token.icon_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <span className="text-[10px] font-bold text-kite-gold">{(tb.token.symbol || "?").slice(0, 2)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-kite-text group-hover:text-kite-gold transition-colors truncate">
                    {tb.token.name || "Unknown Token"}
                  </div>
                  <div className="text-[11px] text-kite-text-muted truncate">
                    {formatTokenBalance(tb.value, tb.token.decimals)} {tb.token.symbol}
                  </div>
                </div>
                <span className="text-[9px] text-kite-text-muted bg-kite-bg px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  {tb.token.type}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Extra contract info */}
      {isContract && (address.creation_tx_hash || address.creator_address_hash) && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border p-5 mb-5">
          <h3 className="text-xs font-semibold text-kite-text-muted uppercase tracking-wider mb-3">Contract Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {address.creator_address_hash && (
              <div>
                <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1">Creator</div>
                <Link href={`/address/${address.creator_address_hash}`} className="text-[13px] font-mono text-kite-gold hover:underline">
                  {shortenHash(address.creator_address_hash, 8)}
                </Link>
              </div>
            )}
            {address.creation_tx_hash && (
              <div>
                <div className="text-[11px] text-kite-text-muted uppercase tracking-wider mb-1">Creation Tx</div>
                <Link href={`/tx/${address.creation_tx_hash}`} className="text-[13px] font-mono text-kite-gold hover:underline">
                  {shortenHash(address.creation_tx_hash, 8)}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

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
                {formatNumber(tab.count, true)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content: Transactions */}
      {activeTab === "transactions" && (
        <>
          <div className="bg-kite-surface rounded-t-[14px] border border-kite-border px-5 py-3">
            <span className="text-sm text-kite-text">
              <span className="font-bold">{formatNumber(counters.transactions_count || txs.length.toString())}</span>
              <span className="text-kite-text-secondary ml-1.5">Transactions</span>
            </span>
          </div>

          <div className="bg-kite-surface rounded-b-[14px] border border-t-0 border-kite-border overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_60px_140px_100px_80px_90px] gap-3 px-5 py-3.5 border-b border-kite-border text-[11px] font-semibold text-kite-text-muted uppercase tracking-wider">
              <span>Tx Hash</span>
              <span>Method</span>
              <span>Block</span>
              <span>From / To</span>
              <span>Value</span>
              <span>Status</span>
              <span>Age</span>
            </div>

            {txs.length === 0 && (
              <div className="px-5 py-12 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <div className="text-kite-text-secondary text-sm mb-1">No transactions yet</div>
                <div className="text-kite-text-muted text-xs">This address has not sent or received any transactions.</div>
              </div>
            )}

            {txs.map((tx) => {
              const isIncoming = tx.to?.hash?.toLowerCase() === hash.toLowerCase();
              const method = tx.method || tx.decoded_input?.method_call?.split("(")[0] || "Transfer";
              return (
                <div
                  key={tx.hash}
                  className="grid grid-cols-[1fr_80px_60px_140px_100px_80px_90px] gap-3 px-5 py-3 border-b border-transparent hover:bg-kite-surface-hover transition-colors items-center"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link href={`/tx/${tx.hash}`} className="text-[13px] font-mono text-kite-gold hover:underline truncate">
                      {shortenHash(tx.hash, 8)}
                    </Link>
                    <CopyButton text={tx.hash} size={11} />
                  </div>
                  <span className="text-[10px] font-medium text-kite-text-secondary bg-kite-bg border border-kite-border rounded px-1.5 py-0.5 truncate text-center">
                    {method.length > 12 ? method.slice(0, 12) + "\u2026" : method}
                  </span>
                  <Link href={`/block/${tx.block}`} className="text-[13px] font-mono text-kite-text-secondary hover:text-kite-gold">
                    {tx.block}
                  </Link>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold flex-shrink-0 ${
                      isIncoming ? "bg-green-400/10 text-green-400 border border-green-400/20" : "bg-orange-400/10 text-orange-400 border border-orange-400/20"
                    }`}>
                      {isIncoming ? "IN" : "OUT"}
                    </span>
                    <Link
                      href={`/address/${isIncoming ? tx.from?.hash : tx.to?.hash}`}
                      className="text-[12px] font-mono text-kite-text-secondary hover:text-kite-gold truncate"
                    >
                      {shortenHash(isIncoming ? tx.from?.hash || "" : tx.to?.hash || "", 5)}
                    </Link>
                  </div>
                  <span className="text-[13px] font-mono text-kite-text">
                    {(parseFloat(tx.value) / 1e18).toFixed(4)}
                  </span>
                  <span className={`text-[11px] font-semibold ${txStatusColor(tx.status)}`}>
                    {txStatusLabel(tx.status)}
                  </span>
                  <span className="text-[12px] text-kite-text-muted">{relativeTime(tx.timestamp)}</span>
                </div>
              );
            })}
          </div>

          {nextTxParams && (
            <div className="flex justify-center mt-5">
              <button
                onClick={loadMoreTxs}
                disabled={loadingMore}
                className="px-8 py-2.5 rounded-[10px] bg-kite-surface border border-kite-border text-sm font-medium text-kite-gold hover:bg-kite-surface-hover hover:border-kite-gold/20 transition-all disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More Transactions"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Tab Content: Internal Transactions */}
      {activeTab === "internal" && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border p-10 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
          </svg>
          <div className="text-kite-text-secondary text-sm font-medium mb-1.5">No internal transactions</div>
          <div className="text-kite-text-muted text-xs max-w-xs mx-auto">
            Internal transactions (message calls between contracts) for this address have not been detected. They will appear here if this address interacts with other contracts internally.
          </div>
        </div>
      )}

      {/* Tab Content: Token Transfers */}
      {activeTab === "tokens" && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border p-10 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <div className="text-kite-text-secondary text-sm font-medium mb-1.5">No token transfers</div>
          <div className="text-kite-text-muted text-xs max-w-xs mx-auto">
            This address has no ERC-20, ERC-721, or ERC-1155 token transfer activity. Token transfers will show here once this address sends or receives tokens.
          </div>
        </div>
      )}

      {/* Tab Content: Contract Info + ABI */}
      {activeTab === "contract" && (
        <div className="space-y-4">
          {/* Contract sub-tabs */}
          <div className="flex gap-1 bg-kite-surface rounded-[10px] border border-kite-border p-1 w-fit">
            {(["info", "read", "write"] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setContractSubTab(sub)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all capitalize ${
                  contractSubTab === sub
                    ? "bg-kite-gold-faint text-kite-gold shadow-sm"
                    : "text-kite-text-secondary hover:text-kite-text hover:bg-kite-surface-hover"
                }`}
              >
                {sub === "info" ? "Overview" : sub === "read" ? `Read (${readMethods.length})` : `Write (${writeMethods.length})`}
              </button>
            ))}
          </div>

          {/* Contract Overview */}
          {contractSubTab === "info" && (
            <div className="bg-kite-surface rounded-[14px] border border-kite-border p-5">
              <h3 className="text-sm font-semibold text-kite-text mb-4">Contract Information</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-[11px] text-kite-text-muted uppercase">Read Methods</span>
                  <div className="text-kite-text mt-1 font-mono">{readMethods.length > 0 ? readMethods.length : address.has_methods_read ? "Yes" : "No"}</div>
                </div>
                <div>
                  <span className="text-[11px] text-kite-text-muted uppercase">Write Methods</span>
                  <div className="text-kite-text mt-1 font-mono">{writeMethods.length > 0 ? writeMethods.length : address.has_methods_write ? "Yes" : "No"}</div>
                </div>
                <div>
                  <span className="text-[11px] text-kite-text-muted uppercase">Verified</span>
                  <div className={`mt-1 font-semibold ${address.is_verified ? "text-green-400" : "text-kite-text-muted"}`}>{address.is_verified ? "Yes" : "No"}</div>
                </div>
                <div>
                  <span className="text-[11px] text-kite-text-muted uppercase">Proxy</span>
                  <div className="text-kite-text mt-1">{address.has_methods_read_proxy || address.has_methods_write_proxy ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Read Methods */}
          {contractSubTab === "read" && (
            <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
              {readMethods.length === 0 ? (
                <div className="p-10 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div className="text-kite-text-secondary text-sm mb-1">No read methods available</div>
                  <div className="text-kite-text-muted text-xs">Contract ABI must be verified to expose read methods.</div>
                </div>
              ) : (
                <div className="divide-y divide-transparent">
                  {readMethods.map((m, idx) => (
                    <div key={m.method_id || idx} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-mono text-kite-text-muted bg-kite-bg px-2 py-0.5 rounded border border-kite-border">{idx + 1}</span>
                        <span className="text-[13px] font-mono font-semibold text-kite-text">{m.name}</span>
                        {m.stateMutability && (
                          <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-px rounded border border-blue-400/20">{m.stateMutability}</span>
                        )}
                      </div>
                      {m.inputs.length > 0 && (
                        <div className="ml-8 space-y-1.5 mb-2">
                          {m.inputs.map((inp, i) => (
                            <div key={i} className="flex items-center gap-2 text-[12px]">
                              <span className="text-kite-text-muted font-mono">{inp.name}</span>
                              <span className="text-kite-text-muted/50">:</span>
                              <span className="text-kite-gold-dim font-mono">{inp.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.outputs.length > 0 && (
                        <div className="ml-8 flex items-center gap-1.5 text-[11px]">
                          <span className="text-kite-text-muted">&rarr;</span>
                          {m.outputs.map((out, i) => (
                            <span key={i} className="text-green-400/70 font-mono">{out.type}{out.name ? ` ${out.name}` : ""}{i < m.outputs.length - 1 ? "," : ""}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Write Methods */}
          {contractSubTab === "write" && (
            <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
              {writeMethods.length === 0 ? (
                <div className="p-10 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/40 mx-auto mb-3">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div className="text-kite-text-secondary text-sm mb-1">No write methods available</div>
                  <div className="text-kite-text-muted text-xs">Contract ABI must be verified to expose write methods.</div>
                </div>
              ) : (
                <div className="divide-y divide-transparent">
                  {writeMethods.map((m, idx) => (
                    <div key={m.method_id || idx} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-mono text-kite-text-muted bg-kite-bg px-2 py-0.5 rounded border border-kite-border">{idx + 1}</span>
                        <span className="text-[13px] font-mono font-semibold text-kite-text">{m.name}</span>
                        {m.stateMutability && (
                          <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-px rounded border border-orange-400/20">{m.stateMutability}</span>
                        )}
                      </div>
                      {m.inputs.length > 0 && (
                        <div className="ml-8 space-y-1.5">
                          {m.inputs.map((inp, i) => (
                            <div key={i} className="flex items-center gap-2 text-[12px]">
                              <span className="text-kite-text-muted font-mono">{inp.name}</span>
                              <span className="text-kite-text-muted/50">:</span>
                              <span className="text-kite-gold-dim font-mono">{inp.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
