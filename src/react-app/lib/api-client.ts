import type {
  Food,
  FoodPair,
  VoteRequest,
  VoteResponse,
  VoteStats,
  Comment,
  CommentRequest,
  ExpandedCommentsResponse,
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

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries = 3,
    retryDelay = 1000,
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options)
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx) except for 408 (timeout) and 429 (rate limit)
        if (error instanceof Error && error.message.includes('API Error')) {
          const statusMatch = error.message.match(/API Error (\d+):/)
          if (statusMatch) {
            const status = parseInt(statusMatch[1])
            if (
              status >= 400 &&
              status < 500 &&
              status !== 408 &&
              status !== 429
            ) {
              throw error
            }
          }
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break
        }

        // Wait before retrying with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt)),
        )
      }
    }

    throw lastError!
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

  async getExpandedComments(
    pairKey: string,
    foodId1: string,
    foodId2: string,
    options: {
      currentPairingLimit?: number
      expandedLimit?: number
      includeExpanded?: boolean
      cursor?: string
    } = {},
  ): Promise<ExpandedCommentsResponse> {
    // Validate required parameters
    if (!pairKey || !foodId1 || !foodId2) {
      throw new Error(
        'Missing required parameters: pairKey, foodId1, and foodId2 are required',
      )
    }

    // Validate pairKey format
    if (!/^[a-zA-Z0-9-]+_[a-zA-Z0-9-]+$/.test(pairKey)) {
      throw new Error('Invalid pairKey format')
    }

    // Build query parameters
    const params = new URLSearchParams()

    if (options.currentPairingLimit !== undefined) {
      params.set(
        'currentPairingLimit',
        Math.min(Math.max(1, options.currentPairingLimit), 20).toString(),
      )
    }

    if (options.expandedLimit !== undefined) {
      params.set(
        'expandedLimit',
        Math.min(Math.max(1, options.expandedLimit), 30).toString(),
      )
    }

    if (options.includeExpanded !== undefined) {
      params.set('includeExpanded', options.includeExpanded.toString())
    }

    if (options.cursor) {
      params.set('cursor', options.cursor)
    }

    // Add food IDs as query parameters for validation
    params.set('foodId1', foodId1)
    params.set('foodId2', foodId2)

    const queryString = params.toString()
    const endpoint = `/comments/${encodeURIComponent(pairKey)}/expanded${queryString ? `?${queryString}` : ''}`

    try {
      return await this.requestWithRetry<ExpandedCommentsResponse>(endpoint)
    } catch (error) {
      // Provide more specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          throw new Error(
            'You must vote on this pairing before viewing comments',
          )
        }
        if (error.message.includes('404')) {
          throw new Error('Comments not found for this pairing')
        }
        if (error.message.includes('400')) {
          throw new Error('Invalid request parameters')
        }
      }
      throw error
    }
  }
}

export const apiClient = new ApiClient()
