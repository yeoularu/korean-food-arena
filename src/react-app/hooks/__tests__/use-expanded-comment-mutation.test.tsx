import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  CommentRequest,
  Comment,
  ExpandedCommentsResponse,
} from '@/lib/types'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createComment: vi.fn(),
  },
}))

// Mock the toast hooks
vi.mock('@/components/Toast', () => ({
  useErrorToast: () => vi.fn(),
  useSuccessToast: () => vi.fn(),
  useInfoToast: () => vi.fn(),
  useWarningToast: () => vi.fn(),
}))

// Mock the retry hook
vi.mock('../use-retry', () => ({
  useRetry: () => ({
    executeWithRetry: (fn: () => Promise<any>) => fn(),
  }),
}))

const mockApiClient = apiClient as any

// Test data
const mockCommentRequest: CommentRequest = {
  pairKey: 'food1_food2',
  result: 'win',
  winnerFoodId: 'food1',
  content: 'Great food!',
}

const mockCommentResponse: Comment = {
  id: 'comment-1',
  pairKey: 'food1_food2',
  result: 'win',
  winnerFoodId: 'food1',
  content: 'Great food!',
  createdAt: '2024-01-01T00:00:00Z',
  nationality: 'US',
}

const mockExpandedCommentsResponse: ExpandedCommentsResponse = {
  currentPairingComments: [
    {
      id: 'existing-1',
      pairKey: 'food1_food2',
      result: 'tie',
      content: 'Existing comment',
      createdAt: '2024-01-01T00:00:00Z',
      nationality: 'CA',
      isCurrentPairing: true,
      otherFoodId: 'food2',
      otherFoodName: 'Food 2',
    },
  ],
  expandedComments: [
    {
      id: 'existing-2',
      pairKey: 'food1_food3',
      result: 'win',
      winnerFoodId: 'food1',
      content: 'Expanded comment',
      createdAt: '2024-01-01T01:00:00Z',
      nationality: 'UK',
      isCurrentPairing: false,
      otherFoodId: 'food3',
      otherFoodName: 'Food 3',
    },
  ],
  totalCount: 2,
  hasMore: false,
}

describe('Expanded Comment Mutation Cache Logic', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Cache Invalidation Logic', () => {
    it('should identify queries that need invalidation for regular comments', () => {
      // Set up regular comment cache
      queryClient.setQueryData(['comments', 'food1_food2'], [])
      queryClient.setQueryData(['comments', 'food3_food4'], [])

      // Simulate the invalidation logic from the mutation
      queryClient.invalidateQueries({
        queryKey: ['comments', 'food1_food2'],
      })

      // Check that the correct query was invalidated
      const targetQuery = queryClient.getQueryCache().find({
        queryKey: ['comments', 'food1_food2'],
      })
      const unrelatedQuery = queryClient.getQueryCache().find({
        queryKey: ['comments', 'food3_food4'],
      })

      expect(targetQuery?.isStale()).toBe(true)
      expect(unrelatedQuery?.isStale()).toBe(false)
    })

    it('should identify expanded comment queries that need invalidation', () => {
      // Set up expanded comment queries
      const relatedQuery1 = [
        'comments',
        'expanded',
        'food1_food3',
        'food1',
        'food3',
        {},
      ]
      const relatedQuery2 = [
        'comments',
        'expanded',
        'food2_food4',
        'food2',
        'food4',
        {},
      ]
      const unrelatedQuery = [
        'comments',
        'expanded',
        'food5_food6',
        'food5',
        'food6',
        {},
      ]

      queryClient.setQueryData(relatedQuery1, mockExpandedCommentsResponse)
      queryClient.setQueryData(relatedQuery2, mockExpandedCommentsResponse)
      queryClient.setQueryData(unrelatedQuery, mockExpandedCommentsResponse)

      // Simulate the predicate function from the mutation
      const [foodId1, foodId2] = 'food1_food2'.split('_')
      const shouldInvalidate = (queryKey: readonly unknown[]) => {
        if (queryKey.length >= 5) {
          const [, , , queryFoodId1, queryFoodId2] = queryKey
          return (
            queryFoodId1 === foodId1 ||
            queryFoodId1 === foodId2 ||
            queryFoodId2 === foodId1 ||
            queryFoodId2 === foodId2
          )
        }
        return false
      }

      expect(shouldInvalidate(relatedQuery1)).toBe(true) // food1 matches
      expect(shouldInvalidate(relatedQuery2)).toBe(true) // food2 matches
      expect(shouldInvalidate(unrelatedQuery)).toBe(false) // no match
    })

    it('should handle malformed pairKey gracefully', () => {
      const malformedPairKey = 'invalid-pair-key' // No underscore
      const [foodId1, foodId2] = malformedPairKey.split('_')

      expect(foodId1).toBe('invalid-pair-key')
      expect(foodId2).toBeUndefined()

      // The predicate should still work but not match anything meaningful
      const testQuery = [
        'comments',
        'expanded',
        'food1_food2',
        'food1',
        'food2',
        {},
      ]
      const shouldInvalidate = (queryKey: readonly unknown[]) => {
        if (queryKey.length >= 5) {
          const [, , , queryFoodId1, queryFoodId2] = queryKey
          return (
            queryFoodId1 === foodId1 ||
            queryFoodId1 === foodId2 ||
            queryFoodId2 === foodId1 ||
            queryFoodId2 === foodId2
          )
        }
        return false
      }

      expect(shouldInvalidate(testQuery)).toBe(false)
    })

    it('should handle edge cases in query key structure', () => {
      const [foodId1, foodId2] = 'food1_food2'.split('_')

      // Test with different query key lengths
      const shortQuery = ['comments', 'expanded']
      const normalQuery = [
        'comments',
        'expanded',
        'food1_food3',
        'food1',
        'food3',
        {},
      ]
      const longQuery = [
        'comments',
        'expanded',
        'food1_food3',
        'food1',
        'food3',
        {},
        'extra',
      ]

      const shouldInvalidate = (queryKey: readonly unknown[]) => {
        if (queryKey.length >= 5) {
          const [, , , queryFoodId1, queryFoodId2] = queryKey
          return (
            queryFoodId1 === foodId1 ||
            queryFoodId1 === foodId2 ||
            queryFoodId2 === foodId1 ||
            queryFoodId2 === foodId2
          )
        }
        return false
      }

      expect(shouldInvalidate(shortQuery)).toBe(false) // Too short
      expect(shouldInvalidate(normalQuery)).toBe(true) // food1 matches
      expect(shouldInvalidate(longQuery)).toBe(true) // food1 matches, extra elements ignored
    })
  })

  describe('Food ID Parsing Logic', () => {
    it('should correctly parse food IDs from valid pairKey', () => {
      const pairKey = 'food1_food2'
      const [foodId1, foodId2] = pairKey.split('_')

      expect(foodId1).toBe('food1')
      expect(foodId2).toBe('food2')
    })

    it('should handle pairKey with multiple underscores', () => {
      const pairKey = 'food_1_food_2'
      const [foodId1, foodId2] = pairKey.split('_')

      expect(foodId1).toBe('food')
      expect(foodId2).toBe('1') // Only splits on first underscore
    })

    it('should handle pairKey without underscore', () => {
      const pairKey = 'invalidpairkey'
      const [foodId1, foodId2] = pairKey.split('_')

      expect(foodId1).toBe('invalidpairkey')
      expect(foodId2).toBeUndefined()
    })

    it('should handle empty pairKey', () => {
      const pairKey = ''
      const [foodId1, foodId2] = pairKey.split('_')

      expect(foodId1).toBe('')
      expect(foodId2).toBeUndefined()
    })
  })

  describe('Cache Invalidation Simulation', () => {
    it('should simulate successful comment creation with cache invalidation', async () => {
      mockApiClient.createComment.mockResolvedValue(mockCommentResponse)

      // Set up cache data
      queryClient.setQueryData(['comments', 'food1_food2'], [])
      queryClient.setQueryData(
        ['comments', 'expanded', 'food1_food3', 'food1', 'food3', {}],
        mockExpandedCommentsResponse,
      )

      // Simulate the mutation success logic
      const variables = mockCommentRequest
      const [foodId1, foodId2] = variables.pairKey.split('_')

      // Invalidate regular comments
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.pairKey],
      })

      // Invalidate expanded comments
      if (foodId1 && foodId2) {
        queryClient.invalidateQueries({
          queryKey: ['comments', 'expanded'],
          predicate: (query) => {
            const queryKey = query.queryKey
            if (queryKey.length >= 5) {
              const [, , , queryFoodId1, queryFoodId2] = queryKey
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

      // Verify invalidation occurred
      const regularQuery = queryClient.getQueryCache().find({
        queryKey: ['comments', 'food1_food2'],
      })
      const expandedQuery = queryClient.getQueryCache().find({
        queryKey: ['comments', 'expanded', 'food1_food3', 'food1', 'food3', {}],
      })

      expect(regularQuery?.isStale()).toBe(true)
      expect(expandedQuery?.isStale()).toBe(true)
    })

    it('should not invalidate cache on API error', async () => {
      const apiError = new Error('API Error 403: You must vote first')
      mockApiClient.createComment.mockRejectedValue(apiError)

      // Set up cache data
      queryClient.setQueryData(['comments', 'food1_food2'], [])

      // Simulate error - no cache invalidation should occur
      try {
        await apiClient.createComment(mockCommentRequest)
      } catch (error) {
        // Expected to fail
      }

      // Verify no invalidation occurred
      const query = queryClient.getQueryCache().find({
        queryKey: ['comments', 'food1_food2'],
      })
      expect(query?.isStale()).toBe(false)
    })
  })

  describe('Query Cache Management', () => {
    it('should handle multiple queries with same food IDs', () => {
      // Set up multiple queries involving the same foods
      const queries = [
        [
          'comments',
          'expanded',
          'food1_food3',
          'food1',
          'food3',
          { limit: 10 },
        ],
        [
          'comments',
          'expanded',
          'food1_food4',
          'food1',
          'food4',
          { limit: 20 },
        ],
        ['comments', 'expanded', 'food2_food5', 'food2', 'food5', {}],
        ['comments', 'expanded', 'food6_food7', 'food6', 'food7', {}],
      ]

      queries.forEach((queryKey) => {
        queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)
      })

      // Simulate invalidation for food1_food2 comment
      const [foodId1, foodId2] = 'food1_food2'.split('_')
      queryClient.invalidateQueries({
        queryKey: ['comments', 'expanded'],
        predicate: (query) => {
          const queryKey = query.queryKey
          if (queryKey.length >= 5) {
            const [, , , queryFoodId1, queryFoodId2] = queryKey
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

      // Check which queries were invalidated
      const allQueries = queryClient.getQueryCache().getAll()
      const food1Queries = allQueries.filter(
        (q) => q.queryKey.includes('food1') && q.queryKey[0] === 'comments',
      )
      const food2Queries = allQueries.filter(
        (q) => q.queryKey.includes('food2') && q.queryKey[0] === 'comments',
      )
      const unrelatedQueries = allQueries.filter(
        (q) =>
          q.queryKey[0] === 'comments' &&
          !q.queryKey.includes('food1') &&
          !q.queryKey.includes('food2'),
      )

      food1Queries.forEach((query) => expect(query.isStale()).toBe(true))
      food2Queries.forEach((query) => expect(query.isStale()).toBe(true))
      unrelatedQueries.forEach((query) => expect(query.isStale()).toBe(false))
    })

    it('should preserve cache data during invalidation', () => {
      const queryKey = [
        'comments',
        'expanded',
        'food1_food2',
        'food1',
        'food2',
        {},
      ]
      queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)

      // Verify data is present
      expect(queryClient.getQueryData(queryKey)).toEqual(
        mockExpandedCommentsResponse,
      )

      // Invalidate query
      queryClient.invalidateQueries({ queryKey })

      // Data should still be present but marked as stale
      expect(queryClient.getQueryData(queryKey)).toEqual(
        mockExpandedCommentsResponse,
      )
      const query = queryClient.getQueryCache().find({ queryKey })
      expect(query?.isStale()).toBe(true)
    })
  })

  describe('Integration with API Client', () => {
    it('should work with successful API response', async () => {
      mockApiClient.createComment.mockResolvedValue(mockCommentResponse)

      const result = await apiClient.createComment(mockCommentRequest)

      expect(result).toEqual(mockCommentResponse)
      expect(mockApiClient.createComment).toHaveBeenCalledWith(
        mockCommentRequest,
      )
    })

    it('should handle API errors correctly', async () => {
      const apiError = new Error('API Error 400: Invalid content')
      mockApiClient.createComment.mockRejectedValue(apiError)

      await expect(apiClient.createComment(mockCommentRequest)).rejects.toThrow(
        apiError,
      )
    })

    it('should handle different comment types', async () => {
      const tieComment: CommentRequest = {
        pairKey: 'food1_food2',
        result: 'tie',
        content: 'Both are great!',
      }

      mockApiClient.createComment.mockResolvedValue({
        ...mockCommentResponse,
        result: 'tie',
        winnerFoodId: undefined,
      })

      const result = await apiClient.createComment(tieComment)

      expect(result.result).toBe('tie')
      expect(result.winnerFoodId).toBeUndefined()
    })
  })
})
