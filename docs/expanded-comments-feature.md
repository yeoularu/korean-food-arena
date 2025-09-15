# Expanded Comments Feature

This document provides a comprehensive overview of the expanded comments feature in the Korean Food Arena application.

## Overview

The expanded comments feature enhances the comment visibility system by allowing users to see comments from people who voted for either of the two foods in the current pairing, regardless of what the other food in their pairing was. This provides users with richer context and more diverse opinions about the foods they're comparing.

## Key Benefits

- **Richer Context**: Users see more comments about the specific foods they're comparing
- **Diverse Opinions**: Comments from various pairings provide different perspectives
- **Better User Experience**: Clear distinction between current pairing and expanded comments
- **Maintained Privacy**: All existing privacy protections are preserved and enhanced

## Architecture

### Frontend Components

#### ExpandedComments Component

- **Location**: `src/react-app/components/ExpandedComments.tsx`
- **Purpose**: Main container component that displays both current pairing and expanded comments
- **Features**:
  - Separates current pairing comments from expanded comments
  - Implements loading states and error handling
  - Supports pagination for large comment sets
  - Provides "Load more" functionality

#### CommentCard Component (Enhanced)

- **Location**: `src/react-app/components/CommentCard.tsx`
- **Purpose**: Displays individual comments with optional pairing context
- **Features**:
  - Shows pairing context for expanded comments
  - Displays vote result and nationality information
  - Responsive design with accessibility support
  - Visual distinction between comment types

### Backend Implementation

#### Expanded Comments API

- **Endpoint**: `GET /api/comments/:pairKey/expanded`
- **Location**: `src/worker/index.ts`
- **Features**:
  - Two-tier query approach (current pairing + expanded)
  - Efficient database queries with proper indexing
  - Nationality privacy protection across all comments
  - Configurable limits and pagination support

#### Database Queries

- **Location**: `src/worker/lib/expandedComments.ts`
- **Features**:
  - Optimized SQL queries with composite indexes
  - Proper error handling and validation
  - Performance monitoring and optimization
  - Consistent privacy protection

### Type System

#### Enhanced Interfaces

- **EnhancedComment**: Extends base Comment with context fields
- **ExpandedCommentsResponse**: Structured response with separated comment types
- **ExpandedCommentsRequest**: Request configuration with limits and options

## Usage Examples

### Basic Implementation

```typescript
import { ExpandedComments } from '@/components/ExpandedComments'

function ResultsPage({ pairKey, foodId1, foodId2 }: {
  pairKey: string
  foodId1: string
  foodId2: string
}) {
  return (
    <div>
      {/* Other results content */}
      <ExpandedComments
        pairKey={pairKey}
        foodId1={foodId1}
        foodId2={foodId2}
      />
    </div>
  )
}
```

### Advanced Configuration

```typescript
import { useExpandedComments } from '@/hooks/use-comment-queries'

function CustomCommentsSection({ pairKey, foodId1, foodId2 }: {
  pairKey: string
  foodId1: string
  foodId2: string
}) {
  const { data, isLoading, error } = useExpandedComments(
    pairKey,
    foodId1,
    foodId2,
    {
      currentPairingLimit: 5,
      expandedLimit: 15,
      includeExpanded: true
    }
  )

  // Custom rendering logic
  return (
    <div>
      {/* Custom implementation */}
    </div>
  )
}
```

### API Client Usage

```typescript
import { apiClient } from '@/lib/api-client'

// Direct API call
const comments = await apiClient.getExpandedComments(
  'bibimbap_kimchi',
  'bibimbap',
  'kimchi',
  {
    currentPairingLimit: 10,
    expandedLimit: 20,
  },
)
```

## Configuration Options

### Query Parameters

| Parameter             | Type    | Default | Range | Description                          |
| --------------------- | ------- | ------- | ----- | ------------------------------------ |
| `currentPairingLimit` | number  | 10      | 1-20  | Max current pairing comments         |
| `expandedLimit`       | number  | 10      | 1-30  | Max expanded comments                |
| `includeExpanded`     | boolean | true    | -     | Whether to include expanded comments |
| `cursor`              | string  | -       | -     | Pagination cursor (ISO timestamp)    |

### Performance Limits

The system automatically optimizes query limits based on performance considerations:

```typescript
// Default optimized limits
const DEFAULT_LIMITS = {
  currentPairingLimit: 8, // Reduced from 10 for performance
  expandedLimit: 12, // Balanced for UX vs performance
  maxTotalLimit: 25, // Maximum combined limit
}
```

## Privacy Protection

### Nationality Privacy

The expanded comments feature maintains and enhances the existing nationality privacy protection:

- **Minimum Group Size**: Nationalities with fewer than 5 users are grouped as "Other"
- **Consistent Protection**: Privacy is applied across both current pairing and expanded comments
- **Cross-Comment Analysis**: Nationality counts consider all comments in the response

### Access Control

- **Vote Requirement**: Users must vote on the current pairing before viewing any comments
- **Session-Based**: All access is tied to Better-auth anonymous sessions
- **No Personal Data**: No personally identifiable information is exposed

## Performance Considerations

### Database Optimization

#### Indexes

```sql
-- Composite index for expanded comment queries
CREATE INDEX idx_comment_winner_food_created ON comment(winner_food_id, created_at DESC);

-- Existing indexes that support the feature
-- idx_comment_pair_key (for current pairing comments)
-- idx_comment_created_at (for chronological ordering)
```

#### Query Optimization

- **Two-tier approach**: Separate queries for current pairing vs expanded comments
- **Configurable limits**: Prevent large responses that impact performance
- **Cursor pagination**: Efficient pagination for large comment sets

### Caching Strategy

#### TanStack Query Configuration

```typescript
const CACHE_CONFIG = {
  currentPairingComments: {
    staleTime: 30000, // 30 seconds - more dynamic
    gcTime: 300000, // 5 minutes
  },
  expandedComments: {
    staleTime: 60000, // 1 minute - less dynamic
    gcTime: 600000, // 10 minutes
  },
}
```

#### Selective Invalidation

- **Targeted Updates**: Only invalidate caches for relevant food pairings
- **Optimistic Updates**: Immediate UI updates with background synchronization
- **Smart Predicates**: Efficient cache invalidation using query predicates

### Response Size Management

- **Progressive Loading**: Load more comments on demand
- **Optimized Defaults**: Balanced limits for performance vs user experience
- **Monitoring**: Performance headers for response size tracking

## Error Handling

### Common Error Scenarios

1. **Access Control (403)**
   - User hasn't voted on pairing
   - Solution: Vote on the pairing first

2. **Validation Errors (400)**
   - Invalid pairKey format
   - Mismatched food IDs
   - Solution: Validate input parameters

3. **Not Found (404)**
   - Invalid food IDs
   - Non-existent pairing
   - Solution: Use valid food IDs

### Error Recovery

```typescript
// Automatic retry with exponential backoff
const retryConfig = {
  retry: (failureCount, error) => {
    if (isApiError(error) && error.code >= 400 && error.code < 500) {
      return false // Don't retry client errors
    }
    return failureCount < 3
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
}
```

## Testing

### Unit Tests

- **Component Tests**: Verify rendering and user interactions
- **Hook Tests**: Test query behavior and cache management
- **API Tests**: Validate request/response handling

### Integration Tests

- **End-to-End Flow**: Complete user journey from voting to viewing comments
- **Access Control**: Verify security requirements
- **Performance**: Load testing with large datasets

### Test Utilities

```typescript
// Mock data for testing
export const mockExpandedCommentsResponse: ExpandedCommentsResponse = {
  currentPairingComments: [
    {
      id: 'comment-1',
      pairKey: 'bibimbap_kimchi',
      result: 'win',
      winnerFoodId: 'bibimbap',
      content: 'Great balance of flavors!',
      createdAt: '2024-01-15T15:30:00.000Z',
      nationality: 'US',
      isCurrentPairing: true,
      otherFoodId: 'kimchi',
      otherFoodName: 'Kimchi',
    },
  ],
  expandedComments: [
    // ... expanded comments
  ],
  totalCount: 5,
  hasMore: false,
}
```

## Migration Guide

### From Legacy to Expanded Comments

1. **Update Component Props**: Add `foodId1` and `foodId2` parameters
2. **Replace Hook Usage**: Switch from `useComments` to `useExpandedComments`
3. **Update Rendering**: Handle structured response with current/expanded sections
4. **Test Thoroughly**: Verify all functionality works with new data structure

### Backward Compatibility

- **Legacy Endpoint**: Original `/api/comments/:pairKey` remains available
- **Gradual Migration**: Components can be updated incrementally
- **Feature Flags**: Optional feature toggle for rollout control

## Monitoring and Analytics

### Performance Metrics

- **Query Execution Time**: Database query performance
- **Response Size**: API response size monitoring
- **Cache Hit Rate**: TanStack Query cache effectiveness
- **User Engagement**: Comment viewing and interaction rates

### Logging

```typescript
// Performance logging
console.log({
  metric: 'expanded_comments_query_duration',
  value: queryTime,
  pairKey,
  limits: { currentPairingLimit, expandedLimit },
  timestamp: new Date().toISOString(),
})
```

## Future Enhancements

### Potential Improvements

1. **Real-time Updates**: WebSocket integration for live comment updates
2. **Comment Reactions**: Like/dislike functionality for comments
3. **Advanced Filtering**: Filter comments by nationality, date, or vote result
4. **Comment Threading**: Reply functionality for comment discussions
5. **Personalization**: Prioritize comments from users with similar preferences

### Scalability Considerations

1. **Database Sharding**: Partition comments by food or region
2. **CDN Caching**: Cache comment responses at edge locations
3. **Background Processing**: Async comment processing for better performance
4. **Search Integration**: Full-text search across comments

## Troubleshooting

### Common Issues

1. **Comments Not Loading**
   - Check network connectivity
   - Verify user has voted on pairing
   - Check browser console for errors

2. **Performance Issues**
   - Reduce query limits
   - Check database indexes
   - Monitor response sizes

3. **Cache Issues**
   - Clear TanStack Query cache
   - Check cache invalidation logic
   - Verify query key consistency

### Debug Tools

```typescript
// Enable debug logging
localStorage.setItem('debug', 'korean-food-arena:*')

// Query devtools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  // Enable performance monitoring
}
```

## Contributing

### Code Style

- Follow existing TypeScript patterns
- Use JSDoc comments for public interfaces
- Implement comprehensive error handling
- Write tests for new functionality

### Pull Request Guidelines

1. **Feature Branch**: Create feature branch from main
2. **Tests**: Include unit and integration tests
3. **Documentation**: Update relevant documentation
4. **Performance**: Consider performance implications
5. **Backward Compatibility**: Maintain existing API contracts
