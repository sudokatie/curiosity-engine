import { Star, Sprout, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useDiscovery, useFeedback, useSetFeedback } from '../../api/discoveries';
import { useCreateSeed } from '../../api/seeds';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface DiscoveryDetailProps {
  id: string;
}

function getSignificanceVariant(significance: number) {
  if (significance >= 0.8) return 'discovery';
  if (significance >= 0.6) return 'ok';
  if (significance >= 0.4) return 'warn';
  return 'muted';
}

export function DiscoveryDetail({ id }: DiscoveryDetailProps) {
  const { data: discovery, isLoading, error } = useDiscovery(id);
  const { data: feedback } = useFeedback(id);
  const setFeedback = useSetFeedback();
  const createSeed = useCreateSeed();

  if (isLoading) {
    return <div className="p-4 text-muted">Loading...</div>;
  }

  if (error || !discovery) {
    return <div className="p-4 text-danger">Failed to load discovery</div>;
  }

  const handleCreateSeed = () => {
    createSeed.mutate({ content: discovery.title, priority: 0.8 });
  };

  const handleExport = () => {
    const content = `# ${discovery.title}\n\n${discovery.content}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discovery-${discovery.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleThumbsUp = () => {
    setFeedback.mutate({ id, rating: 'up' });
  };

  const handleThumbsDown = () => {
    setFeedback.mutate({ id, rating: 'down' });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={getSignificanceVariant(discovery.significance)}>
            <Star className="w-3 h-3 mr-1" />
            {(discovery.significance * 100).toFixed(0)}%
          </Badge>
        </div>
        <h3 className="text-text font-medium text-lg">{discovery.title}</h3>
      </div>

      {discovery.seed_path && discovery.seed_path.length > 0 && (
        <div className="text-xs text-muted">
          Path: {discovery.seed_path.join(' → ')}
        </div>
      )}

      <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
        {discovery.content}
      </div>

      {discovery.questions && discovery.questions.length > 0 && (
        <div>
          <h4 className="text-sm text-muted mb-2">Questions opened</h4>
          <ul className="space-y-1">
            {discovery.questions.map((q, i) => (
              <li key={i} className="text-sm text-text flex items-start gap-2">
                <span className="text-accent">?</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-muted">
        {new Date(discovery.created_at).toLocaleString()}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          variant="secondary"
          onClick={handleCreateSeed}
          disabled={createSeed.isPending}
          className="flex-1"
        >
          <Sprout className="w-4 h-4" />
          Create Seed
        </Button>
        <Button variant="ghost" size="md" onClick={handleExport}>
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2 pt-2 border-t border-border items-center">
        <span className="text-sm text-muted mr-2">Was this useful?</span>
        <Button
          variant={feedback?.rating === 'up' ? 'primary' : 'ghost'}
          size="md"
          onClick={handleThumbsUp}
          disabled={setFeedback.isPending}
        >
          <ThumbsUp className={`w-4 h-4 ${feedback?.rating === 'up' ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant={feedback?.rating === 'down' ? 'danger' : 'ghost'}
          size="md"
          onClick={handleThumbsDown}
          disabled={setFeedback.isPending}
        >
          <ThumbsDown className={`w-4 h-4 ${feedback?.rating === 'down' ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
