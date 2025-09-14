import { eq, and, or, ne, desc, sql, inArray } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { comment, user, food } from '../db/schema'
import { parsePairKey } from './pairKey'
import { ValidationError, withErrorHandling } from './errorHandling'
// Types for expanded comments functionality
export interface ExpandedCommentsRequest {
  pairKey: string
  foodId1: string
  foodId2: string
  currentPairingLimit?: number
  expandedLimit?: number
  includeExpanded?: boolean
  cursor?: string
}

export interface EnhancedComment {
  id: string
  pairKey: string
  result: 'win' | 'tie'
  winnerFoodId?: string
  content: string
  createdAt: string
  nationality: string
  isCurrentPairing: boolean
  otherFoodId: string
  otherFoodName: string
}

export interface ExpandedCommentsResponse {
  currentPairingComments: EnhancedComment[]
  expandedComments: EnhancedComment[]
  totalCount: number
  hasMore: boolean
  cursor?: string
}

/**
 * Extracts the other food ID from a pairKey given one food ID
 * @param pairKey - The normalized pair key (e.g., "food1_food2")
 * @param knownFoodId - One of the food IDs in the pair
 * @returns The other food ID in the pair
 */
export function extractOtherFoodId(pairKey: string, knownFoodId: string): string {
  try {
    const { foodLowId, foodHighId } = parsePairKey(pairKey)

    if (knownFoodId === foodLowId) {
      return foodHighId
    } else if (knownFoodId === foodHighId) {
      return foodLowId
    } else {
      throw new ValidationError(`Food ID ${knownFoodId} is not part of pair key ${pairKey}`)
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
 */
function applyNationalityPrivacy(
  comments: Array<{ nationality?: string | null }>,
  minGroupSize: number = 5
): Array<{ nationality: string }> {
  // Count nationality occurrences across all comments
  const nationalityCounts: Record<string, number> = {}
  comments.forEach((comment) => {
    const nationality = comment.nationality || 'unknown'
    nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1
  })

  // Apply privacy protection
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
  request: ExpandedCommentsRequest
): Promise<ExpandedCommentsResponse> {
  const {
    pairKey,
    foodId1,
    foodId2,
    currentPairingLimit = 10,
    expandedLimit = 10,
    includeExpanded = true,
    cursor
  } = request

  // Validate input parameters
  if (!pairKey || !foodId1 || !foodId2) {
    throw new ValidationError('Missing required parameters: pairKey, foodId1, foodId2')
  }

  // Validate that foodIds match the pairKey
  try {
    const { foodLowId, foodHighId } = parsePairKey(pairKey)
    const sortedRequestIds = [foodId1, foodId2].sort()
    const sortedPairIds = [foodLowId, foodHighId].sort()

    if (sortedRequestIds[0] !== sortedPairIds[0] || sortedRequestIds[1] !== sortedPairIds[1]) {
      throw new ValidationError('Food IDs do not match the provided pair key')
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError(`Invalid pair key format: ${pairKey}`)
  }

  return await withErrorHandling(async () => {
    // Step 1: Get current pairing comments
    const currentPairingWhereCondition = cursor
      ? and(
        eq(comment.pairKey, pairKey),
        sql`${comment.createdAt} < ${cursor}`
      )
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
      .limit(currentPairingLimit)

    const currentPairingComments = await currentPairingQuery

    // Step 2: Get expanded comments (if requested)
    let expandedComments: typeof currentPairingComments = []

    if (includeExpanded) {
      const expandedWhereCondition = cursor
        ? and(
          ne(comment.pairKey, pairKey),
          or(
            eq(comment.winnerFoodId, foodId1),
            eq(comment.winnerFoodId, foodId2)
          ),
          sql`${comment.createdAt} < ${cursor}`
        )
        : and(
          ne(comment.pairKey, pairKey),
          or(
            eq(comment.winnerFoodId, foodId1),
            eq(comment.winnerFoodId, foodId2)
          )
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
        .limit(expandedLimit)

      expandedComments = await expandedQuery
    }

    // Step 3: Get food names for context
    const allOtherFoodIds = new Set<string>()

    // Extract other food IDs from all comments
    const allComments = currentPairingComments.concat(expandedComments)
    allComments.forEach((comment) => {
      try {
        if (comment.winnerFoodId) {
          const otherFoodId = extractOtherFoodId(comment.pairKey, comment.winnerFoodId)
          allOtherFoodIds.add(otherFoodId)
        } else {
          // For tie comments, we need both foods from the pair
          const { foodLowId, foodHighId } = parsePairKey(comment.pairKey)
          allOtherFoodIds.add(foodLowId)
          allOtherFoodIds.add(foodHighId)
        }
      } catch (error) {
        console.warn(`Failed to extract other food ID for comment ${comment.id}:`, error)
      }
    })

    // Also add the current pairing foods for context
    allOtherFoodIds.add(foodId1)
    allOtherFoodIds.add(foodId2)

    const foods = allOtherFoodIds.size > 0
      ? await db
        .select({ id: food.id, name: food.name })
        .from(food)
        .where(inArray(food.id, Array.from(allOtherFoodIds)))
      : []

    const foodNameMap = new Map(foods.map(f => [f.id, f.name]))

    // Step 4: Apply nationality privacy protection to all comments
    const allCommentsForPrivacy = currentPairingComments.concat(expandedComments)
    const protectedComments = applyNationalityPrivacy(allCommentsForPrivacy)

    // Step 5: Transform to EnhancedComment format
    const transformComment = (comment: typeof currentPairingComments[0], index: number, isCurrentPairing: boolean): EnhancedComment => {
      let otherFoodId: string
      let otherFoodName: string

      try {
        if (comment.winnerFoodId) {
          // For win comments, the other food is the one that wasn't voted for
          otherFoodId = extractOtherFoodId(comment.pairKey, comment.winnerFoodId)
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
        console.warn(`Failed to determine other food for comment ${comment.id}:`, error)
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
        nationality: protectedComments[index].nationality,
        isCurrentPairing,
        otherFoodId,
        otherFoodName,
      }
    }

    const enhancedCurrentComments = currentPairingComments.map((comment, index) =>
      transformComment(comment, index, true)
    )

    const enhancedExpandedComments = expandedComments.map((comment, index) =>
      transformComment(comment, currentPairingComments.length + index, false)
    )

    const totalCount = enhancedCurrentComments.length + enhancedExpandedComments.length
    const hasMore = totalCount >= (currentPairingLimit + (includeExpanded ? expandedLimit : 0))
    const allEnhancedComments = enhancedCurrentComments.concat(enhancedExpandedComments)
    const lastComment = allEnhancedComments[allEnhancedComments.length - 1]

    return {
      currentPairingComments: enhancedCurrentComments,
      expandedComments: enhancedExpandedComments,
      totalCount,
      hasMore,
      cursor: lastComment?.createdAt,
    }
  }, 'retrieve expanded comments')
}