import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRuntimeAuth } from './lib/createRuntimeAuth'
import { AuthVariables } from '../auth'
import { getDb } from './db'
import { food, vote, user, comment } from './db/schema'
import { desc, sql, eq, and } from 'drizzle-orm'
import { VoteProcessor, type VoteProcessingError } from './lib/voteProcessor'
import {
  VoteRequestSchema,
  CommentRequestSchema,
  UpdateNationalitySchema,
  PaginationQuerySchema,
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
  '/api/auth/update-nationality',
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
      return await db
        .select()
        .from(food)
        .orderBy(desc(food.eloScore), desc(food.totalVotes), food.name)
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
    const voteProcessor = new VoteProcessor(db)

    try {
      const result = await voteProcessor.processVote({
        ...voteData,
        userId: currentUser.id,
      })

      // Get updated vote statistics
      const voteStats = await getVoteStats(db, voteData.pairKey)

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

    // Get vote statistics
    const voteStats = await withErrorHandling(async () => {
      return await getVoteStats(db, pairKey)
    }, 'retrieve vote statistics')

    return c.json(voteStats)
  }),
)

// Helper function to get vote statistics with nationality breakdown
async function getVoteStats(db: ReturnType<typeof getDb>, pairKey: string) {
  const MIN_GROUP_SIZE = 5

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

  return {
    totalVotes,
    countsByFoodId,
    tieCount,
    skipCount,
    percentageByFoodId,
    tiePercentage,
    nationalityBreakdown,
    countryCodeStandard: 'ISO-3166-1-alpha-2' as const,
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
    const commentId = crypto.randomUUID()
    const newComment = {
      id: commentId,
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
      const MIN_GROUP_SIZE = 5

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

// Test endpoint
app.get('/api/', (c) =>
  c.json({
    name: JSON.stringify({ user: c.get('user'), session: c.get('session') }),
  }),
)

export default app
