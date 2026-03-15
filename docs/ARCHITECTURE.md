# KiteAI Explorer — Architecture

## Overview

Custom block explorer for KiteAI Mainnet (Chain ID: 2366).

**Blockscout is used ONLY as:**
1. **Indexer** — crawls the chain via JSON-RPC, indexes blocks/txs/logs/tokens into Postgres
2. **REST API** — serves indexed data via `/api/v2/*` endpoints
3. **Contract Verification** — Solidity/Vyper source verification via smart-contract-verifier

**Blockscout UI is completely disabled** (`DISABLE_WEBAPP=true`).
All user-facing UI is our custom Next.js frontend.

## Stack

```
┌─────────────────────────────────────┐
│      Custom Frontend (100% ours)    │
│   Next.js + TypeScript + Tailwind   │
│   shadcn/ui + Recharts              │
│         Port 3000                   │
│   ALL pages, ALL UI, ALL UX         │
└──────────────┬──────────────────────┘
               │ REST API v2
               ▼
┌─────────────────────────────────────┐
│    Blockscout (headless, no UI)     │
│         Port 4000                   │
│                                     │
│   ┌────────────────────────────┐    │
│   │  Indexer                   │    │
│   │  blocks, txs, logs, tokens │    │
│   │  internal txs, traces      │    │
│   └─────────┬──────────────────┘    │
│             │                       │
│   ┌─────────▼──────────────────┐    │
│   │  REST API v2 (/api/v2/*)   │    │
│   │  Contract Verification     │    │
│   │  Sig Provider              │    │
│   │  Stats Service             │    │
│   └────────────────────────────┘    │
│             │                       │
│   ┌─────────▼──────┐               │
│   │   PostgreSQL   │               │
│   │   Port 7432    │               │
│   └────────────────┘               │
└──────────────┬──────────────────────┘
               │ JSON-RPC (HTTP + WS)
               ▼
┌─────────────────────────────────────┐
│     KiteAI Archive Node            │
│   Avalanche Subnet-EVM             │
│   Chain ID: 2366 | Token: KITE     │
│   HTTP RPC: Port 9650              │
│   P2P: Port 9651                   │
│   pruning-enabled: false           │
└─────────────────────────────────────┘
```

## Blockscout Role (headless backend only)

Blockscout handles these backend concerns so we don't reinvent them:
- **Chain indexing**: Continuously polls the archive node, parses blocks/txs/receipts/logs
- **Data normalization**: Token detection (ERC-20/721/1155), internal tx tracing, address balancing
- **REST API v2**: Paginated, typed JSON endpoints for all indexed data
- **Contract verification**: Accepts Solidity/Vyper source, compiles & verifies on-chain bytecode
- **Signature decoding**: Method ID → human-readable function name
- **Stats aggregation**: Daily tx counts, gas usage charts

Everything else — every pixel the user sees — is our frontend.

## Chain Details

| Parameter           | Value |
|---------------------|-------|
| Chain Name          | KiteAI Mainnet |
| Chain ID            | 2366 |
| Token               | KITE (18 decimals) |
| Architecture        | Avalanche L1 (Subnet-EVM) |
| Consensus           | Proof of Attributed Intelligence (PoAI) |
| Block Time           | ~2 seconds |
| RPC (Public)        | `https://rpc.gokite.ai` |
| WSS (Public)        | `wss://rpc.gokite.ai/ws` |
| Blockchain ID       | `3USaEfTcoUhHxpKXvpAG916UKCUEyjrtkg2hBArBG3JyDP7my` |
| Subnet ID           | `21uUaTxVdR3Sp6SJhpcSrdH1g66aFoE8mPQDvwKJCjXNexo5y6` |
| Existing Explorer   | `https://kitescan.ai` (Blockscout) |

## Data Flow

1. **Archive Node** syncs all KiteAI blocks with `pruning-enabled: false`
2. **Blockscout Indexer** (headless) polls the node via JSON-RPC, indexes into Postgres
3. **Blockscout REST API** serves indexed data — no UI, just JSON
4. **Our Frontend** fetches from Blockscout API, renders everything

## Key Blockscout API Endpoints

### Dashboard Data
- `GET /api/v2/stats` — network stats, gas prices
- `GET /api/v2/main-page/blocks` — latest blocks
- `GET /api/v2/main-page/transactions` — latest transactions
- `GET /api/v2/main-page/indexing-status` — sync progress
- `GET /api/v2/stats/charts/transactions` — tx chart data

### Detail Pages
- `GET /api/v2/blocks/{number}` — block detail
- `GET /api/v2/transactions/{hash}` — tx detail
- `GET /api/v2/addresses/{hash}` — address detail
- `GET /api/v2/tokens` — token list
- `GET /api/v2/smart-contracts/{hash}` — verified contracts
- `GET /api/v2/search` — universal search

### Transaction Deep-Dive
- `GET /api/v2/transactions/{hash}/logs` — event logs
- `GET /api/v2/transactions/{hash}/internal-transactions` — internal txs
- `GET /api/v2/transactions/{hash}/raw-trace` — execution trace
- `GET /api/v2/transactions/{hash}/state-changes` — state diff
- `GET /api/v2/transactions/{hash}/token-transfers` — token movements

## KiteAI-Specific Features for Explorer

These differentiate us from generic Blockscout:

1. **Agent Identity Resolution** — Kite Passport tiers (User / Agent / Session)
2. **PoAI Attribution** — Contribution scores, rewards distribution
3. **A2A Transaction Labels** — Agent-initiated vs human-initiated
4. **AI Model/Data Tracking** — On-chain attribution events
5. **Delegation Visualization** — User → Agent → Session chains
6. **Stablecoin Micropayment Flows** — USDC A2A patterns

## Frontend Pages

| Page | Route | Priority |
|------|-------|----------|
| Dashboard | `/` | P0 |
| Blocks List | `/blocks` | P0 |
| Block Detail | `/block/[number]` | P0 |
| Transactions List | `/txs` | P0 |
| Transaction Detail | `/tx/[hash]` | P0 |
| Address Detail | `/address/[hash]` | P0 |
| Token List | `/tokens` | P1 |
| Token Detail | `/token/[hash]` | P1 |
| Contract Detail | `/address/[hash]#code` | P1 |
| Search Results | `/search` | P0 |
| Charts & Stats | `/stats` | P2 |
| API Docs | `/api-docs` | P2 |

## Design System

- **Theme**: Dark, warm gold/bronze palette (#C4A96A, #DBC993, #8B7A4E)
- **Background**: Warm blacks (#09090B, #111113)
- **Typography**: Outfit (UI) + JetBrains Mono (data/code)
- **Components**: shadcn/ui base, custom styled
- **Charts**: Recharts with gradient fills
- **Responsive**: Mobile-first
