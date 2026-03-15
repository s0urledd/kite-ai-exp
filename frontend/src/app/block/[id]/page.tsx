"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Block, Transaction, PaginatedResponse } from "@/lib/types/api";
import { formatNumber, shortenHash, weiToGwei, gasPercentage } from "@/lib/utils/format";

export default function BlockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [block, setBlock] = useState<Block | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [b, txData] = await Promise.all([
          blockscout.getBlock(id),
          blockscout.getBlockTransactions(id),
        ]);
        setBlock(b);
        setTxs(txData.items || []);
      } catch (e) {
        console.error("Failed to load block", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-kite-text-muted">Loading block...</div>;
  if (!block) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-red-400">Block not found</div>;

  const rows: [string, React.ReactNode][] = [
    ["Block Height", <span key="h" className="font-mono text-kite-gold">{formatNumber(block.height)}</span>],
    ["Timestamp", new Date(block.timestamp).toLocaleString()],
    ["Transactions", `${block.tx_count ?? txs.length} transactions`],
    ["Validator", <Link key="v" href={`/address/${block.miner?.hash}`} className="font-mono text-kite-gold hover:underline">{block.miner?.hash}</Link>],
    ["Size", `${formatNumber(block.size)} bytes`],
    ["Gas Used", formatNumber(block.gas_used)],
    ["Gas Limit", formatNumber(block.gas_limit)],
    ["Gas Used %", gasPercentage(block.gas_used, block.gas_limit)],
    ["Base Fee", block.base_fee_per_gas ? `${weiToGwei(block.base_fee_per_gas)} Gwei` : "—"],
    ["Hash", <span key="bh" className="font-mono text-xs break-all">{block.hash}</span>],
    ["Parent Hash", <Link key="ph" href={`/block/${block.height - 1}`} className="font-mono text-xs text-kite-gold hover:underline break-all">{block.parent_hash}</Link>],
    ["Nonce", <span key="n" className="font-mono text-xs">{block.nonce}</span>],
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-kite-text">Block</h1>
        <span className="text-kite-gold font-mono font-bold">#{formatNumber(block.height)}</span>
      </div>

      {/* Details */}
      <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden mb-5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[200px_1fr] border-b border-transparent px-4 py-2.5">
            <span className="text-xs font-semibold text-kite-text-muted uppercase">{label}</span>
            <span className="text-sm text-kite-text">{value}</span>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <h2 className="text-lg font-semibold text-kite-text mb-3">Transactions ({txs.length})</h2>
      <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-3 px-4 py-3 border-b border-kite-border text-xs font-semibold text-kite-text-muted uppercase">
          <span>Tx Hash</span>
          <span>From</span>
          <span>To</span>
          <span>Value</span>
          <span>Status</span>
        </div>
        {txs.length === 0 && (
          <div className="px-4 py-6 text-center text-kite-text-muted text-sm">No transactions in this block</div>
        )}
        {txs.map((tx) => (
          <Link
            key={tx.hash}
            href={`/tx/${tx.hash}`}
            className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-3 px-4 py-2.5 border-b border-transparent hover:bg-[#15140E] transition-colors items-center"
          >
            <span className="text-xs font-mono text-kite-gold truncate">{tx.hash}</span>
            <span className="text-xs font-mono text-kite-text-secondary truncate">{shortenHash(tx.from?.hash || "", 4)}</span>
            <span className="text-xs font-mono text-kite-text-secondary truncate">{shortenHash(tx.to?.hash || "", 4)}</span>
            <span className="text-xs font-mono text-kite-text">{(parseFloat(tx.value) / 1e18).toFixed(4)} KITE</span>
            <span className={`text-xs font-medium ${tx.status === "ok" ? "text-green-400" : tx.status === "error" ? "text-red-400" : "text-yellow-400"}`}>
              {tx.status === "ok" ? "Success" : tx.status === "error" ? "Failed" : "Pending"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
