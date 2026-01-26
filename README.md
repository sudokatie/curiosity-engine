# Curiosity Engine

An autonomous exploration system that discovers what it didn't know it was looking for.

## What is this?

Most AI tools are goal-directed: you ask for X, they find X. Curiosity Engine is different. It explores autonomously, follows threads of genuine interest, makes unexpected connections, and brings back discoveries that surprise even itself.

Think of it as the difference between searching and discovering.

## Installation

```bash
git clone https://github.com/thehalvo/curiosity-engine
cd curiosity-engine
npm install
npm run build
```

## Quick Start

### CLI

```bash
# Explore from a topic or URL
npx curiosity explore "Why do we dream?"
npx curiosity explore "https://example.com/interesting-article"

# Manage seeds
npx curiosity add-seed "How do neural networks learn?"
npx curiosity list-seeds
npx curiosity list-seeds --status active

# View discoveries
npx curiosity digest
npx curiosity digest --since 2026-01-01

# Check status
npx curiosity status
```

### Web Interface

Run both the API server and web UI:

```bash
# Terminal 1: API server (port 3333)
npm run server

# Terminal 2: Web UI (port 5173)
cd web
npm install
npm run dev
```

Open http://localhost:5173

The web interface provides:
- Interactive knowledge graph visualization
- Seed management (add, edit, explore)
- Discovery browser with significance filters
- Live exploration with real-time updates
- Settings configuration

### Production Build

```bash
# Build the web UI
cd web
npm run build

# Serve via the API server (serves from web/dist)
cd ..
npm run server
```

## How it works

1. Seeds: Start with something interesting - a phrase, a question, a URL
2. Explore: Follow threads across the web, extracting readable content
3. Evaluate: Score content by novelty, connection potential, explanatory power, contradiction, and generativity
4. Discover: Save findings that exceed the discovery threshold
5. Queue: Store promising threads for future exploration
6. Report: Surface discoveries via digests and the web interface

## Configuration

Copy and edit the config file:

```bash
cp config/default.yaml config/local.yaml
```

Key options:

```yaml
curiosity:
  exploration:
    max_depth: 5
    fetch_delay_ms: 1000
    source_timeout_ms: 30000

  interestingness:
    weights:
      novelty: 0.30
      connection_potential: 0.25
      explanatory_power: 0.20
      contradiction: 0.15
      generativity: 0.10
    follow_threshold: 0.4
    discovery_threshold: 0.6

  threads:
    max_open: 50
    decay_days: 14
    revisit_probability: 0.1

  sources:
    web:
      blocked_domains: []
      respect_robots: true

  reporting:
    daily_digest: true
    digest_time: "09:00"
    breakthrough_alerts: true
    breakthrough_threshold: 0.8
```

## Project Structure

```
curiosity-engine/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── config.ts             # Configuration loader
│   ├── types.ts              # TypeScript types
│   ├── logger.ts             # Logging utility
│   ├── seeds/                # Seed management
│   ├── explorer/             # Core exploration loop
│   ├── sources/              # Web adapter
│   ├── evaluator/            # Interestingness scoring
│   ├── threads/              # Thread pool
│   ├── journal/              # Discovery storage
│   ├── reporter/             # Digests and alerts
│   ├── scheduler/            # Exploration timing
│   └── server/               # API server
│       ├── index.ts          # Express app
│       └── routes/           # API endpoints
├── web/                      # React web interface
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── api/              # API client
│   │   ├── store/            # Zustand stores
│   │   └── hooks/            # Custom hooks
│   └── package.json
├── config/
│   └── default.yaml
├── data/                     # Runtime data (gitignored)
├── DESIGN.md                 # Architecture docs
└── README.md
```

## API Endpoints

The server exposes these endpoints on port 3333:

```
GET    /api/seeds              List seeds
POST   /api/seeds              Create seed
GET    /api/seeds/:id          Get seed
PATCH  /api/seeds/:id          Update seed
DELETE /api/seeds/:id          Archive seed

GET    /api/threads            List threads
GET    /api/threads/:id        Get thread
PATCH  /api/threads/:id        Update thread

GET    /api/discoveries        List discoveries
GET    /api/discoveries/:id    Get discovery

GET    /api/graph              Get graph data
GET    /api/graph/expand/:id   Expand node

POST   /api/explore            Start exploration
GET    /api/explore/status     Get exploration status
DELETE /api/explore            Cancel exploration

GET    /api/health             Health check

WS     /ws                     WebSocket for live updates
```

## What's Implemented

- CLI: Full command set (explore, add-seed, list-seeds, digest, status)
- Web source: Fetching with Readability extraction, robots.txt support
- Evaluator: Heuristic-based scoring across 5 dimensions
- Thread pool: Persistence, decay, priority-based selection
- Journal: Discovery storage with markdown export
- Reporter: Digest generation
- API server: REST endpoints + WebSocket
- Web UI: Graph visualization, seed/discovery management, live exploration

## Current Limitations

- Web only: No code/academic/local file adapters yet
- Heuristic evaluation: LLM-based scoring not yet integrated
- Single-threaded: Parallel exploration not implemented
- Settings UI: Display only, doesn't persist changes yet

## Philosophy

1. Curiosity over goals - The destination isn't known in advance
2. Depth and breadth - Follow deep threads, notice wide connections
3. Surprise as signal - If it's predictable, it's probably not interesting
4. Compounding knowledge - Today's discoveries are tomorrow's seeds
5. Transparent process - Show the path, not just the destination

## Development

```bash
# Watch mode (TypeScript)
npm run dev

# Run tests
npm test

# Type check
npm run lint

# Web UI dev
cd web && npm run dev
```

## License

MIT
