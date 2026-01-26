import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { KnowledgeGraph } from './components/graph/KnowledgeGraph';
import { SeedList } from './components/seeds/SeedList';
import { DiscoveryGrid } from './components/discoveries/DiscoveryGrid';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useUIStore } from './store/ui';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function MainContent() {
  const { viewMode } = useUIStore();

  switch (viewMode) {
    case 'graph':
      return <KnowledgeGraph />;
    case 'seeds':
      return <SeedList />;
    case 'discoveries':
      return <DiscoveryGrid />;
    case 'settings':
      return <SettingsPanel />;
    default:
      return <KnowledgeGraph />;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <MainContent />
      </Layout>
    </QueryClientProvider>
  );
}
