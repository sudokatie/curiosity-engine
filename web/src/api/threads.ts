import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Thread, ThreadStatus } from '../types';

interface ThreadsParams {
  status?: ThreadStatus;
  seedId?: string;
  limit?: number;
}

interface UpdateThreadData {
  status?: ThreadStatus;
  priority?: number;
}

export function useThreads(params: ThreadsParams = {}) {
  const queryString = new URLSearchParams();
  if (params.status) queryString.set('status', params.status);
  if (params.seedId) queryString.set('seed_id', params.seedId);
  if (params.limit) queryString.set('limit', params.limit.toString());

  const endpoint = `/api/threads${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['threads', params],
    queryFn: () => api.get<Thread[]>(endpoint),
  });
}

export function useThread(id: string | null) {
  return useQuery({
    queryKey: ['thread', id],
    queryFn: () => api.get<Thread>(`/api/threads/${id}`),
    enabled: !!id,
  });
}

export function useUpdateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateThreadData }) =>
      api.patch<Thread>(`/api/threads/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}
