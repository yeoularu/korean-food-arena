import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRuntimeAuth } from './lib/createRuntimeAuth'
import { AuthVariables } from '../auth'
import { getDb } from './db'
import { food, vote, user, comment } from './db/schema'
import { desc, sql, eq, and, inArray } from 'drizzle-orm'
import { VoteProcessor, type VoteProcessingError } from './lib/voteProcessor'
import {
  VoteRequestSchema,
  CommentRequestSchema,
  UpdateNationalitySchema,
  PaginationQuerySchema,
  ExpandedCommentsQuerySchema,
  sanitizeContent,
} from './lib/validation'
import {
  asyncHandler,
  requireAuth,
  requireVoteAccess,
  withErrorHandling,
  ValidationError,
  ConflictError,
  NotFoundError,
  InternalServerError,
  validateRequest,
} from './lib/errorHandling'
import { requireAdminAuth } from './lib/adminAuth'
import { getExpandedComments } from './lib/expandedComments'
import type { ExpandedCommentsResponse } from './lib/expandedComments'
import { parsePairKey } from './lib/pairKey'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

// CORS middleware
app.use('*', cors())

// Auth middleware
app.use('*', async (c, next) => {
  const auth = createRuntimeAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
    return next()
  }

  c.set('user', session.user)
  c.set('session', session.session)
  return next()
})

// Auth routes
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = createRuntimeAuth(c.env)
  return auth.handler(c.req.raw)
})

// Custom auth endpoint for updating nationality
app.post(
  '/api/user/update-nationality',
  asyncHandler(async (c) => {
    // Check authentication
    const currentUser = requireAuth(c)

    // Parse and validate request body
    const body = await c.req.json()
    const { nationality } = validateRequest(UpdateNationalitySchema, body)

    // Update user nationality in database
    const db = getDb(c.env.DB)
    const result = await withErrorHandling(async () => {
      const updatedUsers = await db
        .update(user)
        .set({
          nationality: nationality || 'unknown',
        })
        .where(eq(user.id, currentUser.id))
        .returning()

      return updatedUsers[0]
    }, 'update user nationality')

    if (!result) {
      throw new NotFoundError('User not found')
    }

    // Return updated user data
    return c.json({
      user: {
        ...currentUser,
        nationality: result.nationality,
      },
      message: 'Nationality updated successfully',
    })
  }),
)

// Food Management Endpoints

// GET /api/foods/random-pair - Returns two random foods for comparison
app.get(
  '/api/foods/random-pair',
  asyncHandler(async (c) => {
    const db = getDb(c.env.DB)

    const result = await withErrorHandling(async () => {
      // Get two random foods using SQL ORDER BY RANDOM()
      const randomFoods = await db
        .select()
        .from(food)
        .orderBy(sql`RANDOM()`)
        .limit(2)

      if (randomFoods.length < 2) {
        throw new InternalServerError(
          'Insufficient food data available - please seed the database',
        )
      }

      // Randomize left/right presentation order
      const [food1, food2] = randomFoods
      const shouldSwap = Math.random() < 0.5

      return {
        presentedLeft: shouldSwap ? food2 : food1,
        presentedRight: shouldSwap ? food1 : food2,
      }
    }, 'retrieve random food pair')

    return c.json(result)
  }),
)

// GET /api/foods/leaderboard - Returns all foods sorted by ELO score
app.get(
  '/api/foods/leaderboard',
  asyncHandler(async (c) => {
    const db = getDb(c.env.DB)

    const result = await withErrorHandling(async () => {
      // Get all foods sorted by ELO score DESC, then totalVotes DESC, then name ASC
      const foods = await db
        .select()
        .from(food)
        .orderBy(desc(food.eloScore), desc(food.totalVotes), food.name)

      // Aggregate wins per food (result='win')
      const winRows = await db
        .select({
          winnerFoodId: vote.winnerFoodId,
          wins: sql<number>`COUNT(*)`.as('wins'),
        })
        .from(vote)
        .where(eq(vote.result, 'win'))
        .groupBy(vote.winnerFoodId)

      const winMap: Record<string, number> = {}
      winRows.forEach((r) => {
        if (r.winnerFoodId) {
          winMap[r.winnerFoodId] = Number(r.wins) || 0
        }
      })

      // Merge winCount into foods
      return foods.map((f) => ({ ...f, winCount: winMap[f.id] ?? 0 }))
    }, 'retrieve food leaderboard')

    return c.json(result)
  }),
)

// Voting System Endpoints

// POST /api/votes - Records a vote and updates ELO scores
app.post(
  '/api/votes',
  asyncHandler(async (c) => {
    // Check authentication
    const currentUser = requireAuth(c)

    // Parse and validate request body
    const body = await c.req.json()
    const voteData = validateRequest(VoteRequestSchema, body)

    // Process the vote
    const db = getDb(c.env.DB)
    const voteProcessor = new VoteProcessor(db, c.env.DB)

    try {
      const result = await voteProcessor.processVote({
        ...voteData,
        userId: currentUser.id,
      })

      // Get updated vote statistics (including current user's vote)
      const voteStats = await getVoteStats(db, voteData.pairKey, currentUser.id)

      return c.json({
        vote: result.vote,
        updatedScores: result.updatedScores,
        voteStats,
      })
    } catch (error) {
      // Handle specific vote processing errors
      if (error && typeof error === 'object' && 'code' in error) {
        const voteError = error as VoteProcessingError

        switch (voteError.code) {
          case 'DUPLICATE_VOTE':
            throw new ConflictError(
              'You have already voted on this food pairing',
            )
          case 'FOOD_NOT_FOUND':
            throw new ValidationError('One or both foods not found')
          case 'INVALID_VOTE':
            throw new ValidationError(voteError.message)
          case 'RETRY_EXHAUSTED':
            throw new InternalServerError(
              'Vote processing failed due to high concurrency, please try again',
            )
        }
      }

      throw new InternalServerError('Failed to process vote')
    }
  }),
)

// GET /api/votes/stats/:pairKey - Returns voting statistics for a specific pairing
app.get(
  '/api/votes/stats/:pairKey',
  asyncHandler(async (c) => {
    // Check authentication
    const currentUser = requireAuth(c)

    const pairKey = c.req.param('pairKey')
    if (!pairKey) {
      throw new ValidationError('Pair key is required')
    }

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    await requireVoteAccess(
      db,
      currentUser.id,
      pairKey,
      'You must vote on this pairing before viewing results',
    )

    // Get vote statistics (including current user's vote)
    const voteStats = await withErrorHandling(async () => {
      return await getVoteStats(db, pairKey, currentUser.id)
    }, 'retrieve vote statistics')

    return c.json(voteStats)
  }),
)

// Helper function to get vote statistics with nationality breakdown
async function getVoteStats(
  db: ReturnType<typeof getDb>,
  pairKey: string,
  currentUserId?: string,
) {
  const MIN_GROUP_SIZE = 5

  // Derive the two food IDs from the pairKey and fetch their display names
  const [id1, id2] = pairKey.split('_')
  const foodIds = [id1, id2].filter(Boolean)
  const foodsForPair =
    foodIds.length === 2
      ? await db
          .select({ id: food.id, name: food.name, imageUrl: food.imageUrl })
          .from(food)
          .where(inArray(food.id, foodIds))
      : []
  const foodNamesById: Record<string, string> = {}
  foodsForPair.forEach((f) => {
    if (f.id) foodNamesById[f.id] = f.name
  })

  // Get all votes for this pair with user nationality
  const votesWithNationality = await db
    .select({
      result: vote.result,
      winnerFoodId: vote.winnerFoodId,
      foodLowId: vote.foodLowId,
      foodHighId: vote.foodHighId,
      nationality: user.nationality,
    })
    .from(vote)
    .leftJoin(user, eq(vote.userId, user.id))
    .where(eq(vote.pairKey, pairKey))

  // Calculate basic statistics
  const totalVotes = votesWithNationality.length
  const skipCount = votesWithNationality.filter(
    (v: (typeof votesWithNationality)[0]) => v.result === 'skip',
  ).length
  const tieCount = votesWithNationality.filter(
    (v: (typeof votesWithNationality)[0]) => v.result === 'tie',
  ).length

  // Count votes by food ID (excluding skips)
  const nonSkipVotes = votesWithNationality.filter(
    (v: (typeof votesWithNationality)[0]) => v.result !== 'skip',
  )
  const countsByFoodId: Record<string, number> = {}

  // Initialize counts for both foods
  if (votesWithNationality.length > 0) {
    const { foodLowId, foodHighId } = votesWithNationality[0]
    if (foodLowId && foodHighId) {
      countsByFoodId[foodLowId] = 0
      countsByFoodId[foodHighId] = 0
    }
  }

  // Count wins for each food
  nonSkipVotes.forEach((vote: (typeof votesWithNationality)[0]) => {
    if (vote.result === 'win' && vote.winnerFoodId) {
      countsByFoodId[vote.winnerFoodId] =
        (countsByFoodId[vote.winnerFoodId] || 0) + 1
    }
  })

  // Calculate percentages (excluding skips)
  const nonSkipTotal = nonSkipVotes.length
  const percentageByFoodId: Record<string, number> = {}
  const tiePercentage = nonSkipTotal > 0 ? (tieCount / nonSkipTotal) * 100 : 0

  Object.keys(countsByFoodId).forEach((foodId) => {
    percentageByFoodId[foodId] =
      nonSkipTotal > 0 ? (countsByFoodId[foodId] / nonSkipTotal) * 100 : 0
  })

  // Calculate nationality breakdown with privacy protection
  const nationalityBreakdown: Record<
    string,
    { byFoodId: Record<string, number>; tiePercentage: number }
  > = {}

  // Group votes by nationality
  const votesByNationality: Record<string, typeof votesWithNationality> = {}
  votesWithNationality.forEach((vote: (typeof votesWithNationality)[0]) => {
    const nationality = vote.nationality || 'unknown'
    if (!votesByNationality[nationality]) {
      votesByNationality[nationality] = []
    }
    votesByNationality[nationality].push(vote)
  })

  // Process nationality groups with privacy protection
  const smallGroups: typeof votesWithNationality = []

  Object.entries(votesByNationality).forEach(([nationality, votes]) => {
    if (votes.length >= MIN_GROUP_SIZE) {
      // Process large enough groups normally
      const nonSkipVotesForNationality = votes.filter(
        (v: (typeof votesWithNationality)[0]) => v.result !== 'skip',
      )
      const tieCountForNationality = votes.filter(
        (v: (typeof votesWithNationality)[0]) => v.result === 'tie',
      ).length
      const totalNonSkipForNationality = nonSkipVotesForNationality.length

      const byFoodId: Record<string, number> = {}
      Object.keys(countsByFoodId).forEach((foodId) => {
        byFoodId[foodId] = 0
      })

      nonSkipVotesForNationality.forEach(
        (vote: (typeof votesWithNationality)[0]) => {
          if (vote.result === 'win' && vote.winnerFoodId) {
            byFoodId[vote.winnerFoodId] = (byFoodId[vote.winnerFoodId] || 0) + 1
          }
        },
      )

      nationalityBreakdown[nationality] = {
        byFoodId,
        tiePercentage:
          totalNonSkipForNationality > 0
            ? (tieCountForNationality / totalNonSkipForNationality) * 100
            : 0,
      }
    } else {
      // Aggregate small groups into 'Other'
      smallGroups.push(...votes)
    }
  })

  // Process aggregated small groups as 'Other'
  if (smallGroups.length > 0) {
    const nonSkipVotesForOther = smallGroups.filter(
      (v: (typeof votesWithNationality)[0]) => v.result !== 'skip',
    )
    const tieCountForOther = smallGroups.filter(
      (v: (typeof votesWithNationality)[0]) => v.result === 'tie',
    ).length
    const totalNonSkipForOther = nonSkipVotesForOther.length

    const byFoodId: Record<string, number> = {}
    Object.keys(countsByFoodId).forEach((foodId) => {
      byFoodId[foodId] = 0
    })

    nonSkipVotesForOther.forEach((vote: (typeof votesWithNationality)[0]) => {
      if (vote.result === 'win' && vote.winnerFoodId) {
        byFoodId[vote.winnerFoodId] = (byFoodId[vote.winnerFoodId] || 0) + 1
      }
    })

    nationalityBreakdown['Other'] = {
      byFoodId,
      tiePercentage:
        totalNonSkipForOther > 0
          ? (tieCountForOther / totalNonSkipForOther) * 100
          : 0,
    }
  }

  // Current user's latest vote for this pair (non-skip) to lock comment selection
  let userVoteForComment: {
    result: 'win' | 'tie'
    winnerFoodId?: string
  } | null = null
  if (currentUserId) {
    const userVoteRows = await db
      .select({
        result: vote.result,
        winnerFoodId: vote.winnerFoodId,
        createdAt: vote.createdAt,
      })
      .from(vote)
      .where(and(eq(vote.pairKey, pairKey), eq(vote.userId, currentUserId)))
      .orderBy(desc(vote.createdAt))
      .limit(1)

    const uv = userVoteRows[0]
    if (uv) {
      if (uv.result === 'win' && uv.winnerFoodId) {
        userVoteForComment = { result: 'win', winnerFoodId: uv.winnerFoodId }
      } else if (uv.result === 'tie') {
        userVoteForComment = { result: 'tie' }
      }
    }
  }

  return {
    totalVotes,
    countsByFoodId,
    tieCount,
    skipCount,
    percentageByFoodId,
    tiePercentage,
    nationalityBreakdown,
    foodNamesById,
    countryCodeStandard: 'ISO-3166-1-alpha-2' as const,
    userVoteForComment,
  }
}

// Comments System Endpoints

// POST /api/comments - Creates a new comment
app.post(
  '/api/comments',
  asyncHandler(async (c) => {
    // Check authentication
    const currentUser = requireAuth(c)

    // Parse and validate request body
    const body = await c.req.json()
    const commentData = validateRequest(CommentRequestSchema, body)

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    await requireVoteAccess(
      db,
      currentUser.id,
      commentData.pairKey,
      'You must vote on this pairing before commenting',
    )

    // Sanitize content (XSS prevention)
    const sanitizedContent = sanitizeContent(commentData.content)

    // Create comment
    const newComment = {
      pairKey: commentData.pairKey,
      result: commentData.result,
      winnerFoodId: commentData.winnerFoodId || null,
      content: sanitizedContent,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
    }

    const result = await withErrorHandling(async () => {
      const insertedComments = await db
        .insert(comment)
        .values(newComment)
        .returning()

      return insertedComments[0]
    }, 'create comment')

    return c.json(result)
  }),
)

// GET /api/comments/:pairKey - Returns recent comments for a food pairing
app.get(
  '/api/comments/:pairKey',
  asyncHandler(async (c) => {
    // Check authentication
    const currentUser = requireAuth(c)

    const pairKey = c.req.param('pairKey')
    if (!pairKey) {
      throw new ValidationError('Pair key is required')
    }

    // Validate query parameters
    const queryParams = validateRequest(PaginationQuerySchema, {
      limit: c.req.query('limit'),
      cursor: c.req.query('cursor'),
    })

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    await requireVoteAccess(
      db,
      currentUser.id,
      pairKey,
      'You must vote on this pairing before viewing comments',
    )

    const result = await withErrorHandling(async () => {
      // Get comments with nationality from user profile
      const baseQuery = db
        .select({
          id: comment.id,
          pairKey: comment.pairKey,
          result: comment.result,
          winnerFoodId: comment.winnerFoodId,
          content: comment.content,
          createdAt: comment.createdAt,
          nationality: user.nationality,
        })
        .from(comment)
        .leftJoin(user, eq(comment.userId, user.id))
        .orderBy(desc(comment.createdAt))
        .limit(queryParams.limit)

      const whereConditions = queryParams.cursor
        ? and(
            eq(comment.pairKey, pairKey),
            sql`${comment.createdAt} < ${queryParams.cursor}`,
          )
        : eq(comment.pairKey, pairKey)

      const comments = await baseQuery.where(whereConditions)

      // Apply nationality privacy protection
      // Use smaller group size for development/testing
      const MIN_GROUP_SIZE = 1 // Changed from 5 to 1 for better UX during development

      // Count nationality groups for this pairKey
      const nationalityCounts: Record<string, number> = {}
      comments.forEach((comment) => {
        const nationality = comment.nationality || 'unknown'
        nationalityCounts[nationality] =
          (nationalityCounts[nationality] || 0) + 1
      })

      // Apply privacy protection to individual comments
      const protectedComments = comments.map((comment) => ({
        id: comment.id,
        pairKey: comment.pairKey,
        result: comment.result,
        winnerFoodId: comment.winnerFoodId,
        content: comment.content,
        createdAt: comment.createdAt,
        nationality:
          (nationalityCounts[comment.nationality || 'unknown'] || 0) >=
          MIN_GROUP_SIZE
            ? comment.nationality || 'unknown'
            : 'Other',
      }))

      return protectedComments
    }, 'retrieve comments')

    return c.json(result)
  }),
)

// GET /api/comments/:pairKey/expanded - Returns expanded comments for a food pairing
app.get(
  '/api/comments/:pairKey/expanded',
  asyncHandler(async (c) => {
    // Check authentication
    const currentUser = requireAuth(c)

    const pairKey = c.req.param('pairKey')
    if (!pairKey) {
      throw new ValidationError('Pair key is required')
    }

    // Validate query parameters
    const queryParams = validateRequest(ExpandedCommentsQuerySchema, {
      currentPairingLimit: c.req.query('currentPairingLimit'),
      expandedLimit: c.req.query('expandedLimit'),
      includeExpanded: c.req.query('includeExpanded'),
      cursor: c.req.query('cursor'),
    })

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    await requireVoteAccess(
      db,
      currentUser.id,
      pairKey,
      'You must vote on this pairing before viewing comments',
    )

    // Parse food IDs from pairKey for expanded comments query
    const { foodLowId, foodHighId } = parsePairKey(pairKey)

    const result = await withErrorHandling(async () => {
      return await getExpandedComments(db, {
        pairKey,
        foodId1: foodLowId,
        foodId2: foodHighId,
        currentPairingLimit: queryParams.currentPairingLimit,
        expandedLimit: queryParams.expandedLimit,
        includeExpanded: queryParams.includeExpanded,
        cursor: queryParams.cursor,
      })
    }, 'retrieve expanded comments')

    // Add performance metadata to headers (for monitoring tools)
    type PerformanceMeta = {
      queryTime: number
      responseSize: number
      optimized: boolean
      suggestions?: unknown
    }
    const maybeWithPerf = result as ExpandedCommentsResponse & {
      _performance?: PerformanceMeta
    }
    if (maybeWithPerf._performance) {
      const perf = maybeWithPerf._performance
      c.header('X-Query-Time', perf.queryTime.toString())
      c.header('X-Response-Size', perf.responseSize.toString())
      c.header('X-Optimized', perf.optimized.toString())

      // Remove performance data from response body in production
      if (process.env.NODE_ENV !== 'development') {
        delete maybeWithPerf._performance
      }
    }

    return c.json(result)
  }),
)

// Admin endpoints for database seeding
// Requires c.env.ADMIN_API_KEY to be configured. See `src/worker/lib/adminAuth.ts`.
// Example curl (local dev at http://localhost:5173):
// Only supported header:
// curl -X POST 'http://localhost:5173/api/admin/seed' -H 'x-admin-api-key: YOUR_ADMIN_API_KEY'
// curl 'http://localhost:5173/api/admin/seed/status' -H 'x-admin-api-key: YOUR_ADMIN_API_KEY'
app.post(
  '/api/admin/seed',
  requireAdminAuth(),
  asyncHandler(async (c) => {
    const db = getDb(c.env.DB)
    const { DatabaseSeeder } = await import('./lib/seedDatabase')

    const seeder = new DatabaseSeeder(db)
    const result = await seeder.seedFoods()

    return c.json(result, result.success ? 200 : 500)
  }),
)

app.get(
  '/api/admin/seed/status',
  requireAdminAuth(),
  asyncHandler(async (c) => {
    const db = getDb(c.env.DB)
    const { DatabaseSeeder } = await import('./lib/seedDatabase')

    const seeder = new DatabaseSeeder(db)
    const status = await seeder.getSeedingStatus()

    return c.json(status)
  }),
)

export default app
