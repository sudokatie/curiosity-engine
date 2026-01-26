import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUIStore, type ViewMode } from '../../store/ui';
import { useStartExploration, useExplorationStatus } from '../../api/explore';

const tabs: { id: ViewMode; label: string }[] = [
  { id: 'graph', label: 'Graph' },
  { id: 'seeds', label: 'Seeds' },
  { id: 'discoveries', label: 'Discoveries' },
  { id: 'settings', label: 'Settings' },
];

export function Header() {
  const { viewMode, setViewMode, searchQuery, setSearchQuery } = useUIStore();
  const { data: explorationStatus } = useExplorationStatus();
  const startExploration = useStartExploration();

  const isExploring = explorationStatus?.status === 'running';

  const handleExplore = () => {
    if (!isExploring) {
      startExploration.mutate({});
    }
  };

  return (
    <header className="h-14 bg-panel border-b border-border flex items-center px-4 gap-4">
      <h1 className="text-lg font-semibold text-text whitespace-nowrap">
        Curiosity Engine
      </h1>

      <nav className="flex gap-1 ml-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`
              px-3 py-1.5 rounded text-sm font-medium transition-colors
              ${viewMode === tab.id
                ? 'bg-accent text-white'
                : 'text-muted hover:text-text hover:bg-panel-strong'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 max-w-md ml-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      </div>

      <Button
        onClick={handleExplore}
        disabled={isExploring || startExploration.isPending}
      >
        {isExploring ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exploring...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Explore
          </>
        )}
      </Button>
    </header>
  );
}
