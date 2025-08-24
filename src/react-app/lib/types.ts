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

// Comment types
export interface Comment {
  id: string
  pairKey: string
  result: 'win' | 'tie'
  winnerFoodId?: string
  content: string
  createdAt: string
  nationality?: string
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
  countryCodeStandard: 'ISO-3166-1-alpha-2'
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

export interface CommentRequest {
  pairKey: string
  result: 'win' | 'tie'
  winnerFoodId?: string
  content: string
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
