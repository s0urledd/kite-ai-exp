# Kite Explorer

Custom block explorer for **KiteAI Mainnet** (Chain ID: 2366).

Premium UI/UX with Blockscout as the backend indexer/API layer.

## Architecture

```
KiteAI Archive Node (port 9650)
        ↓ JSON-RPC
Blockscout Backend (port 4000)
        ↓ REST API v2
Custom Next.js Frontend (port 3000)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

## Project Structure

```
├── blockscout/              # Blockscout Docker setup
│   ├── docker-compose.yml   # Backend services
│   └── envs/                # Environment configs
│       ├── common-blockscout.env
│       └── common-stats.env
├── frontend/                # Custom Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   │   ├── layout/      # Navbar, Footer, Search
│   │   │   ├── dashboard/   # Dashboard widgets
│   │   │   ├── blocks/      # Block list/detail
│   │   │   ├── transactions/# Tx list/detail
│   │   │   ├── address/     # Address detail
│   │   │   ├── tokens/      # Token list/detail
│   │   │   ├── contracts/   # Contract detail
│   │   │   ├── search/      # Search results
│   │   │   ├── charts/      # Chart components
│   │   │   └── common/      # Shared components
│   │   ├── lib/
│   │   │   ├── api/         # Blockscout API client
│   │   │   ├── config/      # Chain config, env
│   │   │   ├── hooks/       # React hooks
│   │   │   ├── types/       # TypeScript types
│   │   │   └── utils/       # Formatting helpers
│   │   └── styles/          # Global CSS
│   └── public/              # Static assets
└── docs/                    # Documentation
    ├── ARCHITECTURE.md
    └── ROADMAP.md
```

## Quick Start

### 1. Archive Node (must be running)

```bash
# See docs for full setup
curl localhost:9650/ext/health
```

### 2. Blockscout Backend

```bash
cd blockscout
# Edit envs/common-blockscout.env (set SECRET_KEY_BASE)
docker compose up -d
# Wait for indexing to start
curl localhost:4000/api/v2/main-page/indexing-status
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Open http://localhost:3000
```

## Chain Info

| Parameter | Value |
|-----------|-------|
| Chain ID  | 2366 |
| Token     | KITE (18 decimals) |
| RPC       | `https://rpc.gokite.ai` |
| WSS       | `wss://rpc.gokite.ai/ws` |
| Explorer  | `https://kitescan.ai` (existing Blockscout) |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md)
