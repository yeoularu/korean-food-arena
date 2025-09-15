/**
 * Korean Food Arena - Type Exports
 *
 * This file provides a centralized export point for all TypeScript interfaces
 * and types used throughout the application, including the enhanced expanded
 * comments functionality.
 */

// Re-export all types from the main types file
export type {
  // User and Session types
  User,
  Session,
  SessionData,

  // Food types
  Food,
  FoodPair,

  // Vote types
  Vote,
  VoteRequest,
  VoteResponse,
  VoteStats,

  // Comment types (base and enhanced)
  Comment,
  CommentRequest,
  EnhancedComment,
  ExpandedCommentsRequest,
  ExpandedCommentsResponse,

  // Error handling
  ApiError,
} from './types'

// Re-export utility functions
export { isApiError } from './types'

// Import types for use in this file
import type { Comment, EnhancedComment } from './types'

// Re-export API client
export { apiClient } from './api-client'

// Re-export auth client
export { authClient } from './auth-client'

/**
 * Type guards and utility types for enhanced type safety
 */

/**
 * Type guard to check if a comment is an enhanced comment with context
 */
export function isEnhancedComment(
  comment: Comment | EnhancedComment,
): comment is EnhancedComment {
  return (
    'isCurrentPairing' in comment &&
    'otherFoodId' in comment &&
    'otherFoodName' in comment
  )
}

/**
 * Type for comment display context
 */
export type CommentDisplayContext = {
  showPairingContext: boolean
  currentPairKey: string
  foodId1: string
  foodId2: string
}

/**
 * Type for expanded comments query options
 */
export type ExpandedCommentsOptions = {
  currentPairingLimit?: number
  expandedLimit?: number
  includeExpanded?: boolean
  cursor?: string
}

/**
 * Type for comment section configuration
 */
export type CommentSectionConfig = {
  enableExpanded: boolean
  defaultCurrentLimit: number
  defaultExpandedLimit: number
  maxCurrentLimit: number
  maxExpandedLimit: number
}

/**
 * Default configuration values for expanded comments
 */
export const EXPANDED_COMMENTS_CONFIG: CommentSectionConfig = {
  enableExpanded: true,
  defaultCurrentLimit: 10,
  defaultExpandedLimit: 10,
  maxCurrentLimit: 20,
  maxExpandedLimit: 30,
} as const

/**
 * Type for nationality privacy protection
 */
export type NationalityPrivacyConfig = {
  minGroupSize: number
  unknownLabel: string
  otherLabel: string
}

/**
 * Default nationality privacy configuration
 */
export const NATIONALITY_PRIVACY_CONFIG: NationalityPrivacyConfig = {
  minGroupSize: 5,
  unknownLabel: 'unknown',
  otherLabel: 'Other',
} as const

/**
 * Type for API endpoint paths
 */
export type ApiEndpoints = {
  // Food endpoints
  randomPair: '/api/foods/random-pair'
  leaderboard: '/api/foods/leaderboard'

  // Vote endpoints
  createVote: '/api/votes'
  voteStats: (pairKey: string) => string

  // Comment endpoints
  createComment: '/api/comments'
  getComments: (pairKey: string) => string
  getExpandedComments: (pairKey: string) => string

  // User endpoints
  updateNationality: '/api/user/update-nationality'
}

/**
 * API endpoint paths for type-safe routing
 */
export const API_ENDPOINTS: ApiEndpoints = {
  randomPair: '/api/foods/random-pair',
  leaderboard: '/api/foods/leaderboard',
  createVote: '/api/votes',
  voteStats: (pairKey: string) =>
    `/api/votes/stats/${encodeURIComponent(pairKey)}`,
  createComment: '/api/comments',
  getComments: (pairKey: string) =>
    `/api/comments/${encodeURIComponent(pairKey)}`,
  getExpandedComments: (pairKey: string) =>
    `/api/comments/${encodeURIComponent(pairKey)}/expanded`,
  updateNationality: '/api/user/update-nationality',
} as const

/**
 * Query key factories for TanStack Query
 */
export const queryKeys = {
  // Food queries
  foods: ['foods'] as const,
  randomPair: () => [...queryKeys.foods, 'random-pair'] as const,
  leaderboard: () => [...queryKeys.foods, 'leaderboard'] as const,

  // Vote queries
  votes: ['votes'] as const,
  voteStats: (pairKey: string) =>
    [...queryKeys.votes, 'stats', pairKey] as const,

  // Comment queries
  comments: ['comments'] as const,
  commentsByPair: (pairKey: string) =>
    [...queryKeys.comments, pairKey] as const,
  expandedComments: (
    pairKey: string,
    foodId1: string,
    foodId2: string,
    options?: ExpandedCommentsOptions,
  ) =>
    [
      ...queryKeys.comments,
      'expanded',
      pairKey,
      foodId1,
      foodId2,
      options,
    ] as const,

  // User queries
  user: ['user'] as const,
  userProfile: () => [...queryKeys.user, 'profile'] as const,
} as const

/**
 * Mutation keys for TanStack Query
 */
export const mutationKeys = {
  createVote: ['createVote'] as const,
  createComment: ['createComment'] as const,
  updateNationality: ['updateNationality'] as const,
} as const
