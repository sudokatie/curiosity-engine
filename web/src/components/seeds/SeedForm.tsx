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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-medium text-text">Add Seed</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-panel-strong text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter a topic, question, or URL..."
              className="
                w-full bg-bg border border-border rounded px-3 py-2 text-text
                placeholder-muted min-h-[100px] resize-none
                focus:outline-none focus:border-accent
              "
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">
              Priority: {priority.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={priority}
              onChange={(e) => setPriority(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
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
