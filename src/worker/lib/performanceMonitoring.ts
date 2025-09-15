/**
 * Performance monitoring utilities for expanded comments system
 * Tracks query execution time, response size, and provides optimization insights
 */

export interface PerformanceMetrics {
  queryExecutionTime: number
  responseSize: number
  currentPairingCommentsCount: number
  expandedCommentsCount: number
  totalCommentsCount: number
  cacheHit?: boolean
  timestamp: string
}

export interface QueryPerformanceLog {
  operation: string
  pairKey: string
  metrics: PerformanceMetrics
  optimizationSuggestions?: string[]
}

/**
 * Performance thresholds for monitoring
 */
export const PERFORMANCE_THRESHOLDS = {
  // Query execution time in milliseconds
  QUERY_TIME_WARNING: 1000, // 1 second
  QUERY_TIME_CRITICAL: 2000, // 2 seconds

  // Response size in bytes
  RESPONSE_SIZE_WARNING: 50 * 1024, // 50KB
  RESPONSE_SIZE_CRITICAL: 100 * 1024, // 100KB

  // Comment counts for optimization
  TOTAL_COMMENTS_WARNING: 50,
  TOTAL_COMMENTS_CRITICAL: 100,
} as const

/**
 * Tracks performance metrics for expanded comments queries
 */
export class ExpandedCommentsPerformanceMonitor {
  private startTime: number = 0
  private operation: string = ''
  private pairKey: string = ''

  /**
   * Start monitoring a query operation
   */
  startQuery(operation: string, pairKey: string): void {
    this.startTime = Date.now()
    this.operation = operation
    this.pairKey = pairKey
  }

  /**
   * End monitoring and calculate metrics
   */
  endQuery(
    responseData: any,
    additionalMetrics: Partial<PerformanceMetrics> = {},
  ): QueryPerformanceLog {
    const endTime = Date.now()
    const queryExecutionTime = endTime - this.startTime

    // Calculate response size
    const responseSize = this.calculateResponseSize(responseData)

    // Extract comment counts from response
    const currentPairingCommentsCount =
      responseData.currentPairingComments?.length || 0
    const expandedCommentsCount = responseData.expandedComments?.length || 0
    const totalCommentsCount =
      currentPairingCommentsCount + expandedCommentsCount

    const metrics: PerformanceMetrics = {
      queryExecutionTime,
      responseSize,
      currentPairingCommentsCount,
      expandedCommentsCount,
      totalCommentsCount,
      timestamp: new Date().toISOString(),
      ...additionalMetrics,
    }

    const optimizationSuggestions =
      this.generateOptimizationSuggestions(metrics)

    const log: QueryPerformanceLog = {
      operation: this.operation,
      pairKey: this.pairKey,
      metrics,
      optimizationSuggestions,
    }

    // Log performance data
    this.logPerformanceData(log)

    return log
  }

  /**
   * Calculate approximate response size in bytes
   */
  private calculateResponseSize(data: any): number {
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length
    } catch (error) {
      console.warn('Failed to calculate response size:', error)
      return 0
    }
  }

  /**
   * Generate optimization suggestions based on metrics
   */
  private generateOptimizationSuggestions(
    metrics: PerformanceMetrics,
  ): string[] {
    const suggestions: string[] = []

    // Query time suggestions
    if (
      metrics.queryExecutionTime > PERFORMANCE_THRESHOLDS.QUERY_TIME_CRITICAL
    ) {
      suggestions.push(
        'CRITICAL: Query execution time exceeds 2 seconds. Consider adding database indexes or reducing query complexity.',
      )
    } else if (
      metrics.queryExecutionTime > PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING
    ) {
      suggestions.push(
        'WARNING: Query execution time exceeds 1 second. Monitor for performance degradation.',
      )
    }

    // Response size suggestions
    if (metrics.responseSize > PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_CRITICAL) {
      suggestions.push(
        'CRITICAL: Response size exceeds 100KB. Consider reducing comment limits or implementing pagination.',
      )
    } else if (
      metrics.responseSize > PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING
    ) {
      suggestions.push(
        'WARNING: Response size exceeds 50KB. Consider optimizing comment content or reducing limits.',
      )
    }

    // Comment count suggestions
    if (
      metrics.totalCommentsCount >
      PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_CRITICAL
    ) {
      suggestions.push(
        'CRITICAL: Total comment count exceeds 100. Implement stricter pagination limits.',
      )
    } else if (
      metrics.totalCommentsCount > PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_WARNING
    ) {
      suggestions.push(
        'WARNING: Total comment count exceeds 50. Consider reducing default limits.',
      )
    }

    // Ratio-based suggestions
    const expandedRatio =
      metrics.totalCommentsCount > 0
        ? metrics.expandedCommentsCount / metrics.totalCommentsCount
        : 0

    if (expandedRatio > 0.8) {
      suggestions.push(
        'INFO: High ratio of expanded comments. Consider increasing current pairing limit for better balance.',
      )
    }

    if (
      metrics.currentPairingCommentsCount === 0 &&
      metrics.expandedCommentsCount > 0
    ) {
      suggestions.push(
        'INFO: No current pairing comments found. This is normal for new pairings.',
      )
    }

    return suggestions
  }

  /**
   * Log performance data for monitoring
   */
  private logPerformanceData(log: QueryPerformanceLog): void {
    // In production, this would send to a monitoring service
    // For now, we'll use structured console logging

    const logLevel = this.determineLogLevel(log.metrics)
    const logMessage = {
      level: logLevel,
      operation: log.operation,
      pairKey: log.pairKey,
      metrics: log.metrics,
      suggestions: log.optimizationSuggestions,
      timestamp: log.metrics.timestamp,
    }

    switch (logLevel) {
      case 'CRITICAL':
        console.error('PERFORMANCE CRITICAL:', logMessage)
        break
      case 'WARNING':
        console.warn('PERFORMANCE WARNING:', logMessage)
        break
      case 'INFO':
        console.info('PERFORMANCE INFO:', logMessage)
        break
      default:
        console.log('PERFORMANCE LOG:', logMessage)
    }
  }

  /**
   * Determine log level based on metrics
   */
  private determineLogLevel(
    metrics: PerformanceMetrics,
  ): 'CRITICAL' | 'WARNING' | 'INFO' | 'DEBUG' {
    if (
      metrics.queryExecutionTime > PERFORMANCE_THRESHOLDS.QUERY_TIME_CRITICAL ||
      metrics.responseSize > PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_CRITICAL ||
      metrics.totalCommentsCount >
        PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_CRITICAL
    ) {
      return 'CRITICAL'
    }

    if (
      metrics.queryExecutionTime > PERFORMANCE_THRESHOLDS.QUERY_TIME_WARNING ||
      metrics.responseSize > PERFORMANCE_THRESHOLDS.RESPONSE_SIZE_WARNING ||
      metrics.totalCommentsCount > PERFORMANCE_THRESHOLDS.TOTAL_COMMENTS_WARNING
    ) {
      return 'WARNING'
    }

    return 'INFO'
  }
}

/**
 * Optimized query limits based on performance analysis
 */
export const OPTIMIZED_QUERY_LIMITS = {
  // Default limits optimized for performance
  DEFAULT_CURRENT_PAIRING_LIMIT: 8,
  DEFAULT_EXPANDED_LIMIT: 12,

  // Maximum limits to prevent performance issues
  MAX_CURRENT_PAIRING_LIMIT: 15,
  MAX_EXPANDED_LIMIT: 25,

  // Absolute maximum for any single request
  ABSOLUTE_MAX_TOTAL_LIMIT: 40,
} as const

/**
 * Validates and optimizes query limits for best performance
 */
export function optimizeQueryLimits(
  currentPairingLimit: number,
  expandedLimit: number,
  includeExpanded: boolean = true,
): { currentPairingLimit: number; expandedLimit: number; optimized: boolean } {
  let optimized = false
  let optimizedCurrentLimit = currentPairingLimit
  let optimizedExpandedLimit = includeExpanded ? expandedLimit : 0

  // Ensure limits don't exceed maximums
  if (
    optimizedCurrentLimit > OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT
  ) {
    optimizedCurrentLimit = OPTIMIZED_QUERY_LIMITS.MAX_CURRENT_PAIRING_LIMIT
    optimized = true
  }

  if (optimizedExpandedLimit > OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT) {
    optimizedExpandedLimit = OPTIMIZED_QUERY_LIMITS.MAX_EXPANDED_LIMIT
    optimized = true
  }

  // Ensure total doesn't exceed absolute maximum
  const totalLimit = optimizedCurrentLimit + optimizedExpandedLimit
  if (totalLimit > OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT) {
    // Proportionally reduce both limits
    const ratio = OPTIMIZED_QUERY_LIMITS.ABSOLUTE_MAX_TOTAL_LIMIT / totalLimit
    optimizedCurrentLimit = Math.floor(optimizedCurrentLimit * ratio)
    optimizedExpandedLimit = Math.floor(optimizedExpandedLimit * ratio)
    optimized = true
  }

  return {
    currentPairingLimit: optimizedCurrentLimit,
    expandedLimit: optimizedExpandedLimit,
    optimized,
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new ExpandedCommentsPerformanceMonitor()
