import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useNetworkAwareQuery } from './use-network-status'
import { isApiError } from '@/lib/types'

// Query keys for consistent caching
export const foodQueryKeys = {
  all: ['foods'] as const,
  randomPair: () => [...foodQueryKeys.all, 'random-pair'] as const,
  leaderboard: () => [...foodQueryKeys.all, 'leaderboard'] as const,
}

export function useFoodPair() {
  const networkAwareOptions = useNetworkAwareQuery()

  return useQuery({
    queryKey: foodQueryKeys.randomPair(),
    queryFn: () => apiClient.getRandomFoodPair(),
    staleTime: 0, // Always fetch fresh pair
    gcTime: 0, // Don't cache random pairs
    ...networkAwareOptions,
    retry: (failureCount, error) => {
      // Use network-aware retry first
      if (!networkAwareOptions.retry(failureCount)) {
        return false
      }

      // Don't retry on authentication errors
      if (isApiError(error)) {
        if (error.code === 401) {
          return false
        }
        // Don't retry if there's insufficient food data
        if (
          error.code === 500 &&
          error.message?.includes('Insufficient food data')
        ) {
          return false
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
  })
}

export function useLeaderboard() {
  const networkAwareOptions = useNetworkAwareQuery()

  return useQuery({
    queryKey: foodQueryKeys.leaderboard(),
    queryFn: () => apiClient.getLeaderboard(),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
    ...networkAwareOptions,
    retry: (failureCount, error) => {
      // Use network-aware retry first
      if (!networkAwareOptions.retry(failureCount)) {
        return false
      }

      // Don't retry on authentication errors
      if (isApiError(error)) {
        if (error.code === 401) {
          return false
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
  })
}
