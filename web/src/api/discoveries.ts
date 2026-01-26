import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Discovery } from '../types';

interface DiscoveriesParams {
  since?: string;
  minSignificance?: number;
  limit?: number;
}

interface Feedback {
  discoveryId: string;
  rating: 'up' | 'down';
  timestamp: string;
}

export function useDiscoveries(params: DiscoveriesParams = {}) {
  const queryString = new URLSearchParams();
  if (params.since) queryString.set('since', params.since);
  if (params.minSignificance) queryString.set('min_significance', params.minSignificance.toString());
  if (params.limit) queryString.set('limit', params.limit.toString());

  const endpoint = `/api/discoveries${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['discoveries', params],
    queryFn: () => api.get<Discovery[]>(endpoint),
  });
}

export function useDiscovery(id: string | null) {
  return useQuery({
    queryKey: ['discovery', id],
    queryFn: () => api.get<Discovery>(`/api/discoveries/${id}`),
    enabled: !!id,
  });
}

export function useFeedback(id: string | null) {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: () => api.get<Feedback>(`/api/discoveries/${id}/feedback`).catch(() => null),
    enabled: !!id,
  });
}

export function useSetFeedback() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: 'up' | 'down' }) =>
      api.post<Feedback>(`/api/discoveries/${id}/feedback`, { rating }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['feedback', variables.id], data);
    },
  });
}
