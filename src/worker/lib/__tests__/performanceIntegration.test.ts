import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  performanceMonitor,
  optimizeQueryLimits,
  PERFORMANCE_THRESHOLDS,
  OPTIMIZED_QUERY_LIMITS,
} from '../performanceMonitoring'

describe('Performance Monitoring Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Limit Optimization', () => {
    it('should optimize limits for large datasets', () => {
      // Test with very large requested limits
      const result = optimizeQueryLimits(100, 200, true)

      expect(result.optimized).toBe(true)
      expect(result.currentPairingLimit).toBeLessThanOrEqual(
        OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT,
      )
      expect(result.expandedLimit).toBeLessThanOrEqual(
        OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT,
      )
      expect(
        result.currentPairingLimit + result.expandedLimit,
      ).toBeLessThanOrEqual(OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT)
    })

    it('should handle edge cases in limit optimization', () => {
      // Test with zero limits
      const zeroResult = optimizeQueryLimits(0, 0, true)
      expect(zeroResult.currentPairingLimit).toBe(0)
      expect(zeroResult.expandedLimit).toBe(0)
      expect(zeroResult.optimized).toBe(false)

      // Test with disabled expanded comments
      const disabledResult = optimizeQueryLimits(10, 20, false)
      expect(disabledResult.expandedLimit).toBe(0)
      expect(disabledResult.currentPairingLimit).toBe(10)

      // Test with exactly at the limit
      const exactResult = optimizeQueryLimits(
        OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT,
        OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT,
        true,
      )
      // Check if total exceeds absolute limit to determine if optimization should occur
      const totalRequested =
        OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT +
        OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT
      const shouldOptimize =
        totalRequested > OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT
      expect(exactResult.optimized).toBe(shouldOptimize)
    })
  })

  describe('Performance Monitoring with Realistic Data', () => {
    it('should track performance for small datasets', () => {
      const smallDataset = {
        currentPairingComments: Array.from({ length: 5 }, (_, i) => ({
          id: `comment-${i}`,
          content: 'Short comment',
          nationality: 'Korean',
        })),
        expandedComments: Array.from({ length: 8 }, (_, i) => ({
          id: `expanded-${i}`,
          content: 'Another short comment',
          nationality: 'American',
        })),
        totalCount: 13,
        hasMore: false,
      }

      performanceMonitor.startQuery('getExpandedComments', 'food1_food2')
      const log = performanceMonitor.endQuery(smallDataset)

      expect(log.metrics.totalCommentsCount).toBe(13)
      expect(log.metrics.queryExecutionTime).toBeGreaterThanOrEqual(0)
      expect(log.metrics.responseSize).toBeGreaterThan(0)
      expect(log.optimizationSuggestions).toHaveLength(0) // Should be no suggestions for small dataset
    })

    it('should track performance for medium datasets', () => {
      const mediumDataset = {
        currentPairingComments: Array.from({ length: 15 }, (_, i) => ({
          id: `comment-${i}`,
          content:
            'This is a medium length comment with some details about the food comparison',
          nationality:
            i % 3 === 0 ? 'Korean' : i % 3 === 1 ? 'American' : 'Japanese',
          otherFoodName: 'Some Food',
        })),
        expandedComments: Array.from({ length: 25 }, (_, i) => ({
          id: `expanded-${i}`,
          content:
            'This is another medium length comment with opinions about Korean food',
          nationality:
            i % 4 === 0
              ? 'Korean'
              : i % 4 === 1
                ? 'American'
                : i % 4 === 2
                  ? 'Chinese'
                  : 'Japanese',
          otherFoodName: 'Another Food',
        })),
        totalCount: 40,
        hasMore: true,
      }

      performanceMonitor.startQuery('getExpandedComments', 'food1_food2')
      const log = performanceMonitor.endQuery(mediumDataset)

      expect(log.metrics.totalCommentsCount).toBe(40)
      expect(log.metrics.responseSize).toBeGreaterThan(1000) // Should be reasonably sized
      expect(log.optimizationSuggestions).toHaveLength(0) // Should still be within acceptable limits
    })

    it('should generate warnings for large datasets', () => {
      const largeDataset = {
        currentPairingComments: Array.from({ length: 30 }, (_, i) => ({
          id: `comment-${i}`,
          content:
            'This is a very long comment with extensive details about the food, including personal experiences, cultural context, and detailed flavor profiles that make the response quite large'.repeat(
              2,
            ),
          nationality: 'Korean',
          otherFoodName: 'Some Very Long Food Name That Adds To Response Size',
        })),
        expandedComments: Array.from({ length: 40 }, (_, i) => ({
          id: `expanded-${i}`,
          content:
            'Another very long comment with detailed analysis of Korean cuisine, cooking methods, ingredient quality, and comparison with other dishes from the same region or similar styles'.repeat(
              2,
            ),
          nationality: 'American',
          otherFoodName:
            'Another Very Long Food Name That Contributes To Large Response',
        })),
        totalCount: 70,
        hasMore: true,
      }

      performanceMonitor.startQuery('getExpandedComments', 'food1_food2')
      const log = performanceMonitor.endQuery(largeDataset)

      expect(log.metrics.totalCommentsCount).toBe(70)
      expect(log.optimizationSuggestions.length).toBeGreaterThan(0)
      expect(
        log.optimizationSuggestions.some(
          (s) =>
            s.includes('comment count exceeds') ||
            s.includes('Response size exceeds'),
        ),
      ).toBe(true)
    })
  })

  describe('Performance Threshold Validation', () => {
    it('should validate performance thresholds are reasonable', () => {
      // Query time thresholds
      expect(PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING).toBeLessThan(
        PERFORMANCE_THRESHOLDS.QUERY_TIME_CRITICAL,
      )
      expect(PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING).toBeGreaterThan(500) // At least 500ms
      expect(PERFORMANCE_THRESHOLDS.QUERY_TIME_CRITICAL).toBeLessThan(5000) // Less than 5 seconds

      // Response size thresholds
      expect(PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_CRITICAL,
      )
      expect(PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING).toBeGreaterThan(
        10 * 1024,
      ) // At least 10KB
      expect(PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_CRITICAL).toBeLessThan(
        1024 * 1024,
      ) // Less than 1MB

      // Comment count thresholds
      expect(PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_WARNING).toBeLessThan(
        PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_CRITICAL,
      )
      expect(PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_WARNING).toBeGreaterThan(20) // At least 20 comments
      expect(PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_CRITICAL).toBeLessThan(200) // Less than 200 comments
    })

    it('should validate optimized query limits are reasonable', () => {
      // Default limits should be reasonable for most use cases
      expect(
        OPTIMIZED_QUERY_LIMITS.DEFAULT_CURRENT_PAIRING_LIMIT,
      ).toBeGreaterThan(5)
      expect(OPTIMIZED_QUERY_LIMITS.DEFAULT_CURRENT_PAIRING_LIMIT).toBeLessThan(
        15,
      )
      expect(OPTIMIZED_QUERY_LIMITS.DEFAULT_EXPANDED_LIMIT).toBeGreaterThan(8)
      expect(OPTIMIZED_QUERY_LIMITS.DEFAULT_EXPANDED_LIMIT).toBeLessThan(20)

      // Maximum limits should prevent performance issues
      expect(OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT).toBeLessThan(25)
      expect(OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT).toBeLessThan(35)
      expect(OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT).toBeLessThan(50)

      // Ensure the absolute limit is enforced
      const totalMax =
        OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT +
        OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT
      expect(totalMax).toBeGreaterThanOrEqual(
        OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT,
      )
    })
  })

  describe('Real-world Performance Scenarios', () => {
    it('should handle popular food pairing scenario', () => {
      // Simulate a popular food pairing with many comments
      const popularPairingData = {
        currentPairingComments: Array.from({ length: 12 }, (_, i) => ({
          id: `popular-comment-${i}`,
          content: `Great comparison! I've tried both and here's my take: ${['Kimchi is amazing', 'Bulgogi is better', 'Both are excellent'][i % 3]}`,
          nationality: ['Korean', 'American', 'Japanese', 'Chinese'][i % 4],
          otherFoodName: 'Bulgogi',
        })),
        expandedComments: Array.from({ length: 18 }, (_, i) => ({
          id: `popular-expanded-${i}`,
          content: `I've had this food in different contexts: ${['at restaurants', 'homemade', 'street food'][i % 3]}`,
          nationality: ['Korean', 'American', 'Japanese', 'Chinese', 'Thai'][
            i % 5
          ],
          otherFoodName: ['Japchae', 'Galbi', 'Hotteok', 'Mandu'][i % 4],
        })),
        totalCount: 30,
        hasMore: false,
      }

      performanceMonitor.startQuery('getExpandedComments', 'kimchi_bulgogi')
      const log = performanceMonitor.endQuery(popularPairingData)

      expect(log.metrics.totalCommentsCount).toBe(30)
      expect(log.metrics.currentPairingCommentsCount).toBe(12)
      expect(log.metrics.expandedCommentsCount).toBe(18)

      // Should be within acceptable performance range
      expect(
        log.optimizationSuggestions.filter((s) => s.includes('CRITICAL'))
          .length,
      ).toBe(0)
    })

    it('should handle new food pairing scenario', () => {
      // Simulate a new food pairing with few current comments but some expanded comments
      const newPairingData = {
        currentPairingComments: [], // No comments on this specific pairing yet
        expandedComments: Array.from({ length: 8 }, (_, i) => ({
          id: `new-expanded-${i}`,
          content: `I've tried this food before: ${['Really good', 'Not my favorite', 'Interesting flavor'][i % 3]}`,
          nationality: ['Korean', 'American'][i % 2],
          otherFoodName: ['Bibimbap', 'Galbi', 'Japchae'][i % 3],
        })),
        totalCount: 8,
        hasMore: false,
      }

      performanceMonitor.startQuery('getExpandedComments', 'newFood1_newFood2')
      const log = performanceMonitor.endQuery(newPairingData)

      expect(log.metrics.totalCommentsCount).toBe(8)
      expect(log.metrics.currentPairingCommentsCount).toBe(0)
      expect(log.metrics.expandedCommentsCount).toBe(8)

      // Should suggest this is normal for new pairings
      expect(
        log.optimizationSuggestions.some((s) =>
          s.includes('No current pairing comments found'),
        ),
      ).toBe(true)
    })

    it('should handle performance degradation scenario', () => {
      // Simulate a scenario that would trigger performance warnings
      const heavyDataset = {
        currentPairingComments: Array.from({ length: 25 }, (_, i) => ({
          id: `heavy-comment-${i}`,
          content:
            'This is an extremely detailed comment about Korean food culture, history, preparation methods, ingredient sourcing, regional variations, personal experiences, family traditions, and detailed flavor analysis that goes on for quite a while and contributes significantly to the response size making it quite large and potentially problematic for performance if there are many such comments in a single response which is what we are testing here to ensure our monitoring system properly detects and reports on performance issues when they occur in real world usage scenarios.'.repeat(
              3,
            ),
          nationality: 'Korean',
          otherFoodName:
            'Some Food With A Very Long Name That Also Contributes To Response Size',
        })),
        expandedComments: Array.from({ length: 35 }, (_, i) => ({
          id: `heavy-expanded-${i}`,
          content:
            'Another extremely long comment with extensive details about Korean cuisine, cooking techniques, cultural significance, personal anecdotes, family recipes, restaurant recommendations, ingredient analysis, nutritional information, and comparative analysis with other cuisines that makes the response very large and tests our performance monitoring capabilities to ensure they properly detect when responses become too large for optimal user experience and network performance.'.repeat(
              3,
            ),
          nationality: 'American',
          otherFoodName:
            'Another Food With An Even Longer Name That Significantly Contributes To The Overall Response Size',
        })),
        totalCount: 60,
        hasMore: true,
      }

      performanceMonitor.startQuery('getExpandedComments', 'heavy_dataset')

      // Simulate slow query by manipulating start time
      ;(performanceMonitor as unknown).startTime = Date.now() - 1500 // 1.5 seconds ago

      const log = performanceMonitor.endQuery(heavyDataset)

      expect(log.metrics.totalCommentsCount).toBe(60)
      expect(log.metrics.responseSize).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING,
      )

      // Should generate multiple optimization suggestions
      expect(log.optimizationSuggestions.length).toBeGreaterThan(1)
      expect(
        log.optimizationSuggestions.some(
          (s) => s.includes('WARNING') || s.includes('CRITICAL'),
        ),
      ).toBe(true)
    })
  })
})
