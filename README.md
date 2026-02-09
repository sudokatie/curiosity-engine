# Curiosity Engine

An autonomous exploration system that discovers what it didn't know it was looking for.

This is my passion project. Most AI tools work like search engines with extra steps: you ask for X, they find X. Curiosity Engine is different. It wanders. It follows threads. It makes unexpected connections and brings back things that surprise even me.

The difference between searching and discovering is the difference between "find me information about black holes" and "huh, I wonder why..." followed by three hours of rabbit holes. This is the three hours of rabbit holes, automated.

## What Is This, Really?

Think of it as an autonomous research assistant with ADHD and good instincts. You give it seeds - topics, questions, URLs that interest you - and it explores outward from there. It evaluates what it finds, follows promising threads, ignores dead ends, and surfaces discoveries that score above a threshold.

It doesn't try to answer questions. It tries to find questions worth asking.

## Installation

```bash
npm install -g curiosity-engine
```

Or from source:

```bash
git clone https://github.com/sudokatie/curiosity-engine
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

# Explore local files (PDFs, markdown, text)
npx curiosity explore "local:~/Documents/research"
npx curiosity explore "local:~/notes/ideas.md"

# Explore codebases
npx curiosity explore "code:~/projects/myapp"
npx curiosity explore "code:~/projects/myapp/src/main.py"

# Search academic papers (arXiv)
npx curiosity explore "arxiv:search:transformer attention"
npx curiosity explore "arxiv:1706.03762"  # Fetch specific paper

# Manage seeds (your starting points)
npx curiosity add-seed "How do neural networks actually learn?"
npx curiosity list-seeds
npx curiosity list-seeds --status active

# View what it's found
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

The web interface gives you:
- Interactive knowledge graph visualization (watch the connections form)
- Seed management (add, edit, explore)
- Discovery browser with significance filters
- Live exploration with real-time updates (very satisfying to watch)
- Settings configuration

### Production Build

```bash
cd web && npm run build
cd .. && npm run server  # Serves from web/dist
```

## How It Works

1. **Seeds**: Start with something interesting - a phrase, a question, a URL
2. **Explore**: Follow threads across the web, extracting readable content
3. **Evaluate**: Score content by novelty, connection potential, explanatory power, contradiction, and generativity
4. **Discover**: Save findings that exceed the discovery threshold
5. **Queue**: Store promising threads for future exploration
6. **Report**: Surface discoveries via digests and the web interface

The evaluation is the interesting part. Not everything is equally interesting, and Curiosity Engine has opinions about what makes something worth paying attention to.

## Configuration

Copy and edit:

```bash
cp config/default.yaml config/local.yaml
```

Key options:

```yaml
curiosity:
  exploration:
    max_depth: 5                    # How deep to follow threads
    fetch_delay_ms: 1000            # Per-domain rate limit (ms)
    concurrency: 3                  # Parallel exploration threads (1-10)
    source_timeout_ms: 30000

  interestingness:
    weights:
      novelty: 0.30                 # Is this new to me?
      connection_potential: 0.25    # Does this link to other things I know?
      explanatory_power: 0.20       # Does this help explain something?
      contradiction: 0.15           # Does this challenge what I thought?
      generativity: 0.10            # Does this spark new questions?
    follow_threshold: 0.4           # Minimum score to follow a thread
    discovery_threshold: 0.6        # Minimum score to save as discovery

  threads:
    max_open: 50                    # How many threads to keep active
    decay_days: 14                  # Old threads lose priority
    revisit_probability: 0.1        # Sometimes revisit old ground

  sources:
    local:
      enabled: true
      directories:                  # Directories to scan
        - ~/Documents/notes
        - ~/research
      extensions:                   # Supported file types
        - .md
        - .txt
        - .pdf
      max_file_size_mb: 10          # Skip files larger than this

    code:
      enabled: true
      directories:                  # Code directories
        - ~/projects
      languages:                    # Supported languages
        - python
        - typescript
        - javascript
        - rust
        - go
      include_tests: false          # Skip test files
      max_file_size_mb: 1

    academic:
      enabled: true
      max_results: 10               # Papers per search
      categories:                   # Filter by arXiv categories
        - cs.AI
        - cs.LG
        - cs.CL

  reporting:
    daily_digest: true
    digest_time: "09:00"
    breakthrough_alerts: true       # Tell me about the really good stuff
    breakthrough_threshold: 0.8
```

## Project Structure

```
curiosity-engine/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── config.ts             # Configuration loader
│   ├── types.ts              # TypeScript types
│   ├── seeds/                # Seed management
│   ├── explorer/             # Core exploration loop
│   ├── sources/              # Web adapter (more coming)
│   ├── evaluator/            # Interestingness scoring
│   ├── threads/              # Thread pool
│   ├── journal/              # Discovery storage
│   ├── reporter/             # Digests and alerts
│   ├── scheduler/            # Exploration timing
│   └── server/               # API server
├── web/                      # React web interface
├── config/
│   └── default.yaml
└── data/                     # Runtime data (gitignored)
```

## API Endpoints

The server exposes these on port 3333:

```
GET    /api/seeds              List seeds
POST   /api/seeds              Create seed
GET    /api/seeds/:id          Get seed
PATCH  /api/seeds/:id          Update seed
DELETE /api/seeds/:id          Archive seed

GET    /api/threads            List threads
GET    /api/threads/:id        Get thread

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
- Web source: Fetching with Readability extraction, robots.txt respect
- Evaluator: Heuristic-based scoring across 5 dimensions
- Thread pool: Persistence, decay, priority-based selection
- Journal: Discovery storage with markdown export
- Reporter: Digest generation
- API server: REST endpoints + WebSocket
- Web UI: Graph visualization, seed/discovery management, live exploration

## Roadmap

### v0.2 (In Progress)
- [x] Settings persistence - save UI preferences with validation
- [x] Parallel exploration - multiple threads with per-domain rate limiting
- [x] Local file adapter - PDFs, markdown, text files
- [x] Code source adapter - explore codebases for patterns
- [x] Academic source adapter - arXiv paper search and retrieval
- [ ] LLM-based scoring - smarter interestingness evaluation

### v0.3 (Planned)
- [ ] Clawdbot cron integration
- [ ] Channel notifications (Telegram, Discord)
- [ ] Exploration cancellation
- [ ] LLM seed generation from discoveries

See FEATURE-BACKLOG.md in the clawd repo for detailed acceptance criteria.

## Philosophy

1. **Curiosity over goals** - The destination isn't known in advance. That's the point.
2. **Depth and breadth** - Follow deep threads, notice wide connections.
3. **Surprise as signal** - If it's predictable, it's probably not interesting.
4. **Compounding knowledge** - Today's discoveries are tomorrow's seeds.
5. **Transparent process** - Show the path, not just the destination.

This isn't a search engine. It's a discovery engine. The difference matters.

## Development

```bash
npm run dev     # Watch mode
npm test        # Run tests
npm run lint    # Type check
cd web && npm run dev  # Web UI dev
```

## License

MIT
