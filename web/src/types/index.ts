// Seed types
export type SeedStatus = 'active' | 'deferred' | 'exhausted';
export type SeedSource = 'user_input' | 'conversation' | 'discovery' | 'observation';

export interface Seed {
  id: string;
  content: string;
  source: SeedSource;
  source_context: string | null;
  status: SeedStatus;
  priority: number;
  times_explored: number;
  created_at: string;
  last_explored_at: string | null;
  tags: string[];
}

// Thread types
export type ThreadStatus = 'pending' | 'exploring' | 'explored' | 'decayed';

export interface Thread {
  id: string;
  url: string;
  context: string;
  source_session_id: string;
  source_depth: number;
  interestingness_score: number;
  status: ThreadStatus;
  created_at: string;
}

// Interestingness scoring
export interface InterestingnessScore {
  overall: number;
  novelty: number;
  connection_potential: number;
  explanatory_power: number;
  contradiction: number;
  generativity: number;
  components?: {
    [key: string]: {
      score: number;
      reasoning: string;
    };
  };
}

// Discovery types
export interface Discovery {
  id: string;
  title: string;
  content: string;
  significance: number;
  seed_path: string[];
  questions: string[];
  connections: string[];
  tags: string[];
  session_id: string;
  created_at: string;
}

// Graph types
export type GraphNodeType = 'seed' | 'thread' | 'discovery';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  score: number;
  status: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'explored' | 'discovered' | 'spawned';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Exploration types
export type ExplorationStatus = 'idle' | 'running' | 'complete' | 'cancelled' | 'error';

export interface ExplorationState {
  status: ExplorationStatus;
  seedId: string | null;
}

export interface ExplorationLogEntry {
  timestamp: string;
  type: 'start' | 'fetch' | 'evaluate' | 'follow' | 'skip' | 'discovery' | 'complete' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface ExplorationEvent {
  type: 'exploration:start' | 'exploration:step' | 'exploration:discovery' | 'exploration:thread' | 'exploration:complete' | 'exploration:error';
  data: Record<string, unknown>;
}

// Config types
export interface CuriosityConfig {
  exploration: {
    max_depth: number;
    max_breadth: number;
    source_timeout_ms: number;
    fetch_delay_ms: number;
  };
  interestingness: {
    weights: {
      novelty: number;
      connection_potential: number;
      explanatory_power: number;
      contradiction: number;
      generativity: number;
    };
    follow_threshold: number;
    discovery_threshold: number;
  };
  threads: {
    max_open: number;
    decay_days: number;
    revisit_probability: number;
  };
  sources: {
    web: {
      enabled: boolean;
      blocked_domains: string[];
      respect_robots: boolean;
    };
  };
  reporting: {
    daily_digest: boolean;
    digest_time: string;
    breakthrough_alerts: boolean;
    breakthrough_threshold: number;
  };
}

// API response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
