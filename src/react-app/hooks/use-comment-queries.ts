import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CommentRequest } from '@/lib/types'

// Query keys for comment-related queries
export const commentQueryKeys = {
  all: ['comments'] as const,
  byPairKey: (pairKey: string, limit?: number) =>
    [...commentQueryKeys.all, pairKey, limit] as const,
}

export function useComments(pairKey: string, limit = 20) {
  return useQuery({
    queryKey: commentQueryKeys.byPairKey(pairKey, limit),
    queryFn: () => apiClient.getComments(pairKey, limit),
    enabled: !!pairKey,
    staleTime: 30000, // Cache for 30 seconds
  })
}

export function useCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (comment: CommentRequest) => apiClient.createComment(comment),
    onSuccess: (_, variables) => {
      // Invalidate comments for this specific pair
      queryClient.invalidateQueries({
        queryKey: commentQueryKeys.byPairKey(variables.pairKey),
      })
    },
    onError: (error) => {
      console.error('Comment submission failed:', error)
    },
  })
}
