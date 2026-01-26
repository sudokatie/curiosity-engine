import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CuriosityConfig } from '../types';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<CuriosityConfig>('/api/config'),
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<CuriosityConfig>) =>
      api.patch<CuriosityConfig>('/api/config', updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['config'], data);
    },
  });
}
