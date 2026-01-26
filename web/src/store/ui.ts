import { create } from 'zustand';
import type { GraphNodeType } from '../types';

export type ViewMode = 'graph' | 'seeds' | 'discoveries' | 'settings';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface UIState {
  // Selection
  selectedNodeId: string | null;
  selectedNodeType: GraphNodeType | null;
  
  // View
  viewMode: ViewMode;
  sidebarOpen: boolean;
  
  // Search/Filter
  searchQuery: string;
  
  // Graph viewport
  viewport: Viewport;
  
  // Actions
  selectNode: (id: string | null, type: GraphNodeType | null) => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setViewport: (viewport: Viewport) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  selectedNodeType: null,
  viewMode: 'graph',
  sidebarOpen: true,
  searchQuery: '',
  viewport: { x: 0, y: 0, zoom: 1 },

  selectNode: (id, type) =>
    set({ selectedNodeId: id, selectedNodeType: type, sidebarOpen: id !== null }),

  clearSelection: () =>
    set({ selectedNodeId: null, selectedNodeType: null }),

  setViewMode: (mode) =>
    set({ viewMode: mode }),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  setViewport: (viewport) =>
    set({ viewport }),
}));
