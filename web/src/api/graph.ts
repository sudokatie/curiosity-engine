import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { GraphData } from '../types';

export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => api.get<GraphData>('/api/graph'),
  });
}

export function useExpandNode(nodeId: string | null) {
  return useQuery({
    queryKey: ['graph', 'expand', nodeId],
    queryFn: () => api.get<GraphData>(`/api/graph/expand/${nodeId}`),
    enabled: !!nodeId,
  });
}

export function useInvalidateGraph() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['graph'] });
}
