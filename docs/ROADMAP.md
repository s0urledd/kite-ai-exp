# KiteAI Explorer — Roadmap

## Sprint 1: Infrastructure (Week 1)

- [x] Research Blockscout architecture and API
- [x] Research KiteAI chain specifics
- [x] Set up archive node (pruning-enabled: false)
- [x] Create project scaffold
- [x] Deploy Blockscout backend pointing to KiteAI archive node
- [x] Verify indexing works (blocks, txs, logs, tokens)
- [x] Verify API responses from `/api/v2/stats`, `/api/v2/blocks`, etc.

## Sprint 2: Frontend Foundation (Week 2)

- [x] Initialize Next.js 14+ with TypeScript, Tailwind, shadcn/ui
- [x] Set up API adapter layer (typed clients for Blockscout REST v2)
- [x] Build layout: navbar, footer, search bar
- [x] Build Dashboard page:
  - [x] Chain overview stat cards (block height, TPS, gas, addresses, KITE price, mcap, fdv)
  - [x] Latest Blocks panel
  - [x] Latest Transactions panel
  - [x] Transaction Activity chart (area chart)
  - [x] Gas Utilization chart
  - [x] Active Contracts leaderboard
- [x] Wallet connect (RainbowKit + wagmi + viem)

## Sprint 3: Core Pages (Week 3)

- [x] Blocks list page (paginated)
- [x] Block detail page (txs, gas, validator)
- [x] Transactions list page (paginated, filterable)
- [x] Transaction detail page:
  - [x] Overview tab
  - [x] Internal txs tab
  - [x] Logs tab
  - [x] State changes tab
  - [x] Raw trace tab
- [x] Search results page (universal search)

## Sprint 4: Address & Token Pages (Week 4)

- [x] Address detail page:
  - [x] Balance, tx count, token holdings
  - [x] Transaction history tab
  - [x] Token transfers tab
  - [x] Internal txs tab
  - [x] Contract code tab (ABI read/write methods)
- [x] Token list page
- [x] Token detail page (holders, transfers)
- [x] Contract detail page (ABI, read/write, verification status)

## Extra: UI & DX Enhancements (Done)

- [x] DexScreener KITE price integration (live price, 24h change, mcap, fdv)
- [x] Light / Dark theme toggle (CSS variable based, persisted to localStorage)
- [x] Charts & Stats page (5 visualizations: daily tx, gas, TPS, network utilization pie, summary)
- [x] Etherscan/Monad-inspired stat card layout on dashboard
- [x] Full number formatting (no compact K/M/B)
- [x] Improved empty states across all pages
- [x] Contract page with RPC fallback for active contracts

## Sprint 5: KiteAI-Specific Features (Week 5-6)

- [ ] Agent identity badges (User / Agent / Session tier)
- [ ] PoAI attribution scores display
- [ ] A2A transaction labeling
- [ ] AI contribution tracking dashboard
- [ ] Delegation chain visualization
- [ ] Custom chart: Agent activity over time

## Sprint 6: Polish & Deploy (Week 6-7)

- [x] Loading/skeleton/error/empty states
- [ ] Mobile responsive optimization
- [ ] SEO: meta tags, OpenGraph, structured data
- [ ] Performance: ISR, caching, pagination optimization
- [ ] Reverse proxy (nginx/caddy) + SSL
- [ ] Rate limiting
- [ ] Monitoring + error tracking
- [ ] Production deployment

## Non-Goals (for now)

- Custom indexer (use Blockscout)
- Contract verification UI (use Blockscout's built-in)
- User accounts / saved addresses
- Multi-chain support
