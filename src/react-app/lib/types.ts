// Extended user type that includes nationality field
export interface User {
  id: string
  email: string
  emailVerified: boolean
  name: string
  createdAt: Date
  updatedAt: Date
  image?: string | null
  isAnonymous?: boolean | null
  nationality?: string | null
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date
  token: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface SessionData {
  user: User
  session: Session
}

// Food types
export interface Food {
  id: string
  name: string
  imageUrl: string
  eloScore: number
  totalVotes: number
  // Added: number of wins (server-computed), optional for backward compatibility
  winCount?: number
  createdAt: string
  updatedAt: string
}

// Vote types
export interface Vote {
  id: string
  pairKey: string
  foodLowId: string
  foodHighId: string
  presentedLeftId: string
  presentedRightId: string
  result: 'win' | 'tie' | 'skip'
  winnerFoodId?: string
  userId: string
  createdAt: string
}

/**
 * Base comment interface for food pairing comments.
 * Contains the core comment data without expanded context.
 */
export interface Comment {
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
}

/**
 * Enhanced comment interface with additional context fields for expanded comment visibility.
 * Extends the base Comment interface with fields needed to display pairing context.
 */
export interface EnhancedComment extends Comment {
  /** Whether this comment is from the exact current pairing being viewed */
  isCurrentPairing: boolean
  /** The other food ID in the commenter's pairing */
  otherFoodId: string
  /** Display name of the other food for UI context */
  otherFoodName: string
}

/**
 * Structured API response for expanded comments endpoint.
 * Separates current pairing comments from expanded comments for better UX.
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

// Vote statistics
export interface VoteStats {
  totalVotes: number
  countsByFoodId: Record<string, number>
  tieCount: number
  skipCount: number
  percentageByFoodId: Record<string, number>
  tiePercentage: number
  nationalityBreakdown: Record<
    string,
    {
      byFoodId: Record<string, number>
      tiePercentage: number
    }
  >
  // Added: map food IDs to their display names for rendering
  foodNamesById: Record<string, string>
  countryCodeStandard: 'ISO-3166-1-alpha-2'
  // Added: current user's vote for this pair to lock comment selection
  userVoteForComment?: { result: 'win' | 'tie'; winnerFoodId?: string } | null
}
// API Request/Response types
export interface FoodPair {
  presentedLeft: Food
  presentedRight: Food
}

export interface VoteRequest {
  pairKey: string
  foodLowId: string
  foodHighId: string
  presentedLeftId: string
  presentedRightId: string
  result: 'win' | 'tie' | 'skip'
  winnerFoodId?: string
}

export interface VoteResponse {
  vote: Vote
  updatedScores: Record<string, number>
  voteStats: VoteStats
}

/**
 * Request interface for creating a new comment.
 * Used when users submit comments after voting on a pairing.
 */
export interface CommentRequest {
  /** The food pairing identifier */
  pairKey: string
  /** The vote result this comment is associated with */
  result: 'win' | 'tie'
  /** The winning food ID (required if result is 'win') */
  winnerFoodId?: string
  /** The comment text (1-280 characters, will be sanitized) */
  content: string
}

/**
 * Request interface for expanded comments endpoint.
 * Used to configure the expanded comments query with pagination and limits.
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

export interface ApiError {
  error: string
  message: string
  code: number
  details?: Record<string, unknown>
}

// Type guard to check if an error is an ApiError
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'message' in error &&
    'code' in error &&
    typeof (error as Record<string, unknown>).error === 'string' &&
    typeof (error as Record<string, unknown>).message === 'string' &&
    typeof (error as Record<string, unknown>).code === 'number'
  )
}
