import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { foodQueryKeys } from './use-food-queries'
import type { VoteRequest } from '@/lib/types'

// Query keys for vote-related queries
export const voteQueryKeys = {
  all: ['votes'] as const,
  stats: (pairKey: string) => [...voteQueryKeys.all, 'stats', pairKey] as const,
}

export function useVoteStats(pairKey: string) {
  return useQuery({
    queryKey: voteQueryKeys.stats(pairKey),
    queryFn: () => apiClient.getVoteStats(pairKey),
    enabled: !!pairKey,
    staleTime: 10000, // Cache for 10 seconds
  })
}

export function useVoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vote: VoteRequest) => apiClient.createVote(vote),
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
    },
    onError: (error) => {
      console.error('Vote submission failed:', error)
    },
  })
}
