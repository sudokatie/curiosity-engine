import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSeeds } from '../../api/seeds';
import { useUIStore } from '../../store/ui';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SeedForm } from './SeedForm';
import type { SeedStatus } from '../../types';

const statusFilters: { value: SeedStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'exhausted', label: 'Exhausted' },
];

const statusVariant = {
  active: 'ok',
  deferred: 'warn',
  exhausted: 'muted',
} as const;

export function SeedList() {
  const [statusFilter, setStatusFilter] = useState<SeedStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const { selectNode, searchQuery } = useUIStore();

  const { data: seeds, isLoading, error } = useSeeds(
    statusFilter === 'all' ? {} : { status: statusFilter }
  );

  // Filter by search query
  const filteredSeeds = seeds?.filter(seed => {
    if (!searchQuery.trim()) return true;
    return seed.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="p-8 text-muted font-mono text-sm">
        Loading seeds...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-danger font-mono text-sm">
        Failed to load seeds
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-olive uppercase tracking-wider">
            Status
          </span>
          <div className="dotted-separator-v h-4" />
          <div className="flex gap-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`
                  px-3 py-1 text-sm transition-colors
                  ${statusFilter === filter.value
                    ? 'bg-text-cream text-bg'
                    : 'text-muted hover:text-text'
                  }
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="text-right">
            <div className="stat-number text-2xl">{filteredSeeds?.length || 0}</div>
            <div className="stat-label">Seeds</div>
          </div>
          
          <div className="dotted-separator-v h-8" />
          
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Add Seed
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {!filteredSeeds?.length ? (
          <div className="text-center py-12">
            <p className="text-muted font-serif text-lg">
              {searchQuery 
                ? 'No seeds match your search.' 
                : 'No seeds found.'}
            </p>
            <p className="text-muted-olive text-sm mt-2">
              {!searchQuery && 'Add one to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredSeeds.map((seed, index) => (
              <button
                key={seed.id}
                onClick={() => selectNode(seed.id, 'seed')}
                className="
                  bg-panel border border-border p-4 text-left
                  hover:border-accent transition-colors group
                "
              >
                {/* Number and status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-muted-olive">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[seed.status]}>
                      {seed.status}
                    </Badge>
                    <span className="text-xs text-muted font-mono">
                      P{seed.priority.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                {/* Content */}
                <p className="text-text text-sm line-clamp-2 group-hover:text-text-cream transition-colors">
                  {seed.content}
                </p>
                
                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted-olive font-mono">
                    Explored {seed.times_explored}x
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm && <SeedForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
