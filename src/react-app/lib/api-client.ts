import type {
  Food,
  FoodPair,
  VoteRequest,
  VoteResponse,
  VoteStats,
  Comment,
  CommentRequest,
  ApiError,
} from './types'

class ApiClient {
  private baseUrl = '/api'

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for Better-auth sessions
      ...options,
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: response.statusText,
        code: response.status,
      }))
      throw new Error(`API Error ${errorData.code}: ${errorData.message}`)
    }

    return response.json()
  }

  // Food endpoints
  async getRandomFoodPair(): Promise<FoodPair> {
    return this.request<FoodPair>('/foods/random-pair')
  }

  async getLeaderboard(): Promise<Food[]> {
    return this.request<Food[]>('/foods/leaderboard')
  }

  // Vote endpoints
  async createVote(vote: VoteRequest): Promise<VoteResponse> {
    return this.request<VoteResponse>('/votes', {
      method: 'POST',
      body: JSON.stringify(vote),
    })
  }

  async getVoteStats(pairKey: string): Promise<VoteStats> {
    return this.request<VoteStats>(
      `/votes/stats/${encodeURIComponent(pairKey)}`,
    )
  }

  // Comment endpoints
  async createComment(comment: CommentRequest): Promise<Comment> {
    return this.request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    })
  }

  async getComments(pairKey: string, limit = 20): Promise<Comment[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    return this.request<Comment[]>(
      `/comments/${encodeURIComponent(pairKey)}?${params}`,
    )
  }
}

export const apiClient = new ApiClient()
