// API Types based on the design document

export interface Food {
  id: string
  name: string
  imageUrl: string
  eloScore: number
  totalVotes: number
  createdAt: string
  updatedAt: string
}

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
  updatedScores: Record<string, number>
  voteStats: VoteStats
}

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
}

export interface Comment {
  id: string
  pairKey: string
  result: 'win' | 'tie'
  winnerFoodId?: string
  content: string
  userId: string
  nationality?: string
  createdAt: string
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
  details?: unknown
}
