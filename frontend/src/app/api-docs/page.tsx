"use client";

import { useState } from "react";

const BLOCKSCOUT_URL = process.env.NEXT_PUBLIC_BLOCKSCOUT_API_URL || "http://localhost:4000/api/v2";

const endpoints = [
  {
    category: "Stats",
    items: [
      { method: "GET", path: "/stats", description: "Chain statistics (blocks, txs, addresses, gas prices)" },
      { method: "GET", path: "/stats/charts/transactions", description: "Daily transaction chart data" },
      { method: "GET", path: "/main-page/indexing-status", description: "Indexing progress status" },
    ],
  },
  {
    category: "Blocks",
    items: [
      { method: "GET", path: "/blocks", description: "List blocks (paginated)" },
      { method: "GET", path: "/blocks/{number_or_hash}", description: "Block details by number or hash" },
      { method: "GET", path: "/blocks/{number_or_hash}/transactions", description: "Transactions in a block" },
    ],
  },
  {
    category: "Transactions",
    items: [
      { method: "GET", path: "/transactions", description: "List transactions (paginated)" },
      { method: "GET", path: "/transactions/{hash}", description: "Transaction details" },
      { method: "GET", path: "/transactions/{hash}/logs", description: "Transaction event logs" },
      { method: "GET", path: "/transactions/{hash}/internal-transactions", description: "Internal transactions" },
      { method: "GET", path: "/transactions/{hash}/raw-trace", description: "Raw execution trace" },
    ],
  },
  {
    category: "Addresses",
    items: [
      { method: "GET", path: "/addresses/{hash}", description: "Address info (balance, contract, verified)" },
      { method: "GET", path: "/addresses/{hash}/transactions", description: "Address transaction history" },
      { method: "GET", path: "/addresses/{hash}/token-balances", description: "Token balances for address" },
      { method: "GET", path: "/addresses/{hash}/counters", description: "Address counters (tx count, gas used)" },
    ],
  },
  {
    category: "Tokens",
    items: [
      { method: "GET", path: "/tokens", description: "List all tokens (ERC-20, ERC-721, etc.)" },
      { method: "GET", path: "/tokens/{hash}", description: "Token details" },
    ],
  },
  {
    category: "Search",
    items: [
      { method: "GET", path: "/search?q={query}", description: "Search addresses, txs, blocks, tokens" },
      { method: "GET", path: "/search/check-redirect?q={query}", description: "Check if query resolves to exact match" },
    ],
  },
];

export default function ApiDocsPage() {
  const [expanded, setExpanded] = useState<string | null>("Stats");

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-kite-text mb-2">API Documentation</h1>
        <p className="text-sm text-kite-text-secondary">
          Kite Explorer uses the Blockscout v2 REST API. All endpoints are available at:
        </p>
        <code className="mt-2 block text-sm font-mono text-kite-gold bg-kite-surface border border-kite-border rounded-lg px-4 py-2.5">
          {BLOCKSCOUT_URL}
        </code>
      </div>

      <div className="space-y-3">
        {endpoints.map((group) => (
          <div key={group.category} className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === group.category ? null : group.category)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#15140E] transition-colors"
            >
              <span className="text-sm font-semibold text-kite-text">{group.category}</span>
              <span className="text-xs text-kite-text-muted">{group.items.length} endpoints</span>
            </button>

            {expanded === group.category && (
              <div className="border-t border-transparent">
                {group.items.map((ep) => (
                  <div key={ep.path} className="px-4 py-3 border-b border-transparent last:border-b-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                        {ep.method}
                      </span>
                      <code className="text-xs font-mono text-kite-gold">{ep.path}</code>
                    </div>
                    <p className="text-xs text-kite-text-secondary pl-[52px]">{ep.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* JSON-RPC */}
      <div className="mt-6 bg-kite-surface rounded-[14px] border border-kite-border p-4">
        <h2 className="text-sm font-semibold text-kite-text mb-3">JSON-RPC Endpoint</h2>
        <p className="text-xs text-kite-text-secondary mb-2">
          Standard Ethereum JSON-RPC is also available for direct node queries:
        </p>
        <code className="text-sm font-mono text-kite-gold bg-kite-bg rounded-lg px-4 py-2.5 block">
          {process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:9650/ext/bc/.../rpc"}
        </code>
        <p className="text-xs text-kite-text-muted mt-2">
          Supports: eth_blockNumber, eth_getBlockByNumber, eth_getTransactionByHash, eth_call, eth_gasPrice, etc.
        </p>
      </div>
    </div>
  );
}
