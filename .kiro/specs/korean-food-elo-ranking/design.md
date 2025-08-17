# Design Document

## Overview

The Korean Food ELO Ranking System is a web application that allows users to compare Korean foods in head-to-head matchups, updating ELO ratings based on user preferences. The system provides anonymous participation with optional nationality tracking, comment functionality, and real-time leaderboards.

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
        F[Foods - Custom]
        G[Votes - Custom]
        H[Comments - Custom]
        I[User - Better-auth]
        J[Session - Better-auth]
        K[Account - Better-auth]
    end

    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    D --> K
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
- Comment input field with nationality selector
- Recent comments display for this specific pairing
- "Continue" button for next comparison
- **Access Control**: Only accessible after user makes a selection for that specific pairing
- **Immediate Display**: Automatically shown immediately after user completes any selection

#### 3. Leaderboard Component

- Sortable list of foods by ELO score using TanStack Query
- Food photos, names, scores, and rankings
- Real-time score updates with automatic refetching
- Conservative invalidation-based updates (optimistic updates as future enhancement)

#### 4. Navigation Component

- Links between comparison, leaderboard, and other sections
- Session state management

#### 5. Nationality Prompt Component

- **First-Time User Flow**: Appears when user makes their first selection or comment
- Optional nationality selector with common countries
- "Skip" option to proceed without providing nationality
- Stores nationality preference in user session for future interactions
- **Design Rationale**: Prompting after first interaction prevents bias in initial food selection

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
// Response: { food1: Food, food2: Food }

GET /api/foods/leaderboard
// Returns all foods sorted by ELO score
// Response: Food[]
```

#### Voting System

```typescript
POST /api/votes
// Records a vote and updates ELO scores
// Body: { pairKey: string, foodAId: string, foodBId: string, chosen: 'a' | 'b' | 'tie' | 'skip', nationalityAtVote?: string }
// Response: { updatedScores: { foodA: number, foodB: number }, voteStats: VoteStats }
// Note: Uses normalized pairKey to prevent (A,B) vs (B,A) duplicates

GET /api/votes/stats/:pairKey
// Returns voting statistics for a specific pairing (requires user to have voted on this pairing)
// Headers: Authorization with session token
// Response: { totalVotes, chosenAPercentage, chosenBPercentage, nationalityBreakdown, userHasVoted: boolean }
// Note: Returns 403 if user hasn't voted on this pairKey (Requirement 4.6)
```

#### Comments System

```typescript
POST /api/comments
// Creates a new comment
// Body: { pairKey: string, chosen: 'a' | 'b' | 'tie', content: string, nationalityAtComment?: string }
// Response: Comment

GET /api/comments/:pairKey
// Returns recent comments for a food pairing (requires user to have voted on this pairing)
// Headers: Authorization with session token
// Response: Comment[] with chosen, content, nationalityAtComment, and timestamp
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
// EnsureSession component to guarantee anonymous session on first visit
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
        required: false,
        input: true, // Allow users to set nationality
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

export const foods = sqliteTable('foods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('image_url').notNull(),
  eloScore: integer('elo_score').default(1200).notNull(),
  totalVotes: integer('total_votes').default(0).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(), // Use cuid2 or ulid for better performance
  pairKey: text('pair_key').notNull(), // Normalized: min(foodA,foodB)+'_'+max(foodA,foodB)
  foodAId: text('food_a_id').references(() => foods.id),
  foodBId: text('food_b_id').references(() => foods.id),
  chosen: text('chosen', {
    enum: ['a', 'b', 'tie', 'skip'],
  }).notNull(),
  userId: text('user_id'), // References better-auth user table
  nationalityAtVote: text('nationality_at_vote'), // Snapshot of user's nationality at vote time
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(), // Use cuid2 or ulid for better performance
  pairKey: text('pair_key').notNull(), // Same normalized pairKey as votes
  chosen: text('chosen', {
    enum: ['a', 'b', 'tie'],
  }).notNull(),
  content: text('content').notNull(),
  userId: text('user_id'), // References better-auth user table
  nationalityAtComment: text('nationality_at_comment'), // Snapshot of user's nationality at comment time
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Type inference
export type Food = typeof foods.$inferSelect
export type Vote = typeof votes.$inferSelect
export type Comment = typeof comments.$inferSelect
// User type is inferred from better-auth with nationality field
```

## Database Schema

### Tables

```sql
-- D1 Database Schema (SQLite)
-- Note: Better-auth tables (user, session, account, verification) are auto-generated

-- Custom Foods table
CREATE TABLE foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  elo_score INTEGER DEFAULT 1200,
  total_votes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Custom Votes table
CREATE TABLE votes (
  id TEXT PRIMARY KEY, -- Use cuid2() or ulid() for better performance
  pair_key TEXT NOT NULL, -- Normalized: min(food_a_id, food_b_id) + '_' + max(food_a_id, food_b_id)
  food_a_id TEXT REFERENCES foods(id),
  food_b_id TEXT REFERENCES foods(id),
  chosen TEXT CHECK (chosen IN ('a', 'b', 'tie', 'skip')),
  user_id TEXT REFERENCES user(id), -- Better-auth user table
  nationality_at_vote TEXT, -- Snapshot of user's nationality at vote time
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Custom Comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY, -- Use cuid2() or ulid() for better performance
  pair_key TEXT NOT NULL, -- Same normalized pairKey as votes
  chosen TEXT CHECK (chosen IN ('a', 'b', 'tie')),
  content TEXT NOT NULL,
  user_id TEXT REFERENCES user(id), -- Better-auth user table
  nationality_at_comment TEXT, -- Snapshot of user's nationality at comment time
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_votes_pair_key ON votes(pair_key);
CREATE INDEX idx_comments_pair_key ON comments(pair_key);
CREATE INDEX idx_foods_elo ON foods(elo_score);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_comments_user ON comments(user_id);
-- Composite unique index for preventing duplicate votes on same pairing (Requirement 4.6)
CREATE UNIQUE INDEX idx_votes_user_pair ON votes(user_id, pair_key);
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

    return { newRating1, newRating2 }
  }
}
```

### Vote Processing Flow with Concurrency Control

1. Receive vote from frontend with session validation
2. Validate vote data and ensure user hasn't voted on this pairKey before (using unique constraint)
3. **D1 Transaction Processing**:
   - Begin transaction
   - Query current ELO scores for both foods with `updated_at` timestamps
   - Calculate new ELO scores (skip votes don't affect ELO, ties count as 0.5 points each)
   - Update food records with conditional `WHERE updated_at = ?` to prevent race conditions
   - If update affects 0 rows, retry transaction (optimistic locking)
   - Insert vote record with normalized pairKey and nationality snapshot
   - Commit transaction
4. Return updated scores, vote statistics, and nationality breakdown
5. **Immediate Results**: Frontend automatically navigates to results screen
6. **Access Control**: Results are only shown for pairings where user has voted

### Pair Key Normalization

```typescript
function createPairKey(foodAId: string, foodBId: string): string {
  const [min, max] = [foodAId, foodBId].sort()
  return `${min}_${max}`
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
- Rate limiting to prevent abuse
- Comprehensive logging for debugging

### Error Response Format

```typescript
interface ErrorResponse {
  error: string
  message: string
  code: number
  details?: any
}
```

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

- **Cloudflare KV** for frequently accessed leaderboard data with 30-60s TTL
- **Workers Cache API** (caches.default) for API response caching
- Browser caching for food images with strong Cache-Control headers
- Consider **Cloudflare Images** for optimized image delivery
- **Cache Invalidation**: When votes mutate ELO scores, invalidate KV leaderboard cache and Workers Cache entries for `/api/foods/leaderboard` and related `stats/:pairKey` endpoints

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

## Security Considerations

### Data Privacy

- No personally identifiable information storage
- Optional nationality data with user consent
- Session-based tracking without persistent user accounts

### Input Validation and Rate Limiting

- Sanitize all user inputs to prevent XSS (DOMPurify on client, server-side sanitization)
- Validate vote selections and comment content with Zod schemas
- **Rate limiting strategies**:
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
