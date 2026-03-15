"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { blockscout } from "@/lib/api/blockscout";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    try {
      // Check for direct redirect (exact match)
      const redirect = await blockscout.searchRedirect(q);
      if (redirect.redirect) {
        const type = redirect.type;
        const param = redirect.parameter;
        if (type === "block") { router.push(`/block/${param}`); return; }
        if (type === "transaction") { router.push(`/tx/${param}`); return; }
        if (type === "address") { router.push(`/address/${param}`); return; }
      }

      // Pure numeric → block number
      if (/^\d+$/.test(q)) {
        router.push(`/block/${q}`);
        return;
      }

      // 0x + 66 chars → tx hash
      if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
        router.push(`/tx/${q}`);
        return;
      }

      // 0x + 40 chars → address
      if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
        router.push(`/address/${q}`);
        return;
      }

      // Fallback: try search results
      const results = await blockscout.search(q);
      if (results.items?.length > 0) {
        const first = results.items[0];
        if (first.tx_hash) { router.push(`/tx/${first.tx_hash}`); return; }
        if (first.address) { router.push(`/address/${first.address}`); return; }
        if (first.block_number !== null) { router.push(`/block/${first.block_number}`); return; }
      }
    } catch {
      // Fallback for pattern-based routing when API is down
      if (/^\d+$/.test(q)) { router.push(`/block/${q}`); return; }
      if (/^0x[a-fA-F0-9]{64}$/.test(q)) { router.push(`/tx/${q}`); return; }
      if (/^0x[a-fA-F0-9]{40}$/.test(q)) { router.push(`/address/${q}`); return; }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative py-7 px-6 bg-kite-bg overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[400px] h-[120px] bg-[radial-gradient(ellipse,rgba(196,169,106,0.06)_0%,transparent_70%)] pointer-events-none" />

      <form onSubmit={handleSearch} className="flex items-center gap-2.5 max-w-[680px] mx-auto px-4 py-2.5 bg-kite-surface border border-kite-border rounded-[14px]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-kite-text-muted flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-kite-text text-sm placeholder:text-kite-text-muted"
          placeholder="Search by address, tx hash, block number, token..."
          disabled={searching}
        />
        <kbd className="text-kite-text-muted text-xs font-mono border border-kite-border rounded px-1.5 py-px leading-[18px]">
          /
        </kbd>
      </form>
    </div>
  );
}
