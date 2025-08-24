import { eq, and, inArray } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { food, vote, type Vote } from '../db/schema'
import { ELOCalculator, type MatchResult } from './elo'
import { createPairKey, normalizeFoodIds } from './pairKey'

export interface VoteRequest {
  pairKey: string
  foodLowId: string
  foodHighId: string
  presentedLeftId: string
  presentedRightId: string
  result: 'win' | 'tie' | 'skip'
  winnerFoodId?: string
  userId: string
}

export interface VoteResult {
  vote: Vote
  updatedScores: {
    [foodId: string]: number
  }
}

export interface VoteProcessingError extends Error {
  code:
    | 'DUPLICATE_VOTE'
    | 'FOOD_NOT_FOUND'
    | 'INVALID_VOTE'
    | 'CONCURRENCY_ERROR'
    | 'RETRY_EXHAUSTED'
}

export class VoteProcessor {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAYS = [100, 250, 500] // milliseconds

  constructor(private db: DrizzleD1Database, private d1: D1Database) {}

  /**
   * Process a vote with ELO updates and concurrency control
   */
  async processVote(voteRequest: VoteRequest): Promise<VoteResult> {
    // Validate the vote request
    this.validateVoteRequest(voteRequest)

    // Attempt to process the vote with retry logic
    for (let attempt = 0; attempt < VoteProcessor.MAX_RETRIES; attempt++) {
      try {
        return await this.attemptVoteProcessing(voteRequest)
      } catch (error) {
        // Don't retry for certain errors
        if (this.isNonRetryableError(error)) {
          throw error
        }

        // If this is the last attempt, throw the error
        if (attempt === VoteProcessor.MAX_RETRIES - 1) {
          const retryError = new Error(
            'Vote processing failed after maximum retries',
          ) as VoteProcessingError
          retryError.code = 'RETRY_EXHAUSTED'
          throw retryError
        }

        // Log retry attempt for debugging
        console.warn(
          `Vote processing retry ${attempt + 1}/${VoteProcessor.MAX_RETRIES} for pair ${voteRequest.pairKey}:`,
          error,
        )

        // Wait before retrying
        await this.delay(VoteProcessor.RETRY_DELAYS[attempt])
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in vote processing')
  }

  /**
   * Attempt to process a single vote using D1 batch to ensure atomicity
   */
  private async attemptVoteProcessing(
    voteRequest: VoteRequest,
  ): Promise<VoteResult> {
    // Early duplicate check (best-effort). Unique index will still enforce.
    const existingVote = await this.db
      .select()
      .from(vote)
      .where(
        and(
          eq(vote.userId, voteRequest.userId),
          eq(vote.pairKey, voteRequest.pairKey),
        ),
      )
      .limit(1)

    if (existingVote.length > 0) {
      const duplicateError = new Error(
        'User has already voted on this food pairing',
      ) as VoteProcessingError
      duplicateError.code = 'DUPLICATE_VOTE'
      throw duplicateError
    }

    // Get current food ratings with updated_at for optimistic locking
    const foods = await this.db
      .select()
      .from(food)
      .where(
        inArray(food.id, [voteRequest.foodLowId, voteRequest.foodHighId]),
      )

    if (foods.length !== 2) {
      const notFoundError = new Error(
        'One or both foods not found',
      ) as VoteProcessingError
      notFoundError.code = 'FOOD_NOT_FOUND'
      throw notFoundError
    }

    const food1 = foods.find((f) => f.id === voteRequest.foodLowId)!
    const food2 = foods.find((f) => f.id === voteRequest.foodHighId)!

    // Calculate new ELO scores if this is not a skip vote
    const newScores: { [foodId: string]: number } = {}

    let eloResult1: MatchResult | null = null
    if (voteRequest.result !== 'skip') {
      if (voteRequest.result === 'tie') {
        eloResult1 = 'tie'
      } else if (voteRequest.result === 'win') {
        if (voteRequest.winnerFoodId === voteRequest.foodLowId) {
          eloResult1 = 'win'
        } else if (voteRequest.winnerFoodId === voteRequest.foodHighId) {
          eloResult1 = 'loss'
        } else {
          const invalidError = new Error(
            'Winner food ID does not match either food in the pair',
          ) as VoteProcessingError
          invalidError.code = 'INVALID_VOTE'
          throw invalidError
        }
      } else {
        const invalidError = new Error(
          `Invalid vote result: ${voteRequest.result}`,
        ) as VoteProcessingError
        invalidError.code = 'INVALID_VOTE'
        throw invalidError
      }

      const eloUpdate = ELOCalculator.calculateNewRatings(
        food1.eloScore,
        food2.eloScore,
        eloResult1,
      )
      newScores[food1.id] = eloUpdate.newRating1
      newScores[food2.id] = eloUpdate.newRating2
    } else {
      // Keep current scores for skip votes
      newScores[food1.id] = food1.eloScore
      newScores[food2.id] = food2.eloScore
    }

    // Build a D1 batch that updates both foods (with optimistic locking guards) and inserts the vote.
    // If any optimistic lock fails (no rows changed), we intentionally cause a division-by-zero error to abort the batch.
    const currentTimestamp = new Date().toISOString()
    const stmts: D1PreparedStatement[] = []

    if (voteRequest.result !== 'skip') {
      stmts.push(
        this.d1
          .prepare(
            'UPDATE food SET elo_score = ?, total_votes = ?, updated_at = ? WHERE id = ? AND updated_at = ?',
          )
          .bind(
            newScores[food1.id],
            food1.totalVotes + 1,
            currentTimestamp,
            food1.id,
            food1.updatedAt,
          ),
      )
      // Guard: fail if previous UPDATE affected 0 rows
      stmts.push(this.d1.prepare('SELECT IIF(changes() = 0, 1/0, 0)'))

      stmts.push(
        this.d1
          .prepare(
            'UPDATE food SET elo_score = ?, total_votes = ?, updated_at = ? WHERE id = ? AND updated_at = ?',
          )
          .bind(
            newScores[food2.id],
            food2.totalVotes + 1,
            currentTimestamp,
            food2.id,
            food2.updatedAt,
          ),
      )
      // Guard: fail if previous UPDATE affected 0 rows
      stmts.push(this.d1.prepare('SELECT IIF(changes() = 0, 1/0, 0)'))
    } else {
      stmts.push(
        this.d1
          .prepare(
            'UPDATE food SET total_votes = ?, updated_at = ? WHERE id = ? AND updated_at = ?',
          )
          .bind(
            food1.totalVotes + 1,
            currentTimestamp,
            food1.id,
            food1.updatedAt,
          ),
      )
      stmts.push(this.d1.prepare('SELECT IIF(changes() = 0, 1/0, 0)'))

      stmts.push(
        this.d1
          .prepare(
            'UPDATE food SET total_votes = ?, updated_at = ? WHERE id = ? AND updated_at = ?',
          )
          .bind(
            food2.totalVotes + 1,
            currentTimestamp,
            food2.id,
            food2.updatedAt,
          ),
      )
      stmts.push(this.d1.prepare('SELECT IIF(changes() = 0, 1/0, 0)'))
    }

    // Insert vote with a predetermined id and createdAt so we can return it without a round-trip.
    const newVoteId = crypto.randomUUID()
    const voteCreatedAt = new Date().toISOString()
    stmts.push(
      this.d1
        .prepare(
          'INSERT INTO vote (id, pair_key, food_low_id, food_high_id, presented_left_id, presented_right_id, result, winner_food_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          newVoteId,
          voteRequest.pairKey,
          voteRequest.foodLowId,
          voteRequest.foodHighId,
          voteRequest.presentedLeftId,
          voteRequest.presentedRightId,
          voteRequest.result,
          voteRequest.winnerFoodId || null,
          voteRequest.userId,
          voteCreatedAt,
        ),
    )

    try {
      await this.d1.batch(stmts)

      const insertedVote: Vote = {
        id: newVoteId,
        pairKey: voteRequest.pairKey,
        foodLowId: voteRequest.foodLowId,
        foodHighId: voteRequest.foodHighId,
        presentedLeftId: voteRequest.presentedLeftId,
        presentedRightId: voteRequest.presentedRightId,
        result: voteRequest.result,
        winnerFoodId: voteRequest.winnerFoodId || null,
        userId: voteRequest.userId,
        createdAt: voteCreatedAt,
      }

      return {
        vote: insertedVote,
        updatedScores: newScores,
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = (err as Error).message
        // Concurrency guard triggers division by zero
        if (msg.includes('division by zero')) {
          const concurrencyError = new Error(
            `Concurrent modification detected for foods ${food1.id}/${food2.id}, retrying...`,
          ) as VoteProcessingError
          concurrencyError.code = 'CONCURRENCY_ERROR'
          throw concurrencyError
        }
        if (
          msg.includes('UNIQUE constraint failed') &&
          msg.includes('idx_vote_user_pair')
        ) {
          const duplicateError = new Error(
            'User has already voted on this food pairing',
          ) as VoteProcessingError
          duplicateError.code = 'DUPLICATE_VOTE'
          throw duplicateError
        }
      }
      throw err
    }
  }

  /**
   * Validate the vote request
   */
  private validateVoteRequest(voteRequest: VoteRequest): void {
    // Validate pair key matches normalized food IDs
    const expectedPairKey = createPairKey(
      voteRequest.foodLowId,
      voteRequest.foodHighId,
    )
    if (voteRequest.pairKey !== expectedPairKey) {
      const invalidError = new Error(
        'Pair key does not match food IDs',
      ) as VoteProcessingError
      invalidError.code = 'INVALID_VOTE'
      throw invalidError
    }

    // Validate food IDs are normalized (foodLowId <= foodHighId lexicographically)
    const { foodLowId, foodHighId } = normalizeFoodIds(
      voteRequest.foodLowId,
      voteRequest.foodHighId,
    )
    if (
      voteRequest.foodLowId !== foodLowId ||
      voteRequest.foodHighId !== foodHighId
    ) {
      const invalidError = new Error(
        'Food IDs are not properly normalized',
      ) as VoteProcessingError
      invalidError.code = 'INVALID_VOTE'
      throw invalidError
    }

    // Validate presented IDs are one of the food IDs
    if (
      ![voteRequest.foodLowId, voteRequest.foodHighId].includes(
        voteRequest.presentedLeftId,
      ) ||
      ![voteRequest.foodLowId, voteRequest.foodHighId].includes(
        voteRequest.presentedRightId,
      )
    ) {
      const invalidError = new Error(
        'Presented food IDs must match the pair food IDs',
      ) as VoteProcessingError
      invalidError.code = 'INVALID_VOTE'
      throw invalidError
    }

    // Validate presented IDs are different
    if (voteRequest.presentedLeftId === voteRequest.presentedRightId) {
      const invalidError = new Error(
        'Presented food IDs must be different',
      ) as VoteProcessingError
      invalidError.code = 'INVALID_VOTE'
      throw invalidError
    }

    // Validate result and winnerFoodId consistency
    if (voteRequest.result === 'win') {
      if (!voteRequest.winnerFoodId) {
        const invalidError = new Error(
          'Winner food ID is required for win results',
        ) as VoteProcessingError
        invalidError.code = 'INVALID_VOTE'
        throw invalidError
      }
      if (
        ![voteRequest.foodLowId, voteRequest.foodHighId].includes(
          voteRequest.winnerFoodId,
        )
      ) {
        const invalidError = new Error(
          'Winner food ID must be one of the pair food IDs',
        ) as VoteProcessingError
        invalidError.code = 'INVALID_VOTE'
        throw invalidError
      }
    } else if (voteRequest.result === 'tie' || voteRequest.result === 'skip') {
      if (voteRequest.winnerFoodId) {
        const invalidError = new Error(
          'Winner food ID should not be provided for tie or skip results',
        ) as VoteProcessingError
        invalidError.code = 'INVALID_VOTE'
        throw invalidError
      }
    }

    // Validate user ID
    if (!voteRequest.userId || voteRequest.userId.trim() === '') {
      const invalidError = new Error(
        'User ID is required',
      ) as VoteProcessingError
      invalidError.code = 'INVALID_VOTE'
      throw invalidError
    }
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as VoteProcessingError).code
      return ['DUPLICATE_VOTE', 'FOOD_NOT_FOUND', 'INVALID_VOTE'].includes(
        errorCode,
      )
    }
    return false
  }

  /**
   * Delay execution for the specified number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
