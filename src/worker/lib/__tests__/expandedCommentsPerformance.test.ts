import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { getExpandedComments } from '../expandedComments'
import { comment, user, food } from '../../db/schema'
import { PERFORMANCE_THRESHOLDS } from '../performanceMonitoring'

// Mock D1 database for testing
const mockD1 = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  all: vi.fn(),
  run: vi.fn(),
  first: vi.fn(),
  batch: vi.fn(),
} as any

const db = drizzle(mockD1)

describe('Expanded Comments Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Large Dataset Performance', () => {
    it('should handle large numbers of current pairing comments efficiently', async () => {
      // Mock large dataset of current pairing comments
      const largeCurrentComments = Array.from({ length: 100 }, (_, i) => ({
        id: `current-comment-${i}`,
        pairKey: 'food1_food2',
        result: i % 2 === 0 ? 'win' : 'tie',
        winnerFoodId: i % 2 === 0 ? 'food1' : null,
        content: `Current pairing comment ${i} with some content`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        nationality:
          i % 3 === 0 ? 'Korean' : i % 3 === 1 ? 'American' : 'Japanese',
      }))

      const mockFoods = [
        { id: 'food1', name: 'Kimchi' },
        { id: 'food2', name: 'Bulgogi' },
      ]

      // Mock database responses
      mockD1.all
        .mockResolvedValueOnce({ results: largeCurrentComments.slice(0, 15) }) // Current pairing comments (limited)
        .mockResolvedValueOnce({ results: [] }) // No expanded comments
        .mockResolvedValueOnce({ results: mockFoods }) // Food names

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      const startTime = Date.now()
      const result = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 15,
        expandedLimit: 25,
        includeExpanded: true,
      })
      const executionTime = Date.now() - startTime

      // Verify performance
      expect(executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING,
      )
      expect(result.currentPairingComments).toHaveLength(15)
      expect(result.expandedComments).toHaveLength(0)

      // Check if performance data is included in development mode
      if (process.env.NODE_ENV === 'development') {
        expect((result as any)._performance).toBeDefined()
        expect((result as any)._performance.queryTime).toBeGreaterThan(0)
        expect((result as any)._performance.responseSize).toBeGreaterThan(0)
      }

      consoleSpy.mockRestore()
    })

    it('should handle large numbers of expanded comments efficiently', async () => {
      // Mock large dataset of expanded comments
      const largeExpandedComments = Array.from({ length: 200 }, (_, i) => ({
        id: `expanded-comment-${i}`,
        pairKey: `food1_food${i + 3}`, // Different pairings
        result: i % 3 === 0 ? 'win' : i % 3 === 1 ? 'tie' : 'win',
        winnerFoodId: i % 3 !== 1 ? 'food1' : null, // food1 wins or tie
        content: `Expanded comment ${i} with detailed content about the food comparison`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        nationality:
          i % 4 === 0
            ? 'Korean'
            : i % 4 === 1
              ? 'American'
              : i % 4 === 2
                ? 'Japanese'
                : 'Chinese',
      }))

      const mockFoods = Array.from({ length: 50 }, (_, i) => ({
        id: `food${i + 1}`,
        name: `Food ${i + 1}`,
      }))

      // Mock database responses
      mockD1.all
        .mockResolvedValueOnce({ results: [] }) // No current pairing comments
        .mockResolvedValueOnce({ results: largeExpandedComments.slice(0, 25) }) // Expanded comments (limited)
        .mockResolvedValueOnce({ results: mockFoods }) // Food names

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      const startTime = Date.now()
      const result = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 10,
        expandedLimit: 25,
        includeExpanded: true,
      })
      const executionTime = Date.now() - startTime

      // Verify performance
      expect(executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING,
      )
      expect(result.currentPairingComments).toHaveLength(0)
      expect(result.expandedComments).toHaveLength(25)

      // Verify all expanded comments have proper context
      result.expandedComments.forEach((comment) => {
        expect(comment.otherFoodName).toBeDefined()
        expect(comment.otherFoodName).not.toBe('Unknown Food')
        expect(comment.isCurrentPairing).toBe(false)
      })

      consoleSpy.mockRestore()
    })

    it('should optimize limits when requested limits are too high', async () => {
      const mockComments = Array.from({ length: 10 }, (_, i) => ({
        id: `comment-${i}`,
        pairKey: 'food1_food2',
        result: 'win',
        winnerFoodId: 'food1',
        content: `Comment ${i}`,
        createdAt: new Date().toISOString(),
        nationality: 'Korean',
      }))

      const mockFoods = [
        { id: 'food1', name: 'Kimchi' },
        { id: 'food2', name: 'Bulgogi' },
      ]

      mockD1.all
        .mockResolvedValueOnce({ results: mockComments })
        .mockResolvedValueOnce({ results: mockComments })
        .mockResolvedValueOnce({ results: mockFoods })

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      // Request very high limits that should be optimized
      const result = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 50, // Too high
        expandedLimit: 100, // Too high
        includeExpanded: true,
      })

      // Verify limits were optimized
      expect(consoleSpy).toHaveBeenCalledWith(
        'Query limits optimized for performance:',
        expect.objectContaining({
          original: { currentPairingLimit: 50, expandedLimit: 100 },
          optimized: expect.objectContaining({
            currentPairingLimit: expect.any(Number),
            expandedLimit: expect.any(Number),
          }),
          pairKey: 'food1_food2',
        }),
      )

      // Verify the optimization worked
      if (process.env.NODE_ENV === 'development') {
        expect((result as any)._performance?.optimized).toBe(true)
      }

      consoleSpy.mockRestore()
    })
  })

  describe('Response Size Optimization', () => {
    it('should monitor response size and provide optimization suggestions', async () => {
      // Create comments with very long content to test response size monitoring
      const longContentComments = Array.from({ length: 30 }, (_, i) => ({
        id: `long-comment-${i}`,
        pairKey: 'food1_food2',
        result: 'win',
        winnerFoodId: 'food1',
        content: 'This is a very long comment '.repeat(50) + ` - Comment ${i}`, // Very long content
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        nationality: 'Korean',
      }))

      const mockFoods = [
        { id: 'food1', name: 'Kimchi' },
        { id: 'food2', name: 'Bulgogi' },
      ]

      mockD1.all
        .mockResolvedValueOnce({ results: longContentComments.slice(0, 15) })
        .mockResolvedValueOnce({ results: longContentComments.slice(15, 30) })
        .mockResolvedValueOnce({ results: mockFoods })

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const result = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 15,
        expandedLimit: 15,
        includeExpanded: true,
      })

      // Verify that performance monitoring detected the large response
      const performanceLogged =
        consoleWarnSpy.mock.calls.some(
          (call) =>
            call[0] === 'PERFORMANCE WARNING:' &&
            call[1].suggestions?.some((s: string) =>
              s.includes('Response size exceeds'),
            ),
        ) ||
        consoleErrorSpy.mock.calls.some(
          (call) =>
            call[0] === 'PERFORMANCE CRITICAL:' &&
            call[1].suggestions?.some((s: string) =>
              s.includes('Response size exceeds'),
            ),
        )

      expect(performanceLogged).toBe(true)

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Nationality Privacy with Large Datasets', () => {
    it('should efficiently apply nationality privacy protection to large comment sets', async () => {
      // Create a large dataset with various nationalities
      const largeCommentSet = Array.from({ length: 100 }, (_, i) => ({
        id: `comment-${i}`,
        pairKey: i < 50 ? 'food1_food2' : `food1_food${i}`,
        result: 'win',
        winnerFoodId: 'food1',
        content: `Comment ${i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        // Create nationality distribution: some large groups, some small groups
        nationality:
          i < 20
            ? 'Korean'
            : i < 40
              ? 'American'
              : i < 45
                ? 'Japanese'
                : i < 47
                  ? 'Chinese'
                  : i < 48
                    ? 'Thai'
                    : 'Vietnamese', // Small groups should be anonymized
      }))

      const mockFoods = Array.from({ length: 50 }, (_, i) => ({
        id: `food${i + 1}`,
        name: `Food ${i + 1}`,
      }))

      mockD1.all
        .mockResolvedValueOnce({ results: largeCommentSet.slice(0, 15) }) // Current pairing
        .mockResolvedValueOnce({ results: largeCommentSet.slice(50, 75) }) // Expanded
        .mockResolvedValueOnce({ results: mockFoods })

      const result = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 15,
        expandedLimit: 25,
        includeExpanded: true,
      })

      // Verify nationality privacy protection
      const allComments = [
        ...result.currentPairingComments,
        ...result.expandedComments,
      ]
      const nationalityCounts = allComments.reduce(
        (counts, comment) => {
          const nationality = comment.nationality || 'unknown'
          counts[nationality] = (counts[nationality] || 0) + 1
          return counts
        },
        {} as Record<string, number>,
      )

      // Small nationality groups should be anonymized as "Other"
      expect(nationalityCounts['Other']).toBeGreaterThan(0)

      // Large groups should retain their nationality
      expect(nationalityCounts['Korean']).toBeGreaterThan(0)
      expect(nationalityCounts['American']).toBeGreaterThan(0)
    })
  })

  describe('Pagination Performance', () => {
    it('should handle cursor-based pagination efficiently', async () => {
      const mockComments = Array.from({ length: 50 }, (_, i) => ({
        id: `comment-${i}`,
        pairKey: 'food1_food2',
        result: 'win',
        winnerFoodId: 'food1',
        content: `Comment ${i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        nationality: 'Korean',
      }))

      const mockFoods = [
        { id: 'food1', name: 'Kimchi' },
        { id: 'food2', name: 'Bulgogi' },
      ]

      // First page
      mockD1.all
        .mockResolvedValueOnce({ results: mockComments.slice(0, 10) })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: mockFoods })

      const firstPageResult = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 10,
        expandedLimit: 10,
        includeExpanded: true,
      })

      expect(firstPageResult.hasMore).toBe(true)
      expect(firstPageResult.cursor).toBeDefined()

      // Second page with cursor
      mockD1.all
        .mockResolvedValueOnce({ results: mockComments.slice(10, 20) })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: mockFoods })

      const secondPageResult = await getExpandedComments(db, {
        pairKey: 'food1_food2',
        foodId1: 'food1',
        foodId2: 'food2',
        currentPairingLimit: 10,
        expandedLimit: 10,
        includeExpanded: true,
        cursor: firstPageResult.cursor,
      })

      expect(secondPageResult.currentPairingComments).toHaveLength(10)
      expect(secondPageResult.cursor).toBeDefined()
      expect(secondPageResult.cursor).not.toBe(firstPageResult.cursor)
    })
  })
})
