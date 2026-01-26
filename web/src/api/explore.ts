import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ExplorationState } from '../types';

interface StartExplorationData {
  seedId?: string;
  maxDepth?: number;
}

export function useExplorationStatus() {
  return useQuery({
    queryKey: ['exploration', 'status'],
    queryFn: () => api.get<ExplorationState>('/api/explore/status'),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'running' ? 1000 : false;
    },
  });
}

export function useStartExploration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartExplorationData) =>
      api.post<{ sessionId: string }>('/api/explore', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploration', 'status'] });
    },
  });
}

export function useCancelExploration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete('/api/explore'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploration', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}
