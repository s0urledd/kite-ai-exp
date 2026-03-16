"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blockscout } from "@/lib/api/blockscout";
import type { Transaction } from "@/lib/types/api";
import { shortenHash, timeAgo, weiToKite } from "@/lib/utils/format";

export function LatestTransactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await blockscout.getLatestTransactions();
        if (mounted) setTxs(list.slice(0, 8));
      } catch {}
    };
    load();
    const iv = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return (
    <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-transparent">
        <span className="text-sm font-semibold text-kite-text">Latest Transactions</span>
        <Link href="/txs" className="text-xs text-kite-gold font-medium hover:text-white transition-colors px-3 py-1.5 rounded-full bg-[#2a2a2e] hover:bg-[#3a3a3e] border-none">
          View all &rarr;
        </Link>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {txs.map((tx, idx) => {
          const isContract = tx.raw_input?.length > 10;
          const fee = weiToKite(tx.fee?.value || "0", 5);

          return (
            <div
              key={tx.hash + idx}
              className="flex items-center gap-3.5 px-5 py-3 hover:bg-kite-surface-hover transition-colors group"
              style={idx < txs.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.04)" } : undefined}
            >
              {/* Tx icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-[10px] bg-kite-gold-faint border border-kite-border flex items-center justify-center">
                {isContract ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kite-gold-dim">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kite-gold">
                    <polyline points="7 17 2 12 7 7"/>
                    <polyline points="17 7 22 12 17 17"/>
                  </svg>
                )}
              </div>

              {/* Hash & addresses */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    href={`/tx/${tx.hash}`}
                    className="text-[13px] font-mono text-kite-gold hover:text-kite-gold-light transition-colors truncate"
                  >
                    {shortenHash(tx.hash, 8)}
                  </Link>
                  {isContract && (
                    <span className="text-[10px] text-kite-gold-dim bg-kite-gold-faint px-1.5 py-px rounded font-medium border border-transparent flex-shrink-0">
                      Contract
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-kite-text-muted">From</span>
                  <Link
                    href={`/address/${tx.from?.hash || ""}`}
                    className="font-mono text-kite-text-secondary hover:text-kite-gold transition-colors"
                  >
                    {shortenHash(tx.from?.hash || "", 4)}
                  </Link>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 text-kite-text-muted">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span className="text-kite-text-muted">To</span>
                  <Link
                    href={`/address/${tx.to?.hash || ""}`}
                    className="font-mono text-kite-text-secondary hover:text-kite-gold transition-colors"
                  >
                    {shortenHash(tx.to?.hash || "", 4)}
                  </Link>
                </div>
              </div>

              {/* Fee & time */}
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-[11px] font-medium font-mono text-kite-text whitespace-nowrap">
                  <span className="text-white text-[11px] font-normal">Fee </span>{fee} <span className="text-kite-text-secondary text-[11px] font-normal">KITE</span>
                </div>
                <div className="text-[11px] text-white mt-0.5">
                  {timeAgo(tx.timestamp)} ago
                </div>
              </div>
            </div>
          );
        })}

        {txs.length === 0 && (
          <div className="px-5 py-10 text-center text-kite-text-muted text-sm">
            Waiting for transactions...
          </div>
        )}
      </div>
    </div>
  );
}
