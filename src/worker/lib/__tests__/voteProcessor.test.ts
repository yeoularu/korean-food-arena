import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VoteProcessor, type VoteRequest } from '../voteProcessor'
import { DrizzleD1Database } from 'drizzle-orm/d1'

// Mock the database
const mockDb = {
  transaction: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}

// Mock transaction object
const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}

describe('VoteProcessor', () => {
  let voteProcessor: VoteProcessor
  let mockFoods: unknown[]
  let baseVoteRequest: VoteRequest

  beforeEach(() => {
    vi.clearAllMocks()
    voteProcessor = new VoteProcessor(mockDb as unknown as DrizzleD1Database)

    // Mock foods data
    mockFoods = [
      {
        id: 'food1',
        name: 'Kimchi',
        imageUrl: 'kimchi.jpg',
        eloScore: 1200,
        totalVotes: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'food2',
        name: 'Bulgogi',
        imageUrl: 'bulgogi.jpg',
        eloScore: 1300,
        totalVotes: 15,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]

    // Base vote request
    baseVoteRequest = {
      pairKey: 'food1_food2',
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food1',
      presentedRightId: 'food2',
      result: 'win',
      winnerFoodId: 'food1',
      userId: 'user123',
    }
  })

  describe('processVote', () => {
    it('should successfully process a win vote with ELO updates', async () => {
      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
      })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'food1' }]), // Successful update
      })

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'vote123',
            ...baseVoteRequest,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]),
      })

      const result = await voteProcessor.processVote(baseVoteRequest)

      expect(result.vote).toBeDefined()
      expect(result.updatedScores).toBeDefined()
      expect(result.updatedScores['food1']).toBeGreaterThan(1200) // Winner should gain points
      expect(result.updatedScores['food2']).toBeLessThan(1300) // Loser should lose points
    })

    it('should successfully process a tie vote', async () => {
      const tieVoteRequest = {
        ...baseVoteRequest,
        result: 'tie' as const,
        winnerFoodId: undefined,
      }

      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
      })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'food1' }]), // Successful update
      })

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'vote123',
            ...tieVoteRequest,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]),
      })

      const result = await voteProcessor.processVote(tieVoteRequest)

      expect(result.vote).toBeDefined()
      expect(result.updatedScores).toBeDefined()
      // For equal ratings, tie should not change scores much
      expect(Math.abs(result.updatedScores['food1'] - 1200)).toBeLessThan(50)
      expect(Math.abs(result.updatedScores['food2'] - 1300)).toBeLessThan(50)
    })

    it('should successfully process a skip vote without ELO changes', async () => {
      const skipVoteRequest = {
        ...baseVoteRequest,
        result: 'skip' as const,
        winnerFoodId: undefined,
      }

      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
      })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'food1' }]), // Successful update
      })

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'vote123',
            ...skipVoteRequest,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]),
      })

      const result = await voteProcessor.processVote(skipVoteRequest)

      expect(result.vote).toBeDefined()
      expect(result.updatedScores).toBeDefined()
      // Skip votes should not change ELO scores
      expect(result.updatedScores['food1']).toBe(1200)
      expect(result.updatedScores['food2']).toBe(1300)
    })

    it('should throw DUPLICATE_VOTE error when user has already voted', async () => {
      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'existing-vote' }]), // Existing vote found
      })

      await expect(voteProcessor.processVote(baseVoteRequest)).rejects.toThrow(
        'User has already voted on this food pairing',
      )
    })

    it('should throw FOOD_NOT_FOUND error when foods are missing', async () => {
      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockFoods[0]]), // Only one food found
      })

      await expect(voteProcessor.processVote(baseVoteRequest)).rejects.toThrow(
        'One or both foods not found',
      )
    })

    it('should retry on concurrency errors and eventually succeed', async () => {
      let transactionAttempt = 0

      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        transactionAttempt++

        // Reset mocks for each transaction attempt
        vi.clearAllMocks()

        mockTx.select.mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]), // No existing vote
        })

        mockTx.select.mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
        })

        // Mock both food updates
        mockTx.update.mockReturnValue({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockImplementation(() => {
            if (transactionAttempt <= 2) {
              return Promise.resolve([]) // Simulate concurrency conflict (no rows updated)
            }
            return Promise.resolve([{ id: 'food1' }]) // Success on third attempt
          }),
        })

        mockTx.insert.mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([
            {
              id: 'vote123',
              ...baseVoteRequest,
              createdAt: '2024-01-01T00:00:00Z',
            },
          ]),
        })

        return await callback(mockTx)
      })

      const result = await voteProcessor.processVote(baseVoteRequest)

      expect(result.vote).toBeDefined()
      expect(transactionAttempt).toBe(3) // Should have retried twice before succeeding
    })

    it('should throw RETRY_EXHAUSTED error after maximum retries', async () => {
      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
      })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]), // Always fail (no rows updated)
      })

      await expect(voteProcessor.processVote(baseVoteRequest)).rejects.toThrow(
        'Vote processing failed after maximum retries',
      )
    })
  })

  describe('validation', () => {
    it('should throw INVALID_VOTE error for mismatched pair key', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        pairKey: 'wrong_key',
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Pair key does not match food IDs',
      )
    })

    it('should throw INVALID_VOTE error for non-normalized food IDs', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        foodLowId: 'food2', // Should be food1 (lexicographically smaller)
        foodHighId: 'food1', // Should be food2
        pairKey: 'food1_food2', // This is correct, but food IDs are swapped
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Food IDs are not properly normalized',
      )
    })

    it('should throw INVALID_VOTE error for invalid presented food IDs', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        presentedLeftId: 'food3', // Not in the pair
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Presented food IDs must match the pair food IDs',
      )
    })

    it('should throw INVALID_VOTE error for same presented food IDs', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        presentedLeftId: 'food1',
        presentedRightId: 'food1', // Same as left
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Presented food IDs must be different',
      )
    })

    it('should throw INVALID_VOTE error for win without winner food ID', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        result: 'win' as const,
        winnerFoodId: undefined,
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Winner food ID is required for win results',
      )
    })

    it('should throw INVALID_VOTE error for invalid winner food ID', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        result: 'win' as const,
        winnerFoodId: 'food3', // Not in the pair
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Winner food ID must be one of the pair food IDs',
      )
    })

    it('should throw INVALID_VOTE error for tie with winner food ID', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        result: 'tie' as const,
        winnerFoodId: 'food1', // Should not be provided for tie
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Winner food ID should not be provided for tie or skip results',
      )
    })

    it('should throw INVALID_VOTE error for skip with winner food ID', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        result: 'skip' as const,
        winnerFoodId: 'food1', // Should not be provided for skip
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'Winner food ID should not be provided for tie or skip results',
      )
    })

    it('should throw INVALID_VOTE error for empty user ID', async () => {
      const invalidRequest = {
        ...baseVoteRequest,
        userId: '',
      }

      await expect(voteProcessor.processVote(invalidRequest)).rejects.toThrow(
        'User ID is required',
      )
    })
  })

  describe('ELO integration', () => {
    it('should correctly apply ELO calculations for upset win', async () => {
      // Lower rated food (food1: 1200) beats higher rated food (food2: 1300)
      const upsetRequest = {
        ...baseVoteRequest,
        winnerFoodId: 'food1', // Lower rated food wins
      }

      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
      })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'food1' }]), // Successful update
      })

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'vote123',
            ...upsetRequest,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]),
      })

      const result = await voteProcessor.processVote(upsetRequest)

      // Lower rated food should gain more points for upset
      expect(result.updatedScores['food1'] - 1200).toBeGreaterThan(16)
      // Higher rated food should lose more points for upset
      expect(1300 - result.updatedScores['food2']).toBeGreaterThan(16)
    })

    it('should correctly handle reverse winner mapping', async () => {
      // food2 (higher rated) wins
      const normalWinRequest = {
        ...baseVoteRequest,
        winnerFoodId: 'food2', // Higher rated food wins
      }

      // Setup mocks
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No existing vote
      })

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFoods), // Return both foods
      })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'food1' }]), // Successful update
      })

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'vote123',
            ...normalWinRequest,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]),
      })

      const result = await voteProcessor.processVote(normalWinRequest)

      // Higher rated food should gain fewer points
      expect(result.updatedScores['food2'] - 1300).toBeLessThan(16)
      // Lower rated food should lose fewer points
      expect(1200 - result.updatedScores['food1']).toBeLessThan(16)
    })
  })
})
