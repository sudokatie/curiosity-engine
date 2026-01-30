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
    <aside className="w-80 bg-panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-xs font-medium text-muted-olive uppercase tracking-wider">
          {hasSelection ? 'Details' : 'Select a node'}
        </h2>
        <button
          onClick={() => {
            clearSelection();
            setSidebarOpen(false);
          }}
          className="p-1.5 text-muted hover:text-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasSelection && (
          <div className="p-4">
            <p className="text-sm text-muted">
              Click on a node in the graph to see its details.
            </p>
            <div className="mt-4 dotted-separator" />
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-bg-deep">
        <p className="text-xs text-muted-olive font-mono">
          blackabee.com
        </p>
      </div>
    </aside>
  );
}
