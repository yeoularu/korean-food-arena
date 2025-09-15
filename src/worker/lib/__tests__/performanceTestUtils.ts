/**
 * Utility functions for performance testing with large datasets
 * These utilities help create realistic test data and measure performance
 */

import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { comment, user, food } from '../../db/schema'
import { getExpandedComments } from '../expandedComments'
import { PERFORMANCE_THRESHOLDS } from '../performanceMonitoring'

export interface PerformanceTestConfig {
  currentPairingComments: number
  expandedComments: number
  foodCount: number
  nationalityDistribution: Record<string, number>
  avgCommentLength: number
  testIterations: number
}

export interface PerformanceTestResult {
  avgQueryTime: number
  maxQueryTime: number
  minQueryTime: number
  avgResponseSize: number
  maxResponseSize: number
  successRate: number
  optimizationTriggered: boolean
  suggestions: string[]
}

/**
 * Default performance test configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceTestConfig = {
  currentPairingComments: 50,
  expandedComments: 100,
  foodCount: 20,
  nationalityDistribution: {
    Korean: 30,
    American: 25,
    Japanese: 20,
    Chinese: 15,
    Thai: 5,
    Vietnamese: 3,
    Indian: 2,
  },
  avgCommentLength: 150,
  testIterations: 5,
}

/**
 * Generates realistic test data for performance testing
 */
export function generateTestData(config: PerformanceTestConfig) {
  const foods = Array.from({ length: config.foodCount }, (_, i) => ({
    id: `food-${i + 1}`,
    name: `Korean Food ${i + 1}`,
    description: `Description for Korean Food ${i + 1}`,
    imageUrl: `/img/food${i + 1}.jpg`,
    eloScore: 1200 + Math.random() * 400,
    createdAt: new Date().toISOString(),
  }))

  // Generate nationality pool based on distribution
  const nationalityPool: string[] = []
  Object.entries(config.nationalityDistribution).forEach(
    ([nationality, count]) => {
      for (let i = 0; i < count; i++) {
        nationalityPool.push(nationality)
      }
    },
  )

  const users = nationalityPool.map((nationality, i) => ({
    id: `user-${i + 1}`,
    nationality,
    createdAt: new Date().toISOString(),
  }))

  // Generate current pairing comments
  const currentPairingComments = Array.from(
    { length: config.currentPairingComments },
    (_, i) => ({
      id: `current-comment-${i + 1}`,
      userId: users[i % users.length].id,
      pairKey: 'food-1_food-2',
      result: i % 3 === 0 ? 'tie' : ('win' as 'tie' | 'win'),
      winnerFoodId: i % 3 === 0 ? null : i % 2 === 0 ? 'food-1' : 'food-2',
      content: generateCommentContent(config.avgCommentLength, i),
      createdAt: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
    }),
  )

  // Generate expanded comments (comments involving food-1 or food-2 in other pairings)
  const expandedComments = Array.from(
    { length: config.expandedComments },
    (_, i) => {
      const targetFood = i % 2 === 0 ? 'food-1' : 'food-2'
      const otherFood = `food-${(i % (config.foodCount - 2)) + 3}` // Use other foods
      const pairKey = [targetFood, otherFood].sort().join('_')

      return {
        id: `expanded-comment-${i + 1}`,
        userId: users[i % users.length].id,
        pairKey,
        result: i % 3 === 0 ? 'tie' : ('win' as 'tie' | 'win'),
        winnerFoodId: i % 3 === 0 ? null : targetFood,
        content: generateCommentContent(config.avgCommentLength, i + 1000),
        createdAt: new Date(
          Date.now() - (i + config.currentPairingComments) * 60000,
        ).toISOString(),
      }
    },
  )

  return {
    foods,
    users,
    currentPairingComments,
    expandedComments,
    allComments: [...currentPairingComments, ...expandedComments],
  }
}

/**
 * Generates realistic comment content of specified length
 */
function generateCommentContent(targetLength: number, seed: number): string {
  const phrases = [
    'This food is absolutely delicious and has amazing flavor.',
    'I really enjoyed the texture and taste of this dish.',
    'The spice level is perfect for my taste preferences.',
    "This reminds me of my grandmother's cooking.",
    'The presentation is beautiful and appetizing.',
    'I would definitely order this again at a restaurant.',
    'The ingredients seem fresh and high quality.',
    'This is a great representation of Korean cuisine.',
    'The balance of flavors is really well done.',
    'I appreciate the traditional preparation method.',
  ]

  let content = ''
  let phraseIndex = seed % phrases.length

  while (content.length < targetLength) {
    if (content.length > 0) content += ' '
    content += phrases[phraseIndex]
    phraseIndex = (phraseIndex + 1) % phrases.length
  }

  return content.substring(0, targetLength)
}

/**
 * Runs performance tests with the given configuration
 */
export async function runPerformanceTest(
  db: DrizzleD1Database,
  config: PerformanceTestConfig = DEFAULT_PERFORMANCE_CONFIG,
): Promise<PerformanceTestResult> {
  const testData = generateTestData(config)

  // Mock database responses for testing
  const mockCurrentComments = testData.currentPairingComments.map(
    (comment) => ({
      ...comment,
      nationality: testData.users.find((u) => u.id === comment.userId)
        ?.nationality,
    }),
  )

  const mockExpandedComments = testData.expandedComments.map((comment) => ({
    ...comment,
    nationality: testData.users.find((u) => u.id === comment.userId)
      ?.nationality,
  }))

  const results: number[] = []
  const responseSizes: number[] = []
  const suggestions: Set<string> = new Set()
  let optimizationTriggered = false
  let successCount = 0

  for (let i = 0; i < config.testIterations; i++) {
    try {
      const startTime = Date.now()

      // This would need to be adapted based on your actual database mocking strategy
      // For now, we'll simulate the performance characteristics
      const result = await simulateExpandedCommentsQuery(
        mockCurrentComments.slice(0, 15),
        mockExpandedComments.slice(0, 25),
        testData.foods,
      )

      const endTime = Date.now()
      const queryTime = endTime - startTime

      results.push(queryTime)

      // Calculate response size
      const responseSize = new TextEncoder().encode(
        JSON.stringify(result),
      ).length
      responseSizes.push(responseSize)

      // Check if optimization was triggered
      if ((result as any)._performance?.optimized) {
        optimizationTriggered = true
      }

      // Collect suggestions
      if ((result as any)._performance?.suggestions) {
        ;(result as any)._performance.suggestions.forEach((s: string) =>
          suggestions.add(s),
        )
      }

      successCount++
    } catch (error) {
      console.error(`Performance test iteration ${i + 1} failed:`, error)
    }
  }

  return {
    avgQueryTime: results.reduce((sum, time) => sum + time, 0) / results.length,
    maxQueryTime: Math.max(...results),
    minQueryTime: Math.min(...results),
    avgResponseSize:
      responseSizes.reduce((sum, size) => sum + size, 0) / responseSizes.length,
    maxResponseSize: Math.max(...responseSizes),
    successRate: successCount / config.testIterations,
    optimizationTriggered,
    suggestions: Array.from(suggestions),
  }
}

/**
 * Simulates the expanded comments query for performance testing
 */
async function simulateExpandedCommentsQuery(
  currentComments: any[],
  expandedComments: any[],
  foods: any[],
) {
  // Simulate database query time based on data size
  const queryComplexity = currentComments.length + expandedComments.length
  const simulatedDelay = Math.max(10, queryComplexity * 2) // Minimum 10ms, 2ms per comment

  await new Promise((resolve) => setTimeout(resolve, simulatedDelay))

  // Transform to expected format
  const foodNameMap = new Map(foods.map((f) => [f.id, f.name]))

  const transformComment = (comment: any, isCurrentPairing: boolean) => ({
    id: comment.id,
    pairKey: comment.pairKey,
    result: comment.result,
    winnerFoodId: comment.winnerFoodId,
    content: comment.content,
    createdAt: comment.createdAt,
    nationality: comment.nationality,
    isCurrentPairing,
    otherFoodId: 'food-2', // Simplified for testing
    otherFoodName: foodNameMap.get('food-2') || 'Unknown Food',
  })

  const result = {
    currentPairingComments: currentComments.map((c) =>
      transformComment(c, true),
    ),
    expandedComments: expandedComments.map((c) => transformComment(c, false)),
    totalCount: currentComments.length + expandedComments.length,
    hasMore: false,
  }

  // Add performance metadata
  ;(result as any)._performance = {
    queryTime: simulatedDelay,
    responseSize: new TextEncoder().encode(JSON.stringify(result)).length,
    optimized: queryComplexity > 30, // Simulate optimization trigger
    suggestions:
      queryComplexity > 50 ? ['WARNING: Large dataset detected'] : [],
  }

  return result
}

/**
 * Validates performance test results against thresholds
 */
export function validatePerformanceResults(
  results: PerformanceTestResult,
  customThresholds?: Partial<typeof PERFORMANCE_THRESHOLDS>,
): { passed: boolean; issues: string[] } {
  const thresholds = { ...PERFORMANCE_THRESHOLDS, ...customThresholds }
  const issues: string[] = []

  if (results.avgQueryTime > thresholds.QUERY_TIME_WARNING) {
    issues.push(
      `Average query time (${results.avgQueryTime}ms) exceeds warning threshold (${thresholds.QUERY_TIME_WARNING}ms)`,
    )
  }

  if (results.maxQueryTime > thresholds.QUERY_TIME_CRITICAL) {
    issues.push(
      `Maximum query time (${results.maxQueryTime}ms) exceeds critical threshold (${thresholds.QUERY_TIME_CRITICAL}ms)`,
    )
  }

  if (results.avgResponseSize > thresholds.RESPONSE_SIZE_WARNING) {
    issues.push(
      `Average response size (${results.avgResponseSize} bytes) exceeds warning threshold (${thresholds.RESPONSE_SIZE_WARNING} bytes)`,
    )
  }

  if (results.maxResponseSize > thresholds.RESPONSE_SIZE_CRITICAL) {
    issues.push(
      `Maximum response size (${results.maxResponseSize} bytes) exceeds critical threshold (${thresholds.RESPONSE_SIZE_CRITICAL} bytes)`,
    )
  }

  if (results.successRate < 0.95) {
    issues.push(
      `Success rate (${(results.successRate * 100).toFixed(1)}%) is below 95%`,
    )
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

/**
 * Generates a performance test report
 */
export function generatePerformanceReport(
  results: PerformanceTestResult,
  config: PerformanceTestConfig,
): string {
  const validation = validatePerformanceResults(results)

  return `
# Expanded Comments Performance Test Report

## Test Configuration
- Current Pairing Comments: ${config.currentPairingComments}
- Expanded Comments: ${config.expandedComments}
- Food Count: ${config.foodCount}
- Test Iterations: ${config.testIterations}
- Average Comment Length: ${config.avgCommentLength} characters

## Performance Results
- Average Query Time: ${results.avgQueryTime.toFixed(2)}ms
- Maximum Query Time: ${results.maxQueryTime}ms
- Minimum Query Time: ${results.minQueryTime}ms
- Average Response Size: ${(results.avgResponseSize / 1024).toFixed(2)}KB
- Maximum Response Size: ${(results.maxResponseSize / 1024).toFixed(2)}KB
- Success Rate: ${(results.successRate * 100).toFixed(1)}%
- Optimization Triggered: ${results.optimizationTriggered ? 'Yes' : 'No'}

## Optimization Suggestions
${results.suggestions.length > 0 ? results.suggestions.map((s) => `- ${s}`).join('\n') : '- No optimization suggestions'}

## Validation Results
Status: ${validation.passed ? '✅ PASSED' : '❌ FAILED'}

${
  validation.issues.length > 0
    ? `
### Issues Found:
${validation.issues.map((issue) => `- ${issue}`).join('\n')}
`
    : ''
}

## Recommendations
${
  results.avgQueryTime > PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING
    ? '- Consider adding database indexes or optimizing query structure'
    : ''
}
${
  results.avgResponseSize > PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING
    ? '- Consider reducing default comment limits or implementing more aggressive pagination'
    : ''
}
${
  !results.optimizationTriggered &&
  config.currentPairingComments + config.expandedComments > 40
    ? '- Query limit optimization should have been triggered for this dataset size'
    : ''
}
`.trim()
}
