# Korean Food Arena API Reference

This document provides detailed technical reference for the Korean Food Arena API, including TypeScript interfaces, usage examples, and implementation details for the expanded comments feature.

## Table of Contents

1. [Type Definitions](#type-definitions)
2. [API Client Usage](#api-client-usage)
3. [Query Hooks](#query-hooks)
4. [Error Handling](#error-handling)
5. [Performance Considerations](#performance-considerations)
6. [Migration Guide](#migration-guide)

## Type Definitions

### Core Interfaces

#### Food

```typescript
interface Food {
  /** Unique food identifier */
  id: string
  /** Display name of the food */
  name: string
  /** URL to food image */
  imageUrl: string
  /** Current ELO rating score */
  eloScore: number
  /** Total number of votes received */
  totalVotes: number
  /** ISO timestamp when food was created */
  createdAt: string
  /** ISO timestamp when food was last updated */
  updatedAt: string
}
```

#### Comment (Base)

```typescript
interface Comment {
  /** Unique comment identifier */
  id: string
  /** The food pairing this comment belongs to */
  pairKey: string
  /** The vote result this comment is associated with */
  result: 'win' | 'tie'
  /** The winning food ID (only present for 'win' results) */
  winnerFoodId?: string
  /** The comment text content (sanitized) */
  content: string
  /** ISO timestamp when the comment was created */
  createdAt: string
  /** User's nationality (privacy-protected, may be 'Other' for small groups) */
  nationality?: string
}
```

#### EnhancedComment (Extended)

```typescript
interface EnhancedComment extends Comment {
  /** Whether this comment is from the exact current pairing being viewed */
  isCurrentPairing: boolean
  /** The other food ID in the commenter's pairing */
  otherFoodId: string
  /** Display name of the other food for UI context */
  otherFoodName: string
}
```

### Request/Response Interfaces

#### ExpandedCommentsRequest

```typescript
interface ExpandedCommentsRequest {
  /** The normalized pair key (e.g., "bibimbap_kimchi") */
  pairKey: string
  /** First food ID in the pairing */
  foodId1: string
  /** Second food ID in the pairing */
  foodId2: string
  /** Maximum number of current pairing comments to return (1-20, default: 10) */
  currentPairingLimit?: number
  /** Maximum number of expanded comments to return (1-30, default: 10) */
  expandedLimit?: number
  /** Whether to include expanded comments from other pairings (default: true) */
  includeExpanded?: boolean
  /** Pagination cursor (ISO timestamp) for loading more comments */
  cursor?: string
}
```

#### ExpandedCommentsResponse

```typescript
interface ExpandedCommentsResponse {
  /** Comments from the exact current pairing (shown first) */
  currentPairingComments: EnhancedComment[]
  /** Comments from other pairings involving either food */
  expandedComments: EnhancedComment[]
  /** Total number of comments returned in this response */
  totalCount: number
  /** Whether more comments are available for pagination */
  hasMore: boolean
  /** Timestamp cursor for next page (if hasMore is true) */
  cursor?: string
}
```

## API Client Usage

### Basic Usage

```typescript
import { apiClient } from '@/lib/api-client'

// Get expanded comments for a pairing
const response = await apiClient.getExpandedComments(
  'bibimbap_kimchi',
  'bibimbap',
  'kimchi',
  {
    currentPairingLimit: 5,
    expandedLimit: 15,
    includeExpanded: true,
  },
)

console.log('Current pairing comments:', response.currentPairingComments)
console.log('Expanded comments:', response.expandedComments)
```

### Advanced Usage with Pagination

```typescript
import { apiClient } from '@/lib/api-client'

async function loadAllComments(
  pairKey: string,
  foodId1: string,
  foodId2: string,
) {
  let allComments: EnhancedComment[] = []
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const response = await apiClient.getExpandedComments(
      pairKey,
      foodId1,
      foodId2,
      {
        currentPairingLimit: 10,
        expandedLimit: 20,
        cursor,
      },
    )

    allComments.push(
      ...response.currentPairingComments,
      ...response.expandedComments,
    )
    cursor = response.cursor
    hasMore = response.hasMore
  }

  return allComments
}
```

### Error Handling

```typescript
import { apiClient, isApiError } from '@/lib/api-client'

try {
  const comments = await apiClient.getExpandedComments(
    'bibimbap_kimchi',
    'bibimbap',
    'kimchi',
  )
  // Handle success
} catch (error) {
  if (isApiError(error)) {
    switch (error.code) {
      case 403:
        console.error('Must vote before viewing comments')
        break
      case 400:
        console.error('Invalid request parameters:', error.details)
        break
      default:
        console.error('API error:', error.message)
    }
  } else {
    console.error('Network or other error:', error)
  }
}
```

## Query Hooks

### useExpandedComments Hook

```typescript
import { useExpandedComments } from '@/hooks/use-comment-queries'

function CommentsSection({ pairKey, foodId1, foodId2 }: {
  pairKey: string
  foodId1: string
  foodId2: string
}) {
  const {
    data: comments,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useExpandedComments(pairKey, foodId1, foodId2, {
    currentPairingLimit: 10,
    expandedLimit: 15
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} onRetry={refetch} />

  return (
    <div>
      {/* Current pairing comments */}
      {comments?.currentPairingComments.map(comment => (
        <CommentCard
          key={comment.id}
          comment={comment}
          showPairingContext={false}
        />
      ))}

      {/* Expanded comments */}
      {comments?.expandedComments.map(comment => (
        <CommentCard
          key={comment.id}
          comment={comment}
          showPairingContext={true}
        />
      ))}

      {/* Load more button */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

### Query Key Management

```typescript
import { queryKeys } from '@/lib'

// Query key for expanded comments
const queryKey = queryKeys.expandedComments(
  'bibimbap_kimchi',
  'bibimbap',
  'kimchi',
  { currentPairingLimit: 10, expandedLimit: 15 },
)

// Invalidate expanded comments cache
queryClient.invalidateQueries({
  queryKey: queryKeys.comments,
})

// Invalidate specific pairing
queryClient.invalidateQueries({
  queryKey: queryKeys.expandedComments('bibimbap_kimchi', 'bibimbap', 'kimchi'),
})
```

### Mutation Integration

```typescript
import { useCreateCommentMutation } from '@/hooks/use-comment-queries'
import { queryKeys } from '@/lib'

function CommentForm({
  pairKey,
  foodId1,
  foodId2,
}: {
  pairKey: string
  foodId1: string
  foodId2: string
}) {
  const createComment = useCreateCommentMutation()

  const handleSubmit = async (commentData: CommentRequest) => {
    try {
      await createComment.mutateAsync(commentData)

      // Invalidate expanded comments for this pairing
      queryClient.invalidateQueries({
        queryKey: queryKeys.expandedComments(pairKey, foodId1, foodId2),
      })

      // Also invalidate any other pairings involving these foods
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments,
        predicate: (query) => {
          const [, type, queryPairKey, queryFoodId1, queryFoodId2] =
            query.queryKey
          return (
            type === 'expanded' &&
            (queryFoodId1 === foodId1 ||
              queryFoodId1 === foodId2 ||
              queryFoodId2 === foodId1 ||
              queryFoodId2 === foodId2)
          )
        },
      })
    } catch (error) {
      console.error('Failed to create comment:', error)
    }
  }

  // ... form implementation
}
```

## Error Handling

### Error Types

```typescript
interface ApiError {
  error: string
  message: string
  code: number
  details?: Record<string, unknown>
}

// Type guard
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'message' in error &&
    'code' in error
  )
}
```

### Common Error Scenarios

```typescript
// 403 Forbidden - Must vote before viewing comments
{
  "error": "ForbiddenError",
  "message": "You must vote on this pairing before viewing comments",
  "code": 403
}

// 400 Bad Request - Invalid parameters
{
  "error": "ValidationError",
  "message": "Food IDs do not match the provided pair key",
  "code": 400,
  "details": {
    "pairKey": "bibimbap_kimchi",
    "providedIds": ["bibimbap", "bulgogi"],
    "expectedIds": ["bibimbap", "kimchi"]
  }
}

// 404 Not Found - Invalid food IDs
{
  "error": "NotFoundError",
  "message": "One or more foods not found",
  "code": 404
}
```

### Error Boundary Implementation

```typescript
import { ErrorBoundary } from 'react-error-boundary'

function CommentErrorFallback({ error, resetErrorBoundary }: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="error-container">
      <h3>Failed to load comments</h3>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>
        Try Again
      </button>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={CommentErrorFallback}
      onReset={() => {
        // Reset any necessary state
        queryClient.invalidateQueries({ queryKey: queryKeys.comments })
      }}
    >
      <CommentsSection />
    </ErrorBoundary>
  )
}
```

## Performance Considerations

### Query Optimization

```typescript
// Optimized query configuration
const expandedCommentsQuery = useExpandedComments(
  pairKey,
  foodId1,
  foodId2,
  {
    currentPairingLimit: 8, // Reduced for performance
    expandedLimit: 12, // Balanced for UX vs performance
  },
  {
    staleTime: 30000, // Cache for 30 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors except 408 and 429
      if (isApiError(error) && error.code >= 400 && error.code < 500) {
        return error.code === 408 || error.code === 429
      }
      return failureCount < 3
    },
  },
)
```

### Selective Cache Invalidation

```typescript
// Invalidate only relevant caches when creating a comment
const invalidateRelevantCaches = (foodId1: string, foodId2: string) => {
  // Invalidate expanded comments for any pairing involving these foods
  queryClient.invalidateQueries({
    queryKey: queryKeys.comments,
    predicate: (query) => {
      const [, type, , queryFoodId1, queryFoodId2] = query.queryKey
      if (type !== 'expanded') return false

      return (
        queryFoodId1 === foodId1 ||
        queryFoodId1 === foodId2 ||
        queryFoodId2 === foodId1 ||
        queryFoodId2 === foodId2
      )
    },
  })
}
```

### Response Size Monitoring

```typescript
// Monitor response sizes in development
if (process.env.NODE_ENV === 'development') {
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const response = await originalFetch(...args)

    if (args[0]?.toString().includes('/expanded')) {
      const size = response.headers.get('content-length')
      console.log(`Expanded comments response size: ${size} bytes`)
    }

    return response
  }
}
```

## Migration Guide

### From Legacy Comments to Expanded Comments

#### Step 1: Update Component Props

```typescript
// Before (legacy)
interface CommentsProps {
  pairKey: string
}

// After (expanded)
interface CommentsProps {
  pairKey: string
  foodId1: string
  foodId2: string
}
```

#### Step 2: Update Hook Usage

```typescript
// Before (legacy)
const { data: comments } = useComments(pairKey)

// After (expanded)
const { data: comments } = useExpandedComments(pairKey, foodId1, foodId2)
```

#### Step 3: Update Component Rendering

```typescript
// Before (legacy)
{comments?.map(comment => (
  <CommentCard key={comment.id} comment={comment} />
))}

// After (expanded)
{comments?.currentPairingComments.map(comment => (
  <CommentCard key={comment.id} comment={comment} showPairingContext={false} />
))}
{comments?.expandedComments.map(comment => (
  <CommentCard key={comment.id} comment={comment} showPairingContext={true} />
))}
```

### Backward Compatibility

The legacy `/api/comments/:pairKey` endpoint remains available:

```typescript
// Legacy endpoint still works
const legacyComments = await apiClient.getComments(pairKey)

// New endpoint provides enhanced functionality
const expandedComments = await apiClient.getExpandedComments(
  pairKey,
  foodId1,
  foodId2,
)
```

### Feature Flags

```typescript
// Conditional rendering based on feature flag
const ENABLE_EXPANDED_COMMENTS = process.env.REACT_APP_ENABLE_EXPANDED_COMMENTS === 'true'

function CommentsSection(props: CommentsProps) {
  if (ENABLE_EXPANDED_COMMENTS) {
    return <ExpandedCommentsSection {...props} />
  } else {
    return <LegacyCommentsSection pairKey={props.pairKey} />
  }
}
```

## Testing

### Unit Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useExpandedComments } from '@/hooks/use-comment-queries'

describe('useExpandedComments', () => {
  it('should return structured comment data', async () => {
    const { result } = renderHook(() =>
      useExpandedComments('bibimbap_kimchi', 'bibimbap', 'kimchi'),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveProperty('currentPairingComments')
    expect(result.current.data).toHaveProperty('expandedComments')
    expect(result.current.data?.currentPairingComments).toBeInstanceOf(Array)
    expect(result.current.data?.expandedComments).toBeInstanceOf(Array)
  })
})
```

### Integration Tests

```typescript
import { screen, waitFor } from '@testing-library/react'
import { render } from '@/test-utils'
import { ExpandedComments } from '@/components/ExpandedComments'

describe('ExpandedComments Integration', () => {
  it('should display current pairing comments first', async () => {
    render(
      <ExpandedComments
        pairKey="bibimbap_kimchi"
        foodId1="bibimbap"
        foodId2="kimchi"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Comments on this pairing')).toBeInTheDocument()
      expect(screen.getByText('More comments about these foods')).toBeInTheDocument()
    })
  })
})
```
