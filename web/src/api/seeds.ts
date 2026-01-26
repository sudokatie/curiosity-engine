import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Seed, SeedStatus } from '../types';

interface SeedsParams {
  status?: SeedStatus;
  limit?: number;
}

interface CreateSeedData {
  content: string;
  priority?: number;
}

interface UpdateSeedData {
  status?: SeedStatus;
  priority?: number;
}

export function useSeeds(params: SeedsParams = {}) {
  const queryString = new URLSearchParams();
  if (params.status) queryString.set('status', params.status);
  if (params.limit) queryString.set('limit', params.limit.toString());
  
  const endpoint = `/api/seeds${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['seeds', params],
    queryFn: () => api.get<Seed[]>(endpoint),
  });
}

export function useSeed(id: string | null) {
  return useQuery({
    queryKey: ['seed', id],
    queryFn: () => api.get<Seed>(`/api/seeds/${id}`),
    enabled: !!id,
  });
}

export function useCreateSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSeedData) => api.post<Seed>('/api/seeds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

export function useUpdateSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSeedData }) =>
      api.patch<Seed>(`/api/seeds/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
      queryClient.invalidateQueries({ queryKey: ['seed', id] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

export function useDeleteSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/seeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}
