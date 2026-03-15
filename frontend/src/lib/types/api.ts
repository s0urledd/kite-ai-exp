// ============================================
// Blockscout v2 API Response Types
// ============================================

/** GET /api/v2/stats */
export interface ChainStats {
  total_blocks: string;
  total_addresses: string;
  total_transactions: string;
  average_block_time: number;
  coin_price: string | null;
  coin_price_change_percentage: number | null;
  total_gas_used: string;
  gas_prices: {
    slow: number | null;
    average: number | null;
    fast: number | null;
  };
  gas_used_today: string;
  transactions_today: string;
  market_cap: string | null;
  network_utilization_percentage: number;
}

/** GET /api/v2/blocks */
export interface Block {
  height: number;
  timestamp: string;
  hash: string;
  parent_hash: string;
  miner: AddressParam;
  size: number;
  gas_used: string;
  gas_limit: string;
  tx_count: number;
  nonce: string;
  base_fee_per_gas: string | null;
  gas_target_percentage: number | null;
  gas_used_percentage: number | null;
  difficulty: string;
  total_difficulty: string;
  rewards: Reward[];
}

/** GET /api/v2/transactions */
export interface Transaction {
  hash: string;
  block: number | null;
  block_number: number | null;
  timestamp: string;
  from: AddressParam;
  to: AddressParam | null;
  value: string;
  fee: Fee;
  gas_limit: string;
  gas_used: string;
  gas_price: string;
  status: "ok" | "error" | null;
  method: string | null;
  tx_types: string[];
  confirmation_duration: number[];
  result: string;
  nonce: number;
  position: number;
  type: number;
  raw_input: string;
  decoded_input: DecodedInput | null;
  token_transfers: TokenTransfer[] | null;
  token_transfers_count: number | null;
  exchange_rate: string | null;
  has_error_in_internal_txs: boolean;
}

/** GET /api/v2/addresses/{hash} */
export interface Address {
  hash: string;
  is_contract: boolean;
  name: string | null;
  implementation_name: string | null;
  is_verified: boolean;
  coin_balance: string | null;
  exchange_rate: string | null;
  block_number_balance_updated_at: number | null;
  token: TokenInfo | null;
  creation_tx_hash: string | null;
  creator_address_hash: string | null;
  has_custom_methods_read: boolean;
  has_custom_methods_write: boolean;
  has_methods_read: boolean;
  has_methods_write: boolean;
  has_methods_read_proxy: boolean;
  has_methods_write_proxy: boolean;
  has_decompiled_code: boolean;
  has_validated_blocks: boolean;
  has_beacon_chain_withdrawals: boolean;
  has_token_transfers: boolean;
  has_tokens: boolean;
  has_logs: boolean;
}

/** GET /api/v2/tokens */
export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  type: "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-404";
  holders: string;
  total_supply: string;
  exchange_rate: string | null;
  circulating_market_cap: string | null;
  icon_url: string | null;
}

/** GET /api/v2/search */
export interface SearchResult {
  type: "token" | "address" | "block" | "transaction" | "contract";
  name: string | null;
  address: string | null;
  symbol: string | null;
  url: string;
  block_number: number | null;
  tx_hash: string | null;
  is_smart_contract_verified: boolean | null;
}

// --- Shared sub-types ---

export interface AddressParam {
  hash: string;
  name: string | null;
  is_contract: boolean;
  is_verified: boolean | null;
  implementation_name: string | null;
}

export interface Fee {
  type: "actual" | "maximum";
  value: string;
}

export interface Reward {
  type: string;
  value: string;
}

export interface DecodedInput {
  method_id: string;
  method_call: string;
  parameters: DecodedParam[];
}

export interface DecodedParam {
  name: string;
  type: string;
  value: string;
}

export interface TokenTransfer {
  token: TokenInfo;
  from: AddressParam;
  to: AddressParam;
  total: TokenTotal;
  tx_hash: string;
  block_hash: string;
  log_index: string;
  type: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  type: string;
  icon_url: string | null;
}

export interface TokenTotal {
  decimals: string;
  value: string;
}

export interface InternalTransaction {
  block: number;
  created_contract: AddressParam | null;
  error: string | null;
  from: AddressParam;
  gas_limit: string;
  index: number;
  success: boolean;
  timestamp: string;
  to: AddressParam;
  transaction_hash: string;
  type: string;
  value: string;
}

export interface TransactionLog {
  address: AddressParam;
  data: string;
  decoded: DecodedLog | null;
  index: number;
  topics: string[];
  tx_hash: string;
}

export interface DecodedLog {
  method_call: string;
  method_id: string;
  parameters: DecodedParam[];
}

/** GET /api/v2/smart-contracts */
export interface SmartContract {
  address: AddressParam;
  coin_balance: string;
  compiler_version: string | null;
  language: string | null;
  has_constructor_args: boolean;
  optimization_enabled: boolean | null;
  tx_count: number | null;
  verified_at: string | null;
  market_cap: string | null;
}

/** Smart contract method (from ABI) */
export interface ContractMethod {
  type: string;
  method_id: string;
  name: string;
  inputs: Array<{ name: string; type: string; value?: string }>;
  outputs: Array<{ name: string; type: string; value?: string }>;
  stateMutability?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  next_page_params: Record<string, string> | null;
}

/** GET /api/v2/stats/charts/transactions */
export interface TransactionChartData {
  chart_data: Array<{
    date: string;
    tx_count?: number;
    transaction_count?: number;
  }>;
}

/** GET /api/v2/main-page/indexing-status */
export interface IndexingStatus {
  finished_indexing: boolean;
  finished_indexing_blocks: boolean;
  indexed_blocks_ratio: string;
  indexed_internal_transactions_ratio: string;
}
