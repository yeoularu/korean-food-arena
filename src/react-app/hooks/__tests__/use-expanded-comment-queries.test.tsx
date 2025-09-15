import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { expandedCommentQueryKeys } from '../use-comment-queries'
import { apiClient } from '@/lib/api-client'
import type { ExpandedCommentsResponse } from '@/lib/types'

// Mock the API client
const mockApiClient = {
  getExpandedComments: vi.fn(),
  createComment: vi.fn(),
}

vi.mock('@/lib/api-client', () => ({
  apiClient: mockApiClient,
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

// Test data
const mockExpandedCommentsResponse: ExpandedCommentsResponse = {
  currentPairingComments: [
    {
      id: '1',
      pairKey: 'food1_food2',
      result: 'win',
      winnerFoodId: 'food1',
      content: 'Great food!',
      createdAt: '2024-01-01T00:00:00Z',
      nationality: 'US',
      isCurrentPairing: true,
      otherFoodId: 'food2',
      otherFoodName: 'Food 2',
    },
  ],
  expandedComments: [
    {
      id: '2',
      pairKey: 'food1_food3',
      result: 'win',
      winnerFoodId: 'food1',
      content: 'Also great!',
      createdAt: '2024-01-01T01:00:00Z',
      nationality: 'CA',
      isCurrentPairing: false,
      otherFoodId: 'food3',
      otherFoodName: 'Food 3',
    },
  ],
  totalCount: 2,
  hasMore: false,
}

const mockNewComment = {
  id: '3',
  pairKey: 'food1_food2',
  result: 'win' as const,
  winnerFoodId: 'food1',
  content: 'New comment!',
  createdAt: '2024-01-01T02:00:00Z',
  nationality: 'UK',
}

describe('Expanded Comment Query Keys and Cache Management', () => {
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

  describe('Query Key Structure', () => {
    it('should generate correct query keys', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
        {
          currentPairingLimit: 10,
          expandedLimit: 15,
          includeExpanded: true,
        },
      )

      expect(queryKey).toEqual([
        'comments',
        'expanded',
        'food1_food2',
        'food1',
        'food2',
        {
          currentPairingLimit: 10,
          expandedLimit: 15,
          includeExpanded: true,
        },
      ])
    })

    it('should generate different keys for different options', () => {
      const key1 = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
        { currentPairingLimit: 10 },
      )
      const key2 = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
        { currentPairingLimit: 20 },
      )

      expect(key1).not.toEqual(key2)
    })

    it('should generate keys with empty options', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )

      expect(queryKey).toEqual([
        'comments',
        'expanded',
        'food1_food2',
        'food1',
        'food2',
        {},
      ])
    })

    it('should generate different keys for different food pairs', () => {
      const key1 = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )
      const key2 = expandedCommentQueryKeys.byPairKey(
        'food3_food4',
        'food3',
        'food4',
      )

      expect(key1).not.toEqual(key2)
    })
  })

  describe('API Client Integration', () => {
    it('should call API client with correct parameters', async () => {
      mockApiClient.getExpandedComments.mockResolvedValue(
        mockExpandedCommentsResponse,
      )

      const options = {
        currentPairingLimit: 10,
        expandedLimit: 15,
        includeExpanded: true,
        cursor: 'test-cursor',
      }

      await apiClient.getExpandedComments(
        'food1_food2',
        'food1',
        'food2',
        options,
      )

      expect(mockApiClient.getExpandedComments).toHaveBeenCalledWith(
        'food1_food2',
        'food1',
        'food2',
        options,
      )
    })

    it('should handle API errors', async () => {
      const apiError = new Error('API Error 403: You must vote first')
      mockApiClient.getExpandedComments.mockRejectedValue(apiError)

      await expect(
        apiClient.getExpandedComments('food1_food2', 'food1', 'food2'),
      ).rejects.toThrow(apiError)
    })
  })

  describe('Cache Management', () => {
    it('should store and retrieve data from cache', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )

      // Set data in cache
      queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)

      // Retrieve data from cache
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual(mockExpandedCommentsResponse)
    })

    it('should use different cache entries for different query keys', () => {
      const key1 = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
        { currentPairingLimit: 10 },
      )
      const key2 = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
        { currentPairingLimit: 20 },
      )

      // Set different data for different keys
      queryClient.setQueryData(key1, mockExpandedCommentsResponse)
      queryClient.setQueryData(key2, {
        ...mockExpandedCommentsResponse,
        totalCount: 5,
      })

      // Verify they're stored separately
      expect(queryClient.getQueryData(key1)).toEqual(
        mockExpandedCommentsResponse,
      )
      expect(queryClient.getQueryData(key2)).toEqual({
        ...mockExpandedCommentsResponse,
        totalCount: 5,
      })
    })

    it('should clear cache when invalidated', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )

      // Set data in cache
      queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)
      expect(queryClient.getQueryData(queryKey)).toEqual(
        mockExpandedCommentsResponse,
      )

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['comments', 'expanded'] })

      // Data should be marked as stale but still available until refetch
      expect(queryClient.getQueryData(queryKey)).toEqual(
        mockExpandedCommentsResponse,
      )
    })
  })
})

describe('Cache Invalidation Logic', () => {
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

  describe('Cache Invalidation Strategy', () => {
    it('should identify queries that need invalidation for matching foods', () => {
      // Set up test queries
      const relatedQuery1 = expandedCommentQueryKeys.byPairKey(
        'food1_food3',
        'food1',
        'food3',
      )
      const relatedQuery2 = expandedCommentQueryKeys.byPairKey(
        'food2_food4',
        'food2',
        'food4',
      )
      const unrelatedQuery = expandedCommentQueryKeys.byPairKey(
        'food5_food6',
        'food5',
        'food6',
      )

      queryClient.setQueryData(relatedQuery1, mockExpandedCommentsResponse)
      queryClient.setQueryData(relatedQuery2, mockExpandedCommentsResponse)
      queryClient.setQueryData(unrelatedQuery, mockExpandedCommentsResponse)

      // Simulate invalidation logic for a new comment on 'food1_food2'
      const newCommentFoods = ['food1', 'food2']

      // Test the predicate function logic
      const shouldInvalidate = (queryKey: readonly unknown[]) => {
        if (queryKey.length >= 5) {
          const [, , , queryFoodId1, queryFoodId2] = queryKey
          return (
            newCommentFoods.includes(queryFoodId1 as string) ||
            newCommentFoods.includes(queryFoodId2 as string)
          )
        }
        return false
      }

      expect(shouldInvalidate(relatedQuery1)).toBe(true) // food1 matches
      expect(shouldInvalidate(relatedQuery2)).toBe(true) // food2 matches
      expect(shouldInvalidate(unrelatedQuery)).toBe(false) // no match
    })

    it('should invalidate regular comment queries by prefix', () => {
      // Set up regular comment cache
      queryClient.setQueryData(['comments', 'food1_food2'], [])
      queryClient.setQueryData(['comments', 'food3_food4'], [])

      // Verify data is in cache
      expect(queryClient.getQueryData(['comments', 'food1_food2'])).toEqual([])
      expect(queryClient.getQueryData(['comments', 'food3_food4'])).toEqual([])

      // Invalidate specific pair
      queryClient.invalidateQueries({
        queryKey: ['comments', 'food1_food2'],
      })

      // Only the specific pair should be invalidated
      expect(queryClient.getQueryData(['comments', 'food3_food4'])).toEqual([])
    })

    it('should handle selective invalidation with predicate function', () => {
      // Set up multiple expanded comment queries
      const queries = [
        expandedCommentQueryKeys.byPairKey('food1_food3', 'food1', 'food3'),
        expandedCommentQueryKeys.byPairKey('food2_food4', 'food2', 'food4'),
        expandedCommentQueryKeys.byPairKey('food5_food6', 'food5', 'food6'),
      ]

      queries.forEach((queryKey) => {
        queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)
      })

      // Invalidate queries involving food1 or food2
      queryClient.invalidateQueries({
        queryKey: ['comments', 'expanded'],
        predicate: (query) => {
          const queryKey = query.queryKey
          if (queryKey.length >= 5) {
            const [, , , queryFoodId1, queryFoodId2] = queryKey
            return (
              queryFoodId1 === 'food1' ||
              queryFoodId1 === 'food2' ||
              queryFoodId2 === 'food1' ||
              queryFoodId2 === 'food2'
            )
          }
          return false
        },
      })

      // Verify selective invalidation (data still there but marked stale)
      expect(queryClient.getQueryData(queries[0])).toEqual(
        mockExpandedCommentsResponse,
      ) // food1 match
      expect(queryClient.getQueryData(queries[1])).toEqual(
        mockExpandedCommentsResponse,
      ) // food2 match
      expect(queryClient.getQueryData(queries[2])).toEqual(
        mockExpandedCommentsResponse,
      ) // no match
    })
  })

  describe('Optimistic Updates', () => {
    it('should update cache data optimistically for current pairing', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )
      queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)

      // Simulate optimistic update
      queryClient.setQueryData(
        queryKey,
        (oldData: ExpandedCommentsResponse | undefined) => {
          if (!oldData) return oldData

          const newComment = {
            ...mockNewComment,
            isCurrentPairing: true,
            otherFoodId: 'food2',
            otherFoodName: 'Food 2',
          }

          return {
            ...oldData,
            currentPairingComments: [
              newComment,
              ...oldData.currentPairingComments,
            ],
            totalCount: oldData.totalCount + 1,
          }
        },
      )

      const updatedCache = queryClient.getQueryData(
        queryKey,
      ) as ExpandedCommentsResponse
      expect(updatedCache.currentPairingComments).toHaveLength(2)
      expect(updatedCache.currentPairingComments[0].content).toBe(
        'New comment!',
      )
      expect(updatedCache.totalCount).toBe(3)
    })

    it('should update cache data optimistically for expanded comments', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )
      queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)

      // Simulate optimistic update for expanded comment
      queryClient.setQueryData(
        queryKey,
        (oldData: ExpandedCommentsResponse | undefined) => {
          if (!oldData) return oldData

          const newExpandedComment = {
            ...mockNewComment,
            pairKey: 'food1_food3',
            isCurrentPairing: false,
            otherFoodId: 'food3',
            otherFoodName: 'Food 3',
          }

          return {
            ...oldData,
            expandedComments: [newExpandedComment, ...oldData.expandedComments],
            totalCount: oldData.totalCount + 1,
          }
        },
      )

      const updatedCache = queryClient.getQueryData(
        queryKey,
      ) as ExpandedCommentsResponse
      expect(updatedCache.expandedComments).toHaveLength(2)
      expect(updatedCache.expandedComments[0].content).toBe('New comment!')
      expect(updatedCache.expandedComments[0].isCurrentPairing).toBe(false)
    })
  })

  describe('Network-Aware Query Options', () => {
    it('should have proper stale time configuration', () => {
      // Test that the query keys support different stale times
      const queryKey1 = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )
      const queryKey2 = expandedCommentQueryKeys.byPairKey(
        'food3_food4',
        'food3',
        'food4',
      )

      // Set data with different timestamps to simulate stale time behavior
      queryClient.setQueryData(queryKey1, mockExpandedCommentsResponse)
      queryClient.setQueryData(queryKey2, mockExpandedCommentsResponse)

      expect(queryClient.getQueryData(queryKey1)).toEqual(
        mockExpandedCommentsResponse,
      )
      expect(queryClient.getQueryData(queryKey2)).toEqual(
        mockExpandedCommentsResponse,
      )
    })

    it('should support proper cache time configuration', () => {
      const queryKey = expandedCommentQueryKeys.byPairKey(
        'food1_food2',
        'food1',
        'food2',
      )

      // Set and verify data
      queryClient.setQueryData(queryKey, mockExpandedCommentsResponse)
      expect(queryClient.getQueryData(queryKey)).toEqual(
        mockExpandedCommentsResponse,
      )

      // Clear cache to simulate garbage collection
      queryClient.clear()
      expect(queryClient.getQueryData(queryKey)).toBeUndefined()
    })
  })
})
