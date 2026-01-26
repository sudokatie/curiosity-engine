import { create } from 'zustand';
import type { ExplorationStatus, ExplorationLogEntry, Discovery } from '../types';

interface ExplorationState {
  // Status
  status: ExplorationStatus;
  seedId: string | null;
  currentDepth: number;
  maxDepth: number;
  
  // Progress
  logEntries: ExplorationLogEntry[];
  recentDiscoveries: Discovery[];
  
  // Timestamps
  startedAt: string | null;
  
  // Actions
  startExploration: (seedId: string, maxDepth: number) => void;
  updateProgress: (depth: number) => void;
  addLogEntry: (entry: ExplorationLogEntry) => void;
  addDiscovery: (discovery: Discovery) => void;
  completeExploration: () => void;
  cancelExploration: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as ExplorationStatus,
  seedId: null,
  currentDepth: 0,
  maxDepth: 5,
  logEntries: [],
  recentDiscoveries: [],
  startedAt: null,
};

export const useExplorationStore = create<ExplorationState>((set) => ({
  ...initialState,

  startExploration: (seedId, maxDepth) =>
    set({
      status: 'running',
      seedId,
      maxDepth,
      currentDepth: 0,
      logEntries: [],
      recentDiscoveries: [],
      startedAt: new Date().toISOString(),
    }),

  updateProgress: (depth) =>
    set({ currentDepth: depth }),

  addLogEntry: (entry) =>
    set((state) => ({
      logEntries: [...state.logEntries, entry],
    })),

  addDiscovery: (discovery) =>
    set((state) => ({
      recentDiscoveries: [...state.recentDiscoveries, discovery],
    })),

  completeExploration: () =>
    set({ status: 'complete' }),

  cancelExploration: () =>
    set({ status: 'cancelled' }),

  setError: (message) =>
    set((state) => ({
      status: 'error',
      logEntries: [
        ...state.logEntries,
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message,
        },
      ],
    })),

  reset: () => set(initialState),
}));
