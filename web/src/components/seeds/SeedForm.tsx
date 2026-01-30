import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateSeed } from '../../api/seeds';
import { Button } from '../ui/Button';

interface SeedFormProps {
  onClose: () => void;
}

export function SeedForm({ onClose }: SeedFormProps) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState(0.5);
  const createSeed = useCreateSeed();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createSeed.mutate(
      { content: content.trim(), priority },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-panel border border-border w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs font-medium text-muted-olive uppercase tracking-wider">
            Add Seed
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter a topic, question, or URL..."
              className="
                w-full bg-bg border border-border px-3 py-2.5 text-text
                placeholder-muted-olive min-h-[120px] resize-none
                focus:outline-none focus:border-text-cream transition-colors
              "
              autoFocus
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-muted-olive uppercase tracking-wider">
                Priority
              </label>
              <span className="text-sm font-mono text-text-cream">
                {priority.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={priority}
              onChange={(e) => setPriority(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between mt-1 text-xs text-muted-olive">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <div className="dotted-separator" />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!content.trim() || createSeed.isPending}
            >
              {createSeed.isPending ? 'Adding...' : 'Add Seed'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
