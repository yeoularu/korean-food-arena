import { eq, and, or, ne, desc, sql, inArray } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { comment, user, food } from '../db/schema'
import { parsePairKey } from './pairKey'
import { ValidationError, withErrorHandling } from './errorHandling'
import {
  performanceMonitor,
  optimizeQueryLimits,
} from './performanceMonitoring'
/**
 * Types for expanded comments functionality
 * These types are used internally by the worker and should match the frontend types
 */

/**
 * Request parameters for expanded comments query
 */
export interface ExpandedCommentsRequest {
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

/**
 * Enhanced comment with additional context for expanded visibility
 */
export interface EnhancedComment {
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
  /** Whether this comment is from the exact current pairing being viewed */
  isCurrentPairing: boolean
  /** The other food ID in the commenter's pairing */
  otherFoodId: string
  /** Display name of the other food for UI context */
  otherFoodName: string
}

/**
 * Response structure for expanded comments endpoint
 */
export interface ExpandedCommentsResponse {
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

/**
 * Extracts the other food ID from a pairKey given one food ID
 * @param pairKey - The normalized pair key (e.g., "food1_food2")
 * @param knownFoodId - One of the food IDs in the pair
 * @returns The other food ID in the pair
 */
export function extractOtherFoodId(
  pairKey: string,
  knownFoodId: string,
): string {
  try {
    const { foodLowId, foodHighId } = parsePairKey(pairKey)

    if (knownFoodId === foodLowId) {
      return foodHighId
    } else if (knownFoodId === foodHighId) {
      return foodLowId
    } else {
      throw new ValidationError(
        `Food ID ${knownFoodId} is not part of pair key ${pairKey}`,
      )
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError(`Invalid pair key format: ${pairKey}`)
  }
}

/**
 * Applies nationality privacy protection to comments
 * Groups with fewer than minGroupSize members are shown as "Other"
 * This function handles mixed comment types (current pairing + expanded) consistently
 */
export function applyNationalityPrivacy<
  T extends { nationality?: string | null },
>(comments: T[], minGroupSize: number = 5): T[] {
  // Count nationality occurrences across ALL comments in the response
  // This ensures consistent privacy protection across current pairing and expanded comments
  const nationalityCounts: Record<string, number> = {}
  comments.forEach((comment) => {
    const nationality = comment.nationality || 'unknown'
    nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1
  })

  // Apply privacy protection consistently to all comments
  return comments.map((comment) => ({
    ...comment,
    nationality:
      (nationalityCounts[comment.nationality || 'unknown'] || 0) >= minGroupSize
        ? comment.nationality || 'unknown'
        : 'Other',
  }))
}

/**
 * Gets expanded comments for a food pairing
 * Returns both current pairing comments and comments from other pairings involving either food
 */
export async function getExpandedComments(
  db: DrizzleD1Database,
  request: ExpandedCommentsRequest,
): Promise<ExpandedCommentsResponse> {
  // Start performance monitoring
  performanceMonitor.startQuery('getExpandedComments', request.pairKey)

  const {
    pairKey,
    foodId1,
    foodId2,
    currentPairingLimit = 10,
    expandedLimit = 10,
    includeExpanded = true,
    cursor,
  } = request

  // Validate input parameters
  if (!pairKey || !foodId1 || !foodId2) {
    throw new ValidationError(
      'Missing required parameters: pairKey, foodId1, foodId2',
    )
  }

  // Validate that foodIds match the pairKey
  try {
    const { foodLowId, foodHighId } = parsePairKey(pairKey)
    const sortedRequestIds = [foodId1, foodId2].sort()
    const sortedPairIds = [foodLowId, foodHighId].sort()

    if (
      sortedRequestIds[0] !== sortedPairIds[0] ||
      sortedRequestIds[1] !== sortedPairIds[1]
    ) {
      throw new ValidationError('Food IDs do not match the provided pair key')
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError(`Invalid pair key format: ${pairKey}`)
  }

  // Optimize query limits for performance
  const optimizedLimits = optimizeQueryLimits(
    currentPairingLimit,
    expandedLimit,
    includeExpanded,
  )

  // Log if limits were optimized
  if (optimizedLimits.optimized) {
    console.info('Query limits optimized for performance:', {
      original: { currentPairingLimit, expandedLimit },
      optimized: {
        currentPairingLimit: optimizedLimits.currentPairingLimit,
        expandedLimit: optimizedLimits.expandedLimit,
      },
      pairKey,
    })
  }

  return await withErrorHandling(async () => {
    // Use optimized limits
    const finalCurrentLimit = optimizedLimits.currentPairingLimit
    const finalExpandedLimit = optimizedLimits.expandedLimit

    // Step 1: Get current pairing comments
    const currentPairingWhereCondition = cursor
      ? and(eq(comment.pairKey, pairKey), sql`${comment.createdAt} < ${cursor}`)
      : eq(comment.pairKey, pairKey)

    const currentPairingQuery = db
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
      .where(currentPairingWhereCondition)
      .orderBy(desc(comment.createdAt))
      .limit(finalCurrentLimit)

    const currentPairingComments = await currentPairingQuery

    // Step 2: Get expanded comments (if requested)
    let expandedComments: typeof currentPairingComments = []

    if (includeExpanded) {
      const expandedWhereCondition = cursor
        ? and(
            ne(comment.pairKey, pairKey),
            or(
              eq(comment.winnerFoodId, foodId1),
              eq(comment.winnerFoodId, foodId2),
            ),
            sql`${comment.createdAt} < ${cursor}`,
          )
        : and(
            ne(comment.pairKey, pairKey),
            or(
              eq(comment.winnerFoodId, foodId1),
              eq(comment.winnerFoodId, foodId2),
            ),
          )

      const expandedQuery = db
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
        .where(expandedWhereCondition)
        .orderBy(desc(comment.createdAt))
        .limit(finalExpandedLimit)

      expandedComments = await expandedQuery
    }

    // Step 3: Get food names for context
    const allOtherFoodIds = new Set<string>()

    // Extract other food IDs from all comments
    const allComments = currentPairingComments.concat(expandedComments)
    allComments.forEach((comment) => {
      try {
        if (comment.winnerFoodId) {
          const otherFoodId = extractOtherFoodId(
            comment.pairKey,
            comment.winnerFoodId,
          )
          allOtherFoodIds.add(otherFoodId)
        } else {
          // For tie comments, we need both foods from the pair
          const { foodLowId, foodHighId } = parsePairKey(comment.pairKey)
          allOtherFoodIds.add(foodLowId)
          allOtherFoodIds.add(foodHighId)
        }
      } catch (error) {
        console.warn(
          `Failed to extract other food ID for comment ${comment.id}:`,
          error,
        )
      }
    })

    // Also add the current pairing foods for context
    allOtherFoodIds.add(foodId1)
    allOtherFoodIds.add(foodId2)

    const foods =
      allOtherFoodIds.size > 0
        ? await db
            .select({ id: food.id, name: food.name })
            .from(food)
            .where(inArray(food.id, Array.from(allOtherFoodIds)))
        : []

    const foodNameMap = new Map(foods.map((f) => [f.id, f.name]))

    // Step 4: Apply nationality privacy protection to all comments
    // Count nationality occurrences across ALL comments (current + expanded) for consistent protection
    const allCommentsForPrivacy =
      currentPairingComments.concat(expandedComments)
    // Use smaller group size for development/testing
    const minGroupSize = 1 // Changed from 5 to 1 for better UX during development
    const protectedComments = applyNationalityPrivacy(
      allCommentsForPrivacy,
      minGroupSize,
    )

    // Step 5: Transform to EnhancedComment format
    const transformComment = (
      comment: (typeof currentPairingComments)[0],
      index: number,
      isCurrentPairing: boolean,
    ): EnhancedComment => {
      let otherFoodId: string
      let otherFoodName: string

      try {
        if (comment.winnerFoodId) {
          // For win comments, the other food is the one that wasn't voted for
          otherFoodId = extractOtherFoodId(
            comment.pairKey,
            comment.winnerFoodId,
          )
          otherFoodName = foodNameMap.get(otherFoodId) || 'Unknown Food'
        } else {
          // For tie comments, we show both foods in the pairing
          const { foodLowId, foodHighId } = parsePairKey(comment.pairKey)
          // For current pairing ties, show the "other" food relative to the context
          if (isCurrentPairing) {
            otherFoodId = foodId1 // Could be either, we'll show one as context
            otherFoodName = `${foodNameMap.get(foodLowId) || 'Unknown'} vs ${foodNameMap.get(foodHighId) || 'Unknown'}`
          } else {
            // For expanded ties, show the pairing
            otherFoodId = foodLowId
            otherFoodName = `${foodNameMap.get(foodLowId) || 'Unknown'} vs ${foodNameMap.get(foodHighId) || 'Unknown'}`
          }
        }
      } catch (error) {
        console.warn(
          `Failed to determine other food for comment ${comment.id}:`,
          error,
        )
        otherFoodId = 'unknown'
        otherFoodName = 'Unknown Food'
      }

      return {
        id: comment.id,
        pairKey: comment.pairKey,
        result: comment.result,
        winnerFoodId: comment.winnerFoodId || undefined,
        content: comment.content,
        createdAt: comment.createdAt || new Date().toISOString(),
        nationality: protectedComments[index].nationality || undefined,
        isCurrentPairing,
        otherFoodId,
        otherFoodName,
      }
    }

    const enhancedCurrentComments = currentPairingComments.map(
      (comment, index) => transformComment(comment, index, true),
    )

    const enhancedExpandedComments = expandedComments.map((comment, index) =>
      transformComment(comment, currentPairingComments.length + index, false),
    )

    const totalCount =
      enhancedCurrentComments.length + enhancedExpandedComments.length
    const hasMore =
      totalCount >=
      finalCurrentLimit + (includeExpanded ? finalExpandedLimit : 0)
    const allEnhancedComments = enhancedCurrentComments.concat(
      enhancedExpandedComments,
    )
    const lastComment = allEnhancedComments[allEnhancedComments.length - 1]

    const result: ExpandedCommentsResponse = {
      currentPairingComments: enhancedCurrentComments,
      expandedComments: enhancedExpandedComments,
      totalCount,
      hasMore,
      cursor: lastComment?.createdAt,
    }

    // End performance monitoring and log metrics
    const performanceLog = performanceMonitor.endQuery(result, {
      cacheHit: false, // Could be enhanced with actual cache hit detection
    })

    // Add performance metadata to response for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      type PerformanceMeta = {
        queryTime: number
        responseSize: number
        optimized: boolean
        suggestions?: unknown
      }
      const withPerf = result as ExpandedCommentsResponse & {
        _performance?: PerformanceMeta
      }
      withPerf._performance = {
        queryTime: performanceLog.metrics.queryExecutionTime,
        responseSize: performanceLog.metrics.responseSize,
        optimized: optimizedLimits.optimized,
        suggestions: performanceLog.optimizationSuggestions,
      }
    }

    return result
  }, 'retrieve expanded comments')
}
