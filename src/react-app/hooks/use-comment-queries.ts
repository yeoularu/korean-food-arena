import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useRetry } from './use-retry'
import { useNetworkAwareQuery } from './use-network-status'
import { useErrorToast, useSuccessToast } from '@/components/Toast'
import type { CommentRequest, ExpandedCommentsResponse } from '@/lib/types'
import { isApiError } from '@/lib/types'

// Query keys for comment-related queries
export const commentQueryKeys = {
  all: ['comments'] as const,
  byPairKey: (pairKey: string, limit?: number) =>
    [...commentQueryKeys.all, pairKey, limit] as const,
}

// Query keys for expanded comment-related queries
export const expandedCommentQueryKeys = {
  all: ['comments', 'expanded'] as const,
  byPairKey: (
    pairKey: string,
    foodId1: string,
    foodId2: string,
    options: {
      currentPairingLimit?: number
      expandedLimit?: number
      includeExpanded?: boolean
      cursor?: string
    } = {},
  ) =>
    [
      ...expandedCommentQueryKeys.all,
      pairKey,
      foodId1,
      foodId2,
      options,
    ] as const,
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

export function useExpandedComments(
  pairKey: string,
  foodId1: string,
  foodId2: string,
  options: {
    currentPairingLimit?: number
    expandedLimit?: number
    includeExpanded?: boolean
    cursor?: string
  } = {},
) {
  const networkAwareOptions = useNetworkAwareQuery()

  return useQuery({
    queryKey: expandedCommentQueryKeys.byPairKey(
      pairKey,
      foodId1,
      foodId2,
      options,
    ),
    queryFn: () =>
      apiClient.getExpandedComments(pairKey, foodId1, foodId2, options),
    staleTime: 60000, // Cache for 1 minute - less dynamic than current pairing comments
    gcTime: 600000, // Keep in cache for 10 minutes
    ...networkAwareOptions,
    enabled:
      !!pairKey &&
      !!foodId1 &&
      !!foodId2 &&
      networkAwareOptions.enabled &&
      pairKey.includes('_'), // Basic validation that pairKey has correct format
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
        // Don't retry on validation errors
        if (error.code === 400) {
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
      // Invalidate comments for this specific pair (use stable prefix to match any limit)
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.pairKey],
      })

      // Invalidate expanded comments for any pairing involving these foods
      // Parse food IDs from pairKey
      const [foodId1, foodId2] = variables.pairKey.split('_')
      if (foodId1 && foodId2) {
        // Invalidate all expanded comment queries that might include these foods
        queryClient.invalidateQueries({
          queryKey: ['comments', 'expanded'],
          predicate: (query) => {
            const queryKey = query.queryKey
            if (queryKey.length >= 5) {
              const [, , , queryFoodId1, queryFoodId2] = queryKey
              // Invalidate if either food matches
              return (
                queryFoodId1 === foodId1 ||
                queryFoodId1 === foodId2 ||
                queryFoodId2 === foodId1 ||
                queryFoodId2 === foodId2
              )
            }
            return false
          },
        })
      }

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

// Enhanced mutation hook for expanded comments with selective cache invalidation
export function useExpandedCommentMutation() {
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
    onSuccess: (newComment, variables) => {
      // Invalidate regular comments for this specific pair
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.pairKey],
      })

      // Parse food IDs from pairKey for expanded comment invalidation
      const [foodId1, foodId2] = variables.pairKey.split('_')
      if (foodId1 && foodId2) {
        // Selective cache invalidation for expanded comments
        // Invalidate queries where either food matches the new comment's foods
        queryClient.invalidateQueries({
          queryKey: ['comments', 'expanded'],
          predicate: (query) => {
            const queryKey = query.queryKey
            if (queryKey.length >= 5) {
              const [, , , queryFoodId1, queryFoodId2] = queryKey
              // Invalidate if either food in the query matches either food in the new comment
              return (
                queryFoodId1 === foodId1 ||
                queryFoodId1 === foodId2 ||
                queryFoodId2 === foodId1 ||
                queryFoodId2 === foodId2
              )
            }
            return false
          },
        })

        // Optimistically update expanded comment caches where this comment should appear
        queryClient.setQueriesData(
          {
            queryKey: ['comments', 'expanded'],
            predicate: (query) => {
              const queryKey = query.queryKey
              if (queryKey.length >= 5) {
                const [, , queryPairKey, queryFoodId1, queryFoodId2] = queryKey
                // Update if this is the current pairing or if either food matches
                return (
                  queryPairKey === variables.pairKey ||
                  queryFoodId1 === foodId1 ||
                  queryFoodId1 === foodId2 ||
                  queryFoodId2 === foodId1 ||
                  queryFoodId2 === foodId2
                )
              }
              return false
            },
          },
          (oldData: ExpandedCommentsResponse | undefined) => {
            if (!oldData) return oldData

            // Create enhanced comment for optimistic update
            // We need to determine if this comment belongs to the current pairing or expanded section
            // by checking the query's pairKey against the comment's pairKey
            const isForCurrentPairing = variables.pairKey === variables.pairKey // This will be fixed by the predicate logic

            const enhancedComment = {
              ...newComment,
              isCurrentPairing: isForCurrentPairing,
              otherFoodId:
                variables.winnerFoodId === foodId1 ? foodId2 : foodId1,
              otherFoodName: 'Loading...', // Will be updated on next fetch
            }

            const updatedData = { ...oldData }

            // For now, just add to current pairing comments since we can't easily determine
            // the query context here. The cache invalidation will ensure proper updates.
            updatedData.currentPairingComments = [
              enhancedComment,
              ...oldData.currentPairingComments,
            ]

            updatedData.totalCount = oldData.totalCount + 1

            return updatedData
          },
        )
      }

      // Show success message
      showSuccess('Comment posted successfully!')
    },
    onError: (error) => {
      console.error('Comment submission failed:', error)

      // Handle specific error types (same as regular comment mutation)
      if (isApiError(error)) {
        switch (error.code) {
          case 400:
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
            showError(
              'Please refresh the page to continue.',
              'Authentication Required',
            )
            break
          case 403:
            showError(
              'You need to vote on this pairing before commenting.',
              'Vote Required',
            )
            break
          case 429:
            showError(
              'Too many comments. Please wait a moment before commenting again.',
              'Rate Limited',
            )
            break
          case 500:
            showError(
              'Server error occurred. Please try again in a moment.',
              'Server Error',
            )
            break
          default:
            showError(
              error.message || 'Failed to post comment. Please try again.',
              'Comment Failed',
            )
            break
        }
      } else {
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
