"use client";

import Link from "next/link";
import { hex, type RpcBlock } from "@/lib/api/rpc";
import { shortenHash, timeAgo } from "@/lib/utils/format";

interface LatestBlocksProps {
  blocks: RpcBlock[];
}

export function LatestBlocks({ blocks }: LatestBlocksProps) {
  return (
    <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-transparent">
        <span className="text-sm font-semibold text-kite-text">Latest Blocks</span>
        <Link href="/blocks" className="text-xs text-kite-gold font-medium hover:text-white transition-colors px-3 py-1.5 rounded-full bg-[#2a2a2e] hover:bg-[#3a3a3e] border-none">
          View all &rarr;
        </Link>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {blocks.map((b, idx) => {
          const n = hex(b.number);
          const tc = Array.isArray(b.transactions) ? b.transactions.length : 0;
          const ts = hex(b.timestamp);
          const gu = hex(b.gasUsed);
          const gl = hex(b.gasLimit);
          const pct = gl > 0 ? ((gu / gl) * 100).toFixed(0) : "0";

          return (
            <div
              key={n}
              className="flex items-center gap-3.5 px-5 py-3 hover:bg-kite-surface-hover transition-colors group"
              style={idx < blocks.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.04)" } : undefined}
            >
              {/* Block icon */}
              <Link href={`/block/${n}`} className="flex-shrink-0 w-9 h-9 rounded-[10px] bg-kite-gold-faint border border-kite-border flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-gold">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </Link>

              {/* Block info */}
              <Link href={`/block/${n}`} className="min-w-0 w-[140px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-mono font-bold text-kite-gold group-hover:text-kite-gold-light transition-colors">
                    #{n.toLocaleString()}
                  </span>
                  {idx === 0 && (
                    <span className="text-[9px] font-semibold text-kite-gold bg-kite-gold-faint px-1.5 py-px rounded">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white">
                  <span>{tc} txns</span>
                  <span className="text-kite-text-muted/50">&middot;</span>
                  <span>{pct}% gas</span>
                </div>
              </Link>

              {/* Proposer - center */}
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[11px] text-kite-text-muted">Proposer:&nbsp;</span>
                <Link href={`/address/${b.miner}`} className="text-[11px] font-mono text-kite-text-muted hover:text-kite-gold transition-colors">
                  {shortenHash(b.miner, 4)}
                </Link>
              </div>

              {/* Time */}
              <div className="text-right flex-shrink-0">
                <div className="text-[11px] text-white">{timeAgo(ts.toString())} ago</div>
              </div>
            </div>
          );
        })}

        {blocks.length === 0 && (
          <div className="px-5 py-10 text-center text-kite-text-muted text-sm">
            Waiting for blocks...
          </div>
        )}
      </div>
    </div>
  );
}
