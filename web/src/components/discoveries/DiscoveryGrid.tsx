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
    return <div className="p-8 text-muted">Loading discoveries...</div>;
  }

  if (error) {
    return <div className="p-8 text-danger">Failed to load discoveries</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-4">
        <span className="text-sm text-muted">Min significance:</span>
        <div className="flex gap-2">
          {significanceFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setMinSignificance(filter.value)}
              className={`
                px-3 py-1 rounded text-sm transition-colors
                ${minSignificance === filter.value
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-text hover:bg-panel'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!filteredDiscoveries?.length ? (
          <div className="text-center text-muted py-8">
            {searchQuery ? 'No discoveries match your search.' : 'No discoveries yet. Start exploring to find something interesting.'}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredDiscoveries.map((discovery) => (
              <button
                key={discovery.id}
                onClick={() => selectNode(discovery.id, 'discovery')}
                className="
                  bg-panel border border-border rounded-lg p-4 text-left
                  hover:border-discovery transition-colors
                "
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={getSignificanceVariant(discovery.significance)}>
                    <Star className="w-3 h-3 mr-1" />
                    {(discovery.significance * 100).toFixed(0)}%
                  </Badge>
                </div>
                <h3 className="text-text font-medium mb-2">{discovery.title}</h3>
                <p className="text-sm text-muted line-clamp-3">{discovery.content}</p>
                <div className="mt-3 text-xs text-muted">
                  {new Date(discovery.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
