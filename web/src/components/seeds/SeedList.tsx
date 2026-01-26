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
    return <div className="p-8 text-muted">Loading seeds...</div>;
  }

  if (error) {
    return <div className="p-8 text-danger">Failed to load seeds</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`
                px-3 py-1 rounded text-sm transition-colors
                ${statusFilter === filter.value
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-text hover:bg-panel'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Seed
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!filteredSeeds?.length ? (
          <div className="text-center text-muted py-8">
            {searchQuery ? 'No seeds match your search.' : 'No seeds found. Add one to get started.'}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredSeeds.map((seed) => (
              <button
                key={seed.id}
                onClick={() => selectNode(seed.id, 'seed')}
                className="
                  bg-panel border border-border rounded-lg p-4 text-left
                  hover:border-accent transition-colors
                "
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusVariant[seed.status]}>{seed.status}</Badge>
                  <span className="text-xs text-muted font-mono">
                    {seed.priority.toFixed(1)}
                  </span>
                </div>
                <p className="text-text text-sm line-clamp-2">{seed.content}</p>
                <div className="mt-2 text-xs text-muted">
                  Explored {seed.times_explored}x
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
