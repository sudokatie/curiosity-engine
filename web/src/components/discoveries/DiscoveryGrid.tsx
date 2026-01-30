import { useState } from 'react';
import { Star } from 'lucide-react';
import { useDiscoveries } from '../../api/discoveries';
import { useUIStore } from '../../store/ui';
import { Badge } from '../ui/Badge';

const significanceFilters = [
  { value: 0, label: 'All' },
  { value: 0.4, label: '40%+' },
  { value: 0.6, label: '60%+' },
  { value: 0.8, label: '80%+' },
];

function getSignificanceVariant(significance: number) {
  if (significance >= 0.8) return 'discovery';
  if (significance >= 0.6) return 'ok';
  if (significance >= 0.4) return 'warn';
  return 'muted';
}

export function DiscoveryGrid() {
  const [minSignificance, setMinSignificance] = useState(0);
  const { selectNode, searchQuery } = useUIStore();

  const { data: discoveries, isLoading, error } = useDiscoveries({ minSignificance });

  // Filter by search query
  const filteredDiscoveries = discoveries?.filter(discovery => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      discovery.title.toLowerCase().includes(query) ||
      discovery.content.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="p-8 text-muted font-mono text-sm">
        Loading discoveries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-danger font-mono text-sm">
        Failed to load discoveries
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="p-4 border-b border-border flex items-center gap-4">
        <span className="text-xs text-muted-olive uppercase tracking-wider">
          Min significance
        </span>
        <div className="dotted-separator-v h-4" />
        <div className="flex gap-1">
          {significanceFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setMinSignificance(filter.value)}
              className={`
                px-3 py-1 text-sm transition-colors
                ${minSignificance === filter.value
                  ? 'bg-text-cream text-bg'
                  : 'text-muted hover:text-text'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        {/* Stats */}
        <div className="ml-auto flex items-center gap-6">
          <div className="text-right">
            <div className="stat-number text-2xl">{filteredDiscoveries?.length || 0}</div>
            <div className="stat-label">Discoveries</div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {!filteredDiscoveries?.length ? (
          <div className="text-center py-12">
            <p className="text-muted font-serif text-lg">
              {searchQuery 
                ? 'No discoveries match your search.' 
                : 'No discoveries yet.'}
            </p>
            <p className="text-muted-olive text-sm mt-2">
              {!searchQuery && 'Start exploring to find something interesting.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredDiscoveries.map((discovery, index) => (
              <button
                key={discovery.id}
                onClick={() => selectNode(discovery.id, 'discovery')}
                className="
                  bg-panel border border-border p-4 text-left
                  hover:border-text-cream transition-colors group
                "
              >
                {/* Number and badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-muted-olive">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Badge variant={getSignificanceVariant(discovery.significance)}>
                    <Star className="w-3 h-3 mr-1" />
                    {(discovery.significance * 100).toFixed(0)}%
                  </Badge>
                </div>
                
                {/* Title */}
                <h3 className="font-serif text-text-cream text-lg mb-2 group-hover:text-white transition-colors">
                  {discovery.title}
                </h3>
                
                {/* Content preview */}
                <p className="text-sm text-muted line-clamp-3">
                  {discovery.content}
                </p>
                
                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-muted-olive font-mono">
                    {new Date(discovery.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
