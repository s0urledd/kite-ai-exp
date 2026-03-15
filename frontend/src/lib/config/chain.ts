import { defineChain } from "viem";

export const kiteMainnet = defineChain({
  id: 2366,
  name: "KiteAI Mainnet",
  nativeCurrency: {
    name: "KITE",
    symbol: "KITE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL ||
          "https://rpc.gokite.ai",
      ],
      webSocket: [
        process.env.NEXT_PUBLIC_WS_URL ||
          "wss://rpc.gokite.ai/ws",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Kite Explorer",
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
  },
});

export const BLOCKSCOUT_API_URL =
  process.env.NEXT_PUBLIC_BLOCKSCOUT_API_URL || "http://localhost:4000/api/v2";

export const BLOCKSCOUT_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_BLOCKSCOUT_GRAPHQL_URL ||
  "http://localhost:4000/api/v1/graphql";

// Stats microservice URL (separate Rust service for chart/counter data)
export const STATS_API_URL =
  process.env.NEXT_PUBLIC_STATS_API_URL || "http://localhost:8153";
