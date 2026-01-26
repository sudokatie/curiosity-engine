import { X } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { SeedDetail } from '../seeds/SeedDetail';
import { ThreadDetail } from '../threads/ThreadDetail';
import { DiscoveryDetail } from '../discoveries/DiscoveryDetail';

export function Sidebar() {
  const { sidebarOpen, selectedNodeId, selectedNodeType, clearSelection, setSidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  const hasSelection = selectedNodeId && selectedNodeType;

  return (
    <aside className="w-80 bg-panel border-l border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-medium text-text">
          {hasSelection ? 'Details' : 'Select a node'}
        </h2>
        <button
          onClick={() => {
            clearSelection();
            setSidebarOpen(false);
          }}
          className="p-1 rounded hover:bg-panel-strong text-muted hover:text-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasSelection && (
          <div className="p-4 text-muted text-sm">
            Click on a node in the graph to see its details.
          </div>
        )}

        {selectedNodeType === 'seed' && selectedNodeId && (
          <SeedDetail id={selectedNodeId} />
        )}

        {selectedNodeType === 'thread' && selectedNodeId && (
          <ThreadDetail id={selectedNodeId} />
        )}

        {selectedNodeType === 'discovery' && selectedNodeId && (
          <DiscoveryDetail id={selectedNodeId} />
        )}
      </div>
    </aside>
  );
}
