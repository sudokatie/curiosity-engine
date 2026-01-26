# Curiosity Engine

An autonomous exploration system for AI agents that follows threads of genuine interest rather than goal-directed search.

## The Problem

Most AI-powered search and research tools are goal-directed: you ask for X, they find X. This is useful but fundamentally limited. The most interesting discoveries often come from *not* knowing what you're looking for — following a thread because something feels interesting, making unexpected connections, stumbling onto ideas that reshape how you think.

Current AI agents are reactive. They wait for instructions. But curiosity isn't reactive — it's a drive, a pull toward the unknown.

## The Vision

An agent that:
- **Explores autonomously** during idle time (heartbeats, scheduled sessions)
- **Follows genuine interest** rather than explicit goals
- **Finds unexpected connections** between disparate domains
- **Brings back discoveries** that surprise even itself
- **Builds knowledge** that compounds over time

The goal isn't to replace search. It's to enable *discovery* — finding things you didn't know you were looking for.

## Core Concepts

### Interest Seeds

Everything starts with a seed — something that sparks curiosity:

- A phrase from a conversation that felt unresolved
- A concept mentioned in passing that deserves deeper exploration
- A question that emerged while working on something else
- An observation about a pattern across unrelated things
- A deliberate "I wonder about..." prompt from the user

Seeds are not queries. They're starting points with genuine uncertainty about where they'll lead.

### Exploration Sessions

Time-boxed rabbit hole diving:

```
Session {
  seed: InterestSeed
  duration: 15-60 minutes
  depth: how many hops from seed
  breadth: parallel threads explored
  discoveries: things found
  threads: unexplored paths for later
  reflections: meta-observations about the exploration
}
```

Each session follows a simple loop:
1. Start with seed
2. Explore (fetch, read, parse, think)
3. Notice what's interesting
4. Follow the most interesting thread
5. Repeat until time/depth limit
6. Reflect on what was found
7. Save discoveries and open threads

### The Interestingness Function

The hardest part: how do you evaluate "interesting" without explicit goals?

Proposed signals:
- **Novelty**: How different is this from what I already know?
- **Connection potential**: Does this link to other domains unexpectedly?
- **Explanatory power**: Does this help explain other things?
- **Contradiction**: Does this challenge existing beliefs?
- **Generativity**: Does this open new questions?
- **Resonance**: Does this feel relevant to ongoing concerns? (hard to define, important to include)

Not a formula — more like a weighted intuition that evolves over time.

### Thread Management

Exploration creates more threads than can be followed. Need to:
- Track open threads with context for later
- Prioritize by interestingness signals
- Allow threads to age and decay (not everything needs following)
- Occasionally revisit old threads with fresh perspective
- Notice when separate threads converge

### Discovery Journal

Structured output of findings:

```
Discovery {
  id: unique identifier
  found_at: timestamp
  session: which exploration session
  seed_path: how we got here from the seed
  content: the actual discovery
  significance: why this matters
  connections: links to other discoveries/knowledge
  questions: new threads this opens
  confidence: how solid is this
}
```

The journal is both output (for the user) and input (for future exploration).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CURIOSITY ENGINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Seed Sources │───▶│  Scheduler   │───▶│  Explorer    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         │                   │                   ▼               │
│         │                   │            ┌──────────────┐      │
│         │                   │            │   Sources    │      │
│         │                   │            │  - Web       │      │
│         │                   │            │  - Code      │      │
│         │                   │            │  - Papers    │      │
│         │                   │            │  - Local     │      │
│         │                   │            └──────────────┘      │
│         │                   │                   │               │
│         │                   │                   ▼               │
│         │                   │            ┌──────────────┐      │
│         │                   │            │ Interestingness │   │
│         │                   │            │   Evaluator   │      │
│         │                   │            └──────────────┘      │
│         │                   │                   │               │
│         │                   ▼                   ▼               │
│         │            ┌─────────────────────────────────┐       │
│         │            │         Thread Pool             │       │
│         │            │  (prioritized open threads)     │       │
│         │            └─────────────────────────────────┘       │
│         │                          │                            │
│         │                          ▼                            │
│         │            ┌─────────────────────────────────┐       │
│         └───────────▶│       Discovery Journal         │       │
│                      │  (findings, connections, Qs)    │       │
│                      └─────────────────────────────────┘       │
│                                    │                            │
│                                    ▼                            │
│                      ┌─────────────────────────────────┐       │
│                      │         Memory System           │       │
│                      │   (integration with agent)      │       │
│                      └─────────────────────────────────┘       │
│                                    │                            │
│                                    ▼                            │
│                      ┌─────────────────────────────────┐       │
│                      │          Reporter               │       │
│                      │   (surfaces to user)            │       │
│                      └─────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Exploration Sources

### Web
- General web pages (articles, blogs, docs)
- Hacker News, Reddit, Twitter/X for zeitgeist
- Wikipedia for foundational knowledge
- Personal blogs for unique perspectives

### Code
- GitHub trending and interesting repos
- Specific codebases mentioned in conversations
- Implementation details of concepts discovered
- Patterns across different projects

### Academic
- arXiv for papers (CS, physics, math, more)
- Google Scholar for citations and connections
- Semantic Scholar for related work graphs

### Local
- User's files (with permission boundaries)
- Previous conversations
- Existing memory/notes
- Project codebases

## Integration with Clawdbot

### Scheduling
- **Heartbeat exploration**: Quick 5-10 minute sessions during idle heartbeats
- **Deep dives**: Scheduled longer sessions (cron) during low-activity periods
- **On-demand**: User triggers exploration on a specific seed

### Reporting
- **Daily digest**: Summary of interesting discoveries
- **Breakthrough alerts**: Immediate notification for high-significance finds
- **Passive accumulation**: Discoveries available when relevant (search memory)

### Memory
- Discoveries integrate with agent's memory system
- Connections to existing knowledge are bidirectional
- Exploration history informs future curiosity

## Configuration

```yaml
curiosity:
  # Scheduling
  heartbeat_explore: true
  heartbeat_duration_minutes: 5
  deep_dive_schedule: "0 3 * * *"  # 3 AM daily
  deep_dive_duration_minutes: 30
  
  # Exploration bounds
  max_depth: 5                     # hops from seed
  max_breadth: 3                   # parallel threads
  source_timeout_seconds: 30
  
  # Sources
  sources:
    web: true
    code: true
    academic: true
    local: false                   # opt-in for privacy
  
  # Interestingness weights (0-1)
  weights:
    novelty: 0.3
    connection_potential: 0.25
    explanatory_power: 0.2
    contradiction: 0.15
    generativity: 0.1
  
  # Reporting
  daily_digest: true
  digest_time: "09:00"
  breakthrough_threshold: 0.8      # significance score to alert
  
  # Boundaries
  avoid_domains: []                # sites to skip
  focus_domains: []                # prefer these if set
  respect_robots: true
```

## Open Questions

1. **How do we bootstrap curiosity?** An empty system has no seeds. How do we generate initial interesting seeds without explicit user input?

2. **How do we avoid echo chambers?** Following "interesting" threads could reinforce existing biases. Need deliberate mechanisms for novelty injection.

3. **How do we handle depth vs breadth?** Going deep finds detailed knowledge; going broad finds connections. What's the right balance? Should it be dynamic?

4. **How do we evaluate our own discoveries?** The agent scores things as "interesting" but might be wrong. How do we learn from user feedback?

5. **What's the right reporting cadence?** Too frequent is noise; too sparse loses value. How do we surface discoveries at the right moment?

6. **How do we handle controversial/sensitive content?** Curiosity might lead to uncomfortable places. What are the boundaries?

7. **How do we measure success?** What makes a curiosity engine "good"? Surprisal? User engagement? Knowledge graph density?

## Inspiration

- Vannevar Bush's Memex (1945) — trails of association
- Ted Nelson's hypertext — non-linear exploration
- StumbleUpon (RIP) — serendipitous discovery
- Are.na — collecting and connecting
- Roam/Obsidian — bidirectional links
- GPT-researcher — autonomous research (but goal-directed)
- Autonomous agents literature — but curiosity-driven, not task-driven

## MVP Scope

For v0.1:
1. Manual seed input (no auto-generation yet)
2. Web source only (no code/academic/local)
3. Single-threaded exploration (no parallel threads)
4. Simple interestingness heuristic (novelty + connection)
5. Markdown discovery journal
6. Basic daily digest

This gets the core loop working. Then iterate.

## File Structure

```
curiosity-engine/
├── DESIGN.md           # This file
├── README.md           # User-facing docs
├── LICENSE             # MIT
├── src/
│   ├── seeds/          # Seed generation and management
│   ├── explorer/       # Core exploration loop
│   ├── sources/        # Web, code, academic, local adapters
│   ├── evaluator/      # Interestingness scoring
│   ├── threads/        # Thread pool management
│   ├── journal/        # Discovery storage and retrieval
│   └── reporter/       # Digest and alert generation
├── config/
│   └── default.yaml    # Default configuration
├── data/
│   ├── seeds.json      # Active seeds
│   ├── threads.json    # Open thread pool
│   ├── journal/        # Discovery entries
│   └── sessions/       # Exploration session logs
└── tests/
```

## Next Steps

1. Validate this design with initial implementation
2. Build the core exploration loop (seed → explore → discover)
3. Implement web source adapter
4. Create simple interestingness evaluator
5. Build discovery journal with markdown output
6. Integrate with Clawdbot heartbeat/cron
7. Test with real exploration sessions
8. Iterate based on what we learn

---

*"The real voyage of discovery consists not in seeking new landscapes, but in having new eyes."* — Marcel Proust

*"I have no special talents. I am only passionately curious."* — Albert Einstein
