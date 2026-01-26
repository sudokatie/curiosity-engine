import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { KnowledgeGraph } from './components/graph/KnowledgeGraph';
import { SeedList } from './components/seeds/SeedList';
import { DiscoveryGrid } from './components/discoveries/DiscoveryGrid';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { AuthForm } from './components/auth/AuthForm';
import { FeedbackButton } from './components/feedback/FeedbackButton';
import { useUIStore } from './store/ui';
import { useAuthStore } from './store/auth';
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center font-mono">
        <div className="text-xl tracking-wider">CURIOSITY ENGINE</div>
        <div className="text-gray-500 text-sm mt-2">Loading...</div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <>
      <Layout>
        <MainContent />
      </Layout>
      <FeedbackButton />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
