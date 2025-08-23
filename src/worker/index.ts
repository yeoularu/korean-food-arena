import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRuntimeAuth } from './lib/createRuntimeAuth'
import { AuthVariables } from '../auth'
import { getDb, withDbErrorHandling } from './db'
import { food, vote, user, comment } from './db/schema'
import { desc, sql, eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { VoteProcessor, type VoteProcessingError } from './lib/voteProcessor'

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

// Food Management Endpoints

// GET /api/foods/random-pair - Returns two random foods for comparison
app.get('/api/foods/random-pair', async (c) => {
  try {
    const db = getDb(c.env.DB)

    const result = await withDbErrorHandling(async () => {
      // Get two random foods using SQL ORDER BY RANDOM()
      const randomFoods = await db
        .select()
        .from(food)
        .orderBy(sql`RANDOM()`)
        .limit(2)

      if (randomFoods.length < 2) {
        throw new Error('Insufficient food data available')
      }

      // Randomize left/right presentation order
      const [food1, food2] = randomFoods
      const shouldSwap = Math.random() < 0.5

      return {
        presentedLeft: shouldSwap ? food2 : food1,
        presentedRight: shouldSwap ? food1 : food2,
      }
    }, 'Get random food pair')

    return c.json(result)
  } catch (error) {
    console.error('Failed to get random food pair:', error)
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve food pair',
        code: 500,
      },
      500,
    )
  }
})

// GET /api/foods/leaderboard - Returns all foods sorted by ELO score
app.get('/api/foods/leaderboard', async (c) => {
  try {
    const db = getDb(c.env.DB)

    const result = await withDbErrorHandling(async () => {
      // Get all foods sorted by ELO score DESC, then totalVotes DESC, then name ASC
      return await db
        .select()
        .from(food)
        .orderBy(desc(food.eloScore), desc(food.totalVotes), food.name)
    }, 'Get food leaderboard')

    return c.json(result)
  } catch (error) {
    console.error('Failed to get food leaderboard:', error)
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve leaderboard',
        code: 500,
      },
      500,
    )
  }
})

// Zod Schemas for Validation

const VoteRequestSchema = z.object({
  pairKey: z.string().min(1),
  foodLowId: z.string().min(1),
  foodHighId: z.string().min(1),
  presentedLeftId: z.string().min(1),
  presentedRightId: z.string().min(1),
  result: z.enum(['win', 'tie', 'skip']),
  winnerFoodId: z.string().optional(),
})

const CommentRequestSchema = z.object({
  pairKey: z.string().min(1),
  result: z.enum(['win', 'tie']),
  winnerFoodId: z.string().optional(),
  content: z.string().min(1).max(280, 'Comment must be 280 characters or less'),
})

// Voting System Endpoints

// POST /api/votes - Records a vote and updates ELO scores
app.post('/api/votes', async (c) => {
  try {
    // Check authentication
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 401,
        },
        401,
      )
    }

    // Parse and validate request body
    const body = await c.req.json()
    const validationResult = VoteRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid vote data',
          code: 400,
          details: validationResult.error.issues,
        },
        400,
      )
    }

    const voteData = validationResult.data

    // Process the vote
    const db = getDb(c.env.DB)
    const voteProcessor = new VoteProcessor(db)

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
    console.error('Vote processing failed:', error)

    // Handle specific vote processing errors
    if (error && typeof error === 'object' && 'code' in error) {
      const voteError = error as VoteProcessingError

      switch (voteError.code) {
        case 'DUPLICATE_VOTE':
          return c.json(
            {
              error: 'Conflict',
              message: 'You have already voted on this food pairing',
              code: 409,
            },
            409,
          )
        case 'FOOD_NOT_FOUND':
          return c.json(
            {
              error: 'Bad Request',
              message: 'One or both foods not found',
              code: 400,
            },
            400,
          )
        case 'INVALID_VOTE':
          return c.json(
            {
              error: 'Bad Request',
              message: voteError.message,
              code: 400,
            },
            400,
          )
        case 'RETRY_EXHAUSTED':
          return c.json(
            {
              error: 'Internal Server Error',
              message:
                'Vote processing failed due to high concurrency, please try again',
              code: 500,
            },
            500,
          )
      }
    }

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process vote',
        code: 500,
      },
      500,
    )
  }
})

// GET /api/votes/stats/:pairKey - Returns voting statistics for a specific pairing
app.get('/api/votes/stats/:pairKey', async (c) => {
  try {
    // Check authentication
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 401,
        },
        401,
      )
    }

    const pairKey = c.req.param('pairKey')
    if (!pairKey) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Pair key is required',
          code: 400,
        },
        400,
      )
    }

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    const userVote = await db
      .select()
      .from(vote)
      .where(and(eq(vote.userId, currentUser.id), eq(vote.pairKey, pairKey)))
      .limit(1)

    if (userVote.length === 0) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You must vote on this pairing before viewing results',
          code: 403,
        },
        403,
      )
    }

    // Get vote statistics
    const voteStats = await getVoteStats(db, pairKey)

    return c.json(voteStats)
  } catch (error) {
    console.error('Failed to get vote stats:', error)
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve vote statistics',
        code: 500,
      },
      500,
    )
  }
})

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
app.post('/api/comments', async (c) => {
  try {
    // Check authentication
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 401,
        },
        401,
      )
    }

    // Parse and validate request body
    const body = await c.req.json()
    const validationResult = CommentRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid comment data',
          code: 400,
          details: validationResult.error.issues,
        },
        400,
      )
    }

    const commentData = validationResult.data

    // Validate result and winnerFoodId consistency
    if (commentData.result === 'win' && !commentData.winnerFoodId) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Winner food ID is required for win results',
          code: 400,
        },
        400,
      )
    }

    if (commentData.result === 'tie' && commentData.winnerFoodId) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Winner food ID should not be provided for tie results',
          code: 400,
        },
        400,
      )
    }

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    const userVote = await db
      .select()
      .from(vote)
      .where(
        and(
          eq(vote.userId, currentUser.id),
          eq(vote.pairKey, commentData.pairKey),
        ),
      )
      .limit(1)

    if (userVote.length === 0) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You must vote on this pairing before commenting',
          code: 403,
        },
        403,
      )
    }

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = commentData.content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()

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

    const result = await withDbErrorHandling(async () => {
      const insertedComments = await db
        .insert(comment)
        .values(newComment)
        .returning()

      return insertedComments[0]
    }, 'Create comment')

    return c.json(result)
  } catch (error) {
    console.error('Failed to create comment:', error)
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create comment',
        code: 500,
      },
      500,
    )
  }
})

// GET /api/comments/:pairKey - Returns recent comments for a food pairing
app.get('/api/comments/:pairKey', async (c) => {
  try {
    // Check authentication
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 401,
        },
        401,
      )
    }

    const pairKey = c.req.param('pairKey')
    if (!pairKey) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Pair key is required',
          code: 400,
        },
        400,
      )
    }

    const db = getDb(c.env.DB)

    // Check if user has voted on this pairing (access control)
    const userVote = await db
      .select()
      .from(vote)
      .where(and(eq(vote.userId, currentUser.id), eq(vote.pairKey, pairKey)))
      .limit(1)

    if (userVote.length === 0) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You must vote on this pairing before viewing comments',
          code: 403,
        },
        403,
      )
    }

    // Get query parameters
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const cursor = c.req.query('cursor')

    const result = await withDbErrorHandling(async () => {
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
        .limit(limit)

      const whereConditions = cursor
        ? and(
            eq(comment.pairKey, pairKey),
            sql`${comment.createdAt} < ${cursor}`,
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
    }, 'Get comments')

    return c.json(result)
  } catch (error) {
    console.error('Failed to get comments:', error)
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve comments',
        code: 500,
      },
      500,
    )
  }
})

// Test endpoint
app.get('/api/', (c) =>
  c.json({
    name: JSON.stringify({ user: c.get('user'), session: c.get('session') }),
  }),
)

export default app
