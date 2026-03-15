/** Direct JSON-RPC client for the local KiteAI archive node */

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:9650/ext/bc/3USaEfTcoUhHxpKXvpAG916UKCUEyjrtkg2hBArBG3JyDP7my/rpc";

export async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T | null> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = await res.json();
    return json.result as T;
  } catch {
    return null;
  }
}

export const hex = (h: string | undefined | null): number => (h ? parseInt(h, 16) : 0);

export const gwei = (h: string | undefined | null): number => hex(h) / 1e9;

/** Raw RPC block shape */
export interface RpcBlock {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  miner: string;
  gasUsed: string;
  gasLimit: string;
  size: string;
  difficulty: string;
  totalDifficulty: string;
  nonce: string;
  baseFeePerGas?: string;
  transactions: RpcTransaction[] | string[];
}

export interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
  blockNumber: string;
  blockHash: string;
  transactionIndex: string;
  type: string;
}
