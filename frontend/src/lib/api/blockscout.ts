import { BLOCKSCOUT_API_URL } from "@/lib/config/chain";
import type {
  ChainStats,
  Block,
  Transaction,
  Address,
  AddressParam,
  Token,
  TokenTransfer,
  SearchResult,
  PaginatedResponse,
  TransactionChartData,
  IndexingStatus,
  InternalTransaction,
  TransactionLog,
  SmartContract,
  ContractMethod,
} from "@/lib/types/api";

// ============================================
// Blockscout v2 API Client
// ============================================

class BlockscoutClient {
  private baseUrl: string;

  constructor(baseUrl: string = BLOCKSCOUT_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Blockscout API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  // --- Stats ---
  async getStats(): Promise<ChainStats> {
    return this.fetch("/stats");
  }

  async getTransactionCharts(): Promise<TransactionChartData> {
    return this.fetch("/stats/charts/transactions");
  }

  async getIndexingStatus(): Promise<IndexingStatus> {
    return this.fetch("/main-page/indexing-status");
  }

  // --- Blocks ---
  async getLatestBlocks(): Promise<Block[]> {
    const data = await this.fetch<PaginatedResponse<Block>>("/main-page/blocks");
    return data.items || (data as unknown as Block[]);
  }

  async getBlocks(params?: Record<string, string>): Promise<PaginatedResponse<Block>> {
    return this.fetch("/blocks", params);
  }

  async getBlock(numberOrHash: string | number): Promise<Block> {
    return this.fetch(`/blocks/${numberOrHash}`);
  }

  async getBlockTransactions(
    numberOrHash: string | number,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<Transaction>> {
    return this.fetch(`/blocks/${numberOrHash}/transactions`, params);
  }

  // --- Transactions ---
  async getLatestTransactions(): Promise<Transaction[]> {
    const data = await this.fetch<PaginatedResponse<Transaction>>("/main-page/transactions");
    return data.items || (data as unknown as Transaction[]);
  }

  async getTransactions(params?: Record<string, string>): Promise<PaginatedResponse<Transaction>> {
    return this.fetch("/transactions", params);
  }

  async getTransaction(hash: string): Promise<Transaction> {
    return this.fetch(`/transactions/${hash}`);
  }

  async getTransactionLogs(
    hash: string,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<TransactionLog>> {
    return this.fetch(`/transactions/${hash}/logs`, params);
  }

  async getTransactionInternalTxs(
    hash: string,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<InternalTransaction>> {
    return this.fetch(`/transactions/${hash}/internal-transactions`, params);
  }

  async getTransactionRawTrace(hash: string): Promise<unknown> {
    return this.fetch(`/transactions/${hash}/raw-trace`);
  }

  async getTransactionStateChanges(hash: string): Promise<unknown> {
    return this.fetch(`/transactions/${hash}/state-changes`);
  }

  // --- Addresses ---
  async getAddress(hash: string): Promise<Address> {
    return this.fetch(`/addresses/${hash}`);
  }

  async getAddressTransactions(
    hash: string,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<Transaction>> {
    return this.fetch(`/addresses/${hash}/transactions`, params);
  }

  async getAddressTokenBalances(hash: string): Promise<unknown[]> {
    return this.fetch(`/addresses/${hash}/token-balances`);
  }

  async getAddressCounters(hash: string): Promise<Record<string, string>> {
    return this.fetch(`/addresses/${hash}/counters`);
  }

  // --- Tokens ---
  async getTokens(params?: Record<string, string>): Promise<PaginatedResponse<Token>> {
    return this.fetch("/tokens", params);
  }

  async getToken(hash: string): Promise<Token> {
    return this.fetch(`/tokens/${hash}`);
  }

  async getTokenTransfers(hash: string, params?: Record<string, string>): Promise<PaginatedResponse<TokenTransfer>> {
    return this.fetch(`/tokens/${hash}/transfers`, params);
  }

  async getTokenHolders(hash: string, params?: Record<string, string>): Promise<PaginatedResponse<{ address: AddressParam; value: string }>> {
    return this.fetch(`/tokens/${hash}/holders`, params);
  }

  async getTokenCounters(hash: string): Promise<{ token_holders_count: string; transfers_count: string }> {
    return this.fetch(`/tokens/${hash}/counters`);
  }

  // --- Smart Contracts ---
  async getSmartContracts(params?: Record<string, string>): Promise<PaginatedResponse<SmartContract>> {
    return this.fetch("/smart-contracts", params);
  }

  async getSmartContract(hash: string): Promise<SmartContract> {
    return this.fetch(`/smart-contracts/${hash}`);
  }

  async getSmartContractMethods(hash: string, kind: "read" | "write"): Promise<ContractMethod[]> {
    return this.fetch(`/smart-contracts/${hash}/methods-${kind}`);
  }

  // --- Charts ---
  async getMarketChart(): Promise<{ chart_data: Array<{ date: string; closing_price: string; market_cap: string }> }> {
    return this.fetch("/stats/charts/market");
  }

  // --- Search ---
  async search(query: string): Promise<PaginatedResponse<SearchResult>> {
    return this.fetch("/search", { q: query });
  }

  async searchRedirect(query: string): Promise<{ parameter: string; redirect: boolean; type: string }> {
    return this.fetch("/search/check-redirect", { q: query });
  }

  // --- Counters ---
  /**
   * Count ALL contract addresses (verified + unverified) by paginating
   * through /addresses and checking is_contract.
   * Falls back to /smart-contracts (verified only) if needed.
   */
  async countAllContracts(): Promise<number> {
    try {
      // Paginate ALL addresses and count is_contract=true
      // 50 addresses per page, need enough pages to cover total_addresses
      let total = 0;
      let params: Record<string, string> = {};
      for (let page = 0; page < 30; page++) {
        const data = await this.fetch<PaginatedResponse<Address>>("/addresses", params);
        const items = data.items || [];
        if (items.length === 0) break;
        total += items.filter((a) => a.is_contract).length;
        if (!data.next_page_params) break;
        params = Object.fromEntries(
          Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])
        );
      }
      return total;
    } catch {
      return 0;
    }
  }

  /** Count verified smart contracts only */
  async countVerifiedContracts(): Promise<number> {
    try {
      let total = 0;
      let params: Record<string, string> = { limit: "150" };
      for (let page = 0; page < 20; page++) {
        const data = await this.fetch<PaginatedResponse<SmartContract>>("/smart-contracts", params);
        total += data.items?.length ?? 0;
        if (!data.next_page_params) break;
        params = { ...data.next_page_params, limit: "150" };
      }
      return total;
    } catch {
      return 0;
    }
  }

  // --- Health ---
  async health(): Promise<{ healthy: boolean }> {
    return this.fetch("/health");
  }
}

// Singleton
export const blockscout = new BlockscoutClient();
