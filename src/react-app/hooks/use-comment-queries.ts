import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useRetry } from './use-retry'
import { useNetworkAwareQuery } from './use-network-status'
import { useErrorToast, useSuccessToast } from '@/components/Toast'
import type { CommentRequest } from '@/lib/types'
import { isApiError } from '@/lib/types'

// Query keys for comment-related queries
export const commentQueryKeys = {
  all: ['comments'] as const,
  byPairKey: (pairKey: string, limit?: number) =>
    [...commentQueryKeys.all, pairKey, limit] as const,
}

export function useComments(pairKey: string, limit = 20) {
  const networkAwareOptions = useNetworkAwareQuery()

  return useQuery({
    queryKey: commentQueryKeys.byPairKey(pairKey, limit),
    queryFn: () => apiClient.getComments(pairKey, limit),
    staleTime: 30000, // Cache for 30 seconds
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

export function useCommentMutation() {
  const queryClient = useQueryClient()
  const showError = useErrorToast()
  const showSuccess = useSuccessToast()
  const { executeWithRetry } = useRetry({
    maxRetries: 2,
    retryDelay: 1000,
  })

  return useMutation({
    mutationFn: async (comment: CommentRequest) => {
      return executeWithRetry(() => apiClient.createComment(comment))
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this specific pair
      queryClient.invalidateQueries({
        queryKey: commentQueryKeys.byPairKey(variables.pairKey),
      })

      // Show success message
      showSuccess('Comment posted successfully!')
    },
    onError: (error) => {
      console.error('Comment submission failed:', error)

      // Handle specific error types
      if (isApiError(error)) {
        switch (error.code) {
          case 400:
            // Validation error - content might be too long or invalid
            if (error.message.includes('280')) {
              showError(
                'Comment is too long. Please keep it under 280 characters.',
                'Comment Too Long',
              )
            } else {
              showError(
                'Invalid comment content. Please check your input.',
                'Validation Error',
              )
            }
            break
          case 401:
            // Authentication error
            showError(
              'Please refresh the page to continue.',
              'Authentication Required',
            )
            break
          case 403:
            // Authorization error - user might not have voted yet
            showError(
              'You need to vote on this pairing before commenting.',
              'Vote Required',
            )
            break
          case 429:
            // Rate limiting
            showError(
              'Too many comments. Please wait a moment before commenting again.',
              'Rate Limited',
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
              error.message || 'Failed to post comment. Please try again.',
              'Comment Failed',
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
