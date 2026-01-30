import { Search, Sparkles, Loader2, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useUIStore, type ViewMode } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { useStartExploration, useExplorationStatus } from '../../api/explore';

const tabs: { id: ViewMode; label: string; num: string }[] = [
  { id: 'graph', label: 'Graph', num: '01' },
  { id: 'seeds', label: 'Seeds', num: '02' },
  { id: 'discoveries', label: 'Discoveries', num: '03' },
  { id: 'settings', label: 'Settings', num: '04' },
];

export function Header() {
  const { viewMode, setViewMode, searchQuery, setSearchQuery } = useUIStore();
  const { user, logout } = useAuthStore();
  const { data: explorationStatus } = useExplorationStatus();
  const startExploration = useStartExploration();

  const isExploring = explorationStatus?.status === 'running';

  const handleExplore = () => {
    if (!isExploring) {
      startExploration.mutate({});
    }
  };

  return (
    <header className="h-14 bg-panel flex items-center px-4 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-text-cream rotate-45 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-text-cream rotate-45" />
        </div>
        <h1 className="font-serif text-lg text-text-cream tracking-wide">
          Curiosity Engine
        </h1>
      </div>

      {/* Dotted separator */}
      <div className="flex-shrink-0 w-px h-6 dotted-separator-v" />

      {/* Navigation - numbered */}
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm transition-colors
              ${viewMode === tab.id
                ? 'text-text-cream'
                : 'text-muted hover:text-text'
              }
            `}
          >
            <span className="font-mono text-xs text-muted-olive">{tab.num}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Search */}
      <div className="flex-1 max-w-sm ml-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-olive" />
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg border border-border pl-9 pr-3 py-2 text-sm text-text placeholder-muted-olive focus:outline-none focus:border-text-cream transition-colors"
          />
        </div>
      </div>

      {/* Explore button */}
      <Button
        variant="primary"
        onClick={handleExplore}
        disabled={isExploring || startExploration.isPending}
      >
        {isExploring ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exploring
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Explore
          </>
        )}
      </Button>

      {/* User section */}
      <div className="flex items-center gap-3 pl-4 border-l border-border">
        <span className="text-xs text-muted font-mono">{user?.email}</span>
        <button
          onClick={logout}
          className="p-2 text-muted hover:text-accent transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
