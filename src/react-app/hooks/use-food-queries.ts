import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Query keys for consistent caching
export const foodQueryKeys = {
  all: ['foods'] as const,
  randomPair: () => [...foodQueryKeys.all, 'random-pair'] as const,
  leaderboard: () => [...foodQueryKeys.all, 'leaderboard'] as const,
}

export function useFoodPair() {
  return useQuery({
    queryKey: foodQueryKeys.randomPair(),
    queryFn: () => apiClient.getRandomFoodPair(),
    staleTime: 0, // Always fetch fresh pair
    gcTime: 0, // Don't cache random pairs
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: foodQueryKeys.leaderboard(),
    queryFn: () => apiClient.getLeaderboard(),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  })
}
