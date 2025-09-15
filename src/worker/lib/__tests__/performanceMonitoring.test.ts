import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ExpandedCommentsPerformanceMonitor,
  optimizeQueryLimits,
  PERFORMANCE_THRESHOLDS,
  OPTIMIZED_QUERY_LIMITS,
  performanceMonitor,
} from '../performanceMonitoring'

describe('ExpandedCommentsPerformanceMonitor', () => {
  let monitor: ExpandedCommentsPerformanceMonitor

  beforeEach(() => {
    monitor = new ExpandedCommentsPerformanceMonitor()
    vi.clearAllMocks()
  })

  describe('Query Performance Tracking', () => {
    it('should track query execution time correctly', () => {
      const mockResponseData = {
        currentPairingComments: [{ id: '1' }, { id: '2' }],
        expandedComments: [{ id: '3' }, { id: '4' }, { id: '5' }],
        totalCount: 5,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')

      // Simulate some processing time
      const startTime = Date.now()
      while (Date.now() - startTime < 10) {
        // Wait for at least 10ms
      }

      const log = monitor.endQuery(mockResponseData)

      expect(log.operation).toBe('getExpandedComments')
      expect(log.pairKey).toBe('food1_food2')
      expect(log.metrics.queryExecutionTime).toBeGreaterThan(0)
      expect(log.metrics.currentPairingCommentsCount).toBe(2)
      expect(log.metrics.expandedCommentsCount).toBe(3)
      expect(log.metrics.totalCommentsCount).toBe(5)
      expect(log.metrics.responseSize).toBeGreaterThan(0)
      expect(log.metrics.timestamp).toBeDefined()
    })

    it('should calculate response size correctly', () => {
      const smallResponse = { data: 'small' }
      const largeResponse = {
        currentPairingComments: Array(50).fill({
          id: 'comment-id',
          content:
            'This is a long comment with lots of text that will make the response larger',
          nationality: 'Korean',
          otherFoodName: 'Some Food Name',
        }),
        expandedComments: Array(50).fill({
          id: 'expanded-comment-id',
          content:
            'Another long comment with even more text to increase the response size significantly',
          nationality: 'American',
          otherFoodName: 'Another Food Name',
        }),
      }

      monitor.startQuery('test', 'test_pair')
      const smallLog = monitor.endQuery(smallResponse)

      monitor.startQuery('test', 'test_pair')
      const largeLog = monitor.endQuery(largeResponse)

      expect(largeLog.metrics.responseSize).toBeGreaterThan(
        smallLog.metrics.responseSize,
      )
    })
  })

  describe('Optimization Suggestions', () => {
    it('should generate critical suggestions for slow queries', () => {
      const mockResponseData = {
        currentPairingComments: [],
        expandedComments: [],
        totalCount: 0,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')

      // Mock a slow query by manipulating the start time
      ;(monitor as any).startTime = Date.now() - 2500 // 2.5 seconds ago

      const log = monitor.endQuery(mockResponseData)

      expect(
        log.optimizationSuggestions.some((s) =>
          s.includes('CRITICAL: Query execution time exceeds 2 seconds'),
        ),
      ).toBe(true)
    })

    it('should generate warning suggestions for moderately slow queries', () => {
      const mockResponseData = {
        currentPairingComments: [],
        expandedComments: [],
        totalCount: 0,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')

      // Mock a moderately slow query
      ;(monitor as any).startTime = Date.now() - 1200 // 1.2 seconds ago

      const log = monitor.endQuery(mockResponseData)

      expect(
        log.optimizationSuggestions.some((s) =>
          s.includes('WARNING: Query execution time exceeds 1 second'),
        ),
      ).toBe(true)
    })

    it('should generate suggestions for large response sizes', () => {
      const largeResponseData = {
        currentPairingComments: Array(60).fill({
          id: 'comment-id',
          content:
            'Very long comment content that will make the response very large and exceed the warning thresholds for response size monitoring',
          nationality: 'Korean',
          otherFoodName: 'Food Name',
        }),
        expandedComments: Array(60).fill({
          id: 'expanded-comment-id',
          content:
            'Another very long comment content that will contribute to making the response size even larger and trigger optimization suggestions',
          nationality: 'American',
          otherFoodName: 'Another Food Name',
        }),
        totalCount: 120,
        hasMore: true,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')
      const log = monitor.endQuery(largeResponseData)

      expect(
        log.optimizationSuggestions.some(
          (s) =>
            s.includes('Response size exceeds') ||
            s.includes('comment count exceeds'),
        ),
      ).toBe(true)
    })

    it('should generate suggestions for high expanded comment ratios', () => {
      const mockResponseData = {
        currentPairingComments: [], // No current pairing comments
        expandedComments: Array(20).fill({ id: 'expanded' }), // Many expanded comments
        totalCount: 20,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')
      const log = monitor.endQuery(mockResponseData)

      expect(
        log.optimizationSuggestions.some((s) =>
          s.includes('High ratio of expanded comments'),
        ),
      ).toBe(true)
    })

    it('should handle no current pairing comments gracefully', () => {
      const mockResponseData = {
        currentPairingComments: [],
        expandedComments: [{ id: '1' }, { id: '2' }],
        totalCount: 2,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')
      const log = monitor.endQuery(mockResponseData)

      expect(
        log.optimizationSuggestions.some((s) =>
          s.includes('No current pairing comments found'),
        ),
      ).toBe(true)
    })
  })

  describe('Logging Levels', () => {
    it('should use CRITICAL level for severe performance issues', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockResponseData = {
        currentPairingComments: Array(150).fill({ id: 'comment' }), // Exceeds critical threshold
        expandedComments: [],
        totalCount: 150,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')
      ;(monitor as unknown).startTime = Date.now() - 3000 // 3 seconds ago (critical)

      monitor.endQuery(mockResponseData)

      expect(consoleSpy).toHaveBeenCalledWith(
        'PERFORMANCE CRITICAL:',
        expect.objectContaining({
          level: 'CRITICAL',
          operation: 'getExpandedComments',
          pairKey: 'food1_food2',
        }),
      )

      consoleSpy.mockRestore()
    })

    it('should use WARNING level for moderate performance issues', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockResponseData = {
        currentPairingComments: Array(60).fill({ id: 'comment' }), // Exceeds warning threshold
        expandedComments: [],
        totalCount: 60,
        hasMore: false,
      }

      monitor.startQuery('getExpandedComments', 'food1_food2')
      monitor.endQuery(mockResponseData)

      expect(consoleSpy).toHaveBeenCalledWith(
        'PERFORMANCE WARNING:',
        expect.objectContaining({
          level: 'WARNING',
          operation: 'getExpandedComments',
          pairKey: 'food1_food2',
        }),
      )

      consoleSpy.mockRestore()
    })
  })
})

describe('optimizeQueryLimits', () => {
  it('should return original limits when they are within bounds', () => {
    const result = optimizeQueryLimits(5, 8, true)

    expect(result.currentPairingLimit).toBe(5)
    expect(result.expandedLimit).toBe(8)
    expect(result.optimized).toBe(false)
  })

  it('should optimize limits when they exceed maximums', () => {
    const result = optimizeQueryLimits(25, 35, true)

    expect(result.currentPairingLimit).toBe(
      OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT,
    )
    expect(result.expandedLimit).toBe(OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT)
    expect(result.optimized).toBe(true)
  })

  it('should proportionally reduce limits when total exceeds absolute maximum', () => {
    const result = optimizeQueryLimits(30, 30, true) // Total 60 > 40 (absolute max)

    expect(
      result.currentPairingLimit + result.expandedLimit,
    ).toBeLessThanOrEqual(OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT)
    expect(result.optimized).toBe(true)
  })

  it('should set expanded limit to 0 when includeExpanded is false', () => {
    const result = optimizeQueryLimits(10, 15, false)

    expect(result.expandedLimit).toBe(0)
    expect(result.currentPairingLimit).toBe(10)
  })

  it('should handle edge case of very small limits', () => {
    const result = optimizeQueryLimits(1, 1, true)

    expect(result.currentPairingLimit).toBe(1)
    expect(result.expandedLimit).toBe(1)
    expect(result.optimized).toBe(false)
  })
})

describe('Performance Thresholds', () => {
  it('should have reasonable threshold values', () => {
    expect(PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING).toBe(1000)
    expect(PERFORMANCE_THRESHOLDS.QUERY_TIME_CRITICAL).toBe(2000)
    expect(PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING).toBe(50 * 1024)
    expect(PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_CRITICAL).toBe(100 * 1024)
    expect(PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_WARNING).toBe(50)
    expect(PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_CRITICAL).toBe(100)
  })
})

describe('Optimized Query Limits', () => {
  it('should have reasonable default limits', () => {
    expect(OPTIMIZED_QUERY_LIMITS.DEFAULT_CURRENT_PAIRING_LIMIT).toBe(8)
    expect(OPTIMIZED_QUERY_LIMITS.DEFAULT_EXPANDED_LIMIT).toBe(12)
    expect(OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT).toBe(15)
    expect(OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT).toBe(25)
    expect(OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT).toBe(40)
  })

  it('should ensure maximum limits are reasonable', () => {
    const totalMax =
      OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT +
      OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT

    expect(totalMax).toBeGreaterThanOrEqual(
      OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT,
    )
    // This ensures the absolute limit will kick in for optimization
  })
})

describe('Global Performance Monitor', () => {
  it('should export a global performance monitor instance', () => {
    expect(performanceMonitor).toBeInstanceOf(
      ExpandedCommentsPerformanceMonitor,
    )
  })
})
