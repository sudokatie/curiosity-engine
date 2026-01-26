import { ExternalLink, Archive } from 'lucide-react';
import { useThread } from '../../api/threads';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ThreadDetailProps {
  id: string;
}

const statusVariant = {
  pending: 'accent',
  exploring: 'warn',
  explored: 'ok',
  decayed: 'muted',
} as const;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

export function ThreadDetail({ id }: ThreadDetailProps) {
  const { data: thread, isLoading, error } = useThread(id);

  if (isLoading) {
    return <div className="p-4 text-muted">Loading...</div>;
  }

  if (error || !thread) {
    return <div className="p-4 text-danger">Failed to load thread</div>;
  }

  const domain = getDomain(thread.url);

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={statusVariant[thread.status] || 'muted'}>{thread.status}</Badge>
          <Badge variant="muted">{domain}</Badge>
        </div>
        <a
          href={thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          {thread.url.length > 50 ? thread.url.slice(0, 50) + '...' : thread.url}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Interestingness</span>
          <span className="text-lg font-mono font-semibold text-text">
            {(thread.interestingness_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${thread.interestingness_score * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted">Depth</span>
          <p className="text-text font-mono">{thread.source_depth}</p>
        </div>
        <div>
          <span className="text-muted">Created</span>
          <p className="text-text text-xs font-mono">
            {new Date(thread.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {thread.context && (
        <div>
          <span className="text-sm text-muted">Context</span>
          <p className="text-sm text-text mt-1">{thread.context}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => window.open(thread.url, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open URL
        </Button>
        <Button
          variant="ghost"
          size="md"
          disabled={thread.status === 'decayed'}
        >
          <Archive className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
