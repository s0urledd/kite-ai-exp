"use client";

import Link from "next/link";
import { shortenHash, formatNumber } from "@/lib/utils/format";

interface Contract {
  address: string;
  calls: number;
  callers: number;
}

interface ActiveContractsProps {
  contracts: Contract[];
}

export function ActiveContracts({ contracts }: ActiveContractsProps) {
  return (
    <div className="bg-kite-surface rounded-[14px] border border-kite-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-transparent">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="text-sm font-semibold text-kite-text">Active Contracts</span>
        </div>
        <Link href="/contracts" className="text-xs text-kite-gold font-medium hover:text-white transition-colors px-3 py-1.5 rounded-full bg-[#2a2a2e] hover:bg-[#3a3a3e] border-none">
          View all &rarr;
        </Link>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_140px_140px] gap-4 px-5 py-2.5 border-b border-transparent text-[11px] text-white font-semibold uppercase tracking-wider">
        <span className="w-6">#</span>
        <span>Contract Address</span>
        <span className="text-right">Unique Callers</span>
        <span className="text-right">Interactions</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-transparent">
        {contracts.map((c, i) => (
          <Link
            key={c.address}
            href={`/address/${c.address}`}
            className="grid grid-cols-[auto_1fr_140px_140px] gap-4 items-center px-5 py-3 hover:bg-kite-surface-hover transition-colors group"
          >
            <span className="w-6 font-mono text-[13px] text-kite-text-muted font-semibold">
              {i + 1}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-kite-surface border border-kite-border flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-kite-text-muted">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span className="font-mono text-[13px] text-kite-text-secondary group-hover:text-kite-gold transition-colors truncate">
                {shortenHash(c.address, 10)}
              </span>
            </div>
            <span className="text-right font-mono text-[13px] text-kite-text-secondary">
              {formatNumber(c.callers)}
            </span>
            <span className="text-right font-mono text-[13px] text-kite-gold font-semibold">
              {formatNumber(c.calls)}
            </span>
          </Link>
        ))}
      </div>

      {contracts.length === 0 && (
        <div className="py-8 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-kite-text-muted/30 mx-auto mb-2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div className="text-kite-text-muted text-[13px]">Detecting active contracts...</div>
        </div>
      )}
    </div>
  );
}
