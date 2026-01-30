import { Sparkles, Archive, Pencil } from 'lucide-react';
import { useSeed, useUpdateSeed } from '../../api/seeds';
import { useStartExploration } from '../../api/explore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface SeedDetailProps {
  id: string;
}

const statusVariant = {
  active: 'ok',
  deferred: 'warn',
  exhausted: 'muted',
} as const;

export function SeedDetail({ id }: SeedDetailProps) {
  const { data: seed, isLoading, error } = useSeed(id);
  const updateSeed = useUpdateSeed();
  const startExploration = useStartExploration();

  if (isLoading) {
    return <div className="p-4 text-muted font-mono text-sm">Loading...</div>;
  }

  if (error || !seed) {
    return <div className="p-4 text-danger font-mono text-sm">Failed to load seed</div>;
  }

  const handleExplore = () => {
    startExploration.mutate({ seedId: id });
  };

  const handleArchive = () => {
    updateSeed.mutate({ id, data: { status: 'exhausted' } });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={statusVariant[seed.status]}>{seed.status}</Badge>
        </div>
        <p className="text-text">{seed.content}</p>
      </div>

      <div className="dotted-separator" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-deep p-3 border border-border">
          <div className="stat-number text-xl">{seed.priority.toFixed(1)}</div>
          <div className="stat-label">Priority</div>
        </div>
        <div className="bg-bg-deep p-3 border border-border">
          <div className="stat-number text-xl">{seed.times_explored}</div>
          <div className="stat-label">Explored</div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-muted-olive uppercase tracking-wider">Created</span>
          <span className="text-muted">
            {new Date(seed.created_at).toLocaleString()}
          </span>
        </div>
        {seed.last_explored_at && (
          <div className="flex justify-between">
            <span className="text-muted-olive uppercase tracking-wider">Last explored</span>
            <span className="text-muted">
              {new Date(seed.last_explored_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="dotted-separator" />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleExplore}
          disabled={startExploration.isPending}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4" />
          Explore
        </Button>
        <Button variant="secondary" size="md">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={handleArchive}
          disabled={seed.status === 'exhausted'}
        >
          <Archive className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
