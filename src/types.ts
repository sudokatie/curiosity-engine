/**
 * Curiosity Engine - Type Definitions
 */

// ============================================================================
// Enums
// ============================================================================

export enum SeedSource {
  USER_INPUT = "user_input",
  CONVERSATION = "conversation",
  DISCOVERY = "discovery",
  OBSERVATION = "observation",
}

export enum SeedStatus {
  ACTIVE = "active",
  DEFERRED = "deferred",
  EXHAUSTED = "exhausted",
}

export enum ThreadStatus {
  PENDING = "pending",
  EXPLORING = "exploring",
  EXPLORED = "explored",
  DECAYED = "decayed",
}

export enum SessionStatus {
  RUNNING = "running",
  COMPLETED = "completed",
  TIMEOUT = "timeout",
  ERROR = "error",
}

export enum ExplorationDecision {
  FOLLOW = "follow",
  STOP = "stop",
  BRANCH = "branch",
}

// ============================================================================
// Core Data Types
// ============================================================================

export interface Seed {
  id: string;
  content: string;
  source: SeedSource;
  source_context: string | null;
  created_at: string; // ISO timestamp
  priority: number; // 0-1
  times_explored: number;
  last_explored_at: string | null; // ISO timestamp
  status: SeedStatus;
  tags: string[];
}

export interface Thread {
  id: string;
  url: string;
  context: string;
  source_session_id: string;
  source_depth: number;
  interestingness_score: number; // 0-1
  created_at: string; // ISO timestamp
  status: ThreadStatus;
}

export interface Discovery {
  id: string;
  session_id: string;
  seed_path: string[]; // sequence from seed to discovery
  title: string;
  content: string;
  significance: number; // 0-1
  connections: string[]; // IDs of related discoveries
  questions: string[]; // new questions opened
  tags: string[];
  created_at: string; // ISO timestamp
}

export interface ExplorationStep {
  depth: number;
  url: string | null;
  content_summary: string;
  interestingness_score: number;
  decision: ExplorationDecision;
  reasoning: string;
}

export interface ExplorationSession {
  id: string;
  seed_id: string;
  started_at: string; // ISO timestamp
  ended_at: string | null; // ISO timestamp
  duration_limit_ms: number;
  depth_limit: number;
  current_depth: number;
  path: ExplorationStep[];
  discoveries: Discovery[];
  new_threads: Thread[];
  status: SessionStatus;
}

// ============================================================================
// Source Types
// ============================================================================

export interface SourceContent {
  url: string;
  title: string;
  text: string;
  links: string[];
  fetched_at: string; // ISO timestamp
  source_type: string;
}

// ============================================================================
// Evaluation Types
// ============================================================================

export interface InterestingnessComponent {
  score: number;
  reasoning: string;
}

export interface InterestingnessScore {
  overall: number; // 0-1, weighted combination
  novelty: number;
  connection_potential: number;
  explanatory_power: number;
  contradiction: number;
  generativity: number;
  components: {
    novelty: InterestingnessComponent;
    connection_potential: InterestingnessComponent;
    explanatory_power: InterestingnessComponent;
    contradiction: InterestingnessComponent;
    generativity: InterestingnessComponent;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface HeartbeatConfig {
  enabled: boolean;
  duration_minutes: number;
}

export interface DeepDiveConfig {
  enabled: boolean;
  cron: string;
  duration_minutes: number;
}

export interface ExplorationConfig {
  max_depth: number;
  max_breadth: number;
  source_timeout_ms: number;
  fetch_delay_ms: number;
  concurrency: number;
}

export interface WebSourceConfig {
  enabled: boolean;
  blocked_domains: string[];
  preferred_domains: string[];
  respect_robots: boolean;
}

export interface LocalSourceConfig {
  enabled: boolean;
  directories: string[];
  extensions: string[];
  watch: boolean;
  max_file_size_mb: number;
}

export interface CodeSourceConfig {
  enabled: boolean;
  directories: string[];
  languages: string[];
  include_tests: boolean;
  max_file_size_mb: number;
}

export interface AcademicSourceConfig {
  enabled: boolean;
  max_results: number;
  categories: string[];  // e.g., ["cs.AI", "cs.LG"]
}

export interface SourcesConfig {
  web: WebSourceConfig;
  local?: LocalSourceConfig;
  code?: CodeSourceConfig;
  academic?: AcademicSourceConfig;
}

export interface InterestingnessWeights {
  novelty: number;
  connection_potential: number;
  explanatory_power: number;
  contradiction: number;
  generativity: number;
}

export interface InterestingnessConfig {
  weights: InterestingnessWeights;
  follow_threshold: number;
  discovery_threshold: number;
}

export interface ThreadsConfig {
  max_open: number;
  decay_days: number;
  revisit_probability: number;
}

export interface ReportingConfig {
  daily_digest: boolean;
  digest_time: string;
  breakthrough_alerts: boolean;
  breakthrough_threshold: number;
  channel: string | null;
}

export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
}

export interface LlmConfig {
  enabled: boolean;
  provider: "clawdbot" | "ollama" | "openai";
  model?: string;
  base_url?: string;
  api_key?: string;
  cache_evaluations: boolean;
  cache_ttl_hours: number;
}

export interface CuriosityConfig {
  heartbeat: HeartbeatConfig;
  deep_dive: DeepDiveConfig;
  exploration: ExplorationConfig;
  sources: SourcesConfig;
  interestingness: InterestingnessConfig;
  threads: ThreadsConfig;
  reporting: ReportingConfig;
  data_dir: string;
  logging: LoggingConfig;
  llm: LlmConfig;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
