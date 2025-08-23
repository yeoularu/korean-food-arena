# Design Document

## Overview

The Korean Food ELO Ranking System is a web application that allows users to compare Korean foods in head-to-head matchups, updating ELO ratings based on user preferences. The system provides anonymous participation with optional nationality tracking, comment functionality, and real-time leaderboards.

**v1 Scope**: This document focuses on core functionality (anonymous sessions, random pair comparisons, voting, results/comments, leaderboard). Advanced features like caching (Cloudflare KV/Workers Cache), cache invalidation, and rate limiting are excluded from v1 and will be implemented in Phase 2.

**Constants**: MIN_GROUP_SIZE = 5 (minimum nationality group size for privacy protection)

## Architecture

### Technology Stack

- **Frontend**: React SPA with TypeScript, TanStack Router for routing, and TanStack Query for server state management
- **Backend**: Hono framework running on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM for type-safe queries
- **Authentication**: Better-auth with anonymous plugin for session management
- **Deployment**: Cloudflare Workers with static assets serving for unified deployment

### System Architecture

```mermaid
graph TB
    A[User Browser] --> B[React SPA + TanStack Router]
    B --> C[Hono API on Cloudflare Workers]
    C --> D[Cloudflare D1 Database]
    C --> E[ELO Calculation Module]
    E --> D

    subgraph "D1 Database Tables"
        F[Food - Custom]
        G[Vote - Custom]
        H[Comment - Custom]
        I[User - Better-auth]
        J[Session - Better-auth]
        K[Account - Better-auth]
        L[Verification - Better-auth]
    end

    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    D --> K
    D --> L
```

## Components and Interfaces

### Frontend Components

#### 1. Food Comparison Component

- Displays two food items with photos and names
- Primary selection buttons for each food
- Expandable "More options" section with tie/skip options
- Handles user selection and navigation to results

#### 2. Results Component

- Shows vote percentages for the current pairing
- Displays nationality breakdown if available
- Comment input field (no nationality selector needed)
- Recent comments display for this specific pairing
- "Continue" button for next comparison
- **Access Control**: Only accessible after user makes a selection for that specific pairing
- **Immediate Display**: Automatically shown immediately after user completes any selection

#### 3. Leaderboard Component

- Sortable list of foods by ELO score using TanStack Query
- Food photos, names, scores, and rankings
- Real-time score updates with automatic refetching
- Conservative invalidation-based updates (optimistic updates as future enhancement)
- Note: Secondary sort uses totalVotes which includes skip votes to reflect sample size

#### 4. Navigation Component

- Links between comparison, leaderboard, and other sections
- Session state management

#### 5. User Profile Component

- Optional nationality setting in user profile/settings
- Users can set or update nationality at any time
- No forced prompts - completely optional participation
- **Design Rationale**: Non-intrusive approach allows users to participate without nationality pressure

### TanStack Query Integration

#### Query Management

```typescript
// Custom hooks for data fetching
const useFoodPair = () =>
  useQuery({
    queryKey: ['foods', 'random-pair'],
    queryFn: () => api.foods.getRandomPair(),
    staleTime: 0, // Always fetch fresh pair
  })

const useLeaderboard = () =>
  useQuery({
    queryKey: ['foods', 'leaderboard'],
    queryFn: () => api.foods.getLeaderboard(),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  })

const useVoteStats = (pairKey: string) =>
  useQuery({
    queryKey: ['votes', 'stats', pairKey],
    queryFn: () => api.votes.getStats(pairKey),
    enabled: !!pairKey,
  })
```

#### Mutation Management

```typescript
// Conservative approach for voting mutations (recommended for initial version)
const useVoteMutation = () =>
  useMutation({
    mutationFn: api.votes.create,
    onSuccess: () => {
      // Invalidate and refetch for consistency
      queryClient.invalidateQueries(['foods', 'leaderboard'])
      queryClient.invalidateQueries(['votes', 'stats'])
    },
  })

// Optional: Optimistic updates for advanced version (use with caution)
const useOptimisticVoteMutation = () =>
  useMutation({
    mutationFn: api.votes.create,
    onMutate: async (newVote) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries(['foods', 'leaderboard'])
      const previousData = queryClient.getQueryData(['foods', 'leaderboard'])

      queryClient.setQueryData(['foods', 'leaderboard'], (old) => {
        // Optimistic ELO calculation - may cause ranking jumps in concurrent scenarios
        return updateLeaderboardOptimistically(old, newVote)
      })

      return { previousData }
    },
    onError: (err, newVote, context) => {
      // Rollback on error
      queryClient.setQueryData(['foods', 'leaderboard'], context.previousData)
    },
    onSettled: () => {
      // Always refetch to ensure server consistency
      queryClient.invalidateQueries(['foods', 'leaderboard'])
      queryClient.invalidateQueries(['votes', 'stats'])
    },
  })
```

**Note**: For initial implementation, use invalidate-based approach to ensure consistency. Optimistic updates can be added later once the core system is stable.

### Backend API Endpoints

#### Food Management

```typescript
GET /api/foods/random-pair
// Returns two random foods for comparison
// Response: { presentedLeft: Food, presentedRight: Food }
// Policy: Avoids recently presented pairs (v1: client-side tracking via memory/localStorage with suggested window of 10 recent pairs or 5 minutes; backend stateless). Left/right display order is randomized.

GET /api/foods/leaderboard
// Returns all foods sorted by ELO score
// Response: Food[] (includes id, name, imageUrl, eloScore, totalVotes, createdAt, updatedAt)
// Sorting: ELO score DESC, then totalVotes DESC (totalVotes includes skip votes to reflect sample size), then name ASC for tie-breaking (lexicographic order for consistent sorting)
```

#### Voting System

```typescript
POST /api/votes
// Records a vote and updates ELO scores
// Body: { pairKey: string, foodLowId: string, foodHighId: string, presentedLeftId: string, presentedRightId: string, result: 'win' | 'tie' | 'skip', winnerFoodId?: string }
// Response: { updatedScores: { [foodId]: number }, voteStats: VoteStats }
// Note: Uses normalized pairKey and foodLowId/foodHighId to prevent (A,B) vs (B,A) duplicates

GET /api/votes/stats/:pairKey
// Returns voting statistics for a specific pairing (requires user to have voted on this pairing)
// Authentication: Cookie-based session (Better-auth default)
// Response: { 
//   totalVotes: number, 
//   countsByFoodId: { [foodId: string]: number }, 
//   tieCount: number, 
//   skipCount: number,
//   percentageByFoodId: { [foodId: string]: number }, 
//   tiePercentage: number, 
//   nationalityBreakdown: { [countryCode: string]: { byFoodId: { [foodId: string]: number }, tiePercentage: number } }, 

//   countryCodeStandard: 'ISO-3166-1-alpha-2'
// }
// Computation note: Skip votes excluded from percentage calculations. Win/tie percentages calculated from non-skip votes only. (winA + winB + tie) = 100%.
// Privacy: Nationality breakdown only shown for groups with minimum size (MIN_GROUP_SIZE = 5), smaller groups aggregated as 'Other'. Individual comments from users in small nationality groups also display nationality as 'Other'.
// Computation note: Calculated by joining votes.user_id -> user.nationality at query time.
// Caveat: If a user changes nationality, historical breakdown will reflect the latest value.
// Note: Returns 403 if user hasn't voted on this pairKey (Requirement 4.6)

```typescript
// VoteStats response shape (reference)
interface VoteStats {
  totalVotes: number
  countsByFoodId: Record<string, number>
  tieCount: number
  skipCount: number
  // Percentages computed from non-skip votes only
  percentageByFoodId: Record<string, number>
  tiePercentage: number
  nationalityBreakdown: Record<string, {
    byFoodId: Record<string, number>
    tiePercentage: number
  }>
}
```

#### Comments System

```typescript
POST /api/comments
// Creates a new comment
// Body: { pairKey: string, result: 'win' | 'tie', winnerFoodId?: string, content: string }
// Response: Comment
// Content: Plain text only, max 280 characters, server escapes on render, no HTML allowed

GET /api/comments/:pairKey
// Returns recent comments for a food pairing (requires user to have voted on this pairing)
// Authentication: Cookie-based session (Better-auth default)
// Query params: ?limit=20 (default), ?cursor for pagination
// Response: Comment[] with result, winnerFoodId, content, timestamp, and nationality (from user profile via join)
// Sorting: created_at DESC (most recent first)
// Privacy: Compute nationality counts per pairKey; if nationality count < MIN_GROUP_SIZE (5), return 'Other' for individual comment nationality display; recomputed per request
// Note: Returns 403 if user hasn't voted on this pairKey (Requirement 4.6)
```

#### Authentication & Session Management (Better-auth)

```typescript
// Better-auth endpoints (auto-generated)
POST /api/auth/sign-in/anonymous
// Creates anonymous session
// Response: { user, session }

GET /api/auth/session
// Gets current session
// Response: { user, session }

// Custom endpoint for updating user nationality
POST /api/auth/update-nationality
// Updates user nationality through Better-auth server API
// Body: { nationality? }
// Response: { user, session }
// Note: Nationality is optional and can be skipped entirely
```

#### Frontend Session Management Pattern

```typescript
// Pseudocode example: adapt to actual auth client hooks. EnsureSession component to guarantee anonymous session on first visit
function EnsureSession({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useSession()
  const signInAnonymous = useSignInAnonymous()

  useEffect(() => {
    if (!isLoading && !session) {
      signInAnonymous.mutate()
    }
  }, [session, isLoading])

  if (isLoading || (!session && !signInAnonymous.isError)) {
    return <LoadingSpinner />
  }

  return <>{children}</>
}

// Wrap RouterProvider with EnsureSession
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EnsureSession>
        <RouterProvider router={router} />
      </EnsureSession>
    </QueryClientProvider>
  )
}
```

## Data Models

### Better-auth Configuration & Drizzle Schema

```typescript
// auth.ts - Better-auth configuration
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { db } from './db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  user: {
    additionalFields: {
      nationality: {
        type: 'string',
        required: false, // Optional field - users can skip nationality selection
        input: true, // Allow users to set nationality
        // Standard: ISO 3166-1 alpha-2 country codes, 'unknown' for unspecified
      },
    },
  },
  plugins: [
    anonymous({
      emailDomainName: 'korean-food-elo.com',
      generateName: () =>
        `Anonymous User ${Math.random().toString(36).substr(2, 9)}`,
    }),
  ],
})

// schema.ts - Custom tables (Better-auth tables are auto-generated)
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const food = sqliteTable('food', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('image_url').notNull(),
  eloScore: integer('elo_score').default(1200).notNull(),
  totalVotes: integer('total_votes').default(0).notNull(), // Total number of votes including skip votes
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 format
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 format
})

export const vote = sqliteTable('vote', {
  id: text('id').primaryKey(), // Use cuid2 or ulid for better performance
  pairKey: text('pair_key').notNull(), // Normalized: min(foodA,foodB)+'_'+max(foodA,foodB)
  foodLowId: text('food_low_id').references(() => food.id), // Normalized min ID
  foodHighId: text('food_high_id').references(() => food.id), // Normalized max ID
  presentedLeftId: text('presented_left_id').references(() => food.id), // UI display order
  presentedRightId: text('presented_right_id').references(() => food.id), // UI display order
  result: text('result', {
    enum: ['win', 'tie', 'skip'],
  }).notNull(),
  winnerFoodId: text('winner_food_id').references(() => food.id), // Only set when result='win'
  userId: text('user_id').notNull(), // References better-auth user table (table name: 'user')
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 TEXT format
})

export const comment = sqliteTable('comment', {
  id: text('id').primaryKey(), // Use cuid2 or ulid for better performance
  pairKey: text('pair_key').notNull(), // Same normalized pairKey as votes
  result: text('result', {
    enum: ['win', 'tie'],
  }).notNull(), // Skip votes don't generate comments
  winnerFoodId: text('winner_food_id').references(() => food.id), // Only set when result='win'
  content: text('content').notNull(),
  userId: text('user_id').notNull(), // References better-auth user table (table name: 'user')
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 TEXT format
})

// Type inference
export type Food = typeof food.$inferSelect
export type Vote = typeof vote.$inferSelect
export type Comment = typeof comment.$inferSelect
// User type is inferred from better-auth with nationality field
```

## Database Schema

### Tables

```sql
-- D1 Database Schema (SQLite)
-- Note: Better-auth tables (user, session, account, verification) are auto-generated
-- Note: Auth tables use integer(epoch) timestamps; custom tables use TEXT (ISO 8601) timestamps

-- Custom Food table
CREATE TABLE food (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  elo_score INTEGER DEFAULT 1200,
  total_votes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- ISO 8601 format
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP -- ISO 8601 format
);

-- Custom Vote table
CREATE TABLE vote (
  id TEXT PRIMARY KEY, -- Use cuid2() or ulid() for better performance
  pair_key TEXT NOT NULL, -- Normalized: min(food_low_id, food_high_id) + '_' + max(food_low_id, food_high_id)
  food_low_id TEXT REFERENCES food(id), -- Normalized min ID for domain logic
  food_high_id TEXT REFERENCES food(id), -- Normalized max ID for domain logic
  presented_left_id TEXT REFERENCES food(id), -- UI display order for bias analysis
  presented_right_id TEXT REFERENCES food(id), -- UI display order for bias analysis
  result TEXT CHECK (result IN ('win', 'tie', 'skip')) NOT NULL,
  winner_food_id TEXT REFERENCES food(id), -- Only set when result='win'
  user_id TEXT NOT NULL REFERENCES user(id), -- Better-auth user table (table name: 'user')
  created_at TEXT DEFAULT CURRENT_TIMESTAMP -- ISO 8601 TEXT format
);

-- Custom Comment table
CREATE TABLE comment (
  id TEXT PRIMARY KEY, -- Use cuid2() or ulid() for better performance
  pair_key TEXT NOT NULL, -- Same normalized pairKey as votes
  result TEXT CHECK (result IN ('win', 'tie')) NOT NULL, -- Skip votes don't generate comments
  winner_food_id TEXT REFERENCES food(id), -- Only set when result='win'
  content TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id), -- Better-auth user table (table name: 'user')
  created_at TEXT DEFAULT CURRENT_TIMESTAMP -- ISO 8601 TEXT format
);

-- Note: Nationality data is stored in the user table (Better-auth managed)
-- Statistics queries join vote/comment with user table to get current nationality
-- Caveat: If user changes nationality, historical statistics will reflect the updated value

-- Indexes for performance
CREATE INDEX idx_vote_pair_key ON vote(pair_key);
CREATE INDEX idx_comment_pair_key ON comment(pair_key);
CREATE INDEX idx_food_elo ON food(elo_score);
// Composite index for leaderboard sorting optimization
CREATE INDEX idx_food_leaderboard ON food(elo_score DESC, total_votes DESC);
CREATE INDEX idx_vote_created_at ON vote(created_at DESC);
CREATE INDEX idx_comment_created_at ON comment(created_at DESC);
CREATE INDEX idx_vote_user ON vote(user_id);
CREATE INDEX idx_comment_user ON comment(user_id);
-- Composite unique index for preventing duplicate votes on same pairing (Requirement 4.6)
CREATE UNIQUE INDEX idx_vote_user_pair ON vote(user_id, pair_key);
-- Recommendation: leaderboard query optimization
CREATE INDEX idx_food_elo_votes ON food(elo_score DESC, total_votes DESC);
```

## ELO Calculation System

### Algorithm Implementation

```typescript
class ELOCalculator {
  private static readonly K_FACTOR = 32 // Standard K-factor for ELO

  static calculateNewRatings(
    rating1: number,
    rating2: number,
    result: 'win' | 'loss' | 'tie',
  ): { newRating1: number; newRating2: number } {
    const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
    const expected2 = 1 - expected1

    let actual1: number, actual2: number

    switch (result) {
      case 'win':
        actual1 = 1
        actual2 = 0
        break
      case 'loss':
        actual1 = 0
        actual2 = 1
        break
      case 'tie':
        actual1 = 0.5
        actual2 = 0.5
        break
    }

    const newRating1 = Math.round(
      rating1 + this.K_FACTOR * (actual1 - expected1),
    )
    const newRating2 = Math.round(
      rating2 + this.K_FACTOR * (actual2 - expected2),
    )
    // Note: Ratings stored as integers; ties may cause ±1 rounding asymmetries; acceptable for v1

    return { newRating1, newRating2 }
  }
}
```

### Vote Processing Flow with Concurrency Control

1. Receive vote from frontend with session validation
2. Validate vote data and ensure user hasn't voted on this pairKey before (using unique constraint)
3. **Result Mapping**: API input ('win'|'tie'|'skip') → ELO calculation ('win'|'loss'|'tie'). For API 'win' result: winner gets 'win', loser gets 'loss'. For API 'tie': both get 'tie'. For API 'skip': no ELO change.
4. **D1 Transaction Processing**:
   - Begin transaction
   - Query current ELO scores for both foods with `updated_at` timestamps
   - Calculate new ELO scores (skip votes don't affect ELO, ties count as 0.5 points each)
   - Update food records with conditional `WHERE updated_at = ?` and manual `updated_at = CURRENT_TIMESTAMP` to prevent race conditions
   - Example: `UPDATE food SET elo_score=?, total_votes=total_votes+1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND updated_at=?`
   - If either food row update returns 0 rows, rollback and retry the whole transaction (optimistic locking: max 3 retries, backoff 50ms → 100ms → 200ms)
   - Insert vote record with normalized pairKey
   - Commit transaction
5. **Duplicate Vote Handling**: Return 409 Conflict if (user_id, pair_key) unique constraint violated
6. Return updated scores, vote statistics, and nationality breakdown
7. **Immediate Results**: Frontend automatically navigates to results screen
8. **Access Control**: Results are shown for pairings where user has completed any selection (win/tie/skip), but skip votes excluded from ELO/percentage calculations

### Pair Key Normalization

```typescript
function createPairKey(foodLowId: string, foodHighId: string): string {
  const [min, max] = [foodLowId, foodHighId].sort()
  return `${min}_${max}`
}

// Helper function to normalize food IDs for consistent pair representation
// Note: foodLowId/foodHighId use lexicographic order (same as pairKey generation), not related to ELO rating values
function normalizeFoodIds(foodId1: string, foodId2: string): { foodLowId: string, foodHighId: string } {
  const [min, max] = [foodId1, foodId2].sort()
  return { foodLowId: min, foodHighId: max }
}
```

This prevents duplicate entries for (A,B) vs (B,A) comparisons and ensures consistent data structure.

## Error Handling

### Frontend Error Handling

- Network connectivity issues with retry mechanism
- Invalid responses with user-friendly messages
- Loading states for all async operations
- Graceful degradation when features are unavailable

### Backend Error Handling

- Database connection failures with circuit breaker pattern
- Invalid request data with detailed validation messages
- Comprehensive logging for debugging
- **Rate limiting** (Phase 2):
  - **Cloudflare KV** with sliding window counters for IP/session-based limits
  - **Durable Objects** for more complex rate limiting scenarios
  - **Turnstile** integration for bot prevention
- Prevent duplicate voting on same pairKey by same user (unique constraint)
- Content length limits and profanity filtering for comments

### Database Security

- Parameterized queries to prevent SQL injection
- Proper access controls and user permissions
- Regular security updates and patches
- Composite unique indexes to prevent data integrity issues

### Error Response Format

```typescript
interface ErrorResponse {
  error: string
  message: string
  code: number
  details?: any
}
```

### Common Error Codes

- **400 Bad Request**: Validation failure (invalid vote data, malformed request)
- **401 Unauthorized**: Missing or expired session
- **403 Forbidden**: Access denied (user hasn't voted on this pairKey)
- **409 Conflict**: Duplicate vote attempt on same pairKey
- **429 Too Many Requests**: Rate limiting (**Phase 2** implementation)

## Testing Strategy

### Unit Testing

- ELO calculation logic with various scenarios
- Database model validation
- API endpoint input/output validation
- React component rendering and interactions

### Integration Testing

- Full vote flow from frontend to database
- Comment creation and retrieval
- Session management across requests
- Database transaction integrity

### End-to-End Testing

- Complete user journey from food comparison to results
- Cross-browser compatibility
- Mobile responsiveness
- Performance under load

### Test Data

- Seed database with representative Korean foods
- Mock nationality data for testing analytics
- Automated test data cleanup

## Performance Considerations

### Database Optimization

- Proper indexing on frequently queried columns
- Query optimization for leaderboard and statistics
- Retry with backoff on transient D1 errors
- Optimistic retry on updated_at conflicts for ELO updates

### Caching Strategy

**Phase 2 Implementation**:
- **Cloudflare KV** for frequently accessed leaderboard data with 30-60s TTL
- **Workers Cache API** (caches.default) for API response caching
- **Cache Invalidation**: When votes mutate ELO scores, invalidate KV leaderboard cache and Workers Cache entries for `/api/foods/leaderboard` and related `stats/:pairKey` endpoints
- Consider **Cloudflare Images** for optimized image delivery

**v1 Implementation**: Direct database queries without caching for simplicity and consistency

### Scalability

- **Cloudflare Workers** provide automatic horizontal scaling
- **D1 Database** handles concurrent requests without connection pooling concerns
- CDN for static assets and images through Cloudflare's global network

## Access Control Design

### Results and Comments Access Control

**Design Rationale**: To prevent bias in voting decisions, users can only view results and comments for food pairings after they have made their own selection (Requirement 4.6).

**Implementation**:

- Vote records include composite unique constraint on (user_id, pair_key)
- Results and comments endpoints verify user has voted before returning data
- Frontend enforces this by only navigating to results after successful vote submission
- Database queries join votes table to verify user participation before showing results

**Benefits**:

- Prevents users from being influenced by others' choices before making their own
- Ensures authentic personal preferences are captured
- Creates fair comparison environment where all users vote independently

**Summary**: Users can access results/comments only after making any selection (win/tie/skip). Skip votes do not affect ELO and are excluded from percentage calculations.

## Security Considerations

### Data Privacy

- No personally identifiable information storage
- Optional nationality data with user consent
- Session-based tracking without persistent user accounts
- Nationality privacy protection: Groups with N < 5 users shown as 'Other' in both vote statistics and comment displays

### Input Validation and Rate Limiting

- Sanitize all user inputs to prevent XSS (DOMPurify on client, server-side sanitization)
- Validate vote selections and comment content with Zod schemas
- **Rate limiting strategies** (Phase 2):
  - **Cloudflare KV** with sliding window counters for IP/session-based limits
  - **Durable Objects** for more complex rate limiting scenarios
  - **Turnstile** integration for bot prevention
- Prevent duplicate voting on same pairKey by same user (unique constraint)
- Content length limits and profanity filtering for comments

### Database Security

- Parameterized queries to prevent SQL injection
- Proper access controls and user permissions
- Regular security updates and patches
- Composite unique indexes to prevent data integrity issues
