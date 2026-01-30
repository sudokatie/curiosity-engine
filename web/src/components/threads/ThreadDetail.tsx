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
    return <div className="p-4 text-muted font-mono text-sm">Loading...</div>;
  }

  if (error || !thread) {
    return <div className="p-4 text-danger font-mono text-sm">Failed to load thread</div>;
  }

  const domain = getDomain(thread.url);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={statusVariant[thread.status] || 'muted'}>{thread.status}</Badge>
          <Badge variant="muted">{domain}</Badge>
        </div>
        <a
          href={thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-text-cream hover:text-white flex items-center gap-1 transition-colors"
        >
          {thread.url.length > 45 ? thread.url.slice(0, 45) + '...' : thread.url}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="dotted-separator" />

      {/* Interestingness score */}
      <div className="bg-bg-deep p-3 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-olive uppercase tracking-wider">
            Interestingness
          </span>
          <span className="stat-number text-xl">
            {(thread.interestingness_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1 bg-border overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${thread.interestingness_score * 100}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-deep p-3 border border-border">
          <div className="stat-number text-xl">{thread.source_depth}</div>
          <div className="stat-label">Depth</div>
        </div>
        <div className="bg-bg-deep p-3 border border-border">
          <div className="text-sm font-mono text-text">
            {new Date(thread.created_at).toLocaleDateString()}
          </div>
          <div className="stat-label">Created</div>
        </div>
      </div>

      {/* Context */}
      {thread.context && (
        <div>
          <span className="text-xs text-muted-olive uppercase tracking-wider">
            Context
          </span>
          <p className="text-sm text-text mt-2">{thread.context}</p>
        </div>
      )}

      <div className="dotted-separator" />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => window.open(thread.url, '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
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
