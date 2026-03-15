"use client";

import { useState, useEffect } from "react";

const DEXSCREENER_URL =
  "https://api.dexscreener.com/latest/dex/pairs/ethereum/0x3cff303d771452876849de7f0e6a21060886a74ae29fb27d5f3388197c249b19";

export interface KitePrice {
  priceUsd: string;
  priceChange24h: number;
  marketCap: number;
  fdv: number;
  volume24h: number;
  liquidity: number;
}

const INITIAL: KitePrice = {
  priceUsd: "0",
  priceChange24h: 0,
  marketCap: 0,
  fdv: 0,
  volume24h: 0,
  liquidity: 0,
};

export function useKitePrice(pollInterval = 60000) {
  const [price, setPrice] = useState<KitePrice>(INITIAL);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(DEXSCREENER_URL);
        const data = await res.json();
        const pair = data.pair || data.pairs?.[0];
        if (!pair) return;

        setPrice({
          priceUsd: pair.priceUsd || "0",
          priceChange24h: pair.priceChange?.h24 ?? 0,
          marketCap: pair.marketCap ?? 0,
          fdv: pair.fdv ?? 0,
          volume24h: pair.volume?.h24 ?? 0,
          liquidity: pair.liquidity?.usd ?? 0,
        });
      } catch (e) {
        console.error("Failed to fetch KITE price", e);
      }
    };

    load();
    const iv = setInterval(load, pollInterval);
    return () => clearInterval(iv);
  }, [pollInterval]);

  return price;
}
