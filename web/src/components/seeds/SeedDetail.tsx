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
    return <div className="p-4 text-muted">Loading...</div>;
  }

  if (error || !seed) {
    return <div className="p-4 text-danger">Failed to load seed</div>;
  }

  const handleExplore = () => {
    startExploration.mutate({ seedId: id });
  };

  const handleArchive = () => {
    updateSeed.mutate({ id, data: { status: 'exhausted' } });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={statusVariant[seed.status]}>{seed.status}</Badge>
        </div>
        <p className="text-text">{seed.content}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted">Priority</span>
          <p className="text-text font-mono">{seed.priority.toFixed(1)}</p>
        </div>
        <div>
          <span className="text-muted">Explored</span>
          <p className="text-text font-mono">{seed.times_explored}x</p>
        </div>
        <div className="col-span-2">
          <span className="text-muted">Created</span>
          <p className="text-text text-xs font-mono">
            {new Date(seed.created_at).toLocaleString()}
          </p>
        </div>
        {seed.last_explored_at && (
          <div className="col-span-2">
            <span className="text-muted">Last explored</span>
            <p className="text-text text-xs font-mono">
              {new Date(seed.last_explored_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
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
