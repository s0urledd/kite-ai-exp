"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Transaction, TransactionLog, InternalTransaction, PaginatedResponse } from "@/lib/types/api";
import { shortenHash, weiToKite, weiToGwei, txStatusLabel, txStatusColor } from "@/lib/utils/format";

export default function TxDetailPage() {
  const { hash } = useParams<{ hash: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [internalTxs, setInternalTxs] = useState<InternalTransaction[]>([]);
  const [tab, setTab] = useState<"overview" | "logs" | "internal">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hash) return;
    (async () => {
      try {
        const [txData, logsData, intData] = await Promise.all([
          blockscout.getTransaction(hash),
          blockscout.getTransactionLogs(hash).catch(() => ({ items: [], next_page_params: null } as PaginatedResponse<TransactionLog>)),
          blockscout.getTransactionInternalTxs(hash).catch(() => ({ items: [], next_page_params: null } as PaginatedResponse<InternalTransaction>)),
        ]);
        setTx(txData);
        setLogs(logsData.items || []);
        setInternalTxs(intData.items || []);
      } catch (e) {
        console.error("Failed to load tx", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [hash]);

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-kite-text-muted">Loading transaction...</div>;
  if (!tx) return <div className="max-w-[1280px] mx-auto px-6 py-10 text-red-400">Transaction not found</div>;

  const rows: [string, React.ReactNode][] = [
    ["Tx Hash", <span key="h" className="font-mono text-xs break-all">{tx.hash}</span>],
    ["Status", <span key="s" className={`font-semibold ${txStatusColor(tx.status)}`}>{txStatusLabel(tx.status)}</span>],
    ["Block", (tx.block ?? tx.block_number) ? <Link key="b" href={`/block/${tx.block ?? tx.block_number}`} className="text-kite-gold hover:underline font-mono">{tx.block ?? tx.block_number}</Link> : <span key="b" className="text-kite-text-muted">Pending</span>],
    ["Timestamp", new Date(tx.timestamp).toLocaleString()],
    ["From", <Link key="f" href={`/address/${tx.from?.hash}`} className="font-mono text-xs text-kite-gold hover:underline break-all">{tx.from?.hash}</Link>],
    ["To", tx.to ? <Link key="t" href={`/address/${tx.to.hash}`} className="font-mono text-xs text-kite-gold hover:underline break-all">{tx.to.hash}{tx.to.is_contract ? " (Contract)" : ""}</Link> : <span key="t" className="text-kite-text-muted">Contract Creation</span>],
    ["Value", `${weiToKite(tx.value)} KITE`],
    ["Tx Fee", `${weiToKite(tx.fee?.value || "0")} KITE`],
    ["Gas Price", `${weiToGwei(tx.gas_price)} Gwei`],
    ["Gas Limit", tx.gas_limit],
    ["Gas Used", tx.gas_used],
    ["Method", tx.method || tx.decoded_input?.method_call || "—"],
    ["Nonce", tx.nonce.toString()],
    ["Position", tx.position.toString()],
    ["Type", tx.type.toString()],
  ];

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "logs" as const, label: `Logs (${logs.length})` },
    { id: "internal" as const, label: `Internal (${internalTxs.length})` },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <h1 className="text-xl font-bold text-kite-text mb-5">Transaction Details</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-kite-gold-faint text-kite-gold"
                : "text-kite-text-secondary hover:text-kite-gold hover:bg-kite-gold-faint"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[180px_1fr] border-b border-transparent px-4 py-2.5">
              <span className="text-xs font-semibold text-kite-text-muted uppercase">{label}</span>
              <span className="text-sm text-kite-text">{value}</span>
            </div>
          ))}
          {tx.raw_input && tx.raw_input !== "0x" && (
            <div className="px-4 py-3 border-b border-transparent">
              <span className="text-xs font-semibold text-kite-text-muted uppercase block mb-2">Input Data</span>
              <pre className="text-xs font-mono text-kite-text-secondary bg-kite-bg rounded-lg p-3 overflow-x-auto max-h-40">{tx.raw_input}</pre>
            </div>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-3">
          {logs.length === 0 && <div className="text-kite-text-muted text-sm">No logs for this transaction</div>}
          {logs.map((log, i) => (
            <div key={i} className="bg-kite-surface rounded-[14px] border border-kite-border p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-kite-text-muted">Log #{log.index}</span>
                <Link href={`/address/${log.address?.hash}`} className="text-xs font-mono text-kite-gold hover:underline">
                  {shortenHash(log.address?.hash || "", 8)}
                </Link>
              </div>
              {log.decoded && (
                <div className="text-xs font-mono text-kite-gold-dim mb-2">{log.decoded.method_call}</div>
              )}
              <div className="space-y-1">
                {log.topics.map((topic, ti) => (
                  <div key={ti} className="text-xs font-mono text-kite-text-secondary break-all">
                    <span className="text-kite-text-muted mr-2">[{ti}]</span>{topic}
                  </div>
                ))}
              </div>
              {log.data && log.data !== "0x" && (
                <pre className="text-xs font-mono text-kite-text-secondary mt-2 bg-kite-bg rounded p-2 overflow-x-auto">{log.data}</pre>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "internal" && (
        <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
          {internalTxs.length === 0 && (
            <div className="px-4 py-6 text-center text-kite-text-muted text-sm">No internal transactions</div>
          )}
          {internalTxs.map((itx, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b border-transparent">
              <span className={`text-xs font-medium ${itx.success ? "text-green-400" : "text-red-400"}`}>
                {itx.type}
              </span>
              <Link href={`/address/${itx.from?.hash}`} className="text-xs font-mono text-kite-text-secondary hover:text-kite-gold truncate">
                {shortenHash(itx.from?.hash || "", 6)}
              </Link>
              <span className="text-kite-text-muted">→</span>
              <Link href={`/address/${itx.to?.hash}`} className="text-xs font-mono text-kite-text-secondary hover:text-kite-gold truncate">
                {shortenHash(itx.to?.hash || "", 6)}
              </Link>
              <span className="text-xs font-mono text-kite-text ml-auto">{weiToKite(itx.value)} KITE</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
