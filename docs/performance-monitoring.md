# Expanded Comments Performance Monitoring

This document describes the performance monitoring system implemented for the expanded comments feature in the Korean Food Arena application.

## Overview

The performance monitoring system tracks query execution time, response size, and provides optimization suggestions for the expanded comments functionality. It helps ensure the system maintains acceptable performance as the dataset grows.

## Key Components

### Performance Monitor

The `ExpandedCommentsPerformanceMonitor` class tracks performance metrics for each query:

- **Query Execution Time**: Measures how long database queries take
- **Response Size**: Calculates the size of JSON responses
- **Comment Counts**: Tracks current pairing vs expanded comment ratios
- **Optimization Suggestions**: Provides actionable recommendations

### Query Limit Optimization

The `optimizeQueryLimits` function automatically adjusts query limits to prevent performance issues:

```typescript
const optimizedLimits = optimizeQueryLimits(
  currentPairingLimit,
  expandedLimit,
  includeExpanded,
)
```

### Performance Thresholds

The system uses configurable thresholds to determine when to generate warnings:

- **Query Time Warning**: 1 second
- **Query Time Critical**: 2 seconds
- **Response Size Warning**: 50KB
- **Response Size Critical**: 100KB
- **Comment Count Warning**: 50 comments
- **Comment Count Critical**: 100 comments

## Optimized Default Limits

Based on performance analysis, the system uses these optimized defaults:

- **Current Pairing Comments**: 8 (default), 15 (maximum)
- **Expanded Comments**: 12 (default), 25 (maximum)
- **Absolute Maximum Total**: 40 comments per request

## Performance Logging

The system logs performance data with different levels:

### INFO Level

- Normal operation within acceptable limits
- Provides basic metrics for monitoring

### WARNING Level

- Performance approaching concerning levels
- Suggests monitoring for degradation

### CRITICAL Level

- Performance exceeding acceptable limits
- Requires immediate attention

## Example Performance Log

```json
{
  "level": "WARNING",
  "operation": "getExpandedComments",
  "pairKey": "kimchi_bulgogi",
  "metrics": {
    "queryExecutionTime": 1200,
    "responseSize": 65536,
    "currentPairingCommentsCount": 15,
    "expandedCommentsCount": 35,
    "totalCommentsCount": 50,
    "timestamp": "2025-09-15T10:00:00.000Z"
  },
  "suggestions": [
    "WARNING: Query execution time exceeds 1 second. Monitor for performance degradation.",
    "WARNING: Response size exceeds 50KB. Consider optimizing comment content or reducing limits."
  ]
}
```

## API Response Headers

In development mode, performance metrics are included in HTTP response headers:

- `X-Query-Time`: Query execution time in milliseconds
- `X-Response-Size`: Response size in bytes
- `X-Optimized`: Whether query limits were optimized

## Optimization Suggestions

The system provides specific suggestions based on performance metrics:

### Query Time Optimization

- Add database indexes
- Reduce query complexity
- Implement query caching

### Response Size Optimization

- Reduce comment limits
- Implement more aggressive pagination
- Optimize comment content length

### Comment Count Optimization

- Implement stricter pagination limits
- Balance current vs expanded comment ratios
- Consider user experience impact

## Testing Performance

### Unit Tests

Run performance monitoring unit tests:

```bash
pnpm test src/worker/lib/__tests__/performanceMonitoring.test.ts
```

### Integration Tests

Run integration tests with realistic datasets:

```bash
pnpm test src/worker/lib/__tests__/performanceIntegration.test.ts
```

### Performance Test Utilities

Use the performance test utilities to simulate large datasets:

```typescript
import {
  runPerformanceTest,
  generatePerformanceReport,
} from './performanceTestUtils'

const results = await runPerformanceTest(db, {
  currentPairingComments: 50,
  expandedComments: 100,
  testIterations: 10,
})

console.log(generatePerformanceReport(results, config))
```

## Monitoring in Production

### Log Analysis

Monitor application logs for performance warnings and critical alerts:

```bash
# Filter for performance issues
grep "PERFORMANCE" application.log | grep -E "(WARNING|CRITICAL)"
```

### Metrics Collection

The system is designed to integrate with monitoring services:

- Query execution time metrics
- Response size distribution
- Optimization trigger frequency
- User experience impact

### Alerting

Set up alerts for:

- Critical performance thresholds exceeded
- High frequency of optimization triggers
- Sustained performance degradation

## Best Practices

### Database Optimization

1. Ensure proper indexes exist:

   ```sql
   CREATE INDEX idx_comment_winner_food_created ON comment(winner_food_id, created_at DESC);
   ```

2. Monitor query execution plans
3. Consider query result caching for popular pairings

### Application Optimization

1. Use optimized default limits
2. Implement progressive loading for large datasets
3. Monitor real user performance metrics

### User Experience

1. Provide loading indicators for slower queries
2. Implement retry mechanisms for failed requests
3. Consider pagination for very large comment sets

## Configuration

### Environment Variables

- `NODE_ENV`: Controls whether performance metadata is included in responses
- Performance thresholds can be configured via environment variables if needed

### Runtime Configuration

The monitoring system can be configured at runtime:

```typescript
// Adjust thresholds for specific environments
const customThresholds = {
  QUERY_TIME_WARNING: 800, // Stricter for production
  RESPONSE_SIZE_CRITICAL: 75 * 1024, // Smaller limit
}
```

## Future Enhancements

### Planned Improvements

1. **Adaptive Limits**: Automatically adjust limits based on historical performance
2. **User-Specific Optimization**: Tailor limits based on user connection speed
3. **Predictive Scaling**: Anticipate performance issues before they occur
4. **Advanced Caching**: Implement intelligent caching strategies

### Monitoring Integration

1. **APM Integration**: Connect with Application Performance Monitoring tools
2. **Real User Monitoring**: Track actual user experience metrics
3. **Automated Optimization**: Automatically adjust system parameters based on performance data
