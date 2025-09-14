# Design Document

## Overview

This design document outlines the implementation of expanded comment visibility in the Korean Food ELO Ranking System. The enhancement will allow users to see comments from people who voted for either of the two foods in their current pairing, rather than only seeing comments from the exact same food pairing.

The design maintains all existing security, privacy, and performance requirements while expanding the scope of visible comments to provide users with richer context about the foods they're comparing.

## Architecture

### Current vs Enhanced Comment System

**Current System:**
- Comments filtered by exact `pairKey` match
- Users see only comments from identical food pairings (A vs B)
- Limited comment pool for each pairing

**Enhanced System:**
- Comments filtered by individual food participation
- Users see comments from any pairing involving either food A or food B
- Expanded comment pool with better context
- Clear distinction between current pairing and expanded comments

### Database Query Strategy

The enhanced system will use a two-tier query approach:

1. **Primary Comments**: Comments from the exact current pairing (existing behavior)
2. **Expanded Comments**: Comments from other pairings involving either food in the current pair

## Components and Interfaces

### Backend API Changes

#### Enhanced Comment Response Structure

```typescript
// Enhanced Comment interface with additional context
export interface EnhancedComment {
  id: string
  pairKey: string
  result: 'win' | 'tie'
  winnerFoodId?: string
  content: string
  createdAt: string
  nationality?: string
  // New fields for expanded context
  isCurrentPairing: boolean
  otherFoodId: string // The other food in the commenter's pairing
  otherFoodName: string // Name of the other food for display
}

// API response structure
export interface ExpandedCommentsResponse {
  currentPairingComments: EnhancedComment[]
  expandedComments: EnhancedComment[]
  totalCount: number
  hasMore: boolean
  cursor?: string
}
```

#### Modified API Endpoint

```typescript
GET /api/comments/:pairKey/expanded
// Enhanced endpoint that returns both current pairing and expanded comments
// Query params: 
//   - limit: number (default 20, max 50)
//   - cursor: string (for pagination)
//   - includeExpanded: boolean (default true)
//   - currentPairingLimit: number (default 10)
//   - expandedLimit: number (default 10)

// Response structure prioritizes current pairing comments
// Maintains existing access control (user must have voted on current pairing)
```

### Database Query Implementation

#### Primary Query Strategy

```sql
-- Step 1: Get current pairing comments (existing logic)
SELECT 
  c.id, c.pair_key, c.result, c.winner_food_id, c.content, c.created_at,
  u.nationality,
  true as is_current_pairing,
  CASE 
    WHEN c.winner_food_id = :foodId1 THEN :foodId2
    WHEN c.winner_food_id = :foodId2 THEN :foodId1
    ELSE CASE 
      WHEN c.pair_key LIKE :foodId1 || '_%' THEN SUBSTR(c.pair_key, LENGTH(:foodId1) + 2)
      ELSE SUBSTR(c.pair_key, 1, INSTR(c.pair_key, '_') - 1)
    END
  END as other_food_id
FROM comment c
LEFT JOIN user u ON c.user_id = u.id
WHERE c.pair_key = :currentPairKey
ORDER BY c.created_at DESC
LIMIT :currentPairingLimit

-- Step 2: Get expanded comments from other pairings
SELECT 
  c.id, c.pair_key, c.result, c.winner_food_id, c.content, c.created_at,
  u.nationality,
  false as is_current_pairing,
  CASE 
    WHEN c.winner_food_id = :foodId1 THEN 
      CASE 
        WHEN c.pair_key LIKE :foodId1 || '_%' THEN SUBSTR(c.pair_key, LENGTH(:foodId1) + 2)
        ELSE SUBSTR(c.pair_key, 1, INSTR(c.pair_key, '_') - 1)
      END
    WHEN c.winner_food_id = :foodId2 THEN 
      CASE 
        WHEN c.pair_key LIKE :foodId2 || '_%' THEN SUBSTR(c.pair_key, LENGTH(:foodId2) + 2)
        ELSE SUBSTR(c.pair_key, 1, INSTR(c.pair_key, '_') - 1)
      END
    ELSE NULL
  END as other_food_id
FROM comment c
LEFT JOIN user u ON c.user_id = u.id
WHERE c.pair_key != :currentPairKey
  AND (c.winner_food_id = :foodId1 OR c.winner_food_id = :foodId2)
ORDER BY c.created_at DESC
LIMIT :expandedLimit
```

#### Optimized Drizzle ORM Implementation

```typescript
async function getExpandedComments(
  db: Database,
  currentPairKey: string,
  foodId1: string,
  foodId2: string,
  options: {
    currentPairingLimit: number
    expandedLimit: number
    cursor?: string
  }
): Promise<ExpandedCommentsResponse> {
  // Get current pairing comments
  const currentComments = await db
    .select({
      id: comment.id,
      pairKey: comment.pairKey,
      result: comment.result,
      winnerFoodId: comment.winnerFoodId,
      content: comment.content,
      createdAt: comment.createdAt,
      nationality: user.nationality,
      isCurrentPairing: sql<boolean>`true`,
      otherFoodId: sql<string>`
        CASE 
          WHEN ${comment.winnerFoodId} = ${foodId1} THEN ${foodId2}
          WHEN ${comment.winnerFoodId} = ${foodId2} THEN ${foodId1}
          ELSE CASE 
            WHEN ${comment.pairKey} LIKE ${foodId1} || '_%' 
            THEN SUBSTR(${comment.pairKey}, LENGTH(${foodId1}) + 2)
            ELSE SUBSTR(${comment.pairKey}, 1, INSTR(${comment.pairKey}, '_') - 1)
          END
        END
      `,
    })
    .from(comment)
    .leftJoin(user, eq(comment.userId, user.id))
    .where(eq(comment.pairKey, currentPairKey))
    .orderBy(desc(comment.createdAt))
    .limit(options.currentPairingLimit)

  // Get expanded comments from other pairings
  const expandedComments = await db
    .select({
      id: comment.id,
      pairKey: comment.pairKey,
      result: comment.result,
      winnerFoodId: comment.winnerFoodId,
      content: comment.content,
      createdAt: comment.createdAt,
      nationality: user.nationality,
      isCurrentPairing: sql<boolean>`false`,
      otherFoodId: sql<string>`
        CASE 
          WHEN ${comment.winnerFoodId} = ${foodId1} THEN 
            CASE 
              WHEN ${comment.pairKey} LIKE ${foodId1} || '_%' 
              THEN SUBSTR(${comment.pairKey}, LENGTH(${foodId1}) + 2)
              ELSE SUBSTR(${comment.pairKey}, 1, INSTR(${comment.pairKey}, '_') - 1)
            END
          WHEN ${comment.winnerFoodId} = ${foodId2} THEN 
            CASE 
              WHEN ${comment.pairKey} LIKE ${foodId2} || '_%' 
              THEN SUBSTR(${comment.pairKey}, LENGTH(${foodId2}) + 2)
              ELSE SUBSTR(${comment.pairKey}, 1, INSTR(${comment.pairKey}, '_') - 1)
            END
          ELSE NULL
        END
      `,
    })
    .from(comment)
    .leftJoin(user, eq(comment.userId, user.id))
    .where(
      and(
        ne(comment.pairKey, currentPairKey),
        or(
          eq(comment.winnerFoodId, foodId1),
          eq(comment.winnerFoodId, foodId2)
        )
      )
    )
    .orderBy(desc(comment.createdAt))
    .limit(options.expandedLimit)

  // Get food names for context
  const foods = await db
    .select({ id: food.id, name: food.name })
    .from(food)
    .where(inArray(food.id, [foodId1, foodId2, ...otherFoodIds]))

  const foodNameMap = new Map(foods.map(f => [f.id, f.name]))

  // Apply nationality privacy protection and add food names
  const processedComments = [...currentComments, ...expandedComments].map(comment => ({
    ...comment,
    otherFoodName: foodNameMap.get(comment.otherFoodId) || 'Unknown Food',
    nationality: applyNationalityPrivacy(comment.nationality, allComments)
  }))

  return {
    currentPairingComments: processedComments.filter(c => c.isCurrentPairing),
    expandedComments: processedComments.filter(c => !c.isCurrentPairing),
    totalCount: processedComments.length,
    hasMore: processedComments.length >= (options.currentPairingLimit + options.expandedLimit),
    cursor: processedComments[processedComments.length - 1]?.createdAt
  }
}
```

### Frontend Component Changes

#### Enhanced Results Component

```typescript
interface ExpandedCommentsProps {
  pairKey: string
  foodId1: string
  foodId2: string
  currentPairingLimit?: number
  expandedLimit?: number
}

function ExpandedComments({ 
  pairKey, 
  foodId1, 
  foodId2,
  currentPairingLimit = 10,
  expandedLimit = 10 
}: ExpandedCommentsProps) {
  const { data: comments, isLoading } = useExpandedComments(
    pairKey, 
    foodId1, 
    foodId2,
    { currentPairingLimit, expandedLimit }
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Current Pairing Comments */}
      {comments?.currentPairingComments.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">
            Comments on this pairing
          </h3>
          <div className="space-y-3">
            {comments.currentPairingComments.map(comment => (
              <CommentCard 
                key={comment.id} 
                comment={comment}
                showPairingContext={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Expanded Comments */}
      {comments?.expandedComments.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">
            More comments about these foods
          </h3>
          <div className="space-y-3">
            {comments.expandedComments.map(comment => (
              <CommentCard 
                key={comment.id} 
                comment={comment}
                showPairingContext={true}
              />
            ))}
          </div>
        </section>
      )}

      {comments?.hasMore && (
        <button 
          onClick={() => loadMore()}
          className="w-full py-2 text-blue-600 hover:text-blue-800"
        >
          Load more comments
        </button>
      )}
    </div>
  )
}
```

#### Enhanced Comment Card Component

```typescript
interface CommentCardProps {
  comment: EnhancedComment
  showPairingContext: boolean
}

function CommentCard({ comment, showPairingContext }: CommentCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      {/* Comment content */}
      <p className="text-gray-800 mb-2">{comment.content}</p>
      
      {/* Context information */}
      <div className="text-sm text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            Voted for: {comment.winnerFoodId ? 'Winner' : 'Tie'}
          </span>
          {comment.nationality && comment.nationality !== 'unknown' && (
            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
              {comment.nationality}
            </span>
          )}
        </div>
        
        {showPairingContext && (
          <div className="text-xs text-gray-500">
            From pairing with: {comment.otherFoodName}
          </div>
        )}
        
        <div className="text-xs text-gray-400">
          {formatRelativeTime(comment.createdAt)}
        </div>
      </div>
    </div>
  )
}
```

### TanStack Query Integration

#### Enhanced Query Hooks

```typescript
// Enhanced query key factory
export const expandedCommentQueryKeys = {
  all: ['comments', 'expanded'] as const,
  byPairKey: (pairKey: string, foodId1: string, foodId2: string, options: any) =>
    [...expandedCommentQueryKeys.all, pairKey, foodId1, foodId2, options] as const,
}

// Enhanced query hook
export function useExpandedComments(
  pairKey: string,
  foodId1: string,
  foodId2: string,
  options: {
    currentPairingLimit?: number
    expandedLimit?: number
    includeExpanded?: boolean
  } = {}
) {
  const networkAwareOptions = useNetworkAwareQuery()

  return useQuery({
    queryKey: expandedCommentQueryKeys.byPairKey(pairKey, foodId1, foodId2, options),
    queryFn: () => apiClient.getExpandedComments(pairKey, foodId1, foodId2, options),
    staleTime: 30000, // Cache for 30 seconds
    ...networkAwareOptions,
  })
}

// Enhanced mutation for comment creation
export function useCreateCommentMutation() {
  const queryClient = useQueryClient()
  const showSuccessToast = useSuccessToast()
  const showErrorToast = useErrorToast()

  return useMutation({
    mutationFn: apiClient.createComment,
    onSuccess: (data, variables) => {
      showSuccessToast('Comment added successfully!')
      
      // Invalidate both regular and expanded comment queries
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      })
      
      // Invalidate expanded comments for any pairing involving these foods
      queryClient.invalidateQueries({
        queryKey: ['comments', 'expanded'],
      })
    },
    onError: (error) => {
      if (isApiError(error)) {
        showErrorToast(error.message)
      } else {
        showErrorToast('Failed to add comment. Please try again.')
      }
    },
  })
}
```

## Data Models

### Enhanced Comment Response Type

```typescript
// Enhanced comment interface with additional context
export interface EnhancedComment {
  id: string
  pairKey: string
  result: 'win' | 'tie'
  winnerFoodId?: string
  content: string
  createdAt: string
  nationality?: string
  // New fields for expanded context
  isCurrentPairing: boolean
  otherFoodId: string
  otherFoodName: string
}

// API response structure
export interface ExpandedCommentsResponse {
  currentPairingComments: EnhancedComment[]
  expandedComments: EnhancedComment[]
  totalCount: number
  hasMore: boolean
  cursor?: string
}
```

### Database Schema Changes

No database schema changes are required. The existing schema supports this enhancement:

- `comment.pairKey` - Used to identify current pairing comments
- `comment.winnerFoodId` - Used to find comments about specific foods
- `comment.result` - Used to show win/tie context
- Existing indexes support the new query patterns

### Additional Indexes for Performance

```sql
-- New composite index for expanded comment queries
CREATE INDEX idx_comment_winner_food_created ON comment(winner_food_id, created_at DESC);

-- Existing indexes that support the new queries
-- idx_comment_pair_key (existing)
-- idx_comment_created_at (existing)
```

## Error Handling

### Backend Error Handling

```typescript
// Enhanced error handling for expanded comments
async function getExpandedComments(req: ExpandedCommentsRequest): Promise<ExpandedCommentsResponse> {
  try {
    // Validate request parameters
    if (!req.pairKey || !req.foodId1 || !req.foodId2) {
      throw new ValidationError('Missing required parameters')
    }

    // Parse food IDs from pairKey for validation
    const [parsedFoodId1, parsedFoodId2] = req.pairKey.split('_')
    if (!parsedFoodId1 || !parsedFoodId2) {
      throw new ValidationError('Invalid pairKey format')
    }

    // Verify food IDs match pairKey
    const sortedIds = [req.foodId1, req.foodId2].sort()
    const sortedPairIds = [parsedFoodId1, parsedFoodId2].sort()
    if (sortedIds[0] !== sortedPairIds[0] || sortedIds[1] !== sortedPairIds[1]) {
      throw new ValidationError('Food IDs do not match pairKey')
    }

    // Execute queries with error handling
    const result = await withErrorHandling(async () => {
      return await executeExpandedCommentsQuery(req)
    }, 'retrieve expanded comments')

    return result
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new DatabaseError('Failed to retrieve expanded comments')
  }
}
```

### Frontend Error Handling

```typescript
// Enhanced error handling in React components
function ExpandedComments({ pairKey, foodId1, foodId2 }: ExpandedCommentsProps) {
  const { 
    data: comments, 
    isLoading, 
    error,
    refetch 
  } = useExpandedComments(pairKey, foodId1, foodId2)

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">
          Failed to load comments. Please try again.
        </p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!comments || (comments.currentPairingComments.length === 0 && comments.expandedComments.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comments yet. Be the first to share your thoughts!
      </div>
    )
  }

  return (
    // Component JSX
  )
}
```

## Performance Considerations

### Database Query Optimization

1. **Composite Indexes**: New index on `(winner_food_id, created_at DESC)` for efficient expanded comment queries
2. **Query Limits**: Separate limits for current pairing vs expanded comments to control response size
3. **Pagination**: Cursor-based pagination for large comment sets
4. **Query Batching**: Single request returns both comment types to minimize round trips

### Caching Strategy

```typescript
// Enhanced caching with different TTLs
const CACHE_CONFIG = {
  currentPairingComments: {
    staleTime: 30000, // 30 seconds - more dynamic
    cacheTime: 300000, // 5 minutes
  },
  expandedComments: {
    staleTime: 60000, // 1 minute - less dynamic
    cacheTime: 600000, // 10 minutes
  }
}

// Selective cache invalidation
function invalidateCommentCaches(foodId1: string, foodId2: string) {
  // Invalidate current pairing caches
  queryClient.invalidateQueries({
    queryKey: ['comments', 'expanded'],
    predicate: (query) => {
      const [, , pairKey] = query.queryKey
      return pairKey === createPairKey(foodId1, foodId2)
    }
  })

  // Invalidate expanded comment caches for these foods
  queryClient.invalidateQueries({
    queryKey: ['comments', 'expanded'],
    predicate: (query) => {
      const [, , , queryFoodId1, queryFoodId2] = query.queryKey
      return queryFoodId1 === foodId1 || queryFoodId1 === foodId2 ||
             queryFoodId2 === foodId1 || queryFoodId2 === foodId2
    }
  })
}
```

### Response Size Management

```typescript
// Default limits to prevent large responses
const DEFAULT_LIMITS = {
  currentPairingLimit: 10,
  expandedLimit: 10,
  maxTotalLimit: 50,
}

// Progressive loading for large comment sets
function useProgressiveCommentLoading(pairKey: string, foodId1: string, foodId2: string) {
  const [limits, setLimits] = useState(DEFAULT_LIMITS)
  
  const loadMore = useCallback(() => {
    setLimits(prev => ({
      ...prev,
      expandedLimit: Math.min(prev.expandedLimit + 10, 30)
    }))
  }, [])

  return { limits, loadMore }
}
```

## Security Considerations

### Access Control

- Maintains existing access control: users must vote on current pairing before viewing any comments
- Expanded comments still require the same authentication and authorization
- No additional permissions needed for expanded visibility

### Privacy Protection

```typescript
// Enhanced nationality privacy protection across all comments
function applyNationalityPrivacy(
  comments: EnhancedComment[],
  minGroupSize: number = 5
): EnhancedComment[] {
  // Count nationality occurrences across all comments (current + expanded)
  const nationalityCounts = comments.reduce((counts, comment) => {
    const nationality = comment.nationality || 'unknown'
    counts[nationality] = (counts[nationality] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  // Apply privacy protection consistently
  return comments.map(comment => ({
    ...comment,
    nationality: (nationalityCounts[comment.nationality || 'unknown'] || 0) >= minGroupSize
      ? comment.nationality || 'unknown'
      : 'Other'
  }))
}
```

### Input Validation

```typescript
// Enhanced validation for expanded comment requests
const ExpandedCommentsRequestSchema = z.object({
  pairKey: z.string().regex(/^[a-zA-Z0-9-]+_[a-zA-Z0-9-]+$/, 'Invalid pairKey format'),
  foodId1: z.string().uuid('Invalid food ID format'),
  foodId2: z.string().uuid('Invalid food ID format'),
  currentPairingLimit: z.number().min(1).max(20).default(10),
  expandedLimit: z.number().min(1).max(30).default(10),
  includeExpanded: z.boolean().default(true),
  cursor: z.string().optional(),
})
```

## Testing Strategy

### Unit Tests

```typescript
// Database query tests
describe('Expanded Comments Queries', () => {
  test('should return current pairing comments first', async () => {
    const result = await getExpandedComments(db, 'food1_food2', 'food1', 'food2', options)
    expect(result.currentPairingComments).toHaveLength(2)
    expect(result.expandedComments).toHaveLength(3)
  })

  test('should apply nationality privacy protection', async () => {
    const result = await getExpandedComments(db, 'food1_food2', 'food1', 'food2', options)
    const smallGroupComments = result.expandedComments.filter(c => c.nationality === 'Other')
    expect(smallGroupComments.length).toBeGreaterThan(0)
  })

  test('should handle missing food names gracefully', async () => {
    const result = await getExpandedComments(db, 'food1_food2', 'food1', 'food2', options)
    result.expandedComments.forEach(comment => {
      expect(comment.otherFoodName).toBeDefined()
      expect(comment.otherFoodName).not.toBe('')
    })
  })
})
```

### Integration Tests

```typescript
// API endpoint tests
describe('GET /api/comments/:pairKey/expanded', () => {
  test('should require user to have voted on current pairing', async () => {
    const response = await request(app)
      .get('/api/comments/food1_food2/expanded')
      .set('Cookie', sessionCookie)
    
    expect(response.status).toBe(403)
    expect(response.body.message).toContain('must vote')
  })

  test('should return structured response with current and expanded comments', async () => {
    // User votes first
    await createVote(userId, 'food1_food2', 'food1')
    
    const response = await request(app)
      .get('/api/comments/food1_food2/expanded')
      .set('Cookie', sessionCookie)
    
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('currentPairingComments')
    expect(response.body).toHaveProperty('expandedComments')
    expect(response.body).toHaveProperty('totalCount')
  })
})
```

### Frontend Component Tests

```typescript
// React component tests
describe('ExpandedComments Component', () => {
  test('should display current pairing comments first', async () => {
    render(<ExpandedComments pairKey="food1_food2" foodId1="food1" foodId2="food2" />)
    
    await waitFor(() => {
      expect(screen.getByText('Comments on this pairing')).toBeInTheDocument()
      expect(screen.getByText('More comments about these foods')).toBeInTheDocument()
    })
  })

  test('should show pairing context for expanded comments', async () => {
    render(<ExpandedComments pairKey="food1_food2" foodId1="food1" foodId2="food2" />)
    
    await waitFor(() => {
      expect(screen.getByText(/From pairing with:/)).toBeInTheDocument()
    })
  })
})
```

## Migration Strategy

### Backward Compatibility

1. **Dual Endpoints**: Keep existing `/api/comments/:pairKey` endpoint for backward compatibility
2. **Progressive Enhancement**: New `/api/comments/:pairKey/expanded` endpoint for enhanced functionality
3. **Feature Flag**: Optional feature flag to enable/disable expanded comments
4. **Gradual Rollout**: Deploy backend changes first, then frontend updates

### Deployment Plan

1. **Phase 1**: Deploy backend API changes with new endpoint
2. **Phase 2**: Update frontend to use new endpoint with fallback to old endpoint
3. **Phase 3**: Monitor performance and user engagement
4. **Phase 4**: Deprecate old endpoint after successful rollout

### Performance Monitoring

```typescript
// Performance metrics for expanded comments
const PERFORMANCE_METRICS = {
  queryExecutionTime: 'expanded_comments_query_duration',
  responseSize: 'expanded_comments_response_size',
  cacheHitRate: 'expanded_comments_cache_hit_rate',
  userEngagement: 'expanded_comments_view_rate',
}

// Monitoring implementation
async function trackExpandedCommentsPerformance(
  startTime: number,
  responseSize: number,
  cacheHit: boolean
) {
  const duration = Date.now() - startTime
  
  // Log metrics for monitoring
  console.log({
    metric: PERFORMANCE_METRICS.queryExecutionTime,
    value: duration,
    timestamp: new Date().toISOString()
  })
  
  console.log({
    metric: PERFORMANCE_METRICS.responseSize,
    value: responseSize,
    timestamp: new Date().toISOString()
  })
}
```