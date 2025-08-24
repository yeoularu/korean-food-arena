import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { foodQueryKeys } from './use-food-queries'
import { useRetry } from './use-retry'
import { useNetworkAwareQuery } from './use-network-status'
import { useErrorToast, useSuccessToast } from '@/components/Toast'
import type { VoteRequest } from '@/lib/types'
import { isApiError } from '@/lib/types'

// Query keys for vote-related queries
export const voteQueryKeys = {
  all: ['votes'] as const,
  stats: (pairKey: string) => [...voteQueryKeys.all, 'stats', pairKey] as const,
}

export function useVoteStats(pairKey: string) {
  const networkAwareOptions = useNetworkAwareQuery()

  return useQuery({
    queryKey: voteQueryKeys.stats(pairKey),
    queryFn: () => apiClient.getVoteStats(pairKey),
    staleTime: 10000, // Cache for 10 seconds
    ...networkAwareOptions,
    enabled: !!pairKey && networkAwareOptions.enabled,
    retry: (failureCount, error) => {
      // Use network-aware retry first
      if (!networkAwareOptions.retry(failureCount)) {
        return false
      }

      // Don't retry on authentication/authorization errors
      if (isApiError(error)) {
        if (error.code === 401 || error.code === 403) {
          return false
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
  })
}

export function useVoteMutation() {
  const queryClient = useQueryClient()
  const showError = useErrorToast()
  const showSuccess = useSuccessToast()
  const { executeWithRetry } = useRetry({
    maxRetries: 2,
    retryDelay: 1000,
  })

  return useMutation({
    mutationFn: async (vote: VoteRequest) => {
      return executeWithRetry(() => apiClient.createVote(vote))
    },
    onSuccess: (_, variables) => {
      // Conservative invalidation approach (no optimistic updates in v1)

      // Invalidate leaderboard to reflect updated ELO scores
      queryClient.invalidateQueries({
        queryKey: foodQueryKeys.leaderboard(),
      })

      // Invalidate specific pair stats
      queryClient.invalidateQueries({
        queryKey: voteQueryKeys.stats(variables.pairKey),
      })

      // Invalidate all vote stats to be safe
      queryClient.invalidateQueries({
        queryKey: voteQueryKeys.all,
      })

      // Show success message
      const voteTypeMessage =
        variables.result === 'skip'
          ? 'Vote skipped successfully'
          : variables.result === 'tie'
            ? 'Tie vote recorded successfully'
            : 'Vote recorded successfully'

      showSuccess(voteTypeMessage)
    },
    onError: (error) => {
      console.error('Vote submission failed:', error)

      // Handle specific error types
      if (isApiError(error)) {
        switch (error.code) {
          case 409:
            // Duplicate vote - show user-friendly message
            showError(
              'You have already voted on this food pairing.',
              'Duplicate Vote',
            )
            queryClient.invalidateQueries({
              queryKey: voteQueryKeys.all,
            })
            break
          case 401:
            // Authentication error
            showError(
              'Please refresh the page to continue.',
              'Authentication Required',
            )
            break
          case 403:
            // Authorization error
            showError(
              'You do not have permission to vote on this pairing.',
              'Access Denied',
            )
            break
          case 400:
            // Validation error
            showError(
              'Invalid vote data. Please try again.',
              'Validation Error',
            )
            break
          case 500:
            // Server error
            showError(
              'Server error occurred. Please try again in a moment.',
              'Server Error',
            )
            break
          default:
            // Generic API error
            showError(
              error.message || 'Failed to submit vote. Please try again.',
              'Vote Failed',
            )
            break
        }
      } else {
        // Network or other errors
        showError(
          'Network error. Please check your connection and try again.',
          'Connection Error',
        )
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (isApiError(error)) {
        if (error.code >= 400 && error.code < 500) {
          return false
        }
      }
      // Retry server errors up to 2 times
      return failureCount < 2
    },
  })
}
